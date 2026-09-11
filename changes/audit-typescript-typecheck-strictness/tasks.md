# Tasks

任务按证据刷新、Oxlint/ESLint 迁移、compiler 迁移、稳定 owner 同步和联合验收推进；每批规则在当前诊断闭合后进入正式配置。

## Readiness

- [x] 0.1 恢复 Product、scripts、package emit 和 installed-consumer 的 compiler config、roots、Gate identities 和当前基线；对候选规则去重并按 Product implementation、Product tests/support、scripts/tests 分区。
- [x] 0.2 以能否拒绝错误程序为首要标准，完成 index-signature 微型对照和 consumer compatibility 验证，建立 Decision `260911-adopt-soundness-oriented-typescript-typecheck-profiles`。
- [x] 0.3 恢复 `.oxlintrc.json`、Product/scripts lint invocation、Gate JSON projection 和 Finding waiver 边界；验证 warning 在 `--deny-warnings` 下保留 severity 并返回失败。
- [x] 0.4 完成候选 lint 规则和 suppression inventory 基线，审阅 `perf` / `pedantic` 代表诊断，建立 Decision `260911-use-blocking-tiered-oxlint-policy`。
- [ ] 0.5 根据 Plan 距离和其它 active Change 重跑 compiler、lint 和 unused-directive 基线，用受控负向输入确认每项新 lint 规则已注册并使用预期 options；修改 test/test-support 前运行 `bun run test-evidence -- check --root .` 并查询受影响 owner 的当前 Cases。

## Implementation

- [ ] 1.1 将 progress-rendering 中两处 `eslint-disable*` 改为带理由的 exact-rule Oxlint next-line directive，并删除多余 `eslint-enable`。
- [ ] 1.2 设置 `reportUnusedDisableDirectives: "warn"` 和 `respectEslintDisableDirectives: false`，确认现有 Oxlint directives 仍生效且 ESLint directives 不再生效。
- [ ] 1.3 以 error 开启 `typescript/strict-boolean-expressions`、`typescript/only-throw-error`、`typescript/no-confusing-void-expression` 和 `typescript/use-unknown-in-catch-callback-variable`，并删除 `no-throw-literal`。
- [ ] 1.4 修正 Product 10 个、scripts 3 个 `no-promise-executor-return` 诊断，保持 settlement、cancellation、timeout 和 synchronization 语义，然后以 warning 开启该规则。
- [ ] 1.5 以 warning 开启 `typescript/prefer-nullish-coalescing`、`typescript/prefer-optional-chain`、`typescript/prefer-readonly` 和 `unicorn/no-useless-promise-resolve-reject`。
- [ ] 1.6 修正 Product implementation 的 `exactOptionalPropertyTypes` 诊断：区分 absent 和 present-`undefined`，仅在领域允许时扩大 property type，其余对象构造省略字段。
- [ ] 1.7 修正 Product tests/support 和 scripts/tests 的 exact optional 诊断；Product/scripts 同时通过后在根 `tsconfig.json` 开启该规则。
- [ ] 1.8 修正 Product implementation 的 `noUncheckedIndexedAccess` 诊断，在 data boundary、parser、scheduler 和 package Check owner 中建立可复用的长度、key-presence 或 tuple 证据。
- [ ] 1.9 修正 Product tests/support 和 scripts/tests 的 indexed-access 诊断，保持 argv、parser、package tooling 和 Gate material 的边界拒绝及错误映射；两个 scope 通过后开启该规则。
- [ ] 1.10 核对并删除三个 package Check execution 的不可达尾部代码；开启 `allowUnreachableCode: false`、`noImplicitOverride: true` 和 `noImplicitReturns: true`。
- [ ] 1.11 在 package artifact emit 中镜像六项 compiler 语义，在 installed-consumer config 增加 `exactOptionalPropertyTypes`，不增加 compiler invocation 或重复安装。
- [ ] 1.12 更新 workspace tooling、package artifact/lifecycle 和实际受影响的 Gate diagnostics owner，说明 profiles、severity/阻断性、consumer 差异和 suppression 边界。

## Verification

- [ ] 2.1 对每个修改的行为 owner 运行最窄目标测试；覆盖 Promise/progress-rendering/process 时序，并在测试材料修改后重跑 `bun run test-evidence -- check --root .`。
- [ ] 2.2 运行 Product/scripts typecheck、package artifact 目标验收和 external-consumer type acceptance；保留代表性负向类型证据或诊断修复前后对照。
- [ ] 2.3 运行 Product/scripts lint；用受控输入证明 warning severity + nonzero exit、ESLint directive 无效和 unused Oxlint directive 阻断，并运行 development quality target 与 Gate Oxlint projection tests。
- [ ] 2.4 搜索 `src/**`、`scripts/**`、根 config 和 package metadata，确认没有 ESLint dependency、配置、invocation 或 `eslint-disable*` authoring 残留。
- [ ] 2.5 运行 format check、受影响 docs validation、`bun run decisions -- check` 和当前 Change check；审阅局部 diff 没有 baseline、项目侧 lint waiver、无证据 assertion 或无关重构。
- [ ] 2.6 运行默认 `bun run check` 和 `bun run check -- --all`，核对现有 Gate identities、package candidate、artifact emit 和 installed-consumer acceptance 全部通过。
- [ ] 2.7 由非实施代理根据实际 diff 反查 public/internal owner 影响；完整方向成为当前事实后，将两条 Decision 标记为 aligned。
