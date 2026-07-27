### Case AUX-PARALLEL-RUNNER-002: runs independent tasks concurrently but serializes matching mutexes
Entry:
- `scripts/tools/parallel-task-runner/test/index.test.ts > parallel task runner > runs independent tasks concurrently but serializes matching mutexes`
Contract:
- Parallel task runner 保持调度契约 必须保持该原生测试节点界定的可观察行为：runs independent tasks concurrently but serializes matching mutexes。
Proves:
- 在 `parallel task runner` 下，该节点证明：runs independent tasks concurrently but serializes matching mutexes。
