import { focusFirstFocusable, getEventTargetElement, getFocusableElements } from './dom.js';

export type FocusTrap = {
  handleKeydown(event: KeyboardEvent): void;
  handleFocusin(event: FocusEvent): void;
};

export type FocusTrapOptions = {
  root: Element;
  isActive(): boolean;
  allowOutside?(target: Element): boolean;
  focusFallback?(): void;
};

export function createFocusTrap(options: FocusTrapOptions): FocusTrap {
  const { root } = options;

  const focusFallback = () => {
    if (options.focusFallback) {
      options.focusFallback();
      return;
    }
    focusFirstFocusable(root);
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (!options.isActive()) return;
    if (event.key !== 'Tab') return;

    const focusables = getFocusableElements(root);
    if (focusables.length === 0) {
      event.preventDefault();
      if (root instanceof HTMLElement) root.focus();
      return;
    }

    const active = document.activeElement;
    const activeEl = active instanceof HTMLElement ? active : null;

    const currentIndex = activeEl ? focusables.indexOf(activeEl) : -1;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey) {
      if (!activeEl || currentIndex <= 0) {
        event.preventDefault();
        last.focus();
      }
      return;
    }

    if (!activeEl || currentIndex === -1 || currentIndex === focusables.length - 1) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleFocusin = (event: FocusEvent) => {
    if (!options.isActive()) return;

    const target = getEventTargetElement(event);
    if (!target) return;
    if (root.contains(target)) return;
    if (options.allowOutside?.(target)) return;

    queueMicrotask(() => {
      focusFallback();
    });
  };

  return { handleKeydown, handleFocusin };
}

