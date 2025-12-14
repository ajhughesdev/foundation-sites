# @foundation/core (Foundation 7)

This is the initial Foundation 7 core runtime scaffold.

## Intent

- DOM-first (no jQuery requirement)
- ESM-first (explicit exports, side-effect free by default)
- predictable lifecycle (mount + teardown, cleanup guaranteed)

## Install (draft)

```bash
npm install @foundation/core
```

## Usage (draft)

```js
import { createFoundation, definePlugin } from '@foundation/core';
import { dropdown } from '@foundation/dropdown';
import { reveal } from '@foundation/reveal';
import { tooltip } from '@foundation/tooltip';
import '@foundation/css/foundation.css';

const disclosure = definePlugin({
  name: 'disclosure',
  selector: '[data-disclosure]',
  mount(element, { on, emit }) {
    on(element, 'click', () => emit(element, 'foundation:toggle'));
  }
});

const app = createFoundation({ plugins: [disclosure, reveal(), dropdown(), tooltip()] });
app.init(document);
```

## Dev workflow (draft)

- Run `yarn f7:dev` (tsc watch + Vite dev server).
- Open an example like `http://127.0.0.1:5173/packages/core/examples/reveal.html`.
- Examples use a native import map so you can import `@foundation/*` in the browser without bundling.
- If TypeScript/editor tooling can't resolve `@foundation/*`, run `yarn f7:link` once to create local `node_modules/@foundation/*` symlinks.

### Reveal (draft)

Markup:

```html
<button data-reveal-open="my-dialog">Open</button>
<dialog id="my-dialog" data-reveal>
  <p>Hello</p>
  <button data-reveal-close>Close</button>
</dialog>
```

Programmatic control:

```js
document.getElementById('my-dialog')?.dispatchEvent(new CustomEvent('foundation:reveal:open', { bubbles: true }));
```

Options (attributes):

- `data-reveal-modal="true|false"`
- `data-reveal-close-on-backdrop="true|false"`
- `data-reveal-close-on-esc="true|false"`
- `data-reveal-lock-scroll="true|false"`
- `data-reveal-return-focus="true|false"`
- `data-reveal-initial-focus="selector"`
- `data-reveal-trap-focus="true|false"` (non-`<dialog>` modal only)
- `data-reveal-inert-background="true|false"` (non-`<dialog>` modal only)

### Dropdown (draft)

Markup:

```html
<button data-dropdown-toggle="my-dropdown">Toggle</button>
<div id="my-dropdown" data-dropdown hidden>
  <a href="#">Action</a>
  <button type="button" data-dropdown-close>Close</button>
</div>
```

Notes:

- ArrowDown/ArrowUp on the trigger opens and moves focus into the dropdown.
- Keyboard navigation inside the dropdown: ArrowUp/ArrowDown/Home/End.
- Defaults: close on outside click + close on focus leaving (blur) + close on Escape.

### Tooltip (draft)

Markup:

```html
<button data-tooltip title="Tooltip content">Hover or focus</button>
```

Rich content (draft):

```html
<button data-tooltip="#tip-template">Hover or focus</button>
<template id="tip-template">
  <strong>Rich</strong> tooltip content.
</template>
```

### Tabs (draft)

Markup:

```html
<div data-tabs>
  <div data-tabs-list>
    <button type="button" data-tabs-tab="panel-a">A</button>
    <button type="button" data-tabs-tab="panel-b">B</button>
  </div>

  <div id="panel-a" data-tabs-panel>Panel A</div>
  <div id="panel-b" data-tabs-panel>Panel B</div>
</div>
```

Options (attributes):

- `data-tabs-activation="auto|manual"`
- `data-tabs-orientation="horizontal|vertical"`
- `data-tabs-update-hash` (optional deep-linking)

### Accordion (draft)

Markup:

```html
<div data-accordion>
  <details data-accordion-item open>
    <summary>First</summary>
    <div data-accordion-panel>Panel</div>
  </details>
  <details data-accordion-item>
    <summary>Second</summary>
    <div data-accordion-panel>Panel</div>
  </details>
</div>
```

Options (attributes):

- `data-accordion-multi` (allow multiple open)
- `data-accordion-allow-all-closed="false"` (require one open)

### OffCanvas (draft)

Markup:

```html
<button type="button" data-offcanvas-open="my-offcanvas">Open</button>

<aside id="my-offcanvas" data-offcanvas data-offcanvas-position="left" aria-labelledby="my-offcanvas-title" hidden>
  <h2 id="my-offcanvas-title">Menu</h2>
  <button type="button" data-offcanvas-close>Close</button>
  <a href="#">Action</a>
</aside>
```

Triggers:

- `data-offcanvas-open="id"`
- `data-offcanvas-toggle="id"`
- `data-offcanvas-close` (or `data-offcanvas-close="id"`)

Options (attributes):

- `data-offcanvas-modal="true|false"`
- `data-offcanvas-position="left|right|top|bottom"`
- `data-offcanvas-close-on-backdrop="true|false"`
- `data-offcanvas-close-on-esc="true|false"`
- `data-offcanvas-lock-scroll="true|false"`
- `data-offcanvas-return-focus="true|false"`
- `data-offcanvas-initial-focus="selector"`
- `data-offcanvas-trap-focus="true|false"`
- `data-offcanvas-inert-background="true|false"` (non-`<dialog>` modal only)

### Toast / Notification (draft)

Markup:

```html
<div id="demo-toasts" data-toast></div>

<button
  type="button"
  data-toast-show="demo-toasts"
  data-toast-variant="success"
  data-toast-message="Saved!"
>
  Show toast
</button>
```

Programmatic control:

```js
document.getElementById('demo-toasts')?.dispatchEvent(
  new CustomEvent('foundation:toast:show', {
    bubbles: true,
    detail: { message: 'Saved!', variant: 'success' },
  })
);
```

Options (attributes on the toast region):

- `data-toast-position="bottom-end|bottom-start|top-end|top-start"`
- `data-toast-timeout` (ms)
- `data-toast-max`
- `data-toast-dismissible="true|false"`
