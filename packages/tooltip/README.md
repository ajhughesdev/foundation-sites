# @foundation/tooltip (Foundation 7)

Tooltip is the Foundation 7 floating hint plugin.

## Usage (draft)

```js
import { createFoundation } from '@foundation/core';
import { tooltip } from '@foundation/tooltip';
import '@foundation/css/foundation.css';

const app = createFoundation({ plugins: [tooltip()] });
app.init(document);
```

## CSS

- Full bundle: `@foundation/css/foundation.css`
- Component-only: `@foundation/css/components/tooltip.css`

