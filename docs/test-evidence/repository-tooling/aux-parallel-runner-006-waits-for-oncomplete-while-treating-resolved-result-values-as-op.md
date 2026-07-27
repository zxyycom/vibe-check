### Case AUX-PARALLEL-RUNNER-006: waits for onComplete while treating resolved result values as opaque
Entry:
- `scripts/tools/parallel-task-runner/test/index.test.ts > parallel task runner > waits for onComplete while treating resolved result values as opaque`
Contract:
- Parallel task runner 保持调度契约 必须保持该原生测试节点界定的可观察行为：waits for onComplete while treating resolved result values as opaque。
Proves:
- 在 `parallel task runner` 下，该节点证明：waits for onComplete while treating resolved result values as opaque。
