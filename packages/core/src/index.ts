export { createFoundation } from './createFoundation.js';
export { definePlugin } from './types.js';
export { reveal } from './plugins/reveal.js';
export { dropdown } from './plugins/dropdown.js';
export { tooltip } from './plugins/tooltip.js';
export { tabs } from './plugins/tabs.js';
export { accordion } from './plugins/accordion.js';
export { offcanvas } from './plugins/offcanvas.js';
export type {
  Cleanup,
  FoundationApp,
  FoundationPlugin,
  FoundationPluginInstance,
  PluginContext,
  PluginSelector,
} from './types.js';
export type { RevealClosedDetail, RevealInstance, RevealOpenedDetail, RevealOptions } from './plugins/reveal.js';
export type {
  DropdownClosedDetail,
  DropdownInstance,
  DropdownOpenedDetail,
  DropdownOptions,
} from './plugins/dropdown.js';
export type { TooltipInstance, TooltipOptions } from './plugins/tooltip.js';
export type {
  TabsActivationMode,
  TabsChangedDetail,
  TabsInstance,
  TabsOptions,
  TabsOrientation,
  TabsSelectDetail,
} from './plugins/tabs.js';
export type {
  AccordionClosedDetail,
  AccordionCommandDetail,
  AccordionInstance,
  AccordionOpenedDetail,
  AccordionOptions,
} from './plugins/accordion.js';
export type {
  OffCanvasClosedDetail,
  OffCanvasInstance,
  OffCanvasOpenedDetail,
  OffCanvasOptions,
} from './plugins/offcanvas.js';
