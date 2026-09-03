# Tasks

按 stable owner/Decision、source identity、private lifecycle、Product contract 和分层 evidence 的顺序推进。checkbox 只能依据已经完成的实现与直接验证勾选；Plan 不授予 Decision lifecycle、archive 或未列出的实现授权。

## Readiness

- [x] 0.1 复核 Lizard `1.24.0` tag source、root provenance/current evidence、`lizardcomplextags`/`lizardnd` ranges 与当前 27-reader/55-suffix mapping；确认 ND default `7`、all-reader scope、CCN Record-only explanation 与 8-item message bound 未被 stable owner 反驳。
- [x] 0.2 复核 `functionMetrics` options/limits、measurement DTO、findings/waivers/Records/final data、private façade/adapter boundary、source identity/deviation guards 及相邻 tests；运行 `bun run decisions -- check`，确定 selected bodies 从 deferred 变为 translated 时所需的 Decision successor/evolution。
- [x] 0.3 按 `test-evidence-review` 读取 `docs/testing.md`、Case maintenance owner、受影响 current Cases 和相邻 tests；修改任何 native test node/body/Case Owner/Proves 前运行 `bun run test-evidence -- check --root .`，记录必须维护的 Cases 与最窄 test entrypoints。
- [x] 0.4 建立 fixed-tag differential inputs 和 expected oracle observations，覆盖每个 reader family/suffix、normal/edge/malformed source、anonymous/function boundaries、CCN contributor token/line order，以及 ND 的 `else if`、ternary、每个 condition 的第一个/后续 logical operator、bracket/indent closure 与 per-function reset。

## Implementation

- [x] 1.1 翻译 `lizardcomplextags.py` 与 `lizardnd.py` 到 Check-private analyzer targets，保留 source processor order 与 ND lifecycle；以 typed host seams 承接 source dynamic state/patching，不公开 name-based loader/array/plugin surface，也不采用其它 optional body。
- [x] 1.2 更新 `licenses/lizard-1.24.0-provenance.json`、selected target headers/SPDX/legal material、source identity/deviation mapping 与 extension lifecycle corpus，使 selected pair 成为 translated，所有其它 optional bodies 继续 deferred/no registration。
- [x] 1.3 扩展 private FunctionInfo / façade analysis 以保留完整有序 complexity contributors 与 max nesting depth；让唯一 Product adapter 映射必要的 `nestingDepth` 与 CCN explanation facts，保持 exact-input、whole-batch failure 与 unsupported-input boundaries，禁止 port 外 deep imports。
- [x] 1.4 将 ND 闭合为 public `limits.nestingDepth.maximum`（default `7`）：实现 authoring/resolution/validation/deep-freeze、effective strictest-area selection、`nesting-depth` Finding metric、stable waiver identity/audit、Record/message/final-data parsing、exports、guide 和 examples；所有 enabled readers 必须提供 trusted parity facts，不能用静默 zero/null fallback。
- [x] 1.5 将 `complextags` 映射为仅 CCN-over-limit Finding 的 immutable complete Product Record contributor sequence；实现最多 8 项与准确 remainder 的 human message，并证明不改变 CCN numeric limit、metric identity、waiver reconciliation、settlement 或 final-data schema，且不创建 standalone explanation Records。
- [x] 1.6 在 selected bodies 首次成为 runtime behavior 前，按 Decision Records 建立并审核 required successor/evolution：只记录 selected pair 的 long-term exception、其余 bodies 的持续 deferred 状态与 private/no-plugin boundary；source/runtime/docs/tests 成为 current facts 后才可 mark aligned。
- [x] 1.7 新增或更新 source-parity、port façade/adapter、options/validation、waiver/Record/message/final-data、integration/resource/cancellation/determinism/performance tests；按 current test strategy 维护受影响 Case owner/Proves，不创建没有 direct entities 的 planned Case。
- [x] 1.8 更新 `docs/checks/function-metrics.md`、`docs/scanner-dependencies.md` 与必要 stable owner references，说明 ND semantics/default/limit/waiver、all-reader support、CCN contributor Record/message boundary、无 public extension mechanism 和 retained deferred bodies。

## Verification

- [x] 2.1 运行 selected-body direct source parity 和 lifecycle tests against fixed 1.24 oracle；证明 contributor token/line/source order 及 task 0.4 列出的全部 ND semantics 在所有 reader families 上成立，包括 malformed 和 anonymous/function boundaries。
- [x] 2.2 运行 port façade/adapter 与 functionMetrics integration tests，证明 27 readers/55 suffixes、exact-input/unsupported-input、whole-batch failure、resource/cancellation、determinism 和 no-partial-analysis 未回归。
- [x] 2.3 运行 options/validation/resolution、effective-area limit、finding policy、waiver reconciliation/audit、Record/message/final-data 与 public entry tests，证明 default `7`、positive-safe-integer rejection、`nesting-depth` settlement 及 CCN explanation 的 Record-only/bounded-message behavior。
- [x] 2.4 已对 current baseline 运行 representative workload comparison；design 的“性能与资源比较”记录吞吐、peak resource/cancellation boundary 与 Record/message payload impact。该观察确认现有性能/资源证据未显示资源或取消契约回归，同时保留本机 +14.3% latency 与 +2.36 MiB RSS trade-off；它不建立跨机器 budget。
- [x] 2.5 在 test/Case docs changed 后运行 `bun run test-evidence -- check --root .`；运行最窄 target tests、format、typecheck、lint、dependency/public-entry 和 provenance/legal/identity guards，再运行 `bun run verify:vibe-check-workspace:required`。
- [x] 2.6 在 public contract、source provenance、Decision 和 multi-owner evidence 闭合后，运行 `bun run verify:vibe-check-workspace:full`、`bun run decisions -- check` 和 `bun run change-plan -- check changes/adopt-selected-lizard-extensions`；逐项复核 proposal success criteria、Decision alignment、open questions 与实际 evidence，再请求 archive authorization。
