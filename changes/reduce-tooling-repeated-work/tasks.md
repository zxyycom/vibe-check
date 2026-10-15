# Tasks

按 owner 核对、局部实施、语义回归与主线程全局验收的顺序推进。
实施与验证 checkbox 记录文档整理前已验收快照；具体证据与后续复验边界见 design。

## Readiness

- [x] 0.1 读取工具规则、技能与候选源码，确认边界及操作量证据层。
- [x] 0.2 主线程授权独占四个工具 Topic；复用共享的全树 Test Evidence 起点检查。

## Implementation

- [x] 1.1 实施 registry、文档目标/文本及 tar/ESM 重复工作优化，闭合 R03–R07/R09；JSDoc per-target matcher 等未采用子项见 evidence。
- [x] 1.2 实施 lanes、模拟观测/静态身份、topic 计数及 missing-link 位置，闭合 R10–R15。
- [x] 1.3 实施 invocation-local 模块分析/符号及 canonical 构造，闭合 R16/R17。
- [x] 1.4 更新既有语义测试与必要 Case，逐项记录不采用边界与操作量证据。
- [x] 1.5 按质量门槛整理 parser、索引、captured-prefix、Core traversal 和 canonical 职责；保留访问序、owner、阈值与契约。

## Verification

- [x] 2.1 最窄语义回归、scripts 工程检查与 diff 自审通过，命令和冻结基线差分见 evidence.md。
- [x] 2.2 Change 检查通过，并区分局部证明、组合验收和未测工具链耗时边界。
- [x] 2.3 职责整理后重跑 38 个目标测试、721 组差分、五组 reflection trace、scripts 工程与规模检查，交独立复审。
- [x] 2.4 同 candidate required/complete Gate 与非实施复审通过，新增质量阻断均消除。
