# @foundation/dropdown (Foundation 7)

Dropdown is the Foundation 7 floating disclosure/menu plugin.

## Install (draft)

```bash
npm install @foundation/core @foundation/dropdown @foundation/css
```

## Usage (draft)

```js
import { createFoundation } from '@foundation/core';
import { dropdown } from '@foundation/dropdown';
import '@foundation/css/foundation.css';

const app = createFoundation({ plugins: [dropdown()] });
app.init(document);
```

## CSS

- Full bundle: `@foundation/css/foundation.css`
- Component-only: `@foundation/css/components/dropdown.css`
