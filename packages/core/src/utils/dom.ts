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

export function getStringAttribute(element: Element, attr: string): string | undefined {
  const value = element.getAttribute(attr);
  return value && value.trim().length ? value.trim() : undefined;
}

export function isHtmlElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement;
}

export function focusFirstMatch(root: Element, selector: string): boolean {
  const el = root.querySelector(selector);
  if (!isHtmlElement(el)) return false;
  el.focus();
  return true;
}

export function focusFirstFocusable(root: Element): void {
  const selector =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  if (focusFirstMatch(root, selector)) return;
  if (root instanceof HTMLElement) root.focus();
}

export function getEventTargetElement(event: Event): Element | null {
  const target = event.target;
  return target instanceof Element ? target : null;
}

