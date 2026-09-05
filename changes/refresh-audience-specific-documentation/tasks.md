# Tasks

先确认受众边界与任务分组，再同步用户材料和工具，最后分别验收机械闭合与实际可用性。

## Readiness
- [x] 0.1 核对现有文档、Decision 与材料验收，确认单篇深入文档限制需要演进，保留双受众叙述。
- [x] 0.2 恢复 AI-ready-docs 审阅发现与用户新增要求，确认内部文档按 owner 分组，评估迁移引用和长文拆分边界。

## Implementation
- [x] 1.1 建立长期方向和按受众文档影响审查规则，接入 AGENTS 与 navigation，不建立平行账本。
- [x] 1.2 重整 README、公共机制和生命周期/调度任务专题，核对公开回调与使用、失败、取消边界。
- [x] 1.3 同步自然 heading 示例投影、显式材料集合、artifact/consumer 验收与对应 Case，增加文档根短命令。
- [x] 1.4 修正用户说明的 preflight、flags 与 fallback 语义，恢复所有使用者共享的 README 主线。
- [x] 1.5 整理内部文档目录、命名和长文职责，同步当前导航、引用和新增专题维护步骤。内部 owner 分入 development/tooling/governance/testing，Definition 与 Run、四类 tooling 任务分别拥有正文；保留编码规范完整性。Case 只迁移 Owner，未改 IDs/Proves。三份现存报告只修复导航目标，受影响 active Change 文件与既有 Decision 只同步引用。根 investigations 命令恢复默认检查与追加子命令能力。

## Verification
- [x] 2.4 对后续语义修正与内部布局完成独立阅读任务审查，重跑文档、Decision、Change 与全量 Gate。独立审查确认拆分保真，并修复跨页 Gate/receipt 路由、错误锚点、Definition 标题归属、示例 import、secret waiver 清单与 console diagnostic 叙述。当前 candidate `0.0.0-local.26e5b2d9da45` 的 `bun run check -- --all` 为 36/36 pass，日志 `.log/project-gate/2026-09-05T18-55-29.328Z-2507199-d25d596f-7aff-42e8-bbb6-cd6849c0a52a`；包括 exact-candidate artifact/installed-consumer 示例验收。Case 为 550 entities/124 Cases/15 topics；Decision 291 项，新增内部文档方向已独立核对并 aligned；Investigation 35/35 且索引同步。未执行全产品每字段文档一致性审计；本项记录提交前验收，归档仍需单独授权。下列 2.1–2.3 保留前一阶段证据。
- [x] 2.1 运行最窄测试、Case、投影和链接校验，确认已发布材料与例子闭合。工具侧 12 项目标测试（含 artifact 与 installed consumer）通过；`bun run docs:api`、`bun run validate -- docs`、scripts typecheck/lint 与格式检查通过，Case 为 550 实体/124 Cases。
- [x] 2.2 非实施代理按实际 diff 反查双受众文档影响，并用随包材料完成代表性回调/调度使用任务。独立阅读发现并修复 measurement 路由、flags grammar、prepared 取消与保存边界；修复后可恢复两次 Run 的学习样本用法，并区分在线观测、generic Hook 与 complete。八份 Check 指南和 output 只做使用完整性与链接复核，未逐字段对照实现，不宣称全产品语义审计。
- [x] 2.3 完成编码规范与 AI-ready-docs 审查、全量 Gate、Decision 和 Change 校验，记录未覆盖边界。root 的最终 `bun run check -- --all` 为 36/36 pass、0 fail/N/A/unavailable，candidate 为 `0.0.0-local.a054e4a89749`；日志 `.log/project-gate/2026-09-05T17-24-22.432Z-2460225-336eea21-6e68-45f6-84f8-d801925988aa`。两项长期方向已核对并标记 aligned，Decision check 通过；本 Change 保持 active plan，不归档、不提交。
