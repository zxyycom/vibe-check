# Tasks

Readiness 与上游继承已完成；以下勾选只表示对应实施或验收证据完成，不包含 Git 提交、Decision 对齐或结项动作。

## Readiness

- [x] 0.1 范围与 owner 自审：核对 proposal/design、两条 active Decision、Architecture、收集指南、Project files 和协调入口，区分计划方向与当前实现。
- [x] 0.2 契约自审：确认多来源值、双向关系、来源筛选、追加重建/视图隔离和无 I/O；函数指标不强制迁移，临时输入不创建独立试算功能。
- [x] 0.3 发布 261011-project-file-region-index-readiness，收敛精确 API、输入边界、私有存储、最小消费与 10k/50k workload，同步 design；报告不替代实施证据。
- [x] 0.4 非实施代理独立审查文档 diff，确认范围、依赖、调查失败处理和验收可恢复。
- [x] 0.5 实施基线 HEAD 0aeb0d0e；git merge-base --is-ancestor 2b2489cf HEAD 返回 0，已继承完整 matcher 迁移。

## Implementation

- [x] 1.1 实现 createProjectFileRegionIndex、批量值合并与私有双向 Maps；closed/descriptor-safe detached 校验和运行时冻结，区分 unknown undefined 与 known empty []。
- [x] 1.2 appendSources 合并值后重建独立新视图；实际成员不扩大，旧视图不变，不重取来源。
- [x] 1.3 共用 selectConfigPaths 完整 matcher；仅迁移 fileMetrics 实际成员与 Run 规则投影，获取、policy 和 exact inputs 保持原义。
- [x] 1.4 同步公开根、inventory、声明/JSDoc、公开指南、发布映射与受管示例、内部 owner 和 changelog；新增五个索引 Case 并扩充共同 matcher/消费 Case。

## Verification

- [x] 2.1 最终 Bun 局部 53 tests 与 Node24.18 Core 8 tests 通过；覆盖关系、closed 输入、path/ID 与运行时隔离。此前原 NUL predicate 下三个身份回归均失败，恢复修复后通过。
- [x] 2.2 Core 测试覆盖批量/追加等价、规则重建、实际成员和旧视图；独立宿主封锁 fs/process 下构造、查询与追加通过。
- [x] 2.3 collection/Core/Run matcher 与消费策略通过；两宿主 10k/50k 构造/全查询/追加成本保留于报告，不宣称加速或 retained-memory 改善。
- [x] 2.4 最终完整 Gate 43/43 passed，candidate 0.0.0-local.b96090608982；同一 tarball 的 types/Node24.18 runtime/docs、两侧工程校验、材料和各 test lanes 通过，Case 680/169。精确日志、时间与边界见[最终验收](../../docs/investigations/project-file-region-index-readiness.md#最终独立优化与验收)。
- [x] 2.5 非实施代理的公开承诺/内部 owner/正确性独立审查、身份域修复定向复核，以及最终独立优化与验证已完成。验收证据已备妥；稳定提交、Decision 对齐与结项由协调者随后执行，debug 的提交继承门禁保持。
