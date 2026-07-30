# port-lizard-function-metrics-to-typescript

## 状态

- **就绪度**：可以开始 pinned-source baseline 阶段；尚无 translated runtime。
- **进度**：current-contract/scope audit 已完成；implementation tasks 尚未开始。
- **前置条件**：TypeScript/Bun product-source promotion 已归档并实现。
- **推荐顺序**：在 `stabilize-machine-readable-output` 之后、在
  `add-external-project-config-workflow` 之前实施，避免 generated configs 保留已退休的
  `tools.lizard` command。

## 目标结果

当前 TypeScript 与 Rust function metrics 由 repository-owned、Lizard-compatible
TypeScript module 产生。Formal scans 不再解析或启动 Python/Lizard，也不再解析其 CSV
protocol。

## 范围边界

Port 保持当前 selector（`.ts`、`.d.ts`、`.rs`）、normalized `FunctionMetric` fields、
warning/source semantics、ordering、completeness、failure mapping、gate behavior 和 machine
DTO。它只删除 runtime `tools.lizard` command/config path 与 private process/CSV
implementation。

它不增加 Go/Python/JavaScript inputs、per-file partial result、新 metric fields、generic
scanner provider API 或 public package。

## AI 执行路径

1. 先读 `proposal.md` 恢复 behavior-preserving result。
2. 修改 source 前读 `design.md`；其中的 current-fact table 与 compatibility decisions
   取代历史四语言假设。
3. 翻译文件前完成 `tasks.md` section 1。Candidate source map 不证明 final upstream
   import closure。
4. 把 `specs/**` 作为可观察目标，并为 changed/new test entities 更新 semantic Cases。
