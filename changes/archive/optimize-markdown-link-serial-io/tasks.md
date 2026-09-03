# Tasks

基于已保存的实施、测试、before/after、独立审核与 AI-ready/coding-style 收口证据，全部任务已完成；cold gate 未通过已作为本 Change 的复测结论保存，不被隐藏为成功。用户已授权按此边界归档；继续优化仍需新授权。

## Readiness

- [x] 0.1 复核活动 cache Decision、Markdown Link owner、现有 parse-facts cache code/tests 与 benchmark harness，确认 exact-bytes、strict-serial、default-disabled 与 current-settlement 不变量及目标测试入口。
- [x] 0.2 固定本轮 cold/warm/incremental before protocol：fixture seed/workload、cache cleanup/prewarm、5-sample median、环境采集、absolute/relative comparison 与当前 cold gate；复查时补充 archived harness identity、temporary-copy/precise-cleanup step 与 raw inner-command boundary。
- [x] 0.3 审阅 cold overhead 的局部候选并选择一个不引入 source skip、read-ahead、packed file 或 public-contract 变化的低风险优化；把被拒绝的方案和理由写入 design/evidence。

## Implementation

- [x] 1.1 实施所选 Link-owned parse-facts cache 局部优化，保持每个 source 的 exact-byte identity、per-entry atomic publication、best-effort fresh-parse fallback、取消边界与 current settlement。
- [x] 1.2 为受影响的 cache/strict-serial 语义添加或更新最窄测试与 Case evidence：disabled branch filesystem absence、exact-byte invalidation、malformed/I/O fallback、logical target accounting、取消和 source I/O 严格串行。
- [x] 1.3 检查局部 diff，并同步必要的 benchmark/reproducibility evidence、Change design 与 candidate patch；最终 patch 以 zero-context `--unified=0` 生成、以 `git apply --unidiff-zero --binary` 验证，避免嵌套 context 空行触发暂存 whitespace gate；archived harness 只作为历史 input，不修改长期 Decision，除非新事实确实要求另行决策流程。

## Verification

- [x] 2.1 已在同一 deterministic 1,000-source/160-target workload 上运行完整 cold/warm/incremental before/after，保存 samples、median、环境、absolute/relative comparison、cache footprint 和明确的 cold-gate 未通过结论。
- [x] 2.2 运行最窄 Link/cache tests、test-evidence check（如测试正文或 Case 改动触发）、typecheck/lint 及 owner 指定验证，证明 semantic parity、strict serial source I/O、exact-byte identity、failure/cancellation fallback 与 disabled-cache I/O absence；最新 Case evidence 为 383/383 entities mapped by 96 Cases，Case owner 文档不进入 candidate patch。
- [x] 2.3 已以 after evidence、raw command boundary、archived harness identity 和 cfe715d-to-candidate patch 形成复查后继报告并 `sync-index`；最终执行 candidate patch self-check、暂存 diff check、scoped/full investigations、Change check、docs validation 和适用的实现验证。
- [x] 2.4 独立 correctness reviewer 已 PASS 实现、测试、benchmark 方法与证据主张；后续 AI-ready/coding-style 仅作 RootProbe 精确 union、EndpointProbe 与 ExistingEndpointProbe 类型精化和 UTF-8 forged-hit test 独立化，未改 runtime bytes。已确认未把推断、Plan stage 或单一 timing 结果表述为事实或性能验收通过。
