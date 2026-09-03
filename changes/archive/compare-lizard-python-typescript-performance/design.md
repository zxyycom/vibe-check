# Design

本设计以三个严格标注的测量层而非单一语言结论，兑现开发/验证专用的 Python/Lizard 与 TypeScript analyzer 性能比较。它只获取和解释证据；不因任何结果优化 Product 外围，也不修改 source-aligned port。

## Context

- `d356dcb495941918c90e3a6606cb635262d50c8b` 是 hard-cut commit。其 first parent 的 `src/package-checks/function-metrics/lizard/scanner.ts` 对 admitted exact paths 同步执行一次 Python/Lizard command，参数为 `[...files, "--csv"]`，随后 `parser.ts` 解析并排序 Lizard 1.23 CSV；当时 `measurement.ts` 还先执行 Lizard availability check。它是 historical Product end-to-end baseline，而非 current owner。
- current `5ff3149e689ad0cef789956bfab0de2baa8adf5a` 固定 Lizard 1.24 TypeScript baseline。current `measurement.ts` 读取/解码 exact inputs、施加 8 MiB per-file/64 MiB aggregate limit、启动 one-shot Worker；Worker 调 adapter，adapter 是 `analyzer/port-facade.ts` 的唯一 production consumer。port 只接收 supplied in-memory source，不发现/读取路径。
- stable scanner/functionMetrics owners 明确禁止 Python/Lizard executable、subprocess、CSV、PATH/environment override、fallback 与 public scanner option 进入 Product。layout policy 也将 port façade 限为 Check-private production entry。
- `scripts/project/gate/runtime/performance-observation.ts` 为 matching Gate workload 追加 info/warning 而保持 Gate status；现有 five-sample baseline 是 Gate elapsed evidence，不是 analyzer comparison contract。archived replacement Change 的 resource spike 报告 wall/maxRSS observations，并明确没有 latency/RSS budget。
- 报告资源中保存本轮样本；其条件化结果不能从 implementation language、old observation 或 archive 推导，也不能跨 workload 外推。

## Goals / Non-Goals

**Goals**

- 为三种不同问题提供可重复且不可混淆的 measurement：迁移后用户可感知总成本、固定 semantic analyzer cost、以及 current Product stage attribution。阅读结果时必须先按 A/B/C、workload 与 cold/`warmed-operation` 定位，禁止把它们合成为单一语言性能结论。
- 让输入、canonical output、runtime/revision、measurement boundary、统计方法和非可比性均可审计，并支持重复运行而不污染 Product/Gate。
- 用最小的 developer-only harness 保持 production adapter-only boundary和 package privacy。

**Non-Goals**

- 不优化 analyzer 或 Product 外围、替换 runtime、改变 reader semantics、建立 backend abstraction、公开 façade、增加 Product CLI/`bin`、恢复 Python/Lizard/CSV/subprocess/fallback，或为 Worker 建 pool/cache。任何未来外围修复仍须由直接 profile 与同 protocol before/after evidence单独授权。
- 不把 benchmark 纳入 normal `bun test` discovery、required/full Gate、project timing baseline或 release/merge blocker；不由一次机器结果声明跨平台 SLO。
- 不把 historical 1.23 Product result描述为 fixed 1.24 analyzer parity，反之亦然；不在无法恢复旧 path 时制造替代 Product result。

## Decisions

### Intended Change

