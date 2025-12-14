import { definePlugin } from '@foundation/core';
import type { FoundationPlugin, FoundationPluginInstance, PluginContext } from '@foundation/core';
import { ensureId, getEventTargetElement, parseBooleanAttribute } from '@foundation/core/utils/dom.js';

export type AccordionOptions = {
  multi?: boolean;
  allowAllClosed?: boolean;
  keyboard?: boolean;
};

export type AccordionOpenedDetail = {
  id: string;
  item: HTMLDetailsElement;
  summary: HTMLElement;
  panel: HTMLElement;
};

export type AccordionClosedDetail = {
  id: string;
  item: HTMLDetailsElement;
  summary: HTMLElement;
  panel: HTMLElement;
};

export type AccordionCommandDetail =
  | { id: string; index?: never }
  | { index: number; id?: never }
  | { id?: undefined; index?: undefined };

export type AccordionInstance = FoundationPluginInstance & {
  open(target?: AccordionCommandDetail): void;
  close(target?: AccordionCommandDetail): void;
  toggle(target?: AccordionCommandDetail): void;
  openIndex(index: number): void;
  closeAll(): void;
};

const ROOT_CLASS = 'f-accordion';
const ITEM_CLASS = 'f-accordion-item';
const SUMMARY_CLASS = 'f-accordion-summary';
const PANEL_CLASS = 'f-accordion-panel';

function isSummary(el: Element | null): el is HTMLElement {
  return el instanceof HTMLElement && el.tagName === 'SUMMARY';
}

function isDisabled(item: HTMLDetailsElement, summary: HTMLElement): boolean {
  if (item.hasAttribute('data-accordion-disabled')) return true;
  if (summary.getAttribute('aria-disabled') === 'true') return true;
  return false;
}

function enabledItems(items: Array<{ item: HTMLDetailsElement; summary: HTMLElement; panel: HTMLElement }>) {
  return items.filter(({ item, summary }) => !isDisabled(item, summary));
}

function resolveIndex(
  items: Array<{ item: HTMLDetailsElement; summary: HTMLElement; panel: HTMLElement }>,
  target?: AccordionCommandDetail
): number {
  if (!target) return 0;
  if ('index' in target && typeof target.index === 'number') return target.index;
  if ('id' in target && typeof target.id === 'string') {
    const id = target.id.startsWith('#') ? target.id.slice(1) : target.id;
    const idx = items.findIndex((d) => d.item.id === id || d.panel.id === id);
    return idx >= 0 ? idx : 0;
  }
  return 0;
}

function focusSummary(summary: HTMLElement): void {
  try {
    summary.focus();
  } catch {
    // ignore
  }
}

