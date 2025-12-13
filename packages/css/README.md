# @foundation/css (Foundation 7)

This package is the starting point for Foundation 7’s CSS architecture:

- Design tokens via CSS custom properties
- Predictable overrides via cascade layers
- RTL friendliness via logical properties

## Layers

The entrypoint `foundation.css` defines the canonical layer order:

- `reset`
- `tokens`
- `base`
- `components`
- `utilities`
- `overrides`

Foundation code should live in `tokens/base/components/utilities`. Consumers should override in their own stylesheets (which generally come later), or in a dedicated `overrides` layer if they adopt layers.

## Usage (draft)

```css
@import "@foundation/css/foundation.css";
```

Or pick-and-choose:

```css
@import "@foundation/css/tokens.css";
@import "@foundation/css/components/dropdown.css";
@import "@foundation/css/components/reveal.css";
@import "@foundation/css/components/tooltip.css";

```
## Theming (draft)

Tokens follow the system theme by default (`prefers-color-scheme`). To override:

```html
<html data-theme="dark">
```

You can also scope a theme to a subtree:

```html
<section data-theme="dark">...</section>
```
