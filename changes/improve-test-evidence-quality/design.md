# Design

以独立保护真实使用风险的证据为单位，先删除无增量内容，再修复确有价值的测试失败信号。

## Context

当前 main 为 446ce435，起点完整 Test Evidence 为 766 实体 / 190 Cases。既有预算升级阻断等未提交工作保持原样。56 是问题实体去重数，不是删除数量或新测试配额；完整审计材料保留形成时事实，不改写成实施记录。

## Goals / Non-Goals

目标是清理冗余、修正假绿与脆弱时序，同时保留真实 API、错误结算、安全、文件/进程、安装后 consumer 等有独立价值的验收。不维持名义覆盖、不补齐所有可选分支、不扩大 Product API、不改预算或自动重试。

## Decisions

### Intended Change

1. 三个源码所有权互斥的实现代理先完成已确认的局部删除，以及 Gate manifest donor 合并；Case 更新由主线程串行完成。
2. 第一阶段闭合后继续各自的 fixture/oracle/outcome/时序改写。关键 assert 在不会被 SUT containment 吞掉的外部观察，负向隐私/失败证明先建立真实正对照，比较输入隔离目标变量。
3. 使用现有私有边界、隔离 child 和 test support，保持失败注入与实际使用路径的关系。若既有断言无实际独立价值，直接删除，不为历史 Case 文案造新义务。
4. 验证先最窄后汇合；完整 Gate 在独占验证窗口运行，不与其它测试或 compiler 测量并发。

### Resulting Impacts

- Gate 归并同时保留 raw required metadata 和有效选择的不同证据，删除 donor 后统一更新 Case。
- 文档示例回收放在非投影验收区域；如投影确实变化，通过现有生成入口同步，不手改受管片段。
- test-only helper 保持明确所有权；若必须修改生产私有接线，由主线程先核对必要性与最小范围，不能暗中新增可配置公开测试入口。
- 前后清单和实际改动范围在 ignored 本地证据核对，不提交第二实体账本。正式交接保存目标分组、验证和必要例外。

## Risks / Trade-offs

审计大多是静态推断，落地可能揭示建议 fixture 不合法或依赖环境差异；由现有 owner 裁决，不把错误预期写进测试。完整 Gate 现有性能阈值可能阻断，即使行为测试全部通过也必须保留失败事实。工作区已有改动通过起点 patch、哈希和独立 diff 审查保护。

## Open Questions

暂无未决范围问题。SCC 逻辑预算、secret detector protocol 与 Markdown append pending 均采用隔离 child 内的私有模块替换；父测试观察实际完成与失败边界，没有修改生产接线或公开 API。
