import { definePlugin } from '@foundation/core';
import type { FoundationPlugin, FoundationPluginInstance, PluginContext } from '@foundation/core';
import { ensureId, getStringAttribute, parseBooleanAttribute, parseNumberAttribute } from '@foundation/core/utils/dom.js';
import { computeFloatingPosition } from '@foundation/core/utils/floating.js';
import type { FloatingPlacement } from '@foundation/core/utils/floating.js';
import { createRafScheduler } from '@foundation/core/utils/schedule.js';

export type { FloatingPlacement };

export type TooltipOptions = {
  placement?: FloatingPlacement;
  offset?: number;
  viewportPadding?: number;
  flip?: boolean;
  closeOnEsc?: boolean;
  showDelay?: number;
  hideDelay?: number;
};

export type TooltipInstance = FoundationPluginInstance & {
  show(): void;
  hide(): void;
  toggle(): void;
  reposition(): void;
};

const TOOLTIP_CLASS = 'f-tooltip';
const OPENED_ATTR = 'data-tooltip-opened';
const MEASURING_ATTR = 'data-tooltip-measuring';

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

type TooltipContent =
  | { type: 'text'; text: string }
  | { type: 'template'; template: HTMLTemplateElement }
  | { type: 'element'; element: Element };

function getTooltipContent(trigger: Element): TooltipContent | null {
  const explicit = getStringAttribute(trigger, 'data-tooltip-text');
  if (explicit) return { type: 'text', text: explicit };

  const fromDataTooltip = getStringAttribute(trigger, 'data-tooltip');
  if (fromDataTooltip) {
    const normalized = normalizeToken(fromDataTooltip);
    const booleanish = normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
    if (!booleanish) {
      if (fromDataTooltip.startsWith('#')) {
        const referenced = document.querySelector(fromDataTooltip);
        if (referenced instanceof HTMLTemplateElement) return { type: 'template', template: referenced };
        if (referenced instanceof Element) return { type: 'element', element: referenced };
      }

      return { type: 'text', text: fromDataTooltip };
    }
  }

  const title = getStringAttribute(trigger, 'title');
  return title ? { type: 'text', text: title } : null;
}

function addDescribedBy(el: Element, id: string): void {
  const raw = el.getAttribute('aria-describedby') ?? '';
  const parts = raw
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.includes(id)) return;
  parts.push(id);
  el.setAttribute('aria-describedby', parts.join(' '));
}

function removeDescribedBy(el: Element, id: string): void {
  const raw = el.getAttribute('aria-describedby');
  if (!raw) return;
  const parts = raw
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => p !== id);
  if (parts.length === 0) el.removeAttribute('aria-describedby');
  else el.setAttribute('aria-describedby', parts.join(' '));
}

