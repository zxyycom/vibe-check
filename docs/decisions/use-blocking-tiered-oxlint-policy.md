---
title: 采用阻断且分级的 Oxlint 质量策略
id: 260911-use-blocking-tiered-oxlint-policy
status: active
alignment: aligned
createdAt: 2026-09-11T10:05:37Z
purpose: 让规则严重度表达风险类别，同时保持所有正式 lint 诊断阻断 Gate
background: 现有 lint 已拒绝 warning，但规则集与 suppression 仍未明确区分优化建议及 Oxlint 原生责任
decision: 按错误风险与优化建议分级报告，统一使用 Oxlint 原生 suppression 并拒绝 ESLint directive
tags:
  - configuration
  - workflow-policy
relations: []
---

## 目的

- 让 lint 诊断的 `error` / `warning` 表达规则防护的风险类型，而不暗中改变正式 Gate 的验收强度。
- 用少量有独立价值的 type-aware 和优化规则防止回归，避免整类开启 `perf`、`pedantic` 或 `style` 所产生的无差别噪音。
- 让 lint 的规则、执行、诊断与例外都由 Oxlint 责任边界承接，不依赖本项目不使用的 ESLint，也不建立第二套 project Finding waiver。

## 背景

- 形成本判断时，根 `.oxlintrc.json` 是 TypeScript lint rule set 的唯一 owner；`scripts/development/lint.ts` 对 Product 和 scripts 都执行锁定的 Oxlint 并传入 `--deny-warnings`。Project Gate 复用该 invocation，在 JSON failure Records 中保留 Oxlint 的 `error` 或 `warning` severity，Check 成败仍由进程结果决定。
- 形成时以 Oxlint 1.78 对微型输入验证：规则配置为 `warn` 并传入 `--deny-warnings` 时，JSON 仍报告 `severity: "warning"`，同时进程退出码为 1。因此诊断分级与阻断性不需要由项目 adapter 重新映射。
- 形成时正式 type-aware profile 的选定规则 inventory 为：`typescript/no-confusing-void-expression` 162 个位置/53 个文件、`typescript/strict-boolean-expressions` 103/50、`typescript/prefer-nullish-coalescing` 21/15、`typescript/prefer-optional-chain` 12/10、`typescript/only-throw-error` 2/2、`typescript/prefer-readonly` 2/2；`typescript/use-unknown-in-catch-callback-variable` 为 0。位置数只用于安排语义迁移和验证，不是 Bug 数，也不构成关闭已选规则的理由。
- `no-promise-executor-return` 的形成时 inventory 为 Product 10、scripts 2；实施后的正式重跑为 0，仍以目标测试证明 Promise 语义未回归。
- 形成时，`unicorn/no-useless-promise-resolve-reject` 虽观察到 2/2，但 Oxlint 1.78 的 Unicorn plugin 会隐式启用 14 条 correctness 规则，不能稳定地只加载该规则。
- 形成时，整个 `perf` 类别主要产生 67 处 `no-await-in-loop` 和 1 处 `no-useless-call`；前者与项目中依赖顺序或限制并发的 loop 普遍冲突，后者命中 source-aligned analyzer 保留的 receiver seam。
- 形成时仓库没有 ESLint dependency、config 或 invocation，但 Product 仍有两个使用 `eslint-disable*` 语法的 suppression 位置；Oxlint 默认兼容该语法。形成时的 unused-disable 检查还能发现其中一个多余 `eslint-enable` directive。
- Vibe Check 的 Finding waiver 用于拥有完整 Finding 集合和稳定语义 identity 的 Product Check。Gate lint 是由 Oxlint exit status 决定的 external process Check，其诊断 Record identity 含易变的行列位置，因此不具备并入该 waiver 边界的责任条件。

## 决策

- 采用: 保留 Product/scripts 的 `--deny-warnings`，不建立非阻断 lint profile。`.oxlintrc.json` 中的 `error` 表示直接防止不可信语义的规则，`warn` 表示要求显式处理的优化、惯用表达或控制流建议；两者在正式 lint 和 Gate 中都阻断。
- 采用: 首批以 `error` 开启 `typescript/strict-boolean-expressions`、`typescript/only-throw-error`、`typescript/no-confusing-void-expression` 和 `typescript/use-unknown-in-catch-callback-variable`。`typescript/only-throw-error` 承接并取代现有范围更窄的 `no-throw-literal`，避免同一问题重复报告。
- 采用: 首批以 `warn` 开启 `typescript/prefer-nullish-coalescing`、`typescript/prefer-optional-chain`、`typescript/prefer-readonly` 和 `no-promise-executor-return`。所有已选规则按正式 inventory 分批闭合；`use-unknown-in-catch-callback-variable` 在开启后防止新增退化，Promise executor 的正式重跑保持 0 并以目标测试证明语义未回归。
- 采用: 不整类开启 `perf`、`pedantic`、`style`、`nursery` 或 Unicorn correctness；不采用当前与有意顺序 await、parser test string、loop closure 或 source-aligned dynamic call 冲突的 `no-await-in-loop`、`no-template-curly-in-string`、`no-loop-func` 与 `no-useless-call`；`typescript/no-unnecessary-condition` 在 nursery 阶段也不进入正式 profile。也不加载 Unicorn plugin 或采用 `unicorn/no-useless-promise-resolve-reject`：用 13 条 `off` workaround 抵消其 14 条隐式 correctness 规则会把当前版本细节固化为升级脆弱配置，观察到的 2 个位置不构成迁移义务。
- 采用: 将两处 ESLint-spelled suppression 改为范围最小、指定 exact rule 且带可复核理由的 `oxlint-disable-next-line`；删除多余 enable，并设置 `options.respectEslintDisableDirectives: false`。Oxlint 自身在 JSON `code` 中使用的 `eslint(<rule>)` 兼容命名是上游诊断协议，不表示仓库使用 ESLint，不在 project adapter 中重命名。
- 采用: 设置 `options.reportUnusedDisableDirectives: "warn"`；由现有 `--deny-warnings` 使失效 suppression 阻断验收。单个有事实依据的例外使用 Oxlint 原生 next-line directive，稳定文件类别的例外使用窄范围 `.oxlintrc.json` override；只有根本不应进入 lint 的生成或非拥有输入才使用 ignore pattern。
- 采用: 不在 Gate adapter 或 Vibe Check Finding waiver 中二次过滤 Oxlint 诊断。规则选择、severity、scoped override、directive audit 和忽略输入继续由 `.oxlintrc.json` 与 Oxlint invocation 拥有，Gate 只投影已验证的工具诊断。
