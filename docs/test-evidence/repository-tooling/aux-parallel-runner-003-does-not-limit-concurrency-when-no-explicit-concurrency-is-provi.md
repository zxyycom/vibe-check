### Case AUX-PARALLEL-RUNNER-003: does not limit concurrency when no explicit concurrency is provided
Entry:
- `scripts/tools/parallel-task-runner/test/index.test.ts > parallel task runner > does not limit concurrency when no explicit concurrency is provided`
Contract:
- Parallel task runner 保持调度契约 必须保持该原生测试节点界定的可观察行为：does not limit concurrency when no explicit concurrency is provided。
Proves:
- 在 `parallel task runner` 下，该节点证明：does not limit concurrency when no explicit concurrency is provided。