export function tooltip(defaultOptions: TooltipOptions = {}): FoundationPlugin {
  return definePlugin({
    name: 'tooltip',
    selector: '[data-tooltip]',
    mount(element: Element, context: PluginContext): TooltipInstance {
      const content = getTooltipContent(element);
      if (!content) {
        return {
          show() {},
          hide() {},
          toggle() {},
          reposition() {},
        };
      }

      const options: Required<TooltipOptions> = {
        placement: (getStringAttribute(element, 'data-tooltip-placement') as FloatingPlacement | undefined) ??
          (defaultOptions.placement ?? 'top'),
        offset: parseNumberAttribute(element, 'data-tooltip-offset', defaultOptions.offset ?? 8),
        viewportPadding: parseNumberAttribute(element, 'data-tooltip-viewport-padding', defaultOptions.viewportPadding ?? 8),
        flip: parseBooleanAttribute(element, 'data-tooltip-flip', defaultOptions.flip ?? true),
        closeOnEsc: parseBooleanAttribute(element, 'data-tooltip-close-on-esc', defaultOptions.closeOnEsc ?? true),
        showDelay: parseNumberAttribute(element, 'data-tooltip-show-delay', defaultOptions.showDelay ?? 150),
        hideDelay: parseNumberAttribute(element, 'data-tooltip-hide-delay', defaultOptions.hideDelay ?? 100),
      };

      const tooltipEl = document.createElement('div');
      tooltipEl.className = TOOLTIP_CLASS;
      tooltipEl.setAttribute('role', 'tooltip');
      if (content.type === 'text') {
        tooltipEl.textContent = content.text;
      } else if (content.type === 'template') {
        tooltipEl.replaceChildren(content.template.content.cloneNode(true));
      } else {
        const nodes = Array.from(content.element.childNodes).map((node) => node.cloneNode(true));
        tooltipEl.replaceChildren(...nodes);
      }
      tooltipEl.setAttribute('hidden', '');

      const tooltipId = ensureId(tooltipEl, 'f7-tooltip');

      const originalTitle = element.getAttribute('title');
      if (originalTitle !== null) element.removeAttribute('title');

      addDescribedBy(element, tooltipId);
      document.body.append(tooltipEl);

      let isOpen = false;
      let showTimer: number | null = null;
      let hideTimer: number | null = null;

      const repositionNow = () => {
        if (!isOpen) return;

        const anchorRect = element.getBoundingClientRect();

        tooltipEl.setAttribute(MEASURING_ATTR, '');
        const floatingRect = tooltipEl.getBoundingClientRect();

        const { top, left } = computeFloatingPosition(anchorRect, floatingRect, {
          placement: options.placement,
          offset: options.offset,
          viewportPadding: options.viewportPadding,
          flip: options.flip,
        });

        tooltipEl.style.setProperty('--f-tooltip-top', `${top}px`);
        tooltipEl.style.setProperty('--f-tooltip-left', `${left}px`);
        tooltipEl.removeAttribute(MEASURING_ATTR);
      };

      const repositionScheduler = createRafScheduler(repositionNow);
      const reposition = () => repositionNow();

      const clearTimers = () => {
        if (showTimer !== null) {
          window.clearTimeout(showTimer);
          showTimer = null;
        }
        if (hideTimer !== null) {
          window.clearTimeout(hideTimer);
          hideTimer = null;
        }
      };

      const showNow = () => {
        if (isOpen) return;
        isOpen = true;

        tooltipEl.removeAttribute('hidden');
        tooltipEl.setAttribute(OPENED_ATTR, '');

        queueMicrotask(() => {
          repositionNow();
        });
      };

      const hideNow = () => {
        if (!isOpen) return;
        isOpen = false;

        repositionScheduler.cancel();
        tooltipEl.removeAttribute(OPENED_ATTR);
        tooltipEl.removeAttribute(MEASURING_ATTR);
        tooltipEl.setAttribute('hidden', '');
      };

      const show = (immediate = false) => {
        if (isOpen) return;
        if (immediate || options.showDelay <= 0) {
          clearTimers();
          showNow();
          return;
        }

        if (showTimer !== null) return;
        if (hideTimer !== null) {
          window.clearTimeout(hideTimer);
          hideTimer = null;
        }

        showTimer = window.setTimeout(() => {
          showTimer = null;
          showNow();
        }, options.showDelay);
      };

      const hide = (immediate = false) => {
        if (!isOpen) {
          if (showTimer !== null) {
            window.clearTimeout(showTimer);
            showTimer = null;
          }
          return;
        }

        if (immediate || options.hideDelay <= 0) {
          clearTimers();
          hideNow();
          return;
        }

        if (hideTimer !== null) return;
        if (showTimer !== null) {
          window.clearTimeout(showTimer);
          showTimer = null;
        }

        hideTimer = window.setTimeout(() => {
          hideTimer = null;
          hideNow();
        }, options.hideDelay);
      };

      const toggle = () => {
        if (isOpen) hide();
        else show();
      };

      const hoverSupported =
        typeof window.matchMedia === 'function'
          ? window.matchMedia('(any-hover: hover)').matches && window.matchMedia('(any-pointer: fine)').matches
          : true;

      if (hoverSupported) {
        context.on(element, 'pointerenter', () => {
          show(false);
        });
        context.on(element, 'pointerleave', () => {
          hide(false);
        });
      }
      context.on(element, 'focusin', () => {
        show(true);
      });
      context.on(element, 'focusout', (event) => {
        const e = event as FocusEvent;
        const next = e.relatedTarget;
        if (next instanceof Node && element.contains(next)) return;
        hide(true);
      });

      context.on(document, 'keydown', (event) => {
        if (!isOpen && showTimer === null) return;
        if (!options.closeOnEsc) return;

        const e = event as KeyboardEvent;
        if (e.key !== 'Escape') return;
        e.preventDefault();
        hide(true);
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

      return {
        show,
        hide,
        toggle,
        reposition,
        destroy() {
          clearTimers();
          hideNow();
          tooltipEl.remove();
          removeDescribedBy(element, tooltipId);
          if (originalTitle !== null) element.setAttribute('title', originalTitle);
        },
      };
    },
  });
}
