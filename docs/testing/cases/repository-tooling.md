# repository-tooling

## Case AUX-PARALLEL-RUNNER-001: Parallel task runner 保持调度契约
Owner: `docs/script-tooling.md#工具来源`
Entities:
- `bun|scripts/tools/parallel-task-runner/test/index.test.ts|parallel task runner > accepts a task preparation strategy before graph validation and scheduling`
- `bun|scripts/tools/parallel-task-runner/test/index.test.ts|parallel task runner > does not limit concurrency when no explicit concurrency is provided`
- `bun|scripts/tools/parallel-task-runner/test/index.test.ts|parallel task runner > expands nested task groups with inherited metadata and group dependencies`
- `bun|scripts/tools/parallel-task-runner/test/index.test.ts|parallel task runner > normalizes task metadata and supports task.run as the execution body`
- `bun|scripts/tools/parallel-task-runner/test/index.test.ts|parallel task runner > rejects duplicate ids and unknown dependencies`
- `bun|scripts/tools/parallel-task-runner/test/index.test.ts|parallel task runner > rejects invalid task list metadata at the normalization boundary`
- `bun|scripts/tools/parallel-task-runner/test/index.test.ts|parallel task runner > respects an explicit concurrency limit`
- `bun|scripts/tools/parallel-task-runner/test/index.test.ts|parallel task runner > runs independent tasks concurrently but serializes matching mutexes`
- `bun|scripts/tools/parallel-task-runner/test/index.test.ts|parallel task runner > waits for onComplete while treating resolved result values as opaque`
- `bun|scripts/tools/parallel-task-runner/test/index.test.ts|parallel task runner > waits for topological dependencies before starting dependent tasks`
Proves:
- task normalization、concurrency、mutex serialization、dependency ordering 和 nested task expansion 保持稳定。
- prepare strategy、invalid list metadata、duplicate id 和 unknown dependency failure 保持可诊断。

## Case AUX-QUALITY-DOGFOOD-001: Quality dogfood package entries 保持 thin wrapper
Owner: `docs/cli.md#dogfood-wrapper`
Entities:
- `bun|src/product/cli.test.ts|formal and dogfood entrypoints > keeps the dogfood wrapper pointed only at the product CLI`
Proves:
- `scripts/quality/scan.ts` 只导入 Product CLI，显式传入 repository root 并透明转发 argv； 不拥有 parser、config、scan core 或 exit mapping。
- `quality:check`、`quality:full-check` 与 `quality:scan` 保持精确 omitted-gate invocation； `quality:gate` 精确传入 `--profile full --gate regressions`。

## Case AUX-QUALITY-ANNOTATION-WIRING-001: Required workspace 调度 focused acceptance child
Owner: `docs/script-tooling.md#independent-docs-validation-and-workspace-acceptance`
Entities:
- `bun|scripts/quality/producer-annotation-acceptance.test.ts|producer-to-annotation acceptance > connects formal non-empty, zero-byte, and invalid producer streams to the actual consumer`
Proves:
- Required profile 精确调度 focused producer-to-annotation test child；child 自己运行正式 producer 与 actual consumer 并判断 machine boundary，workspace verifier 只使用既有 process result/output 编排。
- Acceptance 使用隔离的临时 fixture copies 与 actual package consumer，workspace task 不增加 artifact parser、schema registry 或 warning mapper。
- Producer 读取 fixture 的 semantic `.vibe-check/config.json`，controlled scanner execution 只通过 Product-owned operational environment 注入，不把 command / args 写回 project config。

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
