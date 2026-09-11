# Design

本设计让 TypeScript compiler 负责类型和控制流可靠性，让 Oxlint 负责代码级错误模式、优化建议和 suppression；两者通过现有 Gate 共同形成一次静态 assurance 升级。

## Context

### 事实源与执行边界

| 机制 | 配置 owner | 责任 | 现有验收 |
| --- | --- | --- | --- |
| Product compiler | `tsconfig.product.json` extends 根 `tsconfig.json` | Product implementation、tests 和 import boundary | required `typecheck-product` |
| Scripts compiler | 根 `tsconfig.json` | Repository scripts 及其传递导入的 Product surface | required `typecheck-scripts` |
| Package emit | `scripts/package/artifact/build.ts` 的显式 `--ignoreConfig` 参数 | 真实 runtime 和 declarations emit | `--all` artifact acceptance |
| Installed consumer | external-consumer 临时 config | 公共 declarations、imports 和 examples | `--all` consumer types acceptance |
| Product/scripts lint | `.oxlintrc.json`；`scripts/development/lint.ts` 选择 scope | Type-aware、代码模式和 suppression 检查 | required `lint-product` / `lint-scripts` |

Compiler 方向由 Decision [`260911-adopt-soundness-oriented-typescript-typecheck-profiles`](../../docs/decisions/adopt-soundness-oriented-typescript-typecheck-profiles.md) 持有；lint severity、规则范围和 suppression 由 Decision [`260911-use-blocking-tiered-oxlint-policy`](../../docs/decisions/use-blocking-tiered-oxlint-policy.md) 持有。两条 Decision 可以独立演进，本 Change 负责一次性实施和联合验收。

### 基线证据

| 证据 | 已核对事实 | 计划用法 |
| --- | --- | --- |
| Selected compiler rules | Product 103 个位置/50 个文件；scripts scope 168/62；跨 scope 去重后 210/89 | 按 exact optional、indexed access、控制流分批修复 |
| Compiler distribution | Product implementation 62、Product tests/support 41、scripts/tests 107 | 按行为 owner 验证，不把位置数当作 Bug 数 |
| Selected lint rules | `no-confusing-void-expression` 162 个位置/53 个文件；`strict-boolean-expressions` 103/50；`prefer-nullish-coalescing` 21/15；`prefer-optional-chain` 12/10；`only-throw-error` 2/2；`prefer-readonly` 2/2；`use-unknown-in-catch-callback-variable` 为 0；`no-promise-executor-return` 正式重跑为 0（原 inventory 为 Product 10、scripts 2） | 依 no-confusing、strict-boolean、其它规则三批闭合；位置只用于分批，不是 Bug 数，也不构成关闭规则的理由；每批以 scope lint、目标测试及受控负向输入验证 |
| Unicorn plugin constraint | `unicorn/no-useless-promise-resolve-reject` 观察到 2/2，但 `plugins: ["unicorn"]` 会隐式启用 14 条 correctness 规则 | 不加载 plugin，不以 13 条 `off` workaround 固定当前版本行为；该 2/2 不是迁移义务 |
| Broad `perf` category | `no-await-in-loop` 67、`no-useless-call` 1 | 不启用类别；保留有意顺序 await 和 source-aligned receiver seam |
| Suppression inventory | 两处 ESLint-spelled suppression；一个多余 `eslint-enable` | 迁移为 Oxlint directive，关闭 ESLint compatibility，启用 unused audit |
| Warning microprobe | JSON 保留 `severity: "warning"`，`--deny-warnings` 返回 1 | severity 用于分类，不改变 Gate 阻断性 |

## Goals / Non-Goals

### Goals

- 采用能拒绝错误程序或迫使未处理风险显式化的 compiler 规则，并按各消费边界配置。
- 采用一组有明确代码质量价值的 lint 规则，让 severity 表达风险类型、现有 Gate 表达阻断性。
- 按行为 owner 修复当前诊断，保持 runtime、错误映射、package 布局和 Gate selection 不变。
- 让 Oxlint 独占 lint suppression，并通过 unused-directive 检查防止例外腐化。

### Non-Goals

- 不把诊断位置数直接解释为 Product Bug 数，也不借迁移重构无关 owner。
- 不增加 compiler/lint runner、Gate Check、diagnostic baseline 或 installed-consumer invocation。
- 不启用整个 `perf`、`pedantic`、`style`、`nursery` 或 Unicorn correctness 类别。
- 不把 Oxlint 诊断接入 Vibe Check Finding waiver；后者继续只服务拥有完整 Finding 集合和稳定语义 identity 的 Product Checks。

## Decisions

### Intended Change

#### 1. Compiler profiles

- 根 `tsconfig.json` 共享 `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noImplicitOverride`、`noImplicitReturns` 和 `allowUnreachableCode: false`；Product config 继续只定义 roots/cache 差异。
- 迁移顺序为 exact optional → indexed access → unreachable/override/return。每批在 Product 和 scripts 都通过后立即写入正式 config。
- Package emit 镜像六项实现语义。Installed consumer 只使用 `strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes`，不承接 implementation-only 控制流规则。

