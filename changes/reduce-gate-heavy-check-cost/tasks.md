# Tasks

按阶段证据实施产物审计优化，完整保留编译、分析和 Gate 验收。

## Readiness

- [x] 0.1 确认扩大范围的授权、既有未提交快照、owner 与并发/资源/预算约束。
- [x] 0.2 完成三个重项的串行 baseline、固定函数输入、阶段计时和 profile，选定必要优化。

## Implementation

- [x] 1.1 声明文档按文件单次扫描，保留完整公开名与相邻中文要求。
- [x] 1.2 ESM 校验复用一次 AST 和完整语法诊断，省去丢弃 emit。
- [x] 1.3 同步直接测试、语义 Case 与需要的 owner 说明。

## Verification

- [x] 2.1 同一 emitted corpus、非法语法与固定输入对照通过，串行 before/after 计时完成。
- [x] 2.2 目标测试、Case、类型、lint、格式、文档和治理检查通过。
- [x] 2.3 非实施代理复审实际 diff、必要验收保留及文档影响，关闭实质阻断。
- [x] 2.4 完整 Gate 连续复测及 required Gate 满足原预算，完成最终交付复核。
