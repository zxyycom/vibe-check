# Tasks

实施、前后测量与追加文档/代码复核已完成；完整交付验收仍有测试超时及性能阻断。相关修正保存版本，Change 删除另需授权。

## Readiness

- [x] 0.1 核对 main、已有改动、规则/owner、Case 起点及相关决策，划定子代理单写者责任。
- [x] 0.2 保存修改前完整 Gate 与四组局部两轮测量、命令、输入及资源身份，不重试性能失败。

## Implementation

- [x] 1.1 删除目录硬约束与构建源码写法锁，将保留的依赖边界测试降层并同步 owner/Case。
- [x] 1.2 将 package 路径、指纹/工具链及文档 guard 错层测试降到真实最窄入口，保留 caller 接线证明。
- [x] 1.3 缩减真实 Git 重复初始化与无关定时等待，保留真实适配边界及测试隔离。
- [x] 1.4 用私有策略缩小 function metrics 容量/取消测试，保持生产默认值和公开 API。
- [x] 1.5 收敛 Gate 命名与 routine/release-only/explicit-only 资格，同步发布接线证据、owner/Case 和长期决策。
- [x] 1.6 以 AI-ready-docs 收敛本次及相关前序文档的主线、owner、重复与当前状态，保留历史证据的形成时边界。
- [x] 1.7 按完整编码规范复核变化模块及直接调用方，只修正实际语义障碍，保留测试与公开契约。

## Verification

- [x] 2.1 非实施代理独立审查实际 diff、公开 API/默认值、测试证明和文档影响，清除实质阻断。
- [x] 2.2 最窄测试、全树 Case、typecheck/lint/format、材料、Decision/Change 等受影响工程验证完成。
- [x] 2.3 停止本轮其它负载后完成同类局部后测及正常 Gate 验收，区分删义务/改频率与执行优化，报告实际功能/性能结果与未验证边界。
- [ ] 2.4 独立复核追加修正，完成受影响测试、工程及文档验证，并分别报告功能与性能状态。

## Evidence

### 实施与测量

最初实施及定向修正已通过非实施代理复核。前测、V1 质量失败、修正后 V2、局部原值、source/tool/candidate identities 与共享资源边界，完整保存在[测量报告](../../docs/investigations/measure-gate-test-boundary-simplification.md)及其资源；本计划只保留交接结论。

- V2 routine all：41 passed / 2 not-applicable，command wall 37.431→31.698 s；mean 2.276→2.024 s、P95 6.053→5.565 s，仍超过原 2/5 s 预算，exit 1。43→41 包含频率取舍，不能视为同 workload 的纯执行优化。
- 四组局部各两轮全通过，均值为 layout 2.630→1.909 s、package 2.636→1.590 s、function metrics 2.410→2.018 s、Git/timer 1.009→0.680 s。显式 consumer types（3 项）与 workbench（1 项）均 exit 0。
- 报告建立后的交付 changed：39 passed / 4 not-applicable；elapsed-to-initial 30.939 s、P95 6.513 s 超预算，exit 1。它不是 V2 的追加对照样本；现场为 `.log/project-gate/2026-10-24T04-35-40.626Z-871578-52f70746-1e64-4ddb-97e3-d02925355e32/`。
- 当时完整 validate、Case（781 entities / 192 Cases / 16 topics）、Decision、Investigation、Change、format 与 diff 检查通过；typecheck/lint 和 owner tests 由局部验证及 Gate 功能结果覆盖。正式 release receipt / prepare / verify 未运行，focused types 不替代正式 tarball 的发布证据。

任务 2.3 完成的是实施后的实测与结果交付，不声明性能预算通过；前序 package acceptance 的未闭合预算状态仍归[对应计划](../consolidate-package-acceptance/tasks.md)。

### 追加审查与版本保存

用户已授权相关前序改动一并提交、必要的后续提交和 hook 推送。首版 `f998ed4c` 已保存并由 hook 推送；代码审查修正保存为 `82f83db7`，hook 因冷却期未推送。未执行 Change finalize 或 package 发布。

- 文档复核覆盖当前 owner、相关 Case、两份 Change、六份 Investigation 与四份 Decision；集中 Gate 选择规则，分离验收流程与测试证据，更新过时状态，保留形成时测量事实。独立代表任务可恢复 41/42/43、显式选择、文档输入 fail-closed 和性能失败；发现的 guard 入口歧义已修正。
- 代码复核覆盖 57 个当前变化文件、删除的 layout 约束及直接调用方，以完整编码规范而非邻近风格裁决。只修正诊断事件的显式类型与候选材料的内部类型名；独立复核确认两个文件的 ESNext 运行时代码输出逐字相同，无临时例外。
- 固定 Bun 1.3.14 的 package/Gate 局部测试 64 项、Product/validation 目标及资格测试 34 项、相关 lifecycle/Core 闭包 4 项均通过；Product/scripts typecheck 与 lint 通过。额外独立诊断测试 2 项使用 Bun 1.4.2，不作为固定工具链或性能样本。
- 最终完整 `validate`（507 JSON / 5 schema / 621 Markdown）、Case（781 entities / 192 Cases / 16 topics）、Decision（377）、Investigation（122，index current）、26 项 Change及 format（1,017 文件）通过。工作树及非原始日志的暂存 diff 检查通过；报告附件为保真保留 Bun code-frame 空行的八处行尾空格，原件摘要一致。
- 追加修正后的 changed：39 passed / 4 not-applicable；elapsed-to-initial 74.825 s、mean 3.582 s、P95 12.846 s 均超预算，exit 1。现场为 `.log/project-gate/2026-10-24T04-51-31.030Z-942589-ccc82a5f-e598-4090-82cd-62c0228f3cee/`。它是交付验证，不是受控性能对照。
- 按 candidate owner 补齐 routine all：40 passed / 1 failed / 2 not-applicable，exit 1；duplicate-detection 首个构造测试触发 5 秒 timeout，并出现后续断言与注册异常。初步结果失败，性能预算未评估。一次原六文件隔离运行 19 passed，首例 4.884 s，不能据此宣称稳定或根因已确定；未重试完整 Gate、修改该模块或放宽限额。

新增失败现场及其边界见[交付超时报告](../../docs/investigations/record-delivery-duplicate-lane-timeout.md)。2.4 保持未勾选，明确完整交付验收尚未通过；本次代码/文档审查已完成，进一步超时与性能修复另行确定范围。