1. **Three named workloads with a common evidence envelope.**

   The developer command accepts a manifest-selected workload and writes machine-readable raw evidence plus a concise human summary outside Product/package output. Every sample records: layer and condition, manifest hash, source snapshot hash, git revision/worktree identity, command/API shape, runtime/tool versions, OS/kernel/architecture/CPU metadata, sample ordinal and interleaved schedule, wall elapsed, CPU user/system, peak-RSS value/unit/scope, status, normalized-output digest and comparability reason. A failure never becomes a zero or missing “fast” sample.

   - **A — historical Product end-to-end:** run old Product only in a disposable worktree at `d356dcb^` and current Product at the selected current revision against independently prepared but byte-identical project fixture roots. Measure the complete product invocation, including the old availability/subprocess/CSV path or current read/decode/Worker path as each truly exists. It answers migration-cost questions only after canonical final metrics agree for that workload. It always carries the 1.23→1.24 and boundary-change labels; unexpected differences make the affected workload `not-comparable`, not a reason to alter either Product.
   - **B — fixed Lizard 1.24 analyzer-only:** use a separately provisioned, version-pinned Python Lizard 1.24 API driver and a test/development-only current-port harness, both receiving the same already-decoded `{path, source}` manifest material. Normalize exactly the function fields consumed by Product — file, name, start/end line, NLOC, standard CCN and parameter count — then stable-sort and compare before timing statistics. This answers analyzer/runtime cost only; it intentionally excludes discovery, bytes/decode, Python CLI/CSV, Worker and Product settlement.
   - **C — current Product decomposition:** for the same current fixture, use benchmark-only outer seams to record normal Product total plus explicitly overlapping read/decode, direct port-façade harness and Worker diagnostics without altering Product behavior. Only one Worker roundtrip minus its own internal adapter+port duration is a mechanical difference; adapter mapping is null when it cannot be isolated. Verify every result digest. It never supplies historical equivalence.

2. **Isolation and boundary containment.**

   The implementation must first select a location verified by existing layout and package-inventory policies. The preferred shape is a narrowly named, development-only analyzer-root harness that may use same-root private internals, launched as a separate process by the development workflow; it is neither a production module nor a default test file and is excluded from package staging. If this cannot be proved without a new exception, use a targeted test-only equivalent or stop for a boundary decision. Scripts must not gain a general source import, the façade must not gain a public export, and no new production consumer may import it. A static guard/test proves these facts.

3. **Inputs and output comparison precede timing.**

   The manifest identifies a tiny TS/JS Product corpus and a B-only 27 reader-family representative normal+edge representative batch (64 deterministic virtual copies), with byte/file counts and source digest. A workload first runs an untimed equivalence preflight. A measures only the intersection that both historical/current Products can analyze; B requires exact Lizard 1.24 equality; C requires current final-output identity. Any known version-related deviation is named in the manifest/result rather than normalized away. Fixtures must remain within current resource limits unless a separately named resource scenario intentionally studies a limit boundary and is not compared to a normal scan.

4. **Fair execution and noise protocol.**

   Conditions use the same host, corpus, filesystem location class, power/load notes, process priority and declared runtime versions. Each condition receives one or more uncounted warm-ups, then at least 15 complete deterministic seeded ABBA blocks, yielding at least 30 valid measured samples per side; the schedule, seed and every raw sample are retained. “Cold” means a fresh top-level benchmark/analyzer process with no reused language module state; `warmed-operation` currently means one uncounted same-process operation within each fresh target followed by a driver-timed second operation; it is not a long-lived session. For A, warm does not erase its architecture’s per-invocation Lizard subprocess or one-shot Worker: those remain part of its named Product condition. Input filesystem cache state, garbage collection controls and unavailable CPU-affinity controls are not controlled by this workflow and are not silently assumed equal.

   Report median, p90, min, max and IQR; mark Tukey-IQR outliers but retain them in raw evidence; statistics use all samples and do not publish a removal-based alternative. Each ABBA block produces one paired log-ratio from the geometric mean of its two observations per side; a deterministic bootstrap over those block ratios produces a 95% confidence interval for the median ratio. With ratio defined as Python/Lizard divided by TypeScript, the versioned interpretation uses a fixed `[0.95, 1.05]` practical-equivalence band: `python-faster` requires the whole interval below `0.95` and Python p90 below TypeScript p90; `typescript-faster` requires the whole interval above `1.05` and TypeScript p90 below Python p90; `no-material-stable-difference` requires the whole interval inside the band; every overlapping or direction-conflicting result is `inconclusive`. `not-comparable` remains reserved for failed equality, identity, environment or measurement-scope preconditions. Exact ratios and intervals are always reported. The 5% band is a pre-registered evidence interpretation threshold, not a Product budget, SLO or Gate policy.

