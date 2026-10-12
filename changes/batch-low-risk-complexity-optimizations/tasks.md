# Tasks

先冻结基线与 readiness，再实施各 owner 的低风险切面，最后统一测量、独立审查与 Gate；不把实施授权视为删除授权。

## Readiness

- [x] 0.1 确认授权范围、指定模型、当前 HEAD、只读 before 副本和完整 Case 基线。
- [x] 0.2 各实现切面核对真实入口、不可变生命周期、错误/顺序边界与最窄测试计划。
- [x] 0.3 测量代理冻结可复现 small/scaled workload 与脚本，取得 before 数据和正确性基线；最终比较时同时补无 scope 保护 workload。

## Implementation

- [x] 1.1 实施 C01/C03/R08/R04 局部索引，保留原 graph preparation 与 validation 顺序。
- [x] 1.2 实施 K04/K07/K14 membership、滚动预算与 raw-coordinate comparison。
- [x] 1.3 实施 T01/T02 prepared-closure 内稳定输入索引，不改策略、history 或 fallback。
- [x] 1.4 根据保护性测量明确 C05 不采用：once-per-call Set 在常见 2/5-key schema 退化，正式源码保持原状。
- [x] 1.5 完成实际 diff 的主线程文档、Case、JSDoc 与材料影响审计及必要 owner 交接；指定模型独立反查另由 2.3 承接。

## Verification

- [x] 2.1 各切面最窄行为测试通过，完整 Case 闭合与必要 typecheck/lint/format/dependency 通过。
- [x] 2.2 在 CPU 静默窗口完成同条件 before/after 及输出/错误/顺序等价核对，记录小规模成本与收益边界。
- [x] 2.3 全新非实施 GPT‑6.1‑sol 独立审查通过；66 tests / 19 files、Case 与证据复核通过，无产品实质阻断；E1 测量解释澄清另记且原始证据不变。
- [x] 2.4 运行完整 Project Gate（43/43），归档后补过 validate、Case、全部 Change、Decision、format 与 diff 检查。
- [x] 2.5 审计范围与证据，按 Core/Run、Checks、learned 分组提交；首次交接明确审查缺口，本轮补齐独立审查记录，保留可复现结果与临时物归宿。
