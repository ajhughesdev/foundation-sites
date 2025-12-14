import { definePlugin } from '@foundation/core';
import type { FoundationPlugin, FoundationPluginInstance, PluginContext } from '@foundation/core';
import {
  ensureId,
  focusFirstFocusable,
  focusLastFocusable,
  getFocusableElements,
  getEventTargetElement,
  getStringAttribute,
  isHtmlElement,
  isTextInputLike,
  parseBooleanAttribute,
  parseNumberAttribute,
} from '@foundation/core/utils/dom.js';
import { computeFloatingPosition } from '@foundation/core/utils/floating.js';
import type { FloatingPlacement } from '@foundation/core/utils/floating.js';
import { createRafScheduler } from '@foundation/core/utils/schedule.js';

export type { FloatingPlacement };

export type DropdownOptions = {
  placement?: FloatingPlacement;
  offset?: number;
  viewportPadding?: number;
  flip?: boolean;
  closeOnOutsideClick?: boolean;
  closeOnFocusOutside?: boolean;
  closeOnEsc?: boolean;
  autoFocus?: boolean;
  matchTriggerWidth?: boolean;
  keyboard?: boolean;
  closeOnSelect?: boolean;
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

      const closeOnOutsideClick = parseBooleanAttribute(
        element,
        'data-dropdown-close-on-outside',
        defaultOptions.closeOnOutsideClick ?? true
      );

      const options: Required<DropdownOptions> = {
        placement: (getStringAttribute(element, 'data-dropdown-placement') as FloatingPlacement | undefined) ??
          (defaultOptions.placement ?? 'bottom-start'),
        offset: parseNumberAttribute(element, 'data-dropdown-offset', defaultOptions.offset ?? 8),
        viewportPadding: parseNumberAttribute(element, 'data-dropdown-viewport-padding', defaultOptions.viewportPadding ?? 8),
        flip: parseBooleanAttribute(element, 'data-dropdown-flip', defaultOptions.flip ?? true),
        closeOnOutsideClick,
        closeOnFocusOutside: parseBooleanAttribute(
          element,
          'data-dropdown-close-on-blur',
          defaultOptions.closeOnFocusOutside ?? closeOnOutsideClick
        ),
        closeOnEsc: parseBooleanAttribute(element, 'data-dropdown-close-on-esc', defaultOptions.closeOnEsc ?? true),
        autoFocus: parseBooleanAttribute(element, 'data-dropdown-auto-focus', defaultOptions.autoFocus ?? false),
        matchTriggerWidth: parseBooleanAttribute(
          element,
          'data-dropdown-match-trigger-width',
          defaultOptions.matchTriggerWidth ?? false
        ),
        keyboard: parseBooleanAttribute(element, 'data-dropdown-keyboard', defaultOptions.keyboard ?? true),
        closeOnSelect: parseBooleanAttribute(
          element,
          'data-dropdown-close-on-select',
          defaultOptions.closeOnSelect ?? false
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

      const repositionNow = () => {
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

      const repositionScheduler = createRafScheduler(repositionNow);
      const reposition = () => repositionNow();

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
          repositionNow();
          if (options.autoFocus) focusFirstFocusable(element);
        });

        emitOpened();
      };

      const close = () => {
        if (!isOpen) return;
        isOpen = false;

        const active = document.activeElement;
        const focusWasInside = active instanceof Node && element.contains(active);
        const focusTarget = opener;

        repositionScheduler.cancel();
        element.removeAttribute(OPENED_ATTR);
        element.removeAttribute(MEASURING_ATTR);
        element.setAttribute('hidden', '');
        element.setAttribute('aria-hidden', 'true');

        if (opener?.isConnected && openerHasExpandedState) {
          setExpanded(opener, false, id);
        }
        opener = null;
        openerHasExpandedState = false;

        if (focusWasInside && focusTarget?.isConnected) {
          try {
            focusTarget.focus();
          } catch {
            // ignore
          }
        }

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
        repositionScheduler.schedule();
      });
      context.on(
        window,
        'scroll',
        () => {
          repositionScheduler.schedule();
        },
        { passive: true, capture: true }
      );

      context.on(document, 'keydown', (event) => {
        const e = event as KeyboardEvent;
        const target = getEventTargetElement(event);
        if (!target) return;

        if (!isOpen && options.keyboard) {
          const trigger =
            getTriggerForId(target, 'data-dropdown-toggle', id) ?? getTriggerForId(target, 'data-dropdown-open', id);
          if (trigger && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            open(trigger);
            queueMicrotask(() => {
              if (!isOpen) return;
              if (e.key === 'ArrowDown') focusFirstFocusable(element);
              else focusLastFocusable(element);
            });
            return;
          }
        }

        if (!isOpen) return;

        if (options.closeOnEsc && e.key === 'Escape') {
          e.preventDefault();
          close();
          return;
        }

        if (!options.keyboard) return;
        if (isTextInputLike(target)) return;

        const focusables = getFocusableElements(element);
        if (focusables.length === 0) return;

        const active = document.activeElement;
        const activeEl = active instanceof HTMLElement ? active : null;

        const withinDropdown = activeEl ? element.contains(activeEl) : false;
        const onOpener = activeEl ? Boolean(opener && opener.contains(activeEl)) : false;

        const currentIndex = withinDropdown && activeEl ? focusables.indexOf(activeEl) : -1;

        if (e.key === 'Home') {
          e.preventDefault();
          focusables[0].focus();
          return;
        }

        if (e.key === 'End') {
          e.preventDefault();
          focusables[focusables.length - 1].focus();
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (withinDropdown) {
            if (currentIndex >= 0) focusables[(currentIndex + 1) % focusables.length].focus();
            else focusables[0].focus();
          } else if (onOpener) {
            focusables[0].focus();
          }
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (withinDropdown) {
            if (currentIndex >= 0) focusables[(currentIndex - 1 + focusables.length) % focusables.length].focus();
            else focusables[focusables.length - 1].focus();
          } else if (onOpener) {
            focusables[focusables.length - 1].focus();
          }
        }
      });

      context.on(document, 'focusin', (event) => {
        if (!isOpen) return;
        if (!options.closeOnFocusOutside) return;

        const target = getEventTargetElement(event);
        if (!target) return;
        if (element.contains(target)) return;
        if (opener && opener.contains(target)) return;

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

        if (isOpen && options.closeOnSelect && element.contains(target)) {
          const selected = target.closest(
            'a[href], button, [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [data-dropdown-select]'
          );
          if (selected && element.contains(selected)) {
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
        if (isHtmlElement(initialTrigger)) {
          opener = initialTrigger;
          openerHasExpandedState = true;
          setExpanded(opener, true, id);
        }
        queueMicrotask(() => {
          repositionNow();
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
