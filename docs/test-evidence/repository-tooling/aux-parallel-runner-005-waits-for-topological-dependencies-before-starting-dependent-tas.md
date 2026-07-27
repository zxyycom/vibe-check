### Case AUX-PARALLEL-RUNNER-005: waits for topological dependencies before starting dependent tasks
Entry:
- `scripts/tools/parallel-task-runner/test/index.test.ts > parallel task runner > waits for topological dependencies before starting dependent tasks`
Contract:
- Parallel task runner 保持调度契约 必须保持该原生测试节点界定的可观察行为：waits for topological dependencies before starting dependent tasks。
Proves:
- 在 `parallel task runner` 下，该节点证明：waits for topological dependencies before starting dependent tasks。
