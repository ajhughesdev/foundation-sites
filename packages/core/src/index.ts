export { createFoundation } from './createFoundation.js';
export { definePlugin } from './types.js';
export { reveal } from './plugins/reveal.js';
export { dropdown } from './plugins/dropdown.js';
export { tooltip } from './plugins/tooltip.js';
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
