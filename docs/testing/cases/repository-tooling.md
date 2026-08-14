# repository-tooling

## Case AUX-QUALITY-DOGFOOD-001: Repository callers use the bound Project Run
Owner: `docs/script-tooling.md#repository-project-run`
Entities:
- `bun|scripts/quality/project-run.test.ts|repository Project Run binds its definition before another caller supplies controls`
Proves:
- The repository Run imports and binds the repository Project Definition; another caller supplies only the controls that Run exposes.

## Case AUX-PARALLEL-RUNNER-001: Parallel task runner 保持调度契约
Owner: `docs/script-tooling.md#工具来源`
Entities:
- `bun|src/product/task-orchestration/test/index.test.ts|parallel task runner > accepts a task preparation strategy before graph validation and scheduling`
- `bun|src/product/task-orchestration/test/index.test.ts|parallel task runner > does not limit concurrency when no explicit concurrency is provided`
- `bun|src/product/task-orchestration/test/index.test.ts|parallel task runner > expands nested task groups with inherited metadata and group dependencies`
- `bun|src/product/task-orchestration/test/index.test.ts|parallel task runner > normalizes task metadata and supports task.run as the execution body`
- `bun|src/product/task-orchestration/test/admission-controller.test.ts|parallel task admission controller > rejects a pending task that is not in the current ready set`
- `bun|src/product/task-orchestration/test/admission-controller.test.ts|parallel task admission controller > rejects synchronous admission callbacks and execution failures without pending work`
- `bun|src/product/task-orchestration/test/index.test.ts|parallel task runner > rejects duplicate ids and unknown dependencies`
- `bun|src/product/task-orchestration/test/index.test.ts|parallel task runner > rejects invalid task list metadata at the normalization boundary`
- `bun|src/product/task-orchestration/test/index.test.ts|parallel task runner > respects an explicit concurrency limit`
- `bun|src/product/task-orchestration/test/index.test.ts|parallel task runner > runs independent tasks concurrently but serializes matching mutexes`
- `bun|src/product/task-orchestration/test/index.test.ts|parallel task runner > waits for onComplete while treating resolved result values as opaque`
- `bun|src/product/task-orchestration/test/index.test.ts|parallel task runner > waits for topological dependencies before starting dependent tasks`
Proves:
- source lift 后 task normalization、concurrency、mutex serialization、dependency ordering 和 nested task expansion 保持稳定。
- prepare strategy、invalid list metadata、duplicate id、unknown dependency，以及 admission seam 选中 blocked task 或同步失败都保持可诊断，并在 execution failure 后不启动 pending work。

## Case AUX-TOOLKIT-FOUNDATION-001: Foundation toolkit 的严格解析与失败结果稳定
Owner: `docs/script-tooling.md#工具来源`
Entities:
- `bun|scripts/tools/foundation/test/foundation.test.ts|script foundation > detects failed process results`
- `bun|scripts/tools/foundation/test/foundation.test.ts|script foundation > parses JSON values and normalizes slash paths`
- `bun|scripts/tools/foundation/test/foundation.test.ts|script foundation > parses strict positive integers`
Proves:
- Foundation 的正整数、JSON 与 slash-path helpers 返回确定性归一结果，并拒绝无效输入。
- 失败的 process result 对开发脚本 consumer 保持可观察，不被误判为成功。

## Case AUX-WORKSPACE-PROCESS-001: Foundation process runner 保持纯文本捕获边界
Owner: `docs/script-tooling.md#工具来源`
Entities:
- `bun|scripts/tools/foundation/test/foundation.test.ts|script foundation > runs child processes with plain text output environment`
Proves:
- 开发脚本启动子进程时使用 plain-text / no-color 环境，并返回可判断的 status、stdout 与 stderr。
