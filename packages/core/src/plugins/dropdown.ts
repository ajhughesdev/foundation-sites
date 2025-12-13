import { definePlugin } from '../types.js';
import type { FoundationPlugin, FoundationPluginInstance, PluginContext } from '../types.js';
import {
  ensureId,
  focusFirstFocusable,
  getEventTargetElement,
  getStringAttribute,
  isHtmlElement,
  parseBooleanAttribute,
  parseNumberAttribute,
} from '../utils/dom.js';
import { computeFloatingPosition } from '../utils/floating.js';
import type { FloatingPlacement } from '../utils/floating.js';

export type DropdownOptions = {
  placement?: FloatingPlacement;
  offset?: number;
  viewportPadding?: number;
  flip?: boolean;
  closeOnOutsideClick?: boolean;
  closeOnEsc?: boolean;
  autoFocus?: boolean;
  matchTriggerWidth?: boolean;
};

export type DropdownOpenedDetail = {
  id: string;
  opener: HTMLElement | null;
  element: Element;
};

export type DropdownClosedDetail = {
  id: string;
  opener: HTMLElement | null;
  element: Element;
};

export type DropdownInstance = FoundationPluginInstance & {
  open(opener?: HTMLElement | null): void;
  close(): void;
  toggle(opener?: HTMLElement | null): void;
  reposition(): void;
};

const OPENED_ATTR = 'data-dropdown-opened';
const MEASURING_ATTR = 'data-dropdown-measuring';
const DROPDOWN_CLASS = 'f-dropdown';

