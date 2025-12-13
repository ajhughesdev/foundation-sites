import { definePlugin } from '../types.js';
import type { FoundationPlugin, FoundationPluginInstance, PluginContext } from '../types.js';
import {
  ensureId,
  getStringAttribute,
  parseBooleanAttribute,
  parseNumberAttribute,
} from '../utils/dom.js';
import { computeFloatingPosition } from '../utils/floating.js';
import type { FloatingPlacement } from '../utils/floating.js';

export type TooltipOptions = {
  placement?: FloatingPlacement;
  offset?: number;
  viewportPadding?: number;
  flip?: boolean;
  closeOnEsc?: boolean;
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

function getTooltipText(trigger: Element): string | null {
  const explicit = getStringAttribute(trigger, 'data-tooltip-text');
  if (explicit) return explicit;

  const fromDataTooltip = getStringAttribute(trigger, 'data-tooltip');
  if (fromDataTooltip) {
    const normalized = normalizeToken(fromDataTooltip);
    const booleanish = normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
    if (!booleanish) return fromDataTooltip;
  }

  const title = getStringAttribute(trigger, 'title');
  return title ?? null;
}

function addDescribedBy(el: Element, id: string): void {
  const raw = el.getAttribute('aria-describedby') ?? '';
  const parts = raw.split(/\s+/).map((p) => p.trim()).filter(Boolean);
  if (parts.includes(id)) return;
  parts.push(id);
  el.setAttribute('aria-describedby', parts.join(' '));
}

function removeDescribedBy(el: Element, id: string): void {
  const raw = el.getAttribute('aria-describedby');
  if (!raw) return;
  const parts = raw.split(/\s+/).map((p) => p.trim()).filter(Boolean).filter((p) => p !== id);
  if (parts.length === 0) el.removeAttribute('aria-describedby');
  else el.setAttribute('aria-describedby', parts.join(' '));
}

export function tooltip(defaultOptions: TooltipOptions = {}): FoundationPlugin {
  return definePlugin({
    name: 'tooltip',
    selector: '[data-tooltip]',
    mount(element: Element, context: PluginContext): TooltipInstance {
      const text = getTooltipText(element);
      if (!text) {
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
      };

      const tooltipEl = document.createElement('div');
      tooltipEl.className = TOOLTIP_CLASS;
      tooltipEl.setAttribute('role', 'tooltip');
      tooltipEl.textContent = text;
      tooltipEl.setAttribute('hidden', '');

      const tooltipId = ensureId(tooltipEl, 'f7-tooltip');

      const originalTitle = element.getAttribute('title');
      if (originalTitle !== null) element.removeAttribute('title');

      addDescribedBy(element, tooltipId);
      document.body.append(tooltipEl);

      let isOpen = false;

      const reposition = () => {
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

      const show = () => {
        if (isOpen) return;
        isOpen = true;

        tooltipEl.removeAttribute('hidden');
        tooltipEl.setAttribute(OPENED_ATTR, '');

        queueMicrotask(() => {
          reposition();
        });
      };

      const hide = () => {
        if (!isOpen) return;
        isOpen = false;

        tooltipEl.removeAttribute(OPENED_ATTR);
        tooltipEl.removeAttribute(MEASURING_ATTR);
        tooltipEl.setAttribute('hidden', '');
      };

      const toggle = () => {
        if (isOpen) hide();
        else show();
      };

      context.on(element, 'pointerenter', () => {
        show();
      });
      context.on(element, 'pointerleave', () => {
        hide();
      });
      context.on(element, 'focusin', () => {
        show();
      });
      context.on(element, 'focusout', (event) => {
        const e = event as FocusEvent;
        const next = e.relatedTarget;
        if (next instanceof Node && element.contains(next)) return;
        hide();
      });

      context.on(document, 'keydown', (event) => {
        if (!isOpen) return;
        if (!options.closeOnEsc) return;

        const e = event as KeyboardEvent;
        if (e.key !== 'Escape') return;
        e.preventDefault();
        hide();
      });

      context.on(window, 'resize', () => {
        reposition();
      });
      context.on(window, 'scroll', () => {
        reposition();
      }, { passive: true, capture: true });

      return {
        show,
        hide,
        toggle,
        reposition,
        destroy() {
          hide();
          tooltipEl.remove();
          removeDescribedBy(element, tooltipId);
          if (originalTitle !== null) element.setAttribute('title', originalTitle);
        },
      };
    },
  });
}
