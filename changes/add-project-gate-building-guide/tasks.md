# Tasks

将已认可正文转为正式随包指南，同时落实 optional exclude；系统字段审计另立 Draft，不在此任务清单批量实施。

## Readiness

- [x] 0.1 核对已审阅正文、文档决策、发布映射、投影与 installed-consumer owner。
- [x] 0.2 明确本轮 optional exclude 的归一化边界，划分示例、产品改动与独立审计的写入范围。

## Implementation

- [x] 1.1 迁入正式指南，更新 README、导航、随包映射和正文链接，退出草稿副本。
- [x] 1.2 为十个片段接入受管 source/region、投影与隔离 consumer 的类型和运行验收。
- [x] 1.3 将 changes.flags.*.exclude 改为可省略且默认空数组，保留其它 closed input 边界与 normalized 内部契约。
- [x] 1.4 同步公开与内部 owner、变更日志和当前语义 Case，约束单页行数例外与仓库链接读取预算。

## Verification

- [x] 2.1 通过受影响局部测试、typecheck/lint、示例投影、材料与 Test Evidence 闭合检查。
- [x] 2.2 通过完整 Gate，核对 exact candidate 的 artifact、类型、文档与外部运行验收。
- [x] 2.3 由非实施代理基于实际改动反查用户路径、API 边界、示例证据与发布材料。
- [x] 2.4 核对局部 diff、Change 状态、验证边界和遗留事项，交付正式指南效果。
