# Design

本设计在 Function Metrics measurement owner 内，将两处高密度领域判断重组为可局部推理的具名阶段。

## Context

- `docs/checks/function-metrics.md` 与 `docs/scanner-dependencies.md#owner-local-adapters` 规定：measurement 负责 admitted source 的 decode、资源和取消；Worker transport 必须 fail closed。
- `docs/testing/cases/check-owned-scanners.md` 将 encoding 和 Worker tests 映射为当前 Case。
- 当前 Gate quality finding 指向 `src/package-checks/function-metrics/measurement.ts` 中的 UTF-8 fallback decoder 和 Worker reply metric predicate。任务范围是实际消除这两项记录，不使用豁免，且仅涉及 Function Metrics measurement、其直接 tests/Cases 和本 Change artifacts。

## Goals / Non-Goals

目标是保持 Python `errors="ignore"` UTF-8 fallback、Worker response fail-closed validation 和 FunctionMetric shape 的现有可观察行为，同时将 sequence-specific decode 与 metric-shape subconditions 表达为可审查的具名职责。

非目标是改变 analyzer、scheduler、admission、execution transaction、公开 API、质量阈值或 Gate policy，或新增通用抽象。

## Decisions

### Intended Change

1. 将 fallback decoder 按 ASCII、two-byte、three-byte、four-byte UTF-8 sequence 的实际解码责任拆分为具名阶段。循环仅选择可完整解码的 sequence，或忽略一个无效 leading byte。
2. 将 Worker response metric predicate 拆分为 FunctionMetric identity、integer measurements 和 cyclomatic-complexity 子条件。整体 response 仍只接受 `analysis-failed` 或 complete metrics array；parent reply guard 不提前验证 `nestingDepth` 或 `complexityContributors`，后续 analysis 保持这两项字段的 fail-closed 责任。
3. 扩展现有 encoding/measurement tests，以有效边界、无效序列、parent reply 的 numeric-domain 与 extra-key 容忍行为证明连续；更新既有 Case 的 `Proves` 以反映当前证据。

### Resulting Impacts

- Decoder 拆分仍拒绝 overlong、surrogate、out-of-range、truncated 或孤立 continuation bytes，并逐一忽略无效 leading byte，使 fallback 输出与 Python `errors="ignore"` 一致；有效 initial BOM 和 fallback raw newline 行为不变。encoding test 覆盖这些分类的代表输入。
- Worker response validation 保持既有 staged fail-closed 边界：parent 仅要求 file/name、四个 safe-integer measurements 和 `{ source: "typescript-analyzer", value: null | safe integer }` CCN；缺失或无效字段不能成为 complete result。负安全整数和 top-level/metric/nested extra keys 继续可接受。`nestingDepth` 和 `complexityContributors` 不移入 parent guard，继续由后续 analysis 验证。直接 Worker tests 证明 source-tree adapter call 与 malformed request rejection；measurement-level response evidence 证明 reply boundary。
- 测试正文和 Case `Proves` 的变化维护 `docs/testing/cases/check-owned-scanners.md` 的现有 Case，并在修改前后执行完整 Test Evidence closure。
- 本 Change artifacts、product typecheck/lint/format、最窄 tests、Change Plan check 和定向 repository Function Metrics quality check 共同构成验收证据；不运行完整 Gate 或 `--all`。

## Risks / Trade-offs

- 逐字节 UTF-8 ignore 语义对 invalid prefix 后的剩余 byte 处理敏感。因此不使用会插入 replacement character 的 decoder fallback；测试以代表序列验证 sequence-specific boundary。
- shape guard 若扩张到后续 analysis 的嵌套 FunctionMetric 字段，会改变当前 staged validation。因此测试固定 parent guard 的字段、numeric-domain 和 extra-key 边界。
- 新增 helper 分别承接独立 sequence 或 shape 不变量，而不是转发 wrapper。

## Open Questions

无。
