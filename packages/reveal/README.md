# @foundation/reveal (Foundation 7)

Reveal is the Foundation 7 modal/dialog plugin.

## Install (draft)

```bash
npm install @foundation/core @foundation/reveal @foundation/css
```

## Usage (draft)

```js
import { createFoundation } from '@foundation/core';
import { reveal } from '@foundation/reveal';
import '@foundation/css/foundation.css';

const app = createFoundation({ plugins: [reveal()] });
app.init(document);
```

## Markup

```html
<button data-reveal-open="my-dialog">Open</button>
<dialog id="my-dialog" data-reveal>
  <p>Hello</p>
  <button data-reveal-close>Close</button>
</dialog>
```

## CSS

- Full bundle: `@foundation/css/foundation.css`
- Component-only: `@foundation/css/components/reveal.css`
