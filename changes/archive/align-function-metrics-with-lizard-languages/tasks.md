# Tasks

所有任务均已以实现、目标测试、workspace validation 与完整 Gate 证据闭合；本文件保留为已归档的实施记录。

## Readiness

- [x] 0.1 已读取 function-metrics/Lizard adapter、target selection、collection与相邻 tests，确认 TypeScript/Rust-only filtering、exact-input handoff、output ownership，以及 functionMetrics 没有 cache 或 cache identity。
- [x] 0.2 已从本地 pinned Lizard 1.23.0 official reader registry 恢复 55 个 lower-cased language/extension mapping，并将大小写、`.cjs` 与 Markdown/JSON/YAML/no-extension fallback rejection 落实为可复核 target-selection evidence。
- [x] 0.3 已将 `align-function-metrics-inputs-with-lizard-supported-languages.md` 建立为 active unaligned；它不改变 adapter CLI protocol 或 Lizard-to-TypeScript port Plan 的后置范围，且实现后已完成 alignment 核对。

## Implementation

- [x] 1.1 已在 adapter-owned module 实现 immutable official extension eligibility mapping，并移除 TypeScript/Rust-only predicate。
- [x] 1.2 已将 target selection 与 exact-input handoff 采用完整 supported set，保留 unsupported path rejection，阻止 CLike fallback input；未引入 cache identity 或 invalidation work。
- [x] 1.3 已更新 table-driven eligibility evidence 与受影响的 function-metrics/scan-scope documentation；未虚构每种语言的独立 parser fixture，machine schema/examples 未变。

## Verification

- [x] 2.1 已运行 function-metrics local suite 13 项（constructor 3、target 1、Lizard scanner 5、parser 4），覆盖 supported set、unknown Markdown/text rejection、TypeScript/Rust regression、exact-input、area overlap 及 no-input/failure boundaries。
- [x] 2.2 已运行 typecheck、lint、format、docs、diff 及 `bun run test-evidence -- check --root .`；test-evidence 报告 281 entities / 84。
- [x] 2.3 已运行 `bun run verify:vibe-check-workspace:required`；最新完整 Gate（required + package tests）36/36，其中 `Bun Product function metrics tests` passed，且 function metrics 无 finding。stable owner/doc 已核对，Decision 已对齐，并通过 decisions 与 Change checks。
