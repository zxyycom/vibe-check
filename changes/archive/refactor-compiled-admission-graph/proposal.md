# Proposal

本 Change 将 Scheduler 私有的 prepared admission graph 编译过程拆成具名、可复核的静态索引阶段，不改变已验证图的语义或任何运行时调度行为。

## Why

`compilePreparedAdmissionGraph` 同时承担 slot catalog、mutex occurrence、relation reverse index、scope terminal/activation 投影、公开顺序和冻结装配，导致两个 repository quality `functionMetrics` Records（CCN 20 与 density 88）。这些相互独立的编译阶段被压在一个长函数中，难以从局部确认其保留的顺序、重复 occurrence 与图引用身份。

## Outcome

编译器以具名的 Product-private 内部阶段构造同一份 `CompiledAdmissionGraph`：它继续仅消费 `prepareTaskGraph` 产出的 `PlannedTaskGraph`，保留防御性 `maxParallel`、unknown relation 和 unknown terminal 检查，复用 supplied graph 及其 snapshot，不重建图。task/scope/mutex slot、reverse dependency/observation/mutex occurrence、terminal-to-scope、activation/scope slot 和公开 lexical order 均保持既有值与顺序；现有 Scheduler/core/reducer/diagnostic/measurement/hook/public API 行为不变。

## Scope

### Intended Change

- Refactor only `src/project-run/task-scheduler/admission-core-compiled-graph.ts` into named private compilation stages and retain the same `CompiledAdmissionGraph` fields and defensive failures.
- Add one direct private compiler test and a current architecture-owned Case mapping. The test may inspect private compiler output but creates no public surface.
- Maintain the Plan artifact through the explicitly authorized final default Gate, then archive this completed Change and create one task-scoped commit; `--all`, benchmark, and push remain out of scope.

### Resulting Impacts

- `prepareTaskGraph` continues to own all untrusted-input validation and normalization; compiler helpers receive `PlannedTaskGraph` only. Retained compiler checks are defensive invariants for an already-prepared graph, not a second validation path.
- Existing core and Scheduler consumers receive equivalent static indexes without any wiring change.
- The changed test entity and Case require the project test-evidence closure in addition to the narrow Bun test.

## Success Criteria

1. The target compiler has a single readable assembly path composed of named pipeline stages, without simply wrapping individual loops.
2. A prepared graph retains the exact graph and snapshot identity; all compiler-owned fields preserve task/scope/mutex slot allocation, duplicate occurrences, terminal/activation mappings and existing order.
3. `taskById` and `scopesById` remain present, `maxParallel`/unknown relation/terminal defensive checks remain in the compiler, and no scheduler/core/public API file changes.
4. Direct tests, test-evidence, product typecheck/lint/format, Change Plan check and focused quality pass; the focused-quality observation has 9 total Records (6 function and 3 file), no target CCN/density Record, and no new Record caused by this Change. This quality evidence is neither a benchmark nor Project Gate acceptance.

## Affected Owners

- [`docs/architecture.md`](../../docs/architecture.md): task-scheduler private compiled graph and one-time immutable graph snapshot boundary; no stable documentation change expected.
- [`docs/coding-style.md`](../../docs/coding-style.md): pipeline and local semantic-expression quality.
- [`docs/testing.md`](../../docs/testing.md) and [`docs/testing/cases/quality-runtime.md`](../../docs/testing/cases/quality-runtime.md): direct test and Case evidence maintenance.
- `src/project-run/task-scheduler/admission-core-compiled-graph.ts`: implementation owner; direct private test is co-located in the same task-scheduler owner.