5. **Resource measures are scoped, not invented.**

   Each measured target runs in an independent supervisory process so its monotonic wall clock and user/system CPU can be collected without prior samples. The collector must record whether CPU is target-process-only or includes children. Peak RSS must state OS source, unit and whether it is parent, child, or verified process-tree scope; a process-wide high-water value is not relabelled as per-analyzer or whole-tree RSS. Before accepting an end-to-end CPU or RSS comparison, implementation validates the chosen platform collector against a parent/child fixture and requires the two conditions to use the same scope and unit. If a host cannot provide comparable process-tree CPU or RSS semantics, it emits the available scoped values and marks that resource comparison `not-comparable`; parent-only CPU for the historical Lizard child path can never be compared with current Bun/Worker CPU. Linux x64 with the documented collector is the initial supported comparison environment; other hosts may emit non-comparable diagnostic evidence until their semantics are verified.

6. **History is optional capability, not a current dependency.**

   A creates/uses an isolated old worktree and exact historical toolchain only when explicitly requested by the dev command. Its preparation verifies commit identity, executable/API version and old Product output before sampling, then cleans the disposable material on normal completion. Missing Python/Lizard, unavailable historical install, source incompatibility or unverified tool version ends A with an actionable non-comparability record. The current package, Product, Gate and ordinary development commands neither provision nor require it.

### Resulting Impacts

1. **Developer tooling/documentation:** a narrowly named opt-in workflow, usage, prerequisites, output location and cleanup/retention policy are added under their stable owner. It rejects ambiguous workload or runtime identity rather than selecting ambient Python/Lizard.
2. **Private analyzer boundary:** any harness location is justified by a path-specific layout/package test. Only its dedicated development execution may enter the port root; normal production consumers remain adapter-only, and no `src/index.ts`, declaration or artifact subpath exposes it.
3. **Historical reproducibility:** A has a manifest mapping hard-cut parent, fixture intersection, Lizard 1.23 identity and output normalization. B separately records Lizard 1.24 identity. A failed restoration cannot be replaced by B or C in the summary.
4. **Evidence integrity:** raw samples, host/runtime metadata, sampled command logs and output digests remain separately inspectable from derived markdown/JSON summary. Archive resource data may be cited as prior observation but is never merged into new sample distributions.
5. **No Gate policy change:** Gate performance observation stays advisory and unchanged. Benchmark failure, slowness or missing historical tool has no effect on ordinary test/Gate status; later blocking thresholds need an independently authorized decision.

## Risks / Trade-offs

- A compares real migration behavior but necessarily includes semantic/version/runtime changes; B is fairer for analyzer cost but deliberately omits user-visible orchestration. Publishing all three labelled layers prevents either from being mistaken for the other.
- Old dependencies may no longer install or execute on a current host. Honest `not-comparable` evidence is preferable to changing the historical revision, relying on ambient package versions or reverse-porting old behavior.
- Peak RSS and child CPU semantics vary by OS. Scoped measurements and a validated initial host sacrifice portability for truthful resource claims.
- Fresh process cold samples include startup; warm samples can hide it. Both are required and named instead of averaged together.
- A dev-only same-root harness adds a small validation surface. The alternative—making the port publicly importable or letting generic scripts deep-import Product source—would violate the existing private boundary and is rejected.

## Open Questions

无未决 Readiness 问题：B 使用 explicit upstream checkout、ephemeral fixed Python/Pygments provision；Linux wait4 parent/child fixture限定 CPU/RSS scope；A/C 使用 TS/JS intersection，B 使用 27 reader-family normal+edge representative fixtures。long-lived warm session 明确不在本 Change 范围。

## 当前实施授权补充

性能比较先产出 Investigation Report；report 保存形成时 evidence 而不改变 Product policy。source-aligned analyzer core/readers/shared/protocol 是本 Change 的不可修改边界。新增 benchmark seam 优先位于外围；确需 analyzer root 时只允许 named `.test-support.ts`，scripts 通过 exact process path 启动而不建立 generic deep import 或 public export。任何外围优化都以同一 fixed workload的 before/after evidence为前提；深层 port hotspot 不实施，只记录后续授权所需的事实。
