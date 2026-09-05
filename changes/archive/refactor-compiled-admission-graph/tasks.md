# Tasks

任务先确认 private compiler boundary，再实施具名阶段和直接证明，最后用最窄行为与质量验证收口。

## Readiness
- [x] 0.1 复核 Architecture、coding style、graph/compiler consumer、现有 AdmissionGraph Case 与工作树，确认 `prepareTaskGraph` 是唯一 untrusted-input validation/normalization 边界，compiler defensive invariants 不构成第二边界，Scheduler/core 不在范围。Owner: Change + task-scheduler.
- [x] 0.2 复核目标 quality Records、编译器输入/输出字段以及 declaration/public/forced/scope order 的现有证明，确定无须修改长期 Decision 或 stable owner docs。Owner: Change + task-scheduler.

## Implementation
- [x] 1.1 将 prepared graph 的 Product-private static compiler pipeline 拆为具名 catalog、mutex/relation/scope index、order 和 final assembly stages，保持一次 compile、defensive checks、existing Object.freeze guards 和 private maps。Owner: `src/project-run/task-scheduler/admission-core-compiled-graph.ts`.
- [x] 1.2 增加一个私有 compiler proof test，覆盖 graph/snapshot reuse、slot/index data、duplicate occurrences、terminal/activation mappings和 relevant order；新增 current architecture-owned Case mapping，不改变 public API。Owner: `src/project-run/task-scheduler/**`, `docs/testing/cases/quality-runtime.md`.

## Verification
- [x] 2.1 运行修改前后要求的 test-evidence check、最窄 compiler/admission Scheduler tests，并审阅局部 diff，确认 Scheduler/core 文件未改且行为 owner evidence 连续。Owner: task-scheduler.
- [x] 2.2 运行 product typecheck、lint、format check、Change Plan check 与 focused quality；记录 total Records 从 11 降至 9（6 function、3 file），target CCN/density Records 消失且没有 Change-caused new Record。明确这不是性能证明，且不运行 `--all` Project Gate 或 benchmark。Owner: Change.
- [x] 2.3 在 focused quality 确认后，按后续显式授权只运行一次 default `bun run check`（不加 `--all`）；Gate passed 后更新收口证据，允许归档本 Change 并仅提交这个 Change 的归档后快照。Owner: Change.
