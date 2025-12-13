# @foundation/core (Foundation 7)

This is the initial Foundation 7 core runtime scaffold.

## Intent

- DOM-first (no jQuery requirement)
- ESM-first (explicit exports, side-effect free by default)
- predictable lifecycle (mount + teardown, cleanup guaranteed)

## Usage (draft)

```js
import { createFoundation, definePlugin, dropdown, reveal, tooltip } from '@foundation/core';
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
