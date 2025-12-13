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

### Tooltip (draft)

Markup:

```html
<button data-tooltip title="Tooltip content">Hover or focus</button>
```
