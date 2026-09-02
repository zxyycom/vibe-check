# translated-function-analyzers-typescript

## Case FM-ANALYZER-READERS-C-001: TypeScript-style source readers preserve Lizard 1.23 observable metrics

Owner: `docs/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/function-metrics/analyzer/readers/typescript.test.ts|TypeScript reader preserves fixtures, type syntax, decorators, regexes, templates, methods, and arrows`
- `bun|src/package-checks/function-metrics/analyzer/readers/javascript.test.ts|JavaScript reader preserves every suffix, regex/template tokens, class methods, and arrows`
- `bun|src/package-checks/function-metrics/analyzer/readers/tsx.test.ts|TSX reader preserves every suffix, JSX nesting and attributes, typed component arrows, and ranges`
- `bun|src/package-checks/function-metrics/analyzer/readers/vue.test.ts|Vue reader preserves fixtures and script-only function boundaries, order, metrics, and ranges`

Proves:

- TypeScript、JavaScript、TSX/JSX 与 Vue 的全部当前 suffix、normal/edge oracle fixture 都保持 Lizard 1.23 function name、range、NLOC、CCN 与 parameter count。
- TypeScript-style reader 保留 function、arrow、class/object method、typed/generic/decorated declarations、JavaScript regular expression 与 template literal 的上游 token/state behavior；它不会将 declare、type alias 或 interface signature 当作 runtime function。
- TSX/JSX 保留 nested tag 和 expression attribute 边界；Vue 只处理 `script` block 中的 TypeScript-style source，并保持多 script block 的 source order。
