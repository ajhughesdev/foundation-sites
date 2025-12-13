import { definePlugin } from '../types.js';
import type { FoundationPlugin, FoundationPluginInstance, PluginContext } from '../types.js';
import {
  ensureId,
  focusFirstFocusable,
  focusFirstMatch,
  getEventTargetElement,
  getStringAttribute,
  isHtmlElement,
  parseBooleanAttribute,
} from '../utils/dom.js';
import { lockScroll, unlockScroll } from '../utils/scrollLock.js';

export type RevealOptions = {
  modal?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  lockScroll?: boolean;
  returnFocus?: boolean;
  initialFocus?: string;
};

export type RevealOpenedDetail = {
  id: string;
  opener: HTMLElement | null;
  element: Element;
};

export type RevealClosedDetail = {
  id: string;
  opener: HTMLElement | null;
  element: Element;
};

export type RevealInstance = FoundationPluginInstance & {
  open(opener?: HTMLElement | null): void;
  close(): void;
  toggle(opener?: HTMLElement | null): void;
};

const OPENED_ATTR = 'data-reveal-opened';
const REVEAL_CLASS = 'f-reveal';
const BACKDROP_CLASS = 'f-reveal-backdrop';

export function reveal(defaultOptions: RevealOptions = {}): FoundationPlugin {
  return definePlugin({
    name: 'reveal',
    selector: '[data-reveal]',
    mount(element: Element, context: PluginContext): RevealInstance {
      const id = ensureId(element, 'f7-reveal');

      const options: Required<RevealOptions> = {
        modal: parseBooleanAttribute(element, 'data-reveal-modal', defaultOptions.modal ?? true),
        closeOnBackdrop: parseBooleanAttribute(
          element,
          'data-reveal-close-on-backdrop',
          defaultOptions.closeOnBackdrop ?? true
        ),
        closeOnEsc: parseBooleanAttribute(element, 'data-reveal-close-on-esc', defaultOptions.closeOnEsc ?? true),
        lockScroll: parseBooleanAttribute(element, 'data-reveal-lock-scroll', defaultOptions.lockScroll ?? true),
        returnFocus: parseBooleanAttribute(element, 'data-reveal-return-focus', defaultOptions.returnFocus ?? true),
        initialFocus: getStringAttribute(element, 'data-reveal-initial-focus') ?? (defaultOptions.initialFocus ?? ''),
      };

      const dialog = element instanceof HTMLDialogElement ? element : null;

      let opener: HTMLElement | null = null;
      let isOpen = dialog ? dialog.open : element.hasAttribute(OPENED_ATTR);
      let backdrop: HTMLElement | null = null;

      if (isOpen && options.lockScroll && options.modal) {
        lockScroll();
      }

      if (dialog) {
        element.classList.add(REVEAL_CLASS);
        if (options.modal) dialog.setAttribute('aria-modal', 'true');
        else dialog.removeAttribute('aria-modal');
      } else {
        element.classList.add(REVEAL_CLASS);
        if (!element.hasAttribute('role')) element.setAttribute('role', 'dialog');
        if (options.modal) element.setAttribute('aria-modal', 'true');
        else element.removeAttribute('aria-modal');
        element.setAttribute('aria-hidden', isOpen ? 'false' : 'true');

        if (element instanceof HTMLElement && !element.hasAttribute('tabindex')) {
          element.tabIndex = -1;
        }

        if (isOpen) {
          element.setAttribute(OPENED_ATTR, '');
          element.removeAttribute('hidden');
        } else {
          element.removeAttribute(OPENED_ATTR);
          element.setAttribute('hidden', '');
        }
      }

      if (dialog) {
        if (isOpen) element.setAttribute(OPENED_ATTR, '');
        else element.removeAttribute(OPENED_ATTR);
      }

      const createBackdrop = () => {
        if (!options.modal) return;
        if (dialog) return;
        if (backdrop) return;

        backdrop = document.createElement('div');
        backdrop.className = BACKDROP_CLASS;
        backdrop.setAttribute('data-reveal-backdrop-for', id);
        document.body.append(backdrop);

        if (options.closeOnBackdrop) {
          backdrop.addEventListener('click', (event) => {
            if (event.target !== backdrop) return;
            close();
          });
        }
      };

      const emitOpened = () => {
        context.emit(element, 'foundation:reveal:opened', { id, opener, element } satisfies RevealOpenedDetail);
      };

      const emitClosed = () => {
        context.emit(element, 'foundation:reveal:closed', { id, opener, element } satisfies RevealClosedDetail);
      };

      const finalizeClose = () => {
        if (!isOpen) return;
        isOpen = false;

        if (backdrop) {
          backdrop.remove();
          backdrop = null;
        }

        element.removeAttribute(OPENED_ATTR);

        if (!dialog) {
          element.setAttribute('aria-hidden', 'true');
          element.setAttribute('hidden', '');
        }

        if (options.lockScroll && options.modal) {
          unlockScroll();
        }

        const focusTarget = opener;
        opener = null;

        if (options.returnFocus && focusTarget?.isConnected) {
          try {
            focusTarget.focus();
          } catch {
            // ignore
          }
        }

        emitClosed();
      };

      const open = (nextOpener: HTMLElement | null = null) => {
        if (isOpen) return;

        opener = nextOpener ?? (isHtmlElement(document.activeElement) ? document.activeElement : null);

        let didOpen = false;
        if (dialog) {
          try {
            if (options.modal) dialog.showModal();
            else dialog.show();
            didOpen = true;
          } catch {
            try {
              dialog.show();
              didOpen = true;
            } catch {
              // ignore
            }
          }
        } else {
          element.setAttribute(OPENED_ATTR, '');
          element.setAttribute('aria-hidden', 'false');
          element.removeAttribute('hidden');

          if (options.modal) {
            createBackdrop();
          }

          didOpen = true;
        }

        if (!didOpen) {
          opener = null;
          return;
        }

        element.setAttribute(OPENED_ATTR, '');

        isOpen = true;
        if (options.lockScroll && options.modal) {
          lockScroll();
        }

        queueMicrotask(() => {
          if (options.initialFocus && focusFirstMatch(element, options.initialFocus)) return;
          focusFirstFocusable(element);
        });

        emitOpened();
      };

      const close = () => {
        if (!isOpen) return;

        if (dialog && dialog.open) {
          try {
            dialog.close();
          } catch {
            // ignore
          }
        }

        finalizeClose();
      };

      const toggle = (nextOpener: HTMLElement | null = null) => {
        if (isOpen) close();
        else open(nextOpener);
      };

      context.on(element, 'foundation:reveal:open', (e) => {
        const target = getEventTargetElement(e);
        if (target !== element) return;
        open(isHtmlElement(document.activeElement) ? document.activeElement : null);
      });
      context.on(element, 'foundation:reveal:close', (e) => {
        const target = getEventTargetElement(e);
        if (target !== element) return;
        close();
      });
      context.on(element, 'foundation:reveal:toggle', (e) => {
        const target = getEventTargetElement(e);
        if (target !== element) return;
        toggle(isHtmlElement(document.activeElement) ? document.activeElement : null);
      });

      context.on(document, 'click', (event) => {
        const target = getEventTargetElement(event);
        if (!target) return;

        const openTrigger = target.closest('[data-reveal-open]');
        if (openTrigger) {
          const openId = openTrigger.getAttribute('data-reveal-open');
          if (openId === id) {
            event.preventDefault();
            open(isHtmlElement(openTrigger) ? openTrigger : null);
          }
          return;
        }

        const toggleTrigger = target.closest('[data-reveal-toggle]');
        if (toggleTrigger) {
          const toggleId = toggleTrigger.getAttribute('data-reveal-toggle');
          if (toggleId === id) {
            event.preventDefault();
            toggle(isHtmlElement(toggleTrigger) ? toggleTrigger : null);
          }
          return;
        }

        const closeTrigger = target.closest('[data-reveal-close]');
        if (!closeTrigger) return;

        const closeId = closeTrigger.getAttribute('data-reveal-close');
        const isInside = element.contains(closeTrigger);
        const matches = closeId === null || closeId === '' || closeId === id;
        if (isInside || matches) {
          event.preventDefault();
          close();
        }
      });

      context.on(document, 'keydown', (event) => {
        if (!isOpen) return;
        if (dialog) return;
        if (!options.closeOnEsc) return;

        const e = event as KeyboardEvent;
        if (e.key !== 'Escape') return;
        e.preventDefault();
        close();
      });

      if (dialog) {
        context.on(dialog, 'cancel', (event) => {
          if (options.closeOnEsc) return;
          event.preventDefault();
        });

        context.on(dialog, 'close', () => {
          finalizeClose();
        });

        context.on(dialog, 'click', (event) => {
          if (!options.closeOnBackdrop) return;
          if (!dialog.open) return;
          if (event.target !== dialog) return;

          const e = event as MouseEvent;
          const rect = dialog.getBoundingClientRect();
          const clickedOutside =
            e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
          if (clickedOutside) close();
        });
      }

      if (!dialog && isOpen && options.modal) {
        createBackdrop();
      }

      return {
        open,
        close,
        toggle,
        destroy() {
          close();
        },
      };
    },
  });
}
