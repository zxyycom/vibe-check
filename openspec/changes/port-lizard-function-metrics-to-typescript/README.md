# port-lizard-function-metrics-to-typescript

## 状态

- **就绪度**：规划保留，但当前明确延期；尚无 translated runtime。
- **进度**：current-contract/scope audit 已完成；implementation tasks 尚未开始。
- **架构前置**：
  [semantic-config prerequisite](../decouple-project-config-from-scanner-tools/README.md) 已
  `all_done`，并交付 semantic document、`ResolvedQualityConfig` 与
  `ScannerDependencySnapshot`；开始 port 前仍须通过本 change 的 task 0.3 核对最终证据。
- **产品优先级**：这是当前产品向能力和体验工作之后的最终运行时统一提升项，不是默认下一项
  工作，也不阻塞
  [external config workflow](../add-external-project-config-workflow/README.md)。只有显式重新排序
  或出现直接产品/发布阻塞证据时才提前恢复。

## 目标结果

完成本 change 后，TypeScript 与 Rust function metrics 由 repository-owned、Lizard-compatible
TypeScript module 产生；formal scans 不再解析或启动 Python/Lizard，也不再解析其 CSV
protocol。这是目标状态，不是当前 runtime。

## 范围边界

Port 保持 current selector（`.ts`、`.d.ts`、`.rs`）、normalized `FunctionMetric` fields、
warning/source semantics、ordering、completeness、failure mapping、gate behavior 和 machine
DTO。它只删除 internal Lizard dependency settings 与 private process/CSV implementation。

Public project config 在本 change 开始前已经是 backend-neutral semantic config。本 port 不修改
其 field tree、version、starter、generated schema、`.vibe-check/config.json` authoring contract
或 accepted-warning `checkId`，也不引入任何 project-level executable setting。

它不增加 Go/Python/JavaScript inputs、per-file partial result、新 metric fields、generic
scanner provider API 或 public package。

## AI 执行路径

1. 先恢复
   [Lizard 优先级决策](../../../docs/decisions/product-priority/defer-lizard-until-after-semantic-config-workflow.md)
   与 configuration active decisions；未满足恢复条件时，不得把本 change 推荐为默认近期工作
   或开始 implementation。
2. 完成本 change 的 `tasks.md` 0.3，核对 `ResolvedQualityConfig` /
   `ScannerDependencySnapshot` 最终证据，并判断产品优先级前置是否已完成或已有显式重新排序。
3. 读 `proposal.md` 恢复 behavior-preserving result，再读 `design.md` 恢复 owner、parity 与
   hard-cut boundary。
4. 翻译文件前完成 section 1。Candidate source map 不证明 final upstream import closure。
5. 把 `specs/**` 作为可观察目标，并为 changed/new test entities 更新 semantic Cases。
