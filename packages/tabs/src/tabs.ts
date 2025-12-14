import { definePlugin } from '@foundation/core';
import type { FoundationPlugin, FoundationPluginInstance, PluginContext } from '@foundation/core';
import { ensureId, getEventTargetElement, getStringAttribute, isHtmlElement, parseBooleanAttribute } from '@foundation/core/utils/dom.js';

export type TabsActivationMode = 'auto' | 'manual';
export type TabsOrientation = 'horizontal' | 'vertical';

export type TabsOptions = {
  activation?: TabsActivationMode;
  orientation?: TabsOrientation;
  updateHash?: boolean;
};

export type TabsChangedDetail = {
  id: string;
  activeId: string;
  previousId: string | null;
  tab: HTMLElement;
  panel: HTMLElement;
};

export type TabsSelectDetail = {
  id: string;
  focus?: boolean;
};

export type TabsInstance = FoundationPluginInstance & {
  select(id: string, options?: { focus?: boolean }): void;
  selectIndex(index: number, options?: { focus?: boolean }): void;
  next(options?: { focus?: boolean }): void;
  prev(options?: { focus?: boolean }): void;
};

const ROOT_CLASS = 'f-tabs';
const LIST_CLASS = 'f-tabs-list';
const TAB_CLASS = 'f-tabs-tab';
const PANEL_CLASS = 'f-tabs-panel';

const ROOT_ACTIVE_ATTR = 'data-tabs-active';
const SELECTED_ATTR = 'data-tabs-selected';
const PANEL_ATTR = 'data-tabs-panel';
const TAB_ATTR = 'data-tabs-tab';

function normalizeIdReference(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
}

function isDisabledTab(tab: HTMLElement): boolean {
  if (tab.hasAttribute('disabled')) return true;
  if (tab.getAttribute('aria-disabled') === 'true') return true;
  if (tab.hasAttribute('data-tabs-disabled')) return true;
  return false;
}

function getTabTargetId(tab: HTMLElement): string | null {
  const explicit = getStringAttribute(tab, TAB_ATTR);
  if (explicit) return normalizeIdReference(explicit);

  const controls = getStringAttribute(tab, 'aria-controls');
  if (controls) return controls;

  if (tab instanceof HTMLAnchorElement) {
    const href = tab.getAttribute('href');
    if (href && href.startsWith('#') && href.length > 1) return href.slice(1);
  }

  return null;
}

function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

function resolveMode(value: string | undefined, fallback: TabsActivationMode): TabsActivationMode {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'manual') return 'manual';
  if (normalized === 'auto' || normalized === 'automatic') return 'auto';
  return fallback;
}

function resolveOrientation(value: string | undefined, fallback: TabsOrientation): TabsOrientation {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'vertical') return 'vertical';
  if (normalized === 'horizontal') return 'horizontal';
  return fallback;
}

