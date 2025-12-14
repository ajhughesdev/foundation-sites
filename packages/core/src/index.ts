export { createFoundation } from './createFoundation.js';
export { definePlugin } from './types.js';
export { accordion } from './plugins/accordion.js';
export { offcanvas } from './plugins/offcanvas.js';
export { toast } from './plugins/toast.js';
export type {
  Cleanup,
  FoundationApp,
  FoundationPlugin,
  FoundationPluginInstance,
  PluginContext,
  PluginSelector,
} from './types.js';
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
export type {
  ToastHiddenDetail,
  ToastInstance,
  ToastOptions,
  ToastRole,
  ToastShowDetail,
  ToastShownDetail,
  ToastVariant,
} from './plugins/toast.js';
