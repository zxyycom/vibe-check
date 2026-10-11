# Tasks

报告接口 Readiness 可先行，Product 实施必须继承已验收 Core 与收集完整迁移的稳定提交；未收集路径不得伪装为零命中。

## Readiness

- [x] 0.1 范围与 owner 自审：核对 proposal/design、上游 Plan、API mechanics、package-tools 和协调入口，区分调试全集与实际 Git evidence/effective flags。
- [x] 0.2 契约自审：确认完整当前全集、零/重叠命中、双向一致/数量、范围元数据、同次共享视图/每次重收集及显式呈现责任；不要求独立试算 API。
- [x] 0.3 实施前记录并确认基线继承已验收 Core 与收集完整 matcher/selection 迁移的稳定提交；文档准备或未提交工作树不能解除上游门禁。
- [x] 0.4 按 Design 发布报告/接口 Readiness Investigation，固定同步入口、regions closed 适配、结果值/查询/formatter、范围元数据、示例与验证入口，同步 design/tasks；上游未冻结内容明确标注，缺口交回 owner。
- [x] 0.5 由非实施代理独立审查实际文档 diff，确认输入范围、上游继承门禁、调查产物与失败处理可执行；自审不替代该项。

## Implementation

- [x] 1.1 在 0.3/0.4/0.5 完成后实现 Non-core 同步工具，仅消费公共 collection/Core，按 changeFlag(id) 投影 token，所有已收集路径保留零命中。
- [x] 1.2 交付完整范围元数据、双向查询和命中数、按需人读 formatter；同次共用只读视图，不自动打印/写文件/分享或执行查询 I/O。
- [x] 1.3 同步 root exports、声明/JSDoc、README/指南入口、受管示例及 package-tools owner；按 test-evidence-review 维护测试/Case，不改变 Run machine output/effective flags。

## Verification

- [x] 2.1 运行最窄工具测试，证明零/单/多命中、完整正负列表、双向/数量与 Runtime region 匹配一致，全集不被 regions 并集缩减。
- [x] 2.2 验证 root/patterns/默认开关与实际排除列表、普通文件/no-follow、空全集/失败、重复调用反映文件/规则变化与同次定位/呈现无 I/O；未收集不等于零命中。
- [x] 2.3 验证输出修改隔离与 formatter 按需行为；运行两向依赖、typecheck/lint、文档/Case、支持宿主安装后消费者及对应跨边界/包 Gate。

- [x] 2.4 由非实施代理基于最终实际 diff 做独立正确性审查，反查公开任务、API/指南/JSDoc/示例、内部 owner 与测试/Case；仅正确性，不把阶段审查变为优化。
- [x] 2.5 正确性闭合后，由独立优化代理完成 ai-ready-docs 与编码规范优化及最终验证，准备稳定 owner 交接；Git 保存、Decision 对齐和 Change 结项随后由主线程按授权执行。

证据：Readiness 调查 `261011-change-flag-debugging-readiness` 已发布；主线程确认独立最终正确性审查无 blocker。

最终优化与验证：收敛指南/报告/coordination/Decision 正文，代码无具体规范问题故保持原样；
工具 6/6，docs:api/validate、Case 686/173、Decision/Investigation、Change 与 diff 检查通过。
最终完整 Gate 43/43（Bun 1.3.14、Node 24.18.0），candidate `0.0.0-local.af431b9f93b1`；
日志 `.log/project-gate/2026-10-11T11-15-59.916Z-1243969-ea395481-628c-40e0-9eae-751835a55ad6`。
Git 提交、Decision alignment 与 Change finalize 尚未执行，留给主线程；不以任务勾选代替这些动作。
