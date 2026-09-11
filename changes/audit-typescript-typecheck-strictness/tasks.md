# Tasks

Implementation 已完成；Verification 保留为联合验收出口。任务按配置、owner 同步和验证证据组织，checkbox 只记录已有证据的进度。

## Readiness

- [x] 0.1 恢复 Product、scripts、package emit 和 installed-consumer 的 compiler config、roots、Gate identities 和当前基线；对候选规则去重并按 Product implementation、Product tests/support、scripts/tests 分区。
- [x] 0.2 以能否拒绝错误程序为首要标准，完成 index-signature 微型对照和 consumer compatibility 验证，建立 Decision `260911-adopt-soundness-oriented-typescript-typecheck-profiles`。
- [x] 0.3 恢复 `.oxlintrc.json`、Product/scripts lint invocation、Gate JSON projection 和 Finding waiver 边界；验证 warning 在 `--deny-warnings` 下保留 severity 并返回失败。
- [x] 0.4 完成候选 lint 规则和 suppression inventory 基线，审阅 `perf` / `pedantic` 代表诊断，建立 Decision `260911-use-blocking-tiered-oxlint-policy`。
- [x] 0.5 根据 Plan 距离和其它 active Change 重跑 compiler、lint 和 unused-directive 基线，用受控负向输入确认每项新 lint 规则已注册并使用预期 options；修改 test/test-support 前运行 `bun run test-evidence -- check --root .` 并查询受影响 owner 的当前 Cases。

## Implementation

- [x] 1.1 将 progress-rendering 中两处 `eslint-disable*` 改为带理由的 exact-rule Oxlint next-line directive，并删除多余 `eslint-enable`。
- [x] 1.2 设置 `reportUnusedDisableDirectives: "warn"` 和 `respectEslintDisableDirectives: false`，确认现有 Oxlint directives 仍生效且 ESLint directives 不再生效。
- [x] 1.3 在 `.oxlintrc.json` 按既定 severity 注册全部选定规则：error 的 `strict-boolean-expressions`、`only-throw-error`、`no-confusing-void-expression`、`use-unknown-in-catch-callback-variable`（并删除 `no-throw-literal`），以及 warning 的 `prefer-nullish-coalescing`、`prefer-optional-chain`、`prefer-readonly`、`no-promise-executor-return`。
- [x] 1.4 复核 `no-promise-executor-return` 原 inventory（Product 10、scripts 2）的正式重跑保持 0，并以 Promise settlement、cancellation、timeout 和 synchronization 的目标测试证明语义未回归。
- [x] 1.5 闭合 `typescript/no-confusing-void-expression` 的 162 个位置/53 个文件；按行为 owner 分批修复并在每批后运行涉及的目标测试和正式 lint scope。
- [x] 1.6 闭合 `typescript/strict-boolean-expressions` 的 103 个位置/50 个文件；按行为 owner 分批修复并在每批后运行涉及的目标测试和正式 lint scope。
- [x] 1.7 闭合其它选定规则：`prefer-nullish-coalescing` 21/15、`prefer-optional-chain` 12/10、`only-throw-error` 2/2、`prefer-readonly` 2/2；复核 `use-unknown-in-catch-callback-variable` 保持 0。位置仅用于分批，不以其数量认定 Bug 或关闭规则。
- [x] 1.8 修正 Product implementation 的 `exactOptionalPropertyTypes` 诊断：区分 absent 和 present-`undefined`，仅在领域允许时扩大 property type，其余对象构造省略字段。
- [x] 1.9 修正 Product tests/support 和 scripts/tests 的 exact optional 诊断；Product/scripts 同时通过后在根 `tsconfig.json` 开启该规则。
- [x] 1.10 修正 Product implementation 的 `noUncheckedIndexedAccess` 诊断，在 data boundary、parser、scheduler 和 package Check owner 中建立可复用的长度、key-presence 或 tuple 证据。
- [x] 1.11 修正 Product tests/support 和 scripts/tests 的 indexed-access 诊断，保持 argv、parser、package tooling 和 Gate material 的边界拒绝及错误映射；两个 scope 通过后开启该规则。
- [x] 1.12 核对并删除三个 package Check execution 的不可达尾部代码；开启 `allowUnreachableCode: false`、`noImplicitOverride: true` 和 `noImplicitReturns: true`。
- [x] 1.13 在 package artifact emit 中镜像六项 compiler 语义，在 installed-consumer config 增加 `exactOptionalPropertyTypes`，不增加 compiler invocation 或重复安装。
- [x] 1.14 更新 workspace tooling、package artifact/lifecycle 和实际受影响的 Gate diagnostics owner，说明 profiles、severity/阻断性、consumer 差异和 suppression 边界。

## Verification

- [x] 2.1 对每个修改的行为 owner 运行最窄目标测试；覆盖 Promise/progress-rendering/process 时序，并在测试材料修改后重跑 `bun run test-evidence -- check --root .`。
- [x] 2.2 运行 Product/scripts typecheck、package artifact 目标验收和 external-consumer type acceptance；保留代表性负向类型证据或诊断修复前后对照。
- [x] 2.3 对 `no-confusing-void-expression`、`strict-boolean-expressions` 和其它选定规则三批分别运行正式 Product/scripts lint 与涉及行为的目标测试；再用受控输入证明 warning severity + nonzero exit、ESLint directive 无效和 unused Oxlint directive 阻断，并运行 development quality target 与 Gate Oxlint projection tests。
- [x] 2.4 搜索 `src/**`、`scripts/**`、根 config 和 package metadata，确认没有 ESLint dependency、配置、invocation 或 `eslint-disable*` authoring 残留。
- [x] 2.5 运行 format check、受影响 docs validation、`bun run decisions -- check` 和当前 Change check；审阅局部 diff 没有 baseline、项目侧 lint waiver、无证据 assertion 或无关重构。
- [x] 2.6 运行默认 `bun run check` 和 `bun run check -- --all`，核对现有 Gate identities、package candidate、artifact emit 和 installed-consumer acceptance 全部通过。
- [x] 2.7 由非实施代理根据实际 diff 反查 public/internal owner 影响；完整方向成为当前事实后，将两条 Decision 标记为 aligned。
