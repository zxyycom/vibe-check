# Design

先审查完整当前文档集合，再按任务收敛、去重和必要的职责拆分降低阅读成本。

## Context

文档导航区分随包公开契约与内部实现 owner。前轮仅调整四篇 tooling 页面；本轮基线包括 README、AGENTS 和 docs 中 39 篇当前说明，共 41 篇。
既有工作区改动已保存逐文件基线。当前 Decision 260905-organize-maintainer-documentation-by-responsibility、260905-structure-package-documentation-by-user-task 与 260908-declare-document-audience-publication-and-contract-ownership 已规定按任务组织、单一 owner 与显式发布；本轮沿用而不增加字数规则。

## Goals / Non-Goals

目标：覆盖全部当前说明，降低单篇无关内容、重复规范与混合阅读路径；维持用户仅凭随包文档可用。
非目标：产品行为、schema、默认值或权限变化；历史、Decision/Investigation 实体、其他 active Change 与机器生成材料的文字重写；按固定行数删减或拆文件。

## Decisions

### Intended Change

已确认：按使用者 API/任务专题、八项 Check、内部产品设计、项目工具/治理/测试四个切面逐篇审阅。删除无独立用途的副本和背景；保留必要推导、约束与例子。只有真实独立的任务和完整承诺才拆篇，不新增纯索引层。README 与导航保持单一总入口。新专题逐项说明去向与原文承接关系。

### Resulting Impacts

标题或文档移动须同步当前入链、Case owner 和显式发布/示例投影 registry；受管示例以原 TypeScript 源为准。Case 调整由主代理按测试证据流程完成，不改变测试证明义务。新用户专题须通过 installed consumer 文档验收；新内部专题不得成为用户完成任务的隐式前提。

## Risks / Trade-offs

缩短文字可能丢失失败与安全规则；拆页可能增加跳转或制造第二 owner。以逐项内容承接和独立使用任务审阅裁决，不以行数下降作为完成证据。提交按语义隔离已有改动，完成只作用于本 Change。

## Open Questions

无。六篇独立专题及跨切面 owner 已统一确认并完成审阅。用户现已授权归档与 Git 提交；按当前生命周期先提交可恢复 Plan 快照，再经 `complete --preflight` 与 `complete` 删除本目录并提交收尾，不建立 archive 副本。

## Implementation Observations

全量逐篇结果见 [review-coverage.md](review-coverage.md)：基线 41 篇，收敛后 47 篇，新增六篇各有独立任务。全部 81 个原代码围栏逐字保留，19 个 Case 只迁移 Owner，公开新增 simulation 已加入显式 registry 与 README 裸路径直链。
用户追加的项目模型偏好已单独写入 AGENTS 与 Decision `260908-default-project-subagents-to-terra`；其后新审查代理使用 Terra。
最窄 43 文件测试首轮因未设置 `VIBE_CHECK_NODE_CMD` 失败 1 项（146 通过）；用 `mise which node` 的绝对路径绑定后 147/147 通过。无需修改实现或测试。
首轮完整 Gate 36/36 通过；当轮核对 47 篇说明与 Gate 前快照相同，22 篇随包 Markdown 在源码、构建包与 installed consumer 中逐字一致。详细命令、candidate 与交付边界见 [验收证据](review-coverage.md#验收证据)。
后续 AI-ready 复审发现三处原有缺口；用户授权局部补正并要求保持长度与重心。仅修正模拟分支、性能测量副作用和中文规则范围，不新增专题或改写示例；独立复审、目标测试及完整 Gate 均已重新通过，见[补正验收](review-coverage.md#ai-ready-复审补正)。
