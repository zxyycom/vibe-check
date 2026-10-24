# Tasks

两版最小测试清理已完成，当前按授权复核并提交。完整 Gate 的性能验收仍待任务 2.4 闭合；其余实施与验证已完成，Change 删除另需授权。

## Readiness

- [x] 0.1 核对 main、已有改动、规则/owner、Case 起点及相关决策，划定子代理单写者责任。
- [x] 0.2 保存修改前完整 Gate 与四组局部两轮测量、命令、输入及资源身份，不重试性能失败。
- [x] 0.3 核对当前 clean main 与全树 Case 起点，限定本版明显问题、单写者范围和保留的真实边界。

## Implementation

- [x] 1.1 删除目录硬约束与构建源码写法锁，将保留的依赖边界测试降层并同步 owner/Case。
- [x] 1.2 将 package 路径、指纹/工具链及文档 guard 错层测试降到真实最窄入口，保留 caller 接线证明。
- [x] 1.3 缩减真实 Git 重复初始化与无关定时等待，保留真实适配边界及测试隔离。
- [x] 1.4 用私有策略缩小 function metrics 容量/取消测试，保持生产默认值和公开 API。
- [x] 1.5 收敛 Gate 命名与 routine/release-only/explicit-only 资格，同步发布接线证据、owner/Case 和长期决策。
- [x] 1.6 以 AI-ready-docs 收敛本次及相关前序文档的主线、owner、重复与当前状态，保留历史证据的形成时边界。
- [x] 1.7 按完整编码规范复核变化模块及直接调用方，只修正实际语义障碍，保留测试与公开契约。
- [x] 1.8 删除 Gate 重复、未消费的 Git/安装准备，将已确认的性能、acquisition、collector 和 installed waiver 规则矩阵降层；同步 Case，不改生产接线、预算或超时。
- [x] 1.9 清理 hash 精确次数、overlap、类型配置、manifest 静态断言及 Gate 内 Product-only outcome 测试，保留真实边界并同步 Case。

## Verification

- [x] 2.1 非实施代理独立审查实际 diff、公开 API/默认值、测试证明和文档影响，清除实质阻断。
- [x] 2.2 最窄测试、全树 Case、typecheck/lint/format、材料、Decision/Change 等受影响工程验证完成。
- [x] 2.3 停止本轮其它负载后完成同类局部后测及正常 Gate 验收，区分删义务/改频率与执行优化，报告实际功能/性能结果与未验证边界。
- [ ] 2.4 闭合完整交付 Gate 的功能及性能验收；未通过时保留现场和未完成状态。
- [x] 2.5 完成最小测试清理的目标测试、全树 Case、工程/材料验证和非实施代理证明审查，交接延后项与当前完整 Gate 结果。
- [x] 2.6 验证第二版目标测试、真实 artifact/installed/type acceptance、全树 Case、工程与文档检查，由非实施代理核对证明迁移，分别报告功能和性能结果。

## Evidence

### 当前验证与未完成项

最近完整执行是第二版清理后的交付验证；功能通过，性能预算未通过，任务 2.4 保持未勾选。

| 验证 | 实际结果 |
| --- | --- |
| routine all | 41 passed / 2 not-applicable，artifact 与 installed docs/runtime 通过；elapsed-to-initial 37.386 s 在 90 s 预算内，mean 2.299 s、P95 6.936 s 超原 2/5 s 预算，exit 1。 |
| 显式 consumer types | 3 passed / 40 not-applicable，exit 0；这是类型兼容诊断，不替代 routine all 的性能结果或正式发布验收。 |
| 目标测试 | 固定 Bun 1.3.14：第一版 Gate 41 项、collector/reconciliation 8 项、Product 6 项；第二版 duplicate 5 项、manifest 3 项、类型配置 1 项、Markdown/Product-Gate 7 项均通过。两版计数包含重复实体。 |
| 工程与材料 | Product/scripts typecheck、lint、format（1,020 文件）、validate（507 JSON / 5 schema / 621 Markdown）、全树 Case（781 entities / 192 Cases / 16 topics）、Decision（377）、Change（26）及 diff 检查通过。 |

