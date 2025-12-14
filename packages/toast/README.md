# @foundation/toast (Foundation 7)

Toast is the Foundation 7 notification plugin.

## Usage (draft)

```js
import { createFoundation } from '@foundation/core';
import { toast } from '@foundation/toast';
import '@foundation/css/foundation.css';

const app = createFoundation({ plugins: [toast()] });
app.init(document);
```

## CSS

- Full bundle: `@foundation/css/foundation.css`
- Component-only: `@foundation/css/components/toast.css`

