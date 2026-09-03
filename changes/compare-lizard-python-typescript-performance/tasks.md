# Tasks

任务先锁定可比性与边界，再实现 developer-only measurement，最后以 raw evidence 审阅是否能够作出有条件结论；本轮不勾选任何实施或基准执行项。

## Readiness
- [ ] 0.1 复核 `d356dcb^` 的 historical Product invocation、Lizard 1.23 executable/API identity、exact-input/CSV parser/normalization 及可重建 toolchain；记录能否在隔离 worktree 复原 A，不能复原时记录禁止替代的 comparability boundary。
- [ ] 0.2 复核 current `5ff3149e689ad0cef789956bfab0de2baa8adf5a` measurement → Worker → adapter → façade chain、package staging与layout guard，选择并审计一个不会成为 Product/package/default-test source 的 analyzer-only harness placement；拒绝 scripts generic deep import或 public façade export。
- [ ] 0.3 定义并审阅 versioned workload manifest：A 的 1.23/current intersection、B 的 fixed Lizard 1.24 source material、C 的 current request/result digest，及 canonical metric ordering/equality/error categories和 resource-limit policy。
- [ ] 0.4 在目标 Linux x64 host 验证 runtime provisioning和 resource supervisor：记录 Python/Lizard/Bun versions、CPU/load/filesystem metadata，以 parent/child fixture验证 CPU与peak-RSS units/scope；两个 condition 无法取得同 scope process-tree CPU或RSS时，对应资源比较必须为 `not-comparable`，只保留 scoped diagnostics。
- [ ] 0.5 审阅 measurement protocol：cold/warm execution shape、uncounted warm-ups、至少15个完整seeded ABBA blocks/每侧至少30个valid samples、raw sample schema、median/p90/min/max/IQR/outlier display、paired log-ratio bootstrap CI、固定5% practical-equivalence band、互斥结论规则及清理/retention边界；确认该解释阈值不修改 Product budget或Gate blocker policy。

## Implementation
- [ ] 1.1 在 `scripts/development/**` 的明确开发 workflow 及其 stable documentation 中实现 opt-in comparison command、manifest validation、isolated temporary worktree lifecycle和 machine-readable evidence output；它不加入 Product API、package、normal test discovery或 default Gate。
- [ ] 1.2 实现并验证 path-specific private analyzer harness/launcher，供 B 与 C 在不扩张 production consumer、public export或 generic backend interface的前提下调用；更新 layout/package guard以 fail closed地保护该边界。
- [ ] 1.3 实现 A historical Product end-to-end driver：以 byte-identical fixture root运行 `d356dcb^` 与 current Product，canonicalize final metrics并在每个 workload先做 untimed equality preflight；缺少旧工具、version mismatch或输出差异输出 actionable non-comparable evidence。
- [ ] 1.4 实现 B fixed-Lizard-1.24 analyzer-only Python API/TypeScript port drivers，锁定输入/driver version、stable-sort canonical metrics并在 equality pass后进行 cold/warm samples；确保 Python/Lizard只存在于显式开发 driver而非 Product。
- [ ] 1.5 实现 C current Product decomposition instrumentation/driver，采集 read/decode、Worker start/transfer、adapter/port analysis和 total，并以 normal current invocation的 request/result digest校验；不改变 Product timing、resource、failure或 settlement behavior。
- [ ] 1.6 实现 per-sample supervisor和 result writer，保留 monotonic wall、user/system CPU、peak RSS及其 scope/unit、host/runtime/worktree identity、schedule/seed、raw outputs/digests和 failures；用受控 parent/child fixture验证 resource field解释，并在跨 condition scope不同时拒绝 CPU/RSS ratio与优劣结论。
- [ ] 1.7 实现统计与 summary renderer，保留所有 samples并显示 raw、with/without-IQR-outlier summaries、ABBA-block paired ratio与95% bootstrap CI、comparability状态和按固定5% band形成的互斥条件化结论；禁止把解释阈值或任何速度结果变成 Gate threshold、warning severity升级或 merge blocker。

## Verification
- [ ] 2.1 运行最窄 unit/integration tests，证明 manifest/identity validation、canonical equality、historic restoration failure、private-boundary guard、sample schema、ABBA pairing/bootstrap classification、statistics/outlier标记和 CPU/RSS resource-scope non-comparability均 fail closed；若改动 native test entities，同步完成 Test Evidence check。
- [ ] 2.2 在已验证的 Linux x64 host执行每层的 smoke workload和完整 cold/warm interleaved comparison；保留原始 evidence，确认每个已统计 condition先通过所需 equality preflight，且 A/B/C 不互相替代。
- [ ] 2.3 审阅结果与 manifests：仅在固定条件、版本、输出相等和统计规则满足时回答 Python/Lizard是否更快；否则明确为 inconclusive/not-comparable，并记录历史1.23→current1.24边界与未覆盖语言/平台。
- [ ] 2.4 运行受影响 owner tests、development lint/format/typecheck、package/privacy/layout validation与 `bun run change-plan -- check changes/compare-lizard-python-typescript-performance`；确认 Product exports、functionMetrics runtime、package contents和 Gate advisory/blocking policy没有变化。
- [ ] 2.5 若实现跨 Product、scripts、package或 Gate owner，运行 `bun run verify:vibe-check-workspace:required`；只有在交付/大范围验证需要时再运行 full，并在 evidence中区分它与 benchmark结果。