export function tabs(defaultOptions: TabsOptions = {}): FoundationPlugin {
  return definePlugin({
    name: 'tabs',
    selector: '[data-tabs]',
    mount(element: Element, context: PluginContext): TabsInstance {
      if (!(element instanceof HTMLElement)) {
        return {
          select() {},
          selectIndex() {},
          next() {},
          prev() {},
        };
      }

      const root = element;
      const id = ensureId(root, 'f7-tabs');

      const options: Required<TabsOptions> = {
        activation: resolveMode(getStringAttribute(root, 'data-tabs-activation'), defaultOptions.activation ?? 'auto'),
        orientation: resolveOrientation(
          getStringAttribute(root, 'data-tabs-orientation'),
          defaultOptions.orientation ?? 'horizontal'
        ),
        updateHash: parseBooleanAttribute(root, 'data-tabs-update-hash', defaultOptions.updateHash ?? false),
      };

      root.classList.add(ROOT_CLASS);

      const explicitList =
        root.querySelector(':scope > [data-tabs-list]') ??
        root.querySelector('[data-tabs-list]') ??
        root.querySelector(':scope > [role="tablist"]') ??
        root.querySelector('[role="tablist"]');

      const inferredList = (() => {
        const firstTab = root.querySelector(`[${TAB_ATTR}]`);
        if (!firstTab) return null;
        return firstTab.parentElement ?? null;
      })();

      const tablist = (explicitList ?? inferredList ?? root) as HTMLElement;
      tablist.classList.add(LIST_CLASS);
      tablist.setAttribute('role', 'tablist');
      tablist.setAttribute('aria-orientation', options.orientation);

      const tabsAll = Array.from(tablist.querySelectorAll<HTMLElement>(`[${TAB_ATTR}]`)).filter(
        (tab) => tab.closest('[data-tabs]') === root
      );

      const panelsAll = Array.from(root.querySelectorAll<HTMLElement>(`[${PANEL_ATTR}]`)).filter(
        (panel) => panel.closest('[data-tabs]') === root
      );

      const panelsById = new Map<string, HTMLElement>();
      for (const panel of panelsAll) {
        const panelId = ensureId(panel, 'f7-tabpanel');
        panelsById.set(panelId, panel);
      }

      const tabData: Array<{ tab: HTMLElement; targetId: string; panel: HTMLElement }> = [];
      for (const tab of tabsAll) {
        const targetId = getTabTargetId(tab);
        if (!targetId) continue;
        const panel = panelsById.get(targetId);
        if (!panel) continue;
        tabData.push({ tab, targetId, panel });
      }

      const enabledTabs = () => tabData.filter(({ tab }) => !isDisabledTab(tab));

      const getActiveId = (): string | null => {
        const rootActive = getStringAttribute(root, ROOT_ACTIVE_ATTR);
        if (rootActive && panelsById.has(rootActive)) return rootActive;

        const hash = options.updateHash ? window.location.hash : '';
        if (hash && hash.length > 1) {
          const fromHash = hash.slice(1);
          if (panelsById.has(fromHash)) return fromHash;
        }

        for (const { tab, targetId } of tabData) {
          if (tab.hasAttribute(SELECTED_ATTR)) return targetId;
          if (tab.getAttribute('aria-selected') === 'true') return targetId;
        }

        const firstEnabled = enabledTabs()[0];
        return firstEnabled?.targetId ?? tabData[0]?.targetId ?? null;
      };

      let activeId = getActiveId();
      if (!activeId && tabData.length > 0) activeId = tabData[0].targetId;

      let focusedIndex = (() => {
        if (!activeId) return 0;
        const idx = tabData.findIndex(({ targetId }) => targetId === activeId);
        return idx >= 0 ? idx : 0;
      })();

      const sync = () => {
        const active = activeId;
        if (!active) return;

        root.setAttribute(ROOT_ACTIVE_ATTR, active);

        for (let i = 0; i < tabData.length; i += 1) {
          const { tab, targetId, panel } = tabData[i];

          tab.classList.add(TAB_CLASS);
          tab.setAttribute('role', 'tab');
          tab.setAttribute('aria-controls', panel.id);

          const tabId = ensureId(tab, 'f7-tab');
          panel.classList.add(PANEL_CLASS);
          panel.setAttribute('role', 'tabpanel');
          panel.setAttribute('aria-labelledby', tabId);

          if (panel instanceof HTMLElement && !panel.hasAttribute('tabindex')) {
            panel.tabIndex = 0;
          }

          const isSelected = targetId === active;
          const isFocused = i === focusedIndex;

          tab.setAttribute('aria-selected', isSelected ? 'true' : 'false');
          tab.toggleAttribute(SELECTED_ATTR, isSelected);
          tab.tabIndex = isFocused ? 0 : -1;

          panel.toggleAttribute(SELECTED_ATTR, isSelected);
          if (isSelected) {
            panel.removeAttribute('hidden');
          } else {
            panel.setAttribute('hidden', '');
          }
        }
      };

      const emitChanged = (nextId: string, previousId: string | null) => {
        const current = tabData.find((d) => d.targetId === nextId);
        if (!current) return;
        context.emit(root, 'foundation:tabs:changed', {
          id,
          activeId: nextId,
          previousId,
          tab: current.tab,
          panel: current.panel,
        } satisfies TabsChangedDetail);
      };

      const updateHash = (nextId: string) => {
        if (!options.updateHash) return;
        if (!nextId) return;
        const url = new URL(window.location.href);
        url.hash = nextId;
        try {
          history.replaceState(history.state, '', url);
        } catch {
          // best effort
        }
      };

      const select = (nextId: string, options?: { focus?: boolean }) => {
        const normalized = normalizeIdReference(nextId);
        const entry = tabData.find((d) => d.targetId === normalized);
        if (!entry) return;
        if (isDisabledTab(entry.tab)) return;

        const previousId = activeId;
        activeId = entry.targetId;
        focusedIndex = tabData.indexOf(entry);
        sync();
        updateHash(activeId);

        if (options?.focus) {
          try {
            entry.tab.focus();
          } catch {
            // ignore
          }
        }

        if (previousId !== activeId) emitChanged(activeId, previousId ?? null);
      };

      const focusIndex = (nextIndex: number, { selectOnFocus }: { selectOnFocus: boolean }) => {
        const enabled = enabledTabs();
        if (enabled.length === 0) return;

        const currentTab = tabData[focusedIndex];
        const currentEnabledIndex = currentTab ? enabled.findIndex((d) => d.tab === currentTab.tab) : -1;
        const startIndex = currentEnabledIndex >= 0 ? currentEnabledIndex : 0;
        const resolvedEnabledIndex = wrapIndex(nextIndex, enabled.length);

        const next = enabled[resolvedEnabledIndex] ?? enabled[startIndex];
        if (!next) return;

        focusedIndex = tabData.indexOf(next);
        if (focusedIndex < 0) focusedIndex = 0;

        if (selectOnFocus) {
          select(next.targetId, { focus: true });
          return;
        }

        sync();
        try {
          next.tab.focus();
        } catch {
          // ignore
        }
      };

      const moveFocus = (delta: number, selectOnFocus: boolean) => {
        const enabled = enabledTabs();
        if (enabled.length === 0) return;

        const currentTab = tabData[focusedIndex];
        const currentEnabledIndex = currentTab ? enabled.findIndex((d) => d.tab === currentTab.tab) : -1;
        const startIndex = currentEnabledIndex >= 0 ? currentEnabledIndex : 0;
        focusIndex(startIndex + delta, { selectOnFocus });
      };

      sync();

      context.on(tablist, 'click', (event) => {
        const target = getEventTargetElement(event);
        if (!target) return;
        const tab = target.closest(`[${TAB_ATTR}]`);
        if (!isHtmlElement(tab)) return;
        if (tab.closest('[data-tabs]') !== root) return;
        if (isDisabledTab(tab)) return;

        const targetId = getTabTargetId(tab);
        if (!targetId) return;
        event.preventDefault();
        select(targetId, { focus: false });
      });

      context.on(tablist, 'keydown', (event) => {
        const e = event as KeyboardEvent;
        const target = getEventTargetElement(event);
        if (!target) return;

        const tab = target.closest(`[${TAB_ATTR}]`);
        if (!isHtmlElement(tab)) return;
        if (tab.closest('[data-tabs]') !== root) return;

        const key = e.key;
        const isHorizontal = options.orientation !== 'vertical';

        const selectOnFocus = options.activation === 'auto';

        if (key === 'Home') {
          e.preventDefault();
          focusIndex(0, { selectOnFocus });
          return;
        }

        if (key === 'End') {
          e.preventDefault();
          focusIndex(-1, { selectOnFocus });
          return;
        }

        if (isHorizontal && (key === 'ArrowLeft' || key === 'ArrowRight')) {
          e.preventDefault();
          moveFocus(key === 'ArrowRight' ? 1 : -1, selectOnFocus);
          return;
        }

        if (!isHorizontal && (key === 'ArrowUp' || key === 'ArrowDown')) {
          e.preventDefault();
          moveFocus(key === 'ArrowDown' ? 1 : -1, selectOnFocus);
          return;
        }

        if (options.activation === 'manual' && (key === 'Enter' || key === ' ')) {
          e.preventDefault();
          const targetId = getTabTargetId(tab);
          if (!targetId) return;
          select(targetId, { focus: true });
        }
      });

      context.on(root, 'foundation:tabs:select', (event) => {
        const target = getEventTargetElement(event);
        if (target !== root) return;
        const detail = (event as CustomEvent<TabsSelectDetail>).detail;
        if (!detail || typeof detail !== 'object') return;
        if (!('id' in detail) || typeof detail.id !== 'string') return;
        select(detail.id, { focus: detail.focus ?? false });
      });

      context.on(window, 'hashchange', () => {
        if (!options.updateHash) return;
        const hash = window.location.hash;
        if (!hash || hash.length <= 1) return;
        const next = hash.slice(1);
        if (next === activeId) return;
        if (!panelsById.has(next)) return;
        select(next, { focus: false });
      });

      return {
        select(id, opts) {
          select(id, opts);
        },
        selectIndex(index, opts) {
          const enabled = enabledTabs();
          if (enabled.length === 0) return;
          const resolved = enabled[wrapIndex(index, enabled.length)];
          if (!resolved) return;
          select(resolved.targetId, opts);
        },
        next(opts) {
          const enabled = enabledTabs();
          if (enabled.length === 0) return;
          const current = tabData.find((d) => d.targetId === activeId);
          const idx = current ? enabled.findIndex((d) => d.tab === current.tab) : -1;
          const next = enabled[wrapIndex((idx >= 0 ? idx : 0) + 1, enabled.length)];
          if (!next) return;
          select(next.targetId, opts);
        },
        prev(opts) {
          const enabled = enabledTabs();
          if (enabled.length === 0) return;
          const current = tabData.find((d) => d.targetId === activeId);
          const idx = current ? enabled.findIndex((d) => d.tab === current.tab) : -1;
          const next = enabled[wrapIndex((idx >= 0 ? idx : 0) - 1, enabled.length)];
          if (!next) return;
          select(next.targetId, opts);
        },
      };
    },
  });
}
