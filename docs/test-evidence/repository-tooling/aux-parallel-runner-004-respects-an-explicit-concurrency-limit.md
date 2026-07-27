### Case AUX-PARALLEL-RUNNER-004: respects an explicit concurrency limit
Entry:
- `scripts/tools/parallel-task-runner/test/index.test.ts > parallel task runner > respects an explicit concurrency limit`
Contract:
- Parallel task runner 保持调度契约 必须保持该原生测试节点界定的可观察行为：respects an explicit concurrency limit。
Proves:
- 在 `parallel task runner` 下，该节点证明：respects an explicit concurrency limit。
