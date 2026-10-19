# Design

以稳定职责和消费者关系决定局部名称、目录与文档落点，保留已有整体分层和产品契约。

## Context

本轮开始于 main，工作树干净。用户已授权按两轮建议整理，并要求 GPT-6.1-sol 子代理承担主要工作。
起点 Test Evidence 完整检查通过：755 个当前实体、187 个 Case、16 个 Topic。
维护文档职责、受众/发布范围、公用 inventory tooling ownership、历史 schema 保留和虚拟评估边界的活动决策均适用。
现有 refine-agent-document-routing 仍是独立 Draft；本轮只同步本次移动引起的导航，不重做 AGENTS 路由。

## Goals / Non-Goals

目标是消除命名误导、隐藏耦合和不必要的路径层，按稳定内部子职责改善局部导航。
不改变 public API、Check 结果、调度算法、默认测试范围、发布流程或 analyzer source-aligned 布局。
不新增依赖或恢复其它 Change。用户已授权整理 Git 提交及 hook 引起的推送；Change 删除仍须另行授权。

## Decisions

### Intended Change

1. 文档只在各 owner 完整定义；callbacks 面向公开用户，workbench 协议有独立维护入口。
2. 原始历史材料按现有 historical 分类归位，current package mapping 不扩大。
3. 扫描政策放在共同 validation owner；全包 Markdown contract/collector 不再藏在 Check guide 文件；Check 身份由现有 public inventory 表达。
4. 通用词的语义判断不由无上下文词黑名单替代；保留真正入口、依赖和材料约束。
5. 私有名称显式区分静态执行计划、未经过正常执行结果映射的早退路径与正常结果映射；相同构造角色采用一致文件名。
6. workbench 的 evaluation/input/comparison/cost 构成评估子职责，普通 policy state 不按前缀强塞其中。
7. Scheduler decision model/inspection 由 core、measurement、shell 共同消费，保留同级；Markdown cache 以 session/payload 的内部职责归组。

### Resulting Impacts

Product、scripts、文档各由独立代理负责互斥写入；共享 Case 账本、Change 与跨切面修补由主代理串行处理。
路径迁移不改变历史 evidence 内容，不留下第二份可编辑规范或兼容 barrel。全量投影写入与 Gate 在切面稳定后串行执行。
测试 rename/move 维持语义身份；机械闭合与实际正文执行分别验证。
追加代码审查修复评估协议的 unknown 边界：将已消费字段构造成只读领域值，保证场景来源二选一、
循环计数与 seed 的整数范围、eligible ID 的字符串元素。它只读取既有冻结文件，不新增输入入口；
新增拒绝行为与纯路径重构分别验证。扫描政策提升后同步全部消费者的 Gate region，保持增量选择完整。

## Risks / Trade-offs

多文件移动会牵涉硬编码路径、Case、material fingerprint 与 exact installed candidate；不能只以编译通过验收。
文件夹增加会带来跳转成本，只有稳定职责收益成立时采用；拥挤主要来自测试的目录及语言 readers 保持原状。
历史 schema 移动须验证 bytes 不变；项目验证可能重建本地候选与 ignored artifact，不代表远端发布。

## Open Questions

实施边界已确认，无待决定的方案问题。按用户追加要求完成文档和代码审查后提交，保留 Plan。

## Implementation Observations

- Scheduler decision model 与 inspection 由 core、measurement、shell 共同消费，保留同级布局，未把共同契约藏入私有 child。
  Markdown parse-facts cache 则形成稳定 session/payload 职责，归入 `parse-facts-cache/`；测试占多数的目录与语言 readers 不做机械拆分。
- workbench evaluation 的执行、输入、比较、成本和类型归同一子模块；普通 policy-state 保留父级。
  冻结 protocol 内的 regression root 路径保持原字节，因此 regression JSON 仍在父级；六份 evidence 与 protocol 迁移逐字节不变。
- 历史 schema 与四份 report examples 归 `historical/v1`，原字节与随包 mapping 保持。
  两份 Investigation 只修复五处已迁移链接，保留形成时正文、身份和时间；派生索引同步后 87 份报告检查通过。
- callbacks 保持扩展点任务选择职责，链接已有可执行自定义 Check 示例，不重复整段代码或增加投影目标。
- 路径迁移保持原有 Case 身份；布局测试以语义命名的正向接受证据代替词黑名单断言。
  新增协议输入 Case 单独证明非法消费字段拒绝与原始文件身份，不把这一行为修复混同于路径移动。
- `ai-ready-docs` 审查收敛重复负向描述和迁移过程，明确编辑流程与材料验证的 owner，调整局部 Markdown 样式。
  代表性阅读任务覆盖 Check 扩展点、调用方清理、材料维护、双 artifact 对照和历史输出材料；均可从正文与引用恢复。
- 完整编码规范审查移除纯转发测试 helper，修正协议边界及 Gate 依赖路径。新增选择矩阵先观察到 5 pass / 2 fail，修复后 7/0。
  非实施代理复核整体语义与文档阅读路径，无剩余阻断；未采用“旧代码如此”或“临时实现”作为规范例外。

## Verification Evidence

全部命令使用项目锁定 Bun 1.3.14。环境默认 Bun 1.4.2 的两项 null-prototype deepEqual 失败已确认在基线复现，未用该版本替代项目工具链。

| 边界 | 实际证据 |
| --- | --- |
| Product / scripts 局部修正 | Product 修正后 58 tests、scripts 20 tests；两侧 typecheck、lint 通过。 |
| 独立复核 | 31 tests、`docs:api`、573 份 Markdown 链接；7 份冻结 JSON bytes 相同。 |
| 材料与治理 | 489 JSON、5 schemas、1 组 current machine examples、4 份历史 report examples；87 份 Investigation、370 份 Decision、14 项 Change 检查通过。 |
| Test Evidence | 756 entities、188 Cases、16 Topics 全树闭合。 |
| 完整 Gate | `bun run check -- --all`：43/43 passed，0 failed/unavailable，包含 artifact 和 external consumer types/docs/runtime。 |

最终 Gate candidate 为 `0.0.0-local.a7d076ba254d`，耗时 31.8 秒；日志位于
`.log/project-gate/2026-10-19T02-46-26.295Z-594702-baf0c7c8-b0cf-4273-b310-d879f37b5341`。
未重新测量历史双 artifact 成本；该历史材料只做 bytes 与相同输入下 comparison 输出对照，不据此声称性能收益。

提交按 Product 职责、仓库工具与材料、workbench 归组、协议输入修复和计划验收分别保存。
Change 目录保留；`finalize` 及删除须另行授权。
