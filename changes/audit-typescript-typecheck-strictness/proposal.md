# Proposal

本 Plan 统一增强 Vibe Check 的 TypeScript compiler 与 Oxlint 静态检查，使错误风险和优化建议都能在现有开发与 Gate 入口中得到明确、阻断性的验证。

## Why

现有 TypeScript `strict` 基线未覆盖索引缺失、optional 字段精确性和部分控制流风险。候选 compiler profile 在当前基线上产生 210 个去重诊断、涉及 89 个文件，说明这些风险已跨越 Product、tests 和 repository scripts，需要按行为 owner 分批闭合。

实施前 Oxlint 已阻断 warning，但未以 severity 区分错误风险与优化建议。选定规则的迁移 inventory 和 Unicorn 排除理由由 [Design](design.md) 保存；位置数只用于分批，不等同于 Bug 数，也不改变规则选择。`no-promise-executor-return` 的正式重跑已归零，仍须以语义测试证明闭合。仓库还保留两处 ESLint suppression 写法，尽管项目没有 ESLint dependency、配置或 invocation。

## Outcome

项目获得一份统一的 TypeScript 静态 assurance：源码、脚本和 package emit 共享 compiler soundness 底线，installed consumer 使用与公共声明责任相符的独立 profile；Oxlint 用 error 和 warning 表达不同风险类型，但两者都阻断；lint 例外只使用 Oxlint 原生机制，失效例外可被检测，ESLint directive 不再生效。

## Scope

### Intended Change

| 范围 | 预期调整 |
| --- | --- |
| Source compiler | 在根 `tsconfig.json` 的 `strict` 之外开启 `noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noImplicitOverride`、`noImplicitReturns` 和 `allowUnreachableCode: false`，由 Product config 继续继承。 |
| Package compiler | 在 package artifact 的显式 `--ignoreConfig` emit 中镜像六项实现语义；installed consumer 在现有 `strict + noUncheckedIndexedAccess` 上增加 `exactOptionalPropertyTypes`。 |
| Lint error rules | 开启 `typescript/strict-boolean-expressions`、`typescript/only-throw-error`、`typescript/no-confusing-void-expression` 和 `typescript/use-unknown-in-catch-callback-variable`；由 `typescript/only-throw-error` 取代 `no-throw-literal`。 |
| Lint warning rules | 开启 `typescript/prefer-nullish-coalescing`、`typescript/prefer-optional-chain`、`typescript/prefer-readonly` 和 `no-promise-executor-return`；保留 `--deny-warnings`，因此 warning 仍阻断。 |
| Suppression | 将两处 `eslint-disable*` 改为精确的 Oxlint next-line directive，删除多余 enable，设置 `respectEslintDisableDirectives: false` 和 warning 级 `reportUnusedDisableDirectives`。 |
| Execution | 复用现有 typecheck/lint Gate identities、package artifact emit 和 external-consumer acceptance，不增加 runner、profile 或 Gate Check。 |

规则取舍分别由 Decisions [`260911-adopt-soundness-oriented-typescript-typecheck-profiles`](../../docs/decisions/adopt-soundness-oriented-typescript-typecheck-profiles.md) 和 [`260911-use-blocking-tiered-oxlint-policy`](../../docs/decisions/use-blocking-tiered-oxlint-policy.md) 持有；本 Plan 只实施其中已选定的规则与边界。

### Resulting Impacts

- Compiler 迁移需要处理 Product implementation 62 个、Product tests/support 41 个、scripts/tests 107 个去重诊断；修复必须区分真实边界缺陷、可建模状态和已有运行时不变量。
- `no-promise-executor-return` 正式重跑已无诊断，仍需要以 Promise settlement、abort、timeout 和 test synchronization 的目标测试证明修复没有改变控制流语义。
- 不加载 Unicorn plugin：它会隐式启用 14 条 correctness 规则，不能稳定地只加载 `unicorn/no-useless-promise-resolve-reject`；该规则观察到的 2 个位置不是本 Change 的迁移义务。
- ESLint directive 迁移会修改 progress-rendering 测试正文，因此需要维护 Test Evidence 并运行相邻 failure/lifecycle tests。
- Package emit、development config 和 installed-consumer profile承担不同责任，实施后需要分别验证，不能用其中一个入口代替另一个。
- 其它 active Change 若先修改公共 types、external-consumer fixture 或诊断高密度 owner，实施前需要基于当前 HEAD 重跑基线。

## Success Criteria

- Product/scripts 在正式配置下通过全部选定 compiler 和 lint 规则，没有诊断 baseline、广泛 suppression 或无证据 assertion。
- Package artifact emit 使用选定的六项 compiler 语义，installed consumer 在 `strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes` 下通过公共 imports、examples 和 declarations 验收。
- `no-promise-executor-return` 的正式重跑保持零诊断，且目标测试证明 Promise 语义未回归；受控输入证明每项新 lint 规则已注册并使用预期 options，warning 保留 warning severity 且因 `--deny-warnings` 返回失败。
- 仓库没有 ESLint dependency、配置、invocation 或 `eslint-disable*` directive；Oxlint 不接受 ESLint directive，unused Oxlint directive 会阻断。
- 受影响 owner 的目标测试、Test Evidence、typecheck、lint、format、文档/Decision 检查、默认 Gate 和 `bun run check -- --all` 全部通过，现有 Gate identities 和 selection 语义不变。
- 稳定 owner 能恢复 compiler/lint profiles、severity 与阻断性、suppression owner 和 consumer 边界；两条 Decision 在完整方向落地并核对后标记为 aligned。

## Affected Owners

- Compiler/lint configuration and development entry：`tsconfig.json`、`tsconfig.product.json`、`.oxlintrc.json`、`scripts/development/typecheck.ts`、`scripts/development/lint.ts` 和 `docs/tooling/workspace.md`。
- Product/scripts implementation and tests：诊断所在的 `src/**`、`scripts/**`、相应行为 owner 文档和 Semantic Cases。
- Package/Gate evidence：`scripts/package/artifact/**`、`scripts/package/candidate/external-consumer/**`、`scripts/project/gate/checks/oxlint-failure-records.*`、package lifecycle/artifact 文档和现有 Gate entries。
- Long-term rationale：上述两条 Decision 及其派生索引。
