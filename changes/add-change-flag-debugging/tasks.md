# Tasks

报告接口 Readiness 可先行，Product 实施必须继承已验收 Core 与收集完整迁移的稳定提交；未收集路径不得伪装为零命中。

## Readiness

- [x] 0.1 范围与 owner 自审：核对 proposal/design、上游 Plan、API mechanics、package-tools 和协调入口，区分调试全集与实际 Git evidence/effective flags。
- [x] 0.2 契约自审：确认完整当前全集、零/重叠命中、双向一致/数量、范围元数据、同次共享视图/每次重收集及显式呈现责任；不要求独立试算 API。
- [ ] 0.3 实施前记录并确认基线继承已验收 Core 与收集完整 matcher/selection 迁移的稳定提交；文档准备或未提交工作树不能解除上游门禁。
- [ ] 0.4 按 Design 发布报告/接口 Readiness Investigation，固定同步入口、regions closed 适配、结果值/查询/formatter、范围元数据、示例与验证入口，同步 design/tasks；上游未冻结内容明确标注，缺口交回 owner。
- [x] 0.5 由非实施代理独立审查实际文档 diff，确认输入范围、上游继承门禁、调查产物与失败处理可执行；自审不替代该项。

## Implementation

- [ ] 1.1 在 0.3/0.4/0.5 完成后实现 Non-core 同步工具，仅消费公共 collection/Core，按 changeFlag(id) 投影 token，所有已收集路径保留零命中。
- [ ] 1.2 交付完整范围元数据、双向查询和命中数、按需人读 formatter；同次共用只读视图，不自动打印/写文件/分享或执行查询 I/O。
- [ ] 1.3 同步 root exports、声明/JSDoc、README/指南入口、受管示例及 package-tools owner；按 test-evidence-review 维护测试/Case，不改变 Run machine output/effective flags。

## Verification

- [ ] 2.1 运行最窄工具测试，证明零/单/多命中、完整正负列表、双向/数量与 Runtime region 匹配一致，全集不被 regions 并集缩减。
- [ ] 2.2 验证 root/patterns/默认开关与实际排除列表、普通文件/no-follow、空全集/失败、重复调用反映文件/规则变化与同次定位/呈现无 I/O；未收集不等于零命中。
- [ ] 2.3 验证输出修改隔离与 formatter 按需行为；运行两向依赖、typecheck/lint、文档/Case、支持宿主安装后消费者及对应跨边界/包 Gate，独立反查公开材料和 owner。
