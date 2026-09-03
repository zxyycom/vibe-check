# Proposal

本 Change 在唯一 Check-private Lizard port façade 中实现可验证且可回退的 reader 快速解析，并保持 source-aligned 翻译主体零修改。

## Why

固定 Lizard 1.24 representative batch 已确认，当前 façade 每个文件调用上游对齐的 ordered reader registry，3,456 个文件累计执行 48,384 次 filename regex test。该路径约占 Bun profile 的 40.8% inclusive CPU；仅预编译 regex 收益很小，而输出等价的 suffix-index 反事实显示约 45%–47% 的 operation 回收方向。上游结构必须继续一比一同步，因此不能把性能修复揉进 registry、reader 或 core。

## Outcome

常规、已证明安全的 filename 由手写 façade 通过 source-order-derived index 直接解析 reader，未覆盖输入仍回退原 `get_reader_for`；两个 façade API、Lizard oracle、Product 边界和完整 filename 行为保持不变，source-aligned registry/core 零修改，并形成正式 before/after 性能证据。

## Scope

### Intended Change

- 在 `analyzer/port-facade.ts` 内建立唯一私有 resolver 和只读 suffix index，由 `languages()` source order 派生并保持重复 suffix first-wins。
- 只对经测试证明安全的完整 filename grammar 使用 O(1) fast path；Unicode、line terminator 和任何未覆盖形状回退原 `get_reader_for`。
- 让 capability 与 analysis 共用 resolver；不新增 public/subpath API，不向 Product adapter 暴露 reader constructor。
- 更新 current deviation、测试 Case、Decision alignment 与正式 15-block ABBA evidence。

### Resulting Impacts

- `port-facade.ts` 成为带显式 host performance deviation 的普通项目代码，继续接受 lint、format、typecheck 和边界验证，不获得 translated-source 质量例外。
- façade tests 必须把 fast-path grammar、fallback 和原 registry identity 作为一个可证伪的边界行为；oracle、source identity 和 extension lifecycle 继续证明 translated body 未漂移。
- current deviation owner 必须记录该非机械差异及未来 upstream-sync review trigger；root source/range provenance 不因手写 façade 优化而复制或改写。
- performance evidence 只证明固定 host/runtime/workload 的 observation，不建立跨主机 hard budget，也不授权 tokenizer/core 优化或 runtime 切换。

## Success Criteria

- 原 `reader-registry.ts`、`CodeReader.matchFilename`、readers、shared、core 和 extension protocol 零 diff。
- 两个 façade API 共用 resolver；27 readers、56 declared entries、55 canonical suffixes及 mixed case、Unicode folds、line terminators、多点/path separator、无/未知 suffix 均与原 registry/既有 boundary 一致。
- 固定 Lizard 1.24 oracle、malformed、reader mapping、source identity、extension protocol与 Product adapter tests保持通过；package public surface不新增 façade/reader能力。
- 同一 manifest 的正式 15-block ABBA before/after 输出完全相同，并证明 fast path 在本机 Bun 1.3.14 representative workload 上有稳定 wall-time 改善。
- Decision、deviation owner、functionMetrics 当前说明和 Test Evidence 均与实际实现一致；typecheck、lint、required/full Gate 通过。

## Affected Owners

- `src/package-checks/function-metrics/analyzer/port-facade.ts` 与相邻 façade tests：私有 resolver 和 Lizard-domain boundary。
- `src/package-checks/function-metrics/analyzer/fixtures/lizard-1.24.0/evidence/source-alignment-deviations.md`：host deviation 与 upstream-sync review trigger。
- `docs/checks/function-metrics.md`、`docs/scanner-dependencies.md`：current private port/adapter 边界与支持语义。
- `docs/testing/cases/function-metrics-analyzers.md`：façade boundary 的 current semantic evidence。
- `docs/decisions/use-a-verified-fast-path-for-lizard-reader-resolution.md`：跨 Change 方向与 alignment。
- `docs/investigations/diagnose-lizard-typescript-port-performance-gap.md` 及资源：根因和形成时性能证据。
