export function ensureId(element: Element, prefix: string): string {
  if (element.id) return element.id;

  const fallback = () =>
    `${prefix}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
  const id = 'randomUUID' in crypto ? `${prefix}-${crypto.randomUUID()}` : fallback();
  element.id = id;
  return id;
}

export function parseBooleanAttribute(element: Element, attr: string, defaultValue: boolean): boolean {
  if (!element.hasAttribute(attr)) return defaultValue;
  const raw = element.getAttribute(attr);
  if (raw === null || raw === '') return true;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false;
  return true;
}

export function parseNumberAttribute(element: Element, attr: string, defaultValue: number): number {
  const raw = element.getAttribute(attr);
  if (raw === null || raw.trim() === '') return defaultValue;
  const value = Number(raw);
  return Number.isFinite(value) ? value : defaultValue;
}

export function getStringAttribute(element: Element, attr: string): string | undefined {
  const value = element.getAttribute(attr);
  return value && value.trim().length ? value.trim() : undefined;
}

export function isHtmlElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function getFocusableElements(root: Element): HTMLElement[] {
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isHtmlElement);
}

export function focusFirstMatch(root: Element, selector: string): boolean {
  const el = root.querySelector(selector);
  if (!isHtmlElement(el)) return false;
  el.focus();
  return true;
}

export function focusFirstFocusable(root: Element): void {
  const focusables = getFocusableElements(root);
  if (focusables.length > 0) {
    focusables[0].focus();
    return;
  }
  if (root instanceof HTMLElement) root.focus();
}

export function focusLastFocusable(root: Element): void {
  const focusables = getFocusableElements(root);
  if (focusables.length > 0) {
    focusables[focusables.length - 1].focus();
    return;
  }
  if (root instanceof HTMLElement) root.focus();
}

export function isTextInputLike(element: Element | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.isContentEditable) return true;

  if (element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLSelectElement) return true;

  if (element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();
    const nonText = new Set(['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'color', 'file']);
    return !nonText.has(type);
  }

  return false;
}

export function getEventTargetElement(event: Event): Element | null {
  const target = event.target;
  return target instanceof Element ? target : null;
}
