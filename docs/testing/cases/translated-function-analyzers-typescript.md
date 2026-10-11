# translated-function-analyzers-typescript

## Case FM-ANALYZER-READERS-C-001: TypeScript-style source readers preserve Lizard 1.24 observable metrics

Owner: `docs/development/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/function-metrics/analyzer/readers/typescript.test.ts|TypeScript reader preserves fixtures, type syntax, decorators, regexes, templates, methods, and arrows`
- `bun|src/package-checks/function-metrics/analyzer/readers/javascript.test.ts|JavaScript reader preserves every suffix, regex/template tokens, class methods, and arrows`
- `bun|src/package-checks/function-metrics/analyzer/readers/tsx.test.ts|TSX reader preserves every suffix, JSX nesting and attributes, typed component arrows, and ranges`
- `bun|src/package-checks/function-metrics/analyzer/readers/vue.test.ts|Vue reader preserves fixtures and script-only function boundaries, order, metrics, and ranges`

Proves:

- TypeScript、JavaScript、TSX/JSX 与 Vue 的全部当前 suffix、normal/edge oracle fixture 都保持 Lizard 1.24 function name、range、NLOC、CCN 与 parameter count。
- TypeScript-style reader 保留 function、arrow、class/object method、typed/generic/decorated declarations、JavaScript regular expression 与 template literal 的上游 token/state behavior；它不会将 declare、type alias 或 interface signature 当作 runtime function。
- TSX/JSX 保留 nested tag 和 expression attribute 边界；Vue 只处理 `script` block 中的 TypeScript-style source，并保持多 script block 的 source order。

## Case FM-TYPESCRIPT-FUNCTION-BOUNDARIES-001: 显式返回类型和推断声明保留真实函数边界

Owner: `docs/development/scanner-dependencies.md#typescript-函数指标的有界偏差`
Entities:

- `bun|src/package-checks/function-metrics/analyzer/typescript-metrics.test.ts|TypeScript function boundaries exclude trailing blocks for typed and inferred declarations and arrows`

Proves:

- typed/inferred declaration、简单/泛型返回类型与 typed arrow 的结束行/NLOC 止于真实闭合位置，尾随控制块不贡献 CCN/ND；正文内部嵌套仍保留实际贡献和深度。

## Case FM-TYPESCRIPT-NULLISH-METRICS-001: 空值合并与既有短路路径保持精确贡献及 ND

Owner: `docs/checks/function-metrics.md#参数与默认配置`
Entities:

- `bun|src/package-checks/function-metrics/analyzer/typescript-metrics.test.ts|TypeScript nullish tokens preserve optional parameters and real ternaries with complete line contributions`
- `bun|src/package-checks/function-metrics/analyzer/typescript-metrics.test.ts|Nullish nesting depth follows short-circuit condition, hidden-bracket, semicolon, and function-reset paths`
- `bun|src/package-checks/function-metrics/analyzer/typescript-metrics.test.ts|Inherited JS JSX TSX and Vue readers share nullish corrections without granting Kotlin a logical operator`

Proves:

- 带空格和紧凑 ?? 为单 token，每项 CCN +1、贡献顺序及真实行号完整；可选参数与真实三元对照不变。TSX/JSX、JS、Vue 继承相同修正，Kotlin 已有 ?? token 不获得新 logical/ND 口径。
- condition 内外、括号/嵌套括号、合法混合表达式、hidden bracket、分号及下一函数 reset 的独立期望，与同形 &&/|| 控制项一致，不是一律 ND 0 或链恒增一层。
