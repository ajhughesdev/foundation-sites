import { definePlugin } from '../types.js';
import type { FoundationPlugin, FoundationPluginInstance, PluginContext } from '../types.js';
import {
  ensureId,
  focusFirstFocusable,
  focusFirstMatch,
  getEventTargetElement,
  getFocusableElements,
  getStringAttribute,
  isHtmlElement,
  parseBooleanAttribute,
} from '../utils/dom.js';
import { lockScroll, unlockScroll } from '../utils/scrollLock.js';

export type OffCanvasOptions = {
  modal?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  lockScroll?: boolean;
  returnFocus?: boolean;
  initialFocus?: string;
  trapFocus?: boolean;
};

export type OffCanvasOpenedDetail = {
  id: string;
  opener: HTMLElement | null;
  element: Element;
};

export type OffCanvasClosedDetail = {
  id: string;
  opener: HTMLElement | null;
  element: Element;
};

export type OffCanvasInstance = FoundationPluginInstance & {
  open(opener?: HTMLElement | null): void;
  close(): void;
  toggle(opener?: HTMLElement | null): void;
};

const OPENED_ATTR = 'data-offcanvas-opened';
const OFFCANVAS_CLASS = 'f-offcanvas';
const BACKDROP_CLASS = 'f-offcanvas-backdrop';