function setExpanded(trigger: HTMLElement, expanded: boolean, controlsId: string): void {
  if (!trigger.hasAttribute('aria-controls')) trigger.setAttribute('aria-controls', controlsId);
  trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

function getTriggerForId(target: Element, attribute: string, id: string): HTMLElement | null {
  const trigger = target.closest(`[${attribute}]`);
  if (!trigger) return null;
  const value = trigger.getAttribute(attribute);
  if (value !== id) return null;
  return isHtmlElement(trigger) ? trigger : null;
}

export function dropdown(defaultOptions: DropdownOptions = {}): FoundationPlugin {
  return definePlugin({
    name: 'dropdown',
    selector: '[data-dropdown]',
    mount(element: Element, context: PluginContext): DropdownInstance {
      if (!(element instanceof HTMLElement)) {
        return {
          open() {},
          close() {},
          toggle() {},
          reposition() {},
        };
      }

      const dropdownEl = element;
      const id = ensureId(element, 'f7-dropdown');

      const options: Required<DropdownOptions> = {
        placement: (getStringAttribute(element, 'data-dropdown-placement') as FloatingPlacement | undefined) ??
          (defaultOptions.placement ?? 'bottom-start'),
        offset: parseNumberAttribute(element, 'data-dropdown-offset', defaultOptions.offset ?? 8),
        viewportPadding: parseNumberAttribute(element, 'data-dropdown-viewport-padding', defaultOptions.viewportPadding ?? 8),
        flip: parseBooleanAttribute(element, 'data-dropdown-flip', defaultOptions.flip ?? true),
        closeOnOutsideClick: parseBooleanAttribute(
          element,
          'data-dropdown-close-on-outside',
          defaultOptions.closeOnOutsideClick ?? true
        ),
        closeOnEsc: parseBooleanAttribute(element, 'data-dropdown-close-on-esc', defaultOptions.closeOnEsc ?? true),
        autoFocus: parseBooleanAttribute(element, 'data-dropdown-auto-focus', defaultOptions.autoFocus ?? false),
        matchTriggerWidth: parseBooleanAttribute(
          element,
          'data-dropdown-match-trigger-width',
          defaultOptions.matchTriggerWidth ?? false
        ),
      };

      element.classList.add(DROPDOWN_CLASS);

      let opener: HTMLElement | null = null;
      let openerHasExpandedState = false;
      let isOpen = element.hasAttribute(OPENED_ATTR);

      if (isOpen) {
        element.removeAttribute('hidden');
        element.setAttribute('aria-hidden', 'false');
      } else {
        element.removeAttribute(OPENED_ATTR);
        element.setAttribute('hidden', '');
        element.setAttribute('aria-hidden', 'true');
      }

      const emitOpened = () => {
        context.emit(element, 'foundation:dropdown:opened', { id, opener, element } satisfies DropdownOpenedDetail);
      };

      const emitClosed = () => {
        context.emit(element, 'foundation:dropdown:closed', { id, opener, element } satisfies DropdownClosedDetail);
      };

      const reposition = () => {
        if (!isOpen) return;
        if (!opener?.isConnected) return;

        const anchorRect = opener.getBoundingClientRect();

        element.setAttribute(MEASURING_ATTR, '');

        const floatingRect = element.getBoundingClientRect();
        const { top, left } = computeFloatingPosition(anchorRect, floatingRect, {
          placement: options.placement,
          offset: options.offset,
          viewportPadding: options.viewportPadding,
          flip: options.flip,
        });

        if (options.matchTriggerWidth) {
          dropdownEl.style.setProperty('--f-dropdown-anchor-width', `${anchorRect.width}px`);
        } else {
          dropdownEl.style.removeProperty('--f-dropdown-anchor-width');
        }

        dropdownEl.style.setProperty('--f-dropdown-top', `${top}px`);
        dropdownEl.style.setProperty('--f-dropdown-left', `${left}px`);
        element.removeAttribute(MEASURING_ATTR);
      };

      const open = (nextOpener: HTMLElement | null = null) => {
        if (isOpen) return;

        opener = nextOpener ?? (isHtmlElement(document.activeElement) ? document.activeElement : null);
        openerHasExpandedState =
          opener?.getAttribute('data-dropdown-open') === id || opener?.getAttribute('data-dropdown-toggle') === id;

        element.removeAttribute('hidden');
        element.setAttribute(OPENED_ATTR, '');
        element.setAttribute('aria-hidden', 'false');
        isOpen = true;

        if (opener && openerHasExpandedState) setExpanded(opener, true, id);

        queueMicrotask(() => {
          reposition();
          if (options.autoFocus) focusFirstFocusable(element);
        });

        emitOpened();
      };

      const close = () => {
        if (!isOpen) return;
        isOpen = false;

        element.removeAttribute(OPENED_ATTR);
        element.removeAttribute(MEASURING_ATTR);
        element.setAttribute('hidden', '');
        element.setAttribute('aria-hidden', 'true');

        if (opener?.isConnected && openerHasExpandedState) {
          setExpanded(opener, false, id);
        }
        opener = null;
        openerHasExpandedState = false;

        emitClosed();
      };

      const toggle = (nextOpener: HTMLElement | null = null) => {
        if (isOpen) close();
        else open(nextOpener);
      };

      context.on(element, 'foundation:dropdown:open', (e) => {
        const target = getEventTargetElement(e);
        if (target !== element) return;
        open(isHtmlElement(document.activeElement) ? document.activeElement : null);
      });
      context.on(element, 'foundation:dropdown:close', (e) => {
        const target = getEventTargetElement(e);
        if (target !== element) return;
        close();
      });
      context.on(element, 'foundation:dropdown:toggle', (e) => {
        const target = getEventTargetElement(e);
        if (target !== element) return;
        toggle(isHtmlElement(document.activeElement) ? document.activeElement : null);
      });

      context.on(window, 'resize', () => {
        reposition();
      });
      context.on(window, 'scroll', () => {
        reposition();
      }, { passive: true, capture: true });

      context.on(document, 'keydown', (event) => {
        if (!isOpen) return;
        if (!options.closeOnEsc) return;

        const e = event as KeyboardEvent;
        if (e.key !== 'Escape') return;
        e.preventDefault();
        close();
      });

      context.on(document, 'click', (event) => {
        const target = getEventTargetElement(event);
        if (!target) return;

        const openTrigger = getTriggerForId(target, 'data-dropdown-open', id);
        if (openTrigger) {
          event.preventDefault();
          open(openTrigger);
          return;
        }

        const toggleTrigger = getTriggerForId(target, 'data-dropdown-toggle', id);
        if (toggleTrigger) {
          event.preventDefault();
          toggle(toggleTrigger);
          return;
        }

        const closeTrigger = target.closest('[data-dropdown-close]');
        if (closeTrigger) {
          const closeId = closeTrigger.getAttribute('data-dropdown-close');
          const isInside = element.contains(closeTrigger);
          const matches = closeId === null || closeId === '' || closeId === id;
          if (isInside || matches) {
            event.preventDefault();
            close();
            return;
          }
        }

        if (!isOpen) return;
        if (!options.closeOnOutsideClick) return;

        const clickedInside = element.contains(target);
        const clickedOpener = opener ? opener.contains(target) : false;
        if (clickedInside || clickedOpener) return;

        close();
      });

      if (isOpen) {
        const initialTrigger = document.querySelector(`[data-dropdown-toggle="${id}"], [data-dropdown-open="${id}"]`);
        if (isHtmlElement(initialTrigger)) opener = initialTrigger;
        queueMicrotask(() => {
          reposition();
        });
      }

      return {
        open,
        close,
        toggle,
        reposition,
        destroy() {
          close();
        },
      };
    },
  });
}