#### 2. Lint profile

| Severity | Rules | 含义 |
| --- | --- | --- |
| `error` | `typescript/strict-boolean-expressions`、`typescript/only-throw-error`、`typescript/no-confusing-void-expression`、`typescript/use-unknown-in-catch-callback-variable` | 直接约束不可信语义；`only-throw-error` 取代范围更窄的 `no-throw-literal` |
| `warning` | `typescript/prefer-nullish-coalescing`、`typescript/prefer-optional-chain`、`typescript/prefer-readonly`、`no-promise-executor-return` | 优化、惯用表达或控制流建议；由现有 `--deny-warnings` 保持阻断 |

选定规则使用当前锁定 Oxlint/tsgolint 的默认 rule options；只有实施诊断证明默认值与行为 owner 冲突时，才在本 Change 中记录并采用最窄配置，不以关闭规则或批量 suppression 作为默认处理。

#### 3. Suppression 与 ESLint 硬切换

- 两处 ESLint-spelled suppression 改为 exact-rule `oxlint-disable-next-line`，保留可复核理由并删除多余 enable。
- `.oxlintrc.json` 设置 `respectEslintDisableDirectives: false` 和 `reportUnusedDisableDirectives: "warn"`。
- 单点例外使用 Oxlint next-line directive；稳定文件类别例外使用窄 override；只有输入不属于 lint owner 时才使用 ignore pattern。
- Oxlint JSON 中的 `eslint(<rule>)` 是上游兼容 code，不是仓库 ESLint dependency，不在 Gate adapter 中重命名。

#### 4. 明确排除项

- Compiler 不采用只增加 index-signature 访问拼写约束的 `noPropertyAccessFromIndexSignature`，也不重复由 Oxlint 承接的 fallthrough、unused 和 exhaustiveness 规则。
- Lint 不采用当前与有意 sequential await、parser test strings、loop closures 或 source-aligned dynamic call 冲突的 `no-await-in-loop`、`no-template-curly-in-string`、`no-loop-func` 和 `no-useless-call`。
- Nursery 的 `typescript/no-unnecessary-condition` 不进入本次稳定 profile。
- Lint 不加载 Unicorn plugin 或采用 `unicorn/no-useless-promise-resolve-reject`：Oxlint 1.78 会随 `plugins: ["unicorn"]` 隐式启用 14 条 Unicorn correctness 规则；以 13 条 `off` 保留单条规则会固化升级脆弱的版本细节。观察到的 2 个位置不构成迁移义务。

#### 5. 实施顺序与现有入口

实施按 lint suppression/profile → lint 三批（`no-confusing-void-expression` → `strict-boolean-expressions` → 其它选定规则）→ exact optional → indexed access → compiler control flow → package/consumer 同步推进。每个 lint 批次在正式 scope lint、涉及行为的目标测试与受控负向输入通过后才视为闭合；位置数不改变任何规则、severity 或 owner。Typecheck/lint development commands 和 Gate identities 保持不变；package artifact 与 external-consumer 继续通过 `--all` 验收。规则由各自配置 owner 生效，Gate 只投影已验证的工具诊断，不重算或二次过滤结果。

### Resulting Impacts

- Exact optional 修复需要区分字段缺失和 present-`undefined`；indexed access 修复需要建立长度、key-presence、tuple 或相邻运行时不变量证据。
- 三个 unreachable 位置需要确认不承接 fallback/cleanup；零诊断 compiler/lint 规则启用后负责阻止未来退化。
- Promise executor 的正式重跑虽已无诊断，仍须证明 resolve/finish 后不继续执行的控制流，以及 cancellation、timeout 和 synchronization 时序保持不变。
- 修改 tests/test-support、公共类型或行为 owner 时，需要维护对应 Test Evidence、目标测试和文档影响审查。
- Development config、package emit 和 installed consumer 分别拥有不同证据；完整验收必须覆盖三者。

## Risks / Trade-offs

- 210 个 compiler 位置跨越多个 owner；分批降低审查混杂，但不会减少每个位置的语义处理责任。
- Compiler 无法证明的既有不变量需要在精确类型、runtime guard 和局部 assertion 之间判断；无条件 guard 和无证据 assertion 都会削弱结果。
- Warning 仍阻断可能被误解；workspace owner 必须明确 severity 是诊断分类而不是 Gate 让步。
- 锁定工具升级后，默认 rule options 可能发现新位置；升级仍需语义审阅，不进行批量自动修复。

## Open Questions

无阻断实施的开放问题。实施完成后若 Plan 距离或其它 active Change 改变受影响输入，重跑 compiler/lint 基线；位置变化不会自动改变已选规则、severity、profile 或 suppression owner。
