# Foundation 7 publishing (draft)

Foundation 7 lives in `packages/` as a set of independently published packages under the `@foundation/*` scope.

This repo is still the Foundation Sites 6.x codebase at the root, so Foundation 7 is currently published from the `packages/*` folders (not from the root).

## Versioning

- Foundation 7 packages are intended to be versioned **together** (same version number across `@foundation/core`, `@foundation/css`, and component packages).
- Current draft version: `0.1.0`.

## Local development

- `yarn f7:link` creates local `node_modules/@foundation/*` symlinks to the `packages/*` folders so TypeScript and Node resolution work without workspaces.
- Examples use a browser import map, so they can import `@foundation/*` specifiers without bundling.

## Preflight

```bash
yarn f7:test
```

That builds all Foundation 7 packages and runs Playwright smoke tests.

Optional: verify package contents:

```bash
for p in packages/{core,css,reveal,dropdown,tooltip,tabs,accordion,offcanvas,toast}; do (cd "$p" && npm pack --dry-run); done
```

## Publish (manual, draft)

1. Ensure you’re logged in: `npm login`
2. Publish in dependency order:
   - `packages/core`
   - `packages/css`
   - component packages (`packages/reveal`, `packages/dropdown`, …)

Example:

```bash
cd packages/core && npm publish --tag next
cd ../css && npm publish --tag next
cd ../reveal && npm publish --tag next
```

Notes:

- Each `@foundation/*` package sets `publishConfig.access="public"` so you don’t need `--access public` for scoped packages.
- Use a dist-tag like `next` (recommended) until the API stabilizes.
