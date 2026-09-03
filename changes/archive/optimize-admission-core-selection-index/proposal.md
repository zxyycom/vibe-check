# Proposal

当前 shipping path 以 `immutable@5.1.9` `List`、project-owned persistent leftist max-heap 和 native reverse indexes/counters 承载 private semantic selection index，从而消除 immutable admission core 的重复 legality 计算，并保留既有 public API、Scheduler lifecycle 和 lazy public catalog。

## Why

before runtime 会在 catalog、single-task validation、select、Scheduler candidates、scope/capacity 与 forced block 中反复做 parent-chain 或 graph scan。前序调查将其识别为真实 Scheduler 回退信号；最终选型仍以完整产品语义与同形 workload 证据为准，而非 predecessor-copy 或 collection microbenchmark。

## Outcome

shipping reducer 使用 `immutable@5.1.9` `List` 承载 dense status/counter stores；每个 immutable `AdmissionCoreState` 持有一份 private selection index。compiled reverse occurrence indexes 与计数保留为冻结原生数组、`Map`/`Set`，forced frontier 保留 project-owned persistent leftist max-heap。

这是一条唯一的 shipping path：representation 不进入 public API、configuration 或 release surface；Change harness 只运行该 path。稳定 public surface、Scheduler/control ownership 和 callback contract 均保持不变。

## Scope

### Intended Change

`admission-core.ts` 和 private compiled-graph integration 以 task slots、reverse dependency/observation/mutex occurrences、scope facts、persistent dense stores 和 canonical forced queue 消除 steady-state parent-chain/full-graph legality work。Scheduler candidates、inspection next boundary、public catalog、validate、select 及 synchronous custom callback 返回后的 hard guard 读取同一 selection facts；仅 catalog、validate 与 rejected select 在需要 public rejection DTO 时构造保留 duplicate/sorted payload 的原因。

### Resulting Impacts

- `AdmissionState`、`AdmissionGraph`、rejection union、catalog order、frozen/opaque surface、settlement API 与 callback contract 不变；private slots、indexes、List 和 heap 不泄漏。
- scope capacity 继续比较 global `runningTotal`；active/activating scope 选择 cap，并保持 scope-before-root precedence。
- legacy snapshot 的 external `runningMutexes` 与 dynamic holder counts 保持相加；dynamic settlement 只移除 dynamic contribution。
- Scheduler 继续拥有 execution、diagnostics、measurement、cancellation 与 effect replay；core 是 legality/transition 的唯一 owner。
- `immutable` 是 runtime dependency：package candidate contract、lockfile、artifact material audit、candidate install audit 和 release receipt 都声明精确版本和 MIT license text。

### Formation Evidence Boundary

parent+delta、chunked-COW 与 full-clone A/B/C artifacts 保留为形成期 provenance；它们说明为何进入 dense incremental 方向，但不定义当前 runtime。library Investigation 在形成时仅给出 qualified persistent-vector baseline；完整产品 oracle、workload、retention 与 package acceptance 通过后，才形成上述 shipping selection。该证据的命令、指纹、数值和比较边界由 [representation gate](readiness/representation-gate.md) owner 维护。

## Success Criteria

1. Selected implementation 与 persisted before semantic oracle 在 public reason/payload/order、candidates、transitions/effects、legacy seed、cancellation、scope/root precedence 和 callback hard guard 上 exact match；timing 不会覆盖 oracle mismatch。
2. 每个 immutable state 有一份 private selection index；public catalog DTO 仍 lazy，candidates/inspection 使用 payload-free indexed blockers 和 O(1) capacity gates。
3. Compiled reverse occurrences 保留 duplicates/declaration order；forced effects 保留 reverse declared-slot priority、duplicate dependency IDs 与 effect/effect-state sequence。
4. Selected same-command matrix 覆盖 real static/custom/learned paths、T/D scaling、catalog/validate/select/settle/fork/candidates、B=63/255 forced settlement、retained DFS/BFS branches 和 CPU/heap observations；heap capture 仅保留已运行的 process-level totals/method，raw dump 因无法归因 admission state 而刻意不保留。77 shared scenarios 对比 read-only before data，legacy seed 与 root→80→80 cascade 是明确的 selected-only Change observations。
5. 当前 harness 只运行 selected shipping path；形成期 artifacts 可审阅且不构成 runtime option、API、config 或 release target。

## Affected Owners

- `src/project-run/task-scheduler/admission-core.ts` and `admission-core-compiled-graph.ts`: private compiled graph、selection index 和 canonical transitions。
- `src/project-run/task-scheduler/scheduler.ts` and policy adapters: consumption of core candidates/hard guard，不形成第二个 legality owner。
- `src/project-run/task-scheduler/*.test.ts` and `docs/testing/cases/**`: public-equivalence 和 Case evidence。
- `scripts/package/**`, `package.json`, `pnpm-lock.yaml`: exact runtime dependency、candidate inventory 和 third-party legal material。
- `readiness/current-admission-core-semantic-oracle.md`: selected-versus-before correctness equality、commands 和 oracle case boundary。
- `readiness/representation-gate.md`: final selection、measurement/retention/package evidence、artifact links 与 formation comparison boundary。