function setExpanded(trigger: HTMLElement, expanded: boolean, controlsId: string): void {
  if (!trigger.hasAttribute('aria-controls')) trigger.setAttribute('aria-controls', controlsId);
  trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

export function offcanvas(defaultOptions: OffCanvasOptions = {}): FoundationPlugin {
  return definePlugin({
    name: 'offcanvas',
    selector: '[data-offcanvas]',
    mount(element: Element, context: PluginContext): OffCanvasInstance {
      const id = ensureId(element, 'f7-offcanvas');

      const options: Required<OffCanvasOptions> = {
        modal: parseBooleanAttribute(element, 'data-offcanvas-modal', defaultOptions.modal ?? true),
        closeOnBackdrop: parseBooleanAttribute(
          element,
          'data-offcanvas-close-on-backdrop',
          defaultOptions.closeOnBackdrop ?? true
        ),
        closeOnEsc: parseBooleanAttribute(element, 'data-offcanvas-close-on-esc', defaultOptions.closeOnEsc ?? true),
        lockScroll: parseBooleanAttribute(element, 'data-offcanvas-lock-scroll', defaultOptions.lockScroll ?? true),
        returnFocus: parseBooleanAttribute(element, 'data-offcanvas-return-focus', defaultOptions.returnFocus ?? true),
        initialFocus: getStringAttribute(element, 'data-offcanvas-initial-focus') ?? (defaultOptions.initialFocus ?? ''),
        trapFocus: parseBooleanAttribute(element, 'data-offcanvas-trap-focus', defaultOptions.trapFocus ?? true),
      };

      const dialog = element instanceof HTMLDialogElement ? element : null;
      const supportsInert = !dialog && element instanceof HTMLElement && 'inert' in HTMLElement.prototype;

      element.classList.add(OFFCANVAS_CLASS);

      if (!dialog) {
        if (!element.hasAttribute('role')) element.setAttribute('role', 'dialog');
        if (options.modal) element.setAttribute('aria-modal', 'true');
        else element.removeAttribute('aria-modal');
        element.setAttribute('aria-hidden', 'true');

        if (element instanceof HTMLElement && !element.hasAttribute('tabindex')) {
          element.tabIndex = -1;
        }
      } else {
        if (options.modal) dialog.setAttribute('aria-modal', 'true');
        else dialog.removeAttribute('aria-modal');
      }

      let opener: HTMLElement | null = null;
      let openerHasExpandedState = false;
      let isOpen = dialog ? dialog.open : element.hasAttribute(OPENED_ATTR);
      let backdrop: HTMLElement | null = null;

      const applyClosedState = () => {
        element.removeAttribute(OPENED_ATTR);

        if (dialog) {
          // dialog visibility is controlled by .open + showModal/close
          return;
        }

        element.setAttribute('aria-hidden', 'true');

        if (supportsInert) {
          (element as unknown as { inert: boolean }).inert = true;
          element.removeAttribute('hidden');
        } else {
          element.setAttribute('hidden', '');
        }
      };

      const applyOpenedState = () => {
        element.setAttribute(OPENED_ATTR, '');

        if (dialog) return;

        element.setAttribute('aria-hidden', 'false');

        if (supportsInert) {
          (element as unknown as { inert: boolean }).inert = false;
          element.removeAttribute('hidden');
        } else {
          element.removeAttribute('hidden');
        }
      };

      const createBackdrop = () => {
        if (!options.modal) return;
        if (dialog) return;
        if (backdrop) return;

        backdrop = document.createElement('div');
        backdrop.className = BACKDROP_CLASS;
        backdrop.setAttribute('data-offcanvas-backdrop-for', id);
        document.body.append(backdrop);

        if (options.closeOnBackdrop) {
          backdrop.addEventListener('click', (event) => {
            if (event.target !== backdrop) return;
            close();
          });
        }
      };

      const emitOpened = () => {
        context.emit(element, 'foundation:offcanvas:opened', { id, opener, element } satisfies OffCanvasOpenedDetail);
      };

      const emitClosed = () => {
        context.emit(element, 'foundation:offcanvas:closed', { id, opener, element } satisfies OffCanvasClosedDetail);
      };

      const finalizeClose = () => {
        if (!isOpen) return;
        isOpen = false;

        if (backdrop) {
          backdrop.remove();
          backdrop = null;
        }

        applyClosedState();

        if (options.lockScroll && options.modal) {
          unlockScroll();
        }

        if (opener?.isConnected && openerHasExpandedState) {
          setExpanded(opener, false, id);
        }

        const focusTarget = opener;
        opener = null;
        openerHasExpandedState = false;

        if (options.returnFocus && focusTarget?.isConnected) {
          try {
            focusTarget.focus();
          } catch {
            // ignore
          }
        }

        emitClosed();
      };

      const focusInitial = () => {
        if (options.initialFocus && focusFirstMatch(element, options.initialFocus)) return;
        focusFirstFocusable(element);
      };

      const open = (nextOpener: HTMLElement | null = null) => {
        if (isOpen) return;

        opener = nextOpener ?? (isHtmlElement(document.activeElement) ? document.activeElement : null);
        openerHasExpandedState =
          opener?.getAttribute('data-offcanvas-open') === id || opener?.getAttribute('data-offcanvas-toggle') === id;

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
          applyOpenedState();
          if (options.modal) createBackdrop();
          didOpen = true;
        }

        if (!didOpen) {
          opener = null;
          openerHasExpandedState = false;
          return;
        }

        applyOpenedState();
        isOpen = true;

        if (options.lockScroll && options.modal) {
          lockScroll();
        }

        if (opener && openerHasExpandedState) setExpanded(opener, true, id);

        queueMicrotask(() => {
          focusInitial();
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

      const trapTabKey = (event: KeyboardEvent) => {
        if (!isOpen) return;
        if (dialog) return;
        if (!options.modal) return;
        if (!options.trapFocus) return;

        if (event.key !== 'Tab') return;

        const focusables = getFocusableElements(element);
        if (focusables.length === 0) {
          event.preventDefault();
          if (element instanceof HTMLElement) element.focus();
          return;
        }

        const active = document.activeElement;
        const activeEl = active instanceof HTMLElement ? active : null;

        const currentIndex = activeEl ? focusables.indexOf(activeEl) : -1;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey) {
          if (!activeEl || currentIndex === -1 || activeEl === first) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (!activeEl || currentIndex === -1 || activeEl === last) {
            event.preventDefault();
            first.focus();
          }
        }
      };

      if (isOpen && options.lockScroll && options.modal) {
        lockScroll();
      }

      if (isOpen) {
        applyOpenedState();
        if (options.modal) createBackdrop();
      } else {
        applyClosedState();
      }

      context.on(element, 'foundation:offcanvas:open', (e) => {
        const target = getEventTargetElement(e);
        if (target !== element) return;
        open(isHtmlElement(document.activeElement) ? document.activeElement : null);
      });
      context.on(element, 'foundation:offcanvas:close', (e) => {
        const target = getEventTargetElement(e);
        if (target !== element) return;
        close();
      });
      context.on(element, 'foundation:offcanvas:toggle', (e) => {
        const target = getEventTargetElement(e);
        if (target !== element) return;
        toggle(isHtmlElement(document.activeElement) ? document.activeElement : null);
      });

      context.on(document, 'keydown', (event) => {
        if (!isOpen) return;

        const e = event as KeyboardEvent;
        trapTabKey(e);

        if (!options.closeOnEsc) return;
        if (e.key !== 'Escape') return;
        e.preventDefault();
        close();
      });

      context.on(document, 'focusin', (event) => {
        if (!isOpen) return;
        if (dialog) return;
        if (!options.modal) return;
        if (!options.trapFocus) return;

        const target = getEventTargetElement(event);
        if (!target) return;
        if (element.contains(target)) return;
        if (backdrop && backdrop.contains(target)) return;

        queueMicrotask(() => {
          focusInitial();
        });
      });

      context.on(document, 'click', (event) => {
        const target = getEventTargetElement(event);
        if (!target) return;

        const openTrigger = target.closest('[data-offcanvas-open]');
        if (openTrigger) {
          const openId = openTrigger.getAttribute('data-offcanvas-open');
          if (openId === id) {
            event.preventDefault();
            open(isHtmlElement(openTrigger) ? openTrigger : null);
          }
          return;
        }

        const toggleTrigger = target.closest('[data-offcanvas-toggle]');
        if (toggleTrigger) {
          const toggleId = toggleTrigger.getAttribute('data-offcanvas-toggle');
          if (toggleId === id) {
            event.preventDefault();
            toggle(isHtmlElement(toggleTrigger) ? toggleTrigger : null);
          }
          return;
        }

        const closeTrigger = target.closest('[data-offcanvas-close]');
        if (!closeTrigger) return;

        const closeId = closeTrigger.getAttribute('data-offcanvas-close');
        const isInside = element.contains(closeTrigger);
        const matches = closeId === null || closeId === '' || closeId === id;
        if (isInside || matches) {
          event.preventDefault();
          close();
        }
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
          if (!options.modal) return;
          if (!dialog.open) return;
          if (event.target !== dialog) return;

          const e = event as MouseEvent;
          const rect = dialog.getBoundingClientRect();
          const clickedOutside =
            e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
          if (clickedOutside) close();
        });
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

