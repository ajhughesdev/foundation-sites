import { definePlugin } from '../types.js';
import type { FoundationPlugin, FoundationPluginInstance, PluginContext } from '../types.js';
import {
  ensureId,
  getEventTargetElement,
  getStringAttribute,
  parseBooleanAttribute,
  parseNumberAttribute,
} from '../utils/dom.js';

export type ToastVariant = 'info' | 'success' | 'warning' | 'danger';
export type ToastRole = 'status' | 'alert';

export type ToastOptions = {
  timeout?: number;
  max?: number;
  dismissible?: boolean;
};

export type ToastShowDetail = {
  message: string;
  variant?: ToastVariant;
  timeout?: number;
  dismissible?: boolean;
  role?: ToastRole;
  id?: string;
};

export type ToastShownDetail = {
  id: string;
  element: Element;
  toast: HTMLElement;
};

export type ToastHiddenDetail = {
  id: string;
  element: Element;
  toast: HTMLElement;
  reason: 'dismiss' | 'timeout' | 'clear' | 'api';
};

export type ToastInstance = FoundationPluginInstance & {
  show(detail: ToastShowDetail): string;
  dismiss(toastId: string): void;
  clear(): void;
};

const REGION_CLASS = 'f-toast-region';
const TOAST_CLASS = 'f-toast';
const LEAVING_ATTR = 'data-toast-leaving';

function normalizeVariant(value: string | undefined): ToastVariant {
  const raw = (value ?? '').trim().toLowerCase();
  if (raw === 'success' || raw === 'warning' || raw === 'danger') return raw;
  return 'info';
}

function normalizeRole(value: string | undefined, variant: ToastVariant): ToastRole {
  const raw = (value ?? '').trim().toLowerCase();
  if (raw === 'alert' || raw === 'status') return raw;
  if (variant === 'danger') return 'alert';
  return 'status';
}