日志：

- all：`.log/project-gate/2026-10-24T06-00-58.557Z-1024625-77a200dd-1878-4728-8c87-1d2a9aebd649/`。
- types：`.log/project-gate/2026-10-24T06-01-53.133Z-1031700-d880d55b-6a13-43ae-80a3-3ab2593c4a38/`。

两次验证使用同一 `0.0.0-local.883a39af14a7` candidate，preparation 复用当前安装。它们是交付验证，不是冷构建或受控性能对照；duplicate 功能组此次 2.786 s 通过，只证明该次执行成功。workbench 和正式 release receipt 验收未在两版清理后重跑，发布仍需同一正式 tarball 的完整验收。

### 追加清理的证明边界

| 对象 | 当前直接证明与保留的集成边界 |
| --- | --- |
| Gate | 性能规则由领域矩阵证明，adapter 保留总耗时与 Check 分布两个真实日志锚点及 preflight 短路顺序；lane 子集和手工 blocking 副本由现存全集与真实 factory 测试承接。 |
| duplicate | 十次 acquisition 改为直接 Check execution；area/blocking 矩阵直接调用领域 API。保留 scanner exact-input、一次真实 raw-cache 策略重算、零获取、source mutation 和隔离进程；正向 hash 精确次数锁定退出。 |
| Git 与缓存身份 | history failure 保留假进程协议及错误观察，移除未被消费的真实 Git 初始化；cache identity 移除未传入配置的假安装树。 |
| package | collector 接收已渲染输入；类型配置与 manifest 静态批准值在直接入口证明。真实 compiler、法律字节、文件排除、pack/installed 和公开 waiver 调用保留；artifact suite 共享构建次数不变。 |
| Markdown lint | 空 root、零匹配和 missing-root outcomes 在 Product 的直接执行与真实文件系统层证明，Gate 副本移除。 |

三项新增配对测试与三项删除实体按原目的维护 Case；总数仍为 781，数量不作为证明价值指标。生产实现、公开 API、预算、timeout 与 Gate 选择保持不变。

### 前序证据与版本

- 初始实施与后测见[测量报告](../../docs/investigations/measure-gate-test-boundary-simplification.md)：四组局部各两轮通过，routine all 从 43 项变为 41 项包含频率取舍，不能解释为同 workload 的纯执行优化。任务 2.3 表示实测及结果交付完成，不声明预算通过。
- 前序代码/文档审查已保存为 `f998ed4c`、`82f83db7` 和 `9bf26715`。其完整 Gate 中 duplicate timeout 的现场及隔离运行边界见[交付超时报告](../../docs/investigations/record-delivery-duplicate-lane-timeout.md)；前序 package acceptance 的预算状态仍归[对应计划](../consolidate-package-acceptance/tasks.md)。
- 第一版清理后的 all 为 41 passed / 2 not-applicable，mean 2.700 s、P95 7.286 s 超预算，exit 1；现场为 `.log/project-gate/2026-10-24T05-46-27.529Z-1002785-a2d57a4b-8e64-4e09-94a3-06042c000d07/`。当前状态以上面的第二版结果为准。

### 提交前复核

用户授权两版清理的文档/代码复核、必要提交及 hook 推送。提交保存已验证的清理结果及未闭合性能状态，不表示 Change 已结项。

- 两版证明迁移已由非实施代理审查；collector Case 的 marker 说明已收窄到真实断言。
- 追加完整编码规范复核覆盖全部 19 个变化代码文件（含三个新增配对测试），未发现阻断；没有使用相邻写法或临时用途作为例外。
- AI-ready-docs 复核覆盖三份计划、协调表目标行和五份 Case；独立阅读能够恢复授权、证明分层、当前失败与历史证据边界。过期提交限制和重复过程记录已收敛，Markdown 保持各自格式契约。
- 本轮复核只调整文档，沿用上表同一代码快照的测试及 all/types 执行证据；提交前重跑 Product/scripts typecheck、lint、format、validate、全树 Case 和目标 Change 检查通过。
