type InertState = {
  count: number;
  previous: boolean;
};

const inertStateByElement = new WeakMap<HTMLElement, InertState>();

function supportsInert(): boolean {
  return 'inert' in HTMLElement.prototype;
}

function retainInert(element: HTMLElement): void {
  const current = inertStateByElement.get(element);
  if (current) {
    current.count += 1;
    inertStateByElement.set(element, current);
    (element as unknown as { inert: boolean }).inert = true;
    return;
  }

  inertStateByElement.set(element, { count: 1, previous: (element as unknown as { inert: boolean }).inert });
  (element as unknown as { inert: boolean }).inert = true;
}

function releaseInert(element: HTMLElement): void {
  const current = inertStateByElement.get(element);
  if (!current) return;

  current.count -= 1;
  if (current.count > 0) {
    inertStateByElement.set(element, current);
    return;
  }

  (element as unknown as { inert: boolean }).inert = current.previous;
  inertStateByElement.delete(element);
}

export type InertOutside = {
  activate(): void;
  deactivate(): void;
};

export type InertOutsideOptions = {
  root: Element;
  allowElement?(element: HTMLElement): boolean;
};

export function createInertOutside(options: InertOutsideOptions): InertOutside {
  const { root } = options;

  let activeTargets: HTMLElement[] | null = null;

  const activate = () => {
    if (!supportsInert()) return;
    if (activeTargets) return;
    if (!(root instanceof Element)) return;

    const targets: HTMLElement[] = [];
    const body = document.body;
    if (!body) return;

    for (const child of Array.from(body.children)) {
      if (!(child instanceof HTMLElement)) continue;
      if (child === root) continue;
      if (child.contains(root)) continue;
      if (root.contains(child)) continue;
      if (options.allowElement?.(child)) continue;
      retainInert(child);
      targets.push(child);
    }

    activeTargets = targets;
  };

  const deactivate = () => {
    if (!activeTargets) return;
    for (const target of activeTargets) {
      releaseInert(target);
    }
    activeTargets = null;
  };

  return { activate, deactivate };
}