export function accordion(defaultOptions: AccordionOptions = {}): FoundationPlugin {
  return definePlugin({
    name: 'accordion',
    selector: '[data-accordion]',
    mount(element: Element, context: PluginContext): AccordionInstance {
      if (!(element instanceof HTMLElement)) {
        return {
          open() {},
          close() {},
          toggle() {},
          openIndex() {},
          closeAll() {},
        };
      }

      const root = element;
      root.classList.add(ROOT_CLASS);

      const options: Required<AccordionOptions> = {
        multi: parseBooleanAttribute(root, 'data-accordion-multi', defaultOptions.multi ?? false),
        allowAllClosed: parseBooleanAttribute(root, 'data-accordion-allow-all-closed', defaultOptions.allowAllClosed ?? true),
        keyboard: parseBooleanAttribute(root, 'data-accordion-keyboard', defaultOptions.keyboard ?? true),
      };

      const detailsItems = Array.from(root.querySelectorAll<HTMLDetailsElement>('details[data-accordion-item]')).filter(
        (item) => item.closest('[data-accordion]') === root
      );

      const items: Array<{ item: HTMLDetailsElement; summary: HTMLElement; panel: HTMLElement }> = [];

      for (const item of detailsItems) {
        item.classList.add(ITEM_CLASS);
        ensureId(item, 'f7-accordion-item');

        const summary = item.querySelector(':scope > summary');
        if (!isSummary(summary)) continue;
        summary.classList.add(SUMMARY_CLASS);
        ensureId(summary, 'f7-accordion-summary');

        let panelEl = item.querySelector<HTMLElement>(':scope > [data-accordion-panel]');
        if (!panelEl) {
          panelEl = document.createElement('div');
          panelEl.setAttribute('data-accordion-panel', '');
        }

        const nodesToMove = Array.from(item.childNodes).filter((node) => node !== summary && node !== panelEl);
        for (const node of nodesToMove) {
          panelEl.append(node);
        }

        if (summary.parentElement !== item) item.prepend(summary);
        if (panelEl.parentElement !== item) item.append(panelEl);
        if (item.firstElementChild !== summary) item.prepend(summary);
        if (panelEl.previousElementSibling !== summary) item.append(panelEl);

        panelEl.classList.add(PANEL_CLASS);
        panelEl.setAttribute('data-accordion-panel', '');
        ensureId(panelEl, 'f7-accordion-panel');

        summary.setAttribute('aria-controls', panelEl.id);
        summary.setAttribute('aria-expanded', item.open ? 'true' : 'false');

        panelEl.setAttribute('role', 'region');
        panelEl.setAttribute('aria-labelledby', summary.id);

        items.push({ item, summary, panel: panelEl });
      }

      const enforceInitialState = () => {
        if (items.length === 0) return;

        if (!options.multi) {
          let found = false;
          for (const { item } of items) {
            if (!item.open) continue;
            if (!found) {
              found = true;
              continue;
            }
            item.open = false;
          }
        }

        const anyOpen = items.some(({ item }) => item.open);
        if (!options.allowAllClosed && !anyOpen) {
          const first = enabledItems(items)[0] ?? items[0];
          first.item.open = true;
        }
      };

      const syncAria = () => {
        for (const { item, summary } of items) {
          summary.setAttribute('aria-expanded', item.open ? 'true' : 'false');
        }
      };

      enforceInitialState();
      syncAria();

      const emitOpened = (data: { item: HTMLDetailsElement; summary: HTMLElement; panel: HTMLElement }) => {
        context.emit(root, 'foundation:accordion:opened', {
          id: data.item.id,
          item: data.item,
          summary: data.summary,
          panel: data.panel,
        } satisfies AccordionOpenedDetail);
      };

      const emitClosed = (data: { item: HTMLDetailsElement; summary: HTMLElement; panel: HTMLElement }) => {
        context.emit(root, 'foundation:accordion:closed', {
          id: data.item.id,
          item: data.item,
          summary: data.summary,
          panel: data.panel,
        } satisfies AccordionClosedDetail);
      };

      let isSyncing = false;

      const closeOthers = (openedItem: HTMLDetailsElement) => {
        if (options.multi) return;
        isSyncing = true;
        try {
          for (const { item } of items) {
            if (item === openedItem) continue;
            if (!item.open) continue;
            item.open = false;
          }
        } finally {
          isSyncing = false;
        }
      };

      const ensureOneOpen = (closedItem: HTMLDetailsElement) => {
        if (options.allowAllClosed) return;
        if (items.some(({ item }) => item.open)) return;

        const reopened = items.find(({ item }) => item === closedItem) ?? enabledItems(items)[0] ?? items[0];
        isSyncing = true;
        try {
          reopened.item.open = true;
        } finally {
          isSyncing = false;
        }
      };

      for (const data of items) {
        context.on(data.item, 'toggle', () => {
          if (isSyncing) {
            syncAria();
            return;
          }

          if (data.item.open) {
            closeOthers(data.item);
            syncAria();
            emitOpened(data);
          } else {
            ensureOneOpen(data.item);
            syncAria();
            if (!data.item.open) emitClosed(data);
          }
        });
      }

      context.on(root, 'keydown', (event) => {
        if (!options.keyboard) return;

        const e = event as KeyboardEvent;
        const target = getEventTargetElement(event);
        if (!target) return;

        const summary = target.closest('summary');
        if (!isSummary(summary)) return;
        const currentIndex = items.findIndex((d) => d.summary === summary);
        if (currentIndex < 0) return;

        const enabled = enabledItems(items);
        if (enabled.length === 0) return;

        const enabledIndex = enabled.findIndex((d) => d.summary === summary);
        if (enabledIndex < 0) return;

        const focusEnabledAt = (idx: number) => {
          const resolved = ((idx % enabled.length) + enabled.length) % enabled.length;
          const next = enabled[resolved];
          if (!next) return;
          focusSummary(next.summary);
        };

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            focusEnabledAt(enabledIndex + 1);
            break;
          case 'ArrowUp':
            e.preventDefault();
            focusEnabledAt(enabledIndex - 1);
            break;
          case 'Home':
            e.preventDefault();
            focusEnabledAt(0);
            break;
          case 'End':
            e.preventDefault();
            focusEnabledAt(-1);
            break;
          default:
            break;
        }
      });

      const openIndex = (index: number, focus = false) => {
        const enabled = enabledItems(items);
        if (enabled.length === 0) return;
        const resolved = enabled[((index % enabled.length) + enabled.length) % enabled.length];
        if (!resolved) return;

        isSyncing = true;
        try {
          if (!options.multi) {
            for (const { item } of items) {
              item.open = item === resolved.item;
            }
          } else {
            resolved.item.open = true;
          }
        } finally {
          isSyncing = false;
        }

        syncAria();
        emitOpened(resolved);
        if (focus) focusSummary(resolved.summary);
      };

      const closeIndex = (index: number, focus = false) => {
        const enabled = enabledItems(items);
        if (enabled.length === 0) return;
        const resolved = enabled[((index % enabled.length) + enabled.length) % enabled.length];
        if (!resolved) return;

        if (!options.allowAllClosed) {
          const openCount = items.filter(({ item }) => item.open).length;
          if (openCount <= 1 && resolved.item.open) return;
        }

        isSyncing = true;
        try {
          resolved.item.open = false;
        } finally {
          isSyncing = false;
        }

        syncAria();
        emitClosed(resolved);
        if (focus) focusSummary(resolved.summary);
      };

      const toggleIndex = (index: number, focus = false) => {
        const enabled = enabledItems(items);
        if (enabled.length === 0) return;
        const resolved = enabled[((index % enabled.length) + enabled.length) % enabled.length];
        if (!resolved) return;
        if (resolved.item.open) closeIndex(index, focus);
        else openIndex(index, focus);
      };

      const closeAll = () => {
        if (!options.allowAllClosed) return;
        isSyncing = true;
        try {
          for (const { item } of items) item.open = false;
        } finally {
          isSyncing = false;
        }
        syncAria();
      };

      context.on(root, 'foundation:accordion:open', (event) => {
        const target = getEventTargetElement(event);
        if (target !== root) return;
        const detail = (event as CustomEvent<AccordionCommandDetail>).detail;
        openIndex(resolveIndex(items, detail), true);
      });

      context.on(root, 'foundation:accordion:close', (event) => {
        const target = getEventTargetElement(event);
        if (target !== root) return;
        const detail = (event as CustomEvent<AccordionCommandDetail>).detail;
        closeIndex(resolveIndex(items, detail), true);
      });

      context.on(root, 'foundation:accordion:toggle', (event) => {
        const target = getEventTargetElement(event);
        if (target !== root) return;
        const detail = (event as CustomEvent<AccordionCommandDetail>).detail;
        toggleIndex(resolveIndex(items, detail), true);
      });

      return {
        open(target) {
          openIndex(resolveIndex(items, target), false);
        },
        close(target) {
          closeIndex(resolveIndex(items, target), false);
        },
        toggle(target) {
          toggleIndex(resolveIndex(items, target), false);
        },
        openIndex(index) {
          openIndex(index, false);
        },
        closeAll() {
          closeAll();
        },
        destroy() {
          closeAll();
        },
      };
    },
  });
}