function makeToastId(): string {
  const fallback = () => `f7-toast-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
  return 'randomUUID' in crypto ? `f7-toast-${crypto.randomUUID()}` : fallback();
}

export function toast(defaultOptions: ToastOptions = {}): FoundationPlugin {
  return definePlugin({
    name: 'toast',
    selector: '[data-toast]',
    mount(element: Element, context: PluginContext): ToastInstance {
      if (!(element instanceof HTMLElement)) {
        return {
          show() {
            return '';
          },
          dismiss() {},
          clear() {},
        };
      }

      const region = element;
      const regionId = ensureId(region, 'f7-toast-region');

      const options: Required<ToastOptions> = {
        timeout: parseNumberAttribute(region, 'data-toast-timeout', defaultOptions.timeout ?? 5_000),
        max: parseNumberAttribute(region, 'data-toast-max', defaultOptions.max ?? 5),
        dismissible: parseBooleanAttribute(region, 'data-toast-dismissible', defaultOptions.dismissible ?? true),
      };

      region.classList.add(REGION_CLASS);

      const timers = new Map<string, number>();
      const toastById = new Map<string, HTMLElement>();

      const prefersTop = () => {
        const pos = getStringAttribute(region, 'data-toast-position') ?? '';
        return pos.trim().toLowerCase().startsWith('top');
      };

      const emitShown = (toastEl: HTMLElement, toastId: string) => {
        context.emit(
          region,
          'foundation:toast:shown',
          { id: toastId, element: region, toast: toastEl } satisfies ToastShownDetail
        );
      };

      const emitHidden = (toastEl: HTMLElement, toastId: string, reason: ToastHiddenDetail['reason']) => {
        context.emit(
          region,
          'foundation:toast:hidden',
          { id: toastId, element: region, toast: toastEl, reason } satisfies ToastHiddenDetail
        );
      };

      const removeToast = (toastId: string, reason: ToastHiddenDetail['reason']) => {
        const toastEl = toastById.get(toastId);
        if (!toastEl) return;

        const timer = timers.get(toastId);
        if (timer) {
          window.clearTimeout(timer);
          timers.delete(toastId);
        }

        toastById.delete(toastId);
        toastEl.setAttribute(LEAVING_ATTR, '');

        window.setTimeout(() => {
          toastEl.remove();
          emitHidden(toastEl, toastId, reason);
        }, 220);
      };

      const trimToMax = () => {
        const max = Math.max(0, Math.floor(options.max));
        if (max === 0) {
          clear();
          return;
        }

        while (toastById.size > max) {
          const toastEl = prefersTop() ? region.lastElementChild : region.firstElementChild;
          if (!toastEl || !(toastEl instanceof HTMLElement)) break;
          const toastId = toastEl.getAttribute('data-toast-id');
          if (!toastId) {
            toastEl.remove();
            continue;
          }
          removeToast(toastId, 'clear');
        }
      };

      const show = (detail: ToastShowDetail): string => {
        const message = (detail.message ?? '').trim();
        if (!message) return '';

        const variant = normalizeVariant(detail.variant);
        const role = normalizeRole(detail.role, variant);
        const dismissible = detail.dismissible ?? options.dismissible;
        const timeout = Number.isFinite(detail.timeout) ? (detail.timeout as number) : options.timeout;
        const toastId = (detail.id ?? '').trim() || makeToastId();

        if (toastById.has(toastId)) {
          removeToast(toastId, 'clear');
        }

        const toastEl = document.createElement('div');
        toastEl.className = TOAST_CLASS;
        toastEl.setAttribute('data-toast-item', '');
        toastEl.setAttribute('data-toast-id', toastId);
        toastEl.setAttribute('data-toast-variant', variant);
        toastEl.setAttribute('data-toast-opened', '');
        toastEl.setAttribute('role', role);
        toastEl.setAttribute('aria-atomic', 'true');

        const body = document.createElement('div');
        body.className = 'f-toast__body';
        body.textContent = message;
        toastEl.append(body);

        if (dismissible) {
          const dismissButton = document.createElement('button');
          dismissButton.type = 'button';
          dismissButton.className = 'f-toast__dismiss';
          dismissButton.setAttribute('data-toast-dismiss', '');
          dismissButton.textContent = 'Dismiss';
          dismissButton.addEventListener('click', () => removeToast(toastId, 'dismiss'));
          toastEl.append(dismissButton);
        }

        toastById.set(toastId, toastEl);

        if (prefersTop()) region.prepend(toastEl);
        else region.append(toastEl);

        trimToMax();

        if (timeout > 0) {
          const timer = window.setTimeout(() => removeToast(toastId, 'timeout'), timeout);
          timers.set(toastId, timer);
        }

        emitShown(toastEl, toastId);
        return toastId;
      };

      const dismiss = (toastId: string) => {
        const id = toastId.trim();
        if (!id) return;
        removeToast(id, 'api');
      };

      const clear = () => {
        for (const [toastId] of toastById) {
          removeToast(toastId, 'clear');
        }
      };

      context.on(region, 'foundation:toast:show', (event) => {
        const target = getEventTargetElement(event);
        if (target !== region) return;
        const e = event as CustomEvent<ToastShowDetail>;
        if (!e.detail) return;
        show(e.detail);
      });

      context.on(region, 'foundation:toast:dismiss', (event) => {
        const target = getEventTargetElement(event);
        if (target !== region) return;
        const e = event as CustomEvent<{ id?: string }>;
        const toastId = (e.detail?.id ?? '').trim();
        if (!toastId) return;
        dismiss(toastId);
      });

      context.on(region, 'foundation:toast:clear', (event) => {
        const target = getEventTargetElement(event);
        if (target !== region) return;
        clear();
      });

      context.on(document, 'click', (event) => {
        const target = getEventTargetElement(event);
        if (!target) return;

        const showTrigger = target.closest('[data-toast-show]');
        if (!showTrigger) return;
        const showId = (showTrigger.getAttribute('data-toast-show') ?? '').trim();
        if (showId !== regionId) return;

        event.preventDefault();

        const message =
          getStringAttribute(showTrigger, 'data-toast-message') ??
          getStringAttribute(showTrigger, 'data-toast-text') ??
          (showTrigger.textContent ? showTrigger.textContent.trim() : '');

        const triggerVariant = normalizeVariant(getStringAttribute(showTrigger, 'data-toast-variant'));

        show({
          message,
          variant: triggerVariant,
          timeout: parseNumberAttribute(showTrigger, 'data-toast-timeout', options.timeout),
          dismissible: parseBooleanAttribute(showTrigger, 'data-toast-dismissible', options.dismissible),
          role: normalizeRole(getStringAttribute(showTrigger, 'data-toast-role'), triggerVariant),
        });
      });

      return {
        show,
        dismiss,
        clear,
        destroy() {
          clear();
        },
      };
    },
  });
}
