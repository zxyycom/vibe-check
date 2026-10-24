# Tasks

第三版降层与收窄已完成并验证，当前按授权复核并提交。完整 Gate 的性能验收仍待任务 2.4 闭合；Change 删除另需授权。

## Readiness

- [x] 0.1 核对 main、已有改动、规则/owner、Case 起点及相关决策，划定子代理单写者责任。
- [x] 0.2 保存修改前完整 Gate 与四组局部两轮测量、命令、输入及资源身份，不重试性能失败。
- [x] 0.3 核对当前 clean main 与全树 Case 起点，限定本版明显问题、单写者范围和保留的真实边界。
- [x] 0.4 核对第三版 clean main、完整 Case 起点及已确认取舍，明确保留的独立观察与撤销的组合证明。

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
- [x] 1.10 收窄 installed waiver 与 builtin Run/发布接线，将 aggregation 矩阵降到已有 API，移除 artifact 私有路径锁定并同步 Case。

## Verification

- [x] 2.1 非实施代理独立审查实际 diff、公开 API/默认值、测试证明和文档影响，清除实质阻断。
- [x] 2.2 最窄测试、全树 Case、typecheck/lint/format、材料、Decision/Change 等受影响工程验证完成。
- [x] 2.3 停止本轮其它负载后完成同类局部后测及正常 Gate 验收，区分删义务/改频率与执行优化，报告实际功能/性能结果与未验证边界。
- [ ] 2.4 闭合完整交付 Gate 的功能及性能验收；未通过时保留现场和未完成状态。
- [x] 2.5 完成最小测试清理的目标测试、全树 Case、工程/材料验证和非实施代理证明审查，交接延后项与当前完整 Gate 结果。
- [x] 2.6 验证第二版目标测试、真实 artifact/installed/type acceptance、全树 Case、工程与文档检查，由非实施代理核对证明迁移，分别报告功能和性能结果。
- [x] 2.7 完成第三版最窄测试、全树 Case、工程/材料检查、独立审查及一次完整 Gate，明确未覆盖的组合与性能边界。

## Evidence

### 当前验证与未完成项

以下为第三版清理后的直接验证：功能通过，性能预算未通过，任务 2.4 保持未勾选。

| 验证 | 实际结果 |
| --- | --- |
| routine all | 41 passed / 2 not-applicable，artifact 与 installed docs/runtime 通过；elapsed-to-initial 46.397 s 在 90 s 预算内，mean 2.863 s、P95 6.653 s 超原 2/5 s 预算，exit 1。 |
| 目标测试 | 固定 Bun 1.3.14：aggregation/Run、duplicate constructor、maintenance first-parent/progress、machine publication、Markdown findings-cache 共 7 文件 17 项通过。新增测试类型导入修正后，聚合两文件 4 项及 Product typecheck 再次通过。 |
| 工程与材料 | Product/scripts typecheck、lint、format（1,020 文件）、validate（507 JSON / 5 schema / 621 Markdown）、全树 Case（782 entities / 191 Cases / 16 topics）、目标 Change 及 diff 检查通过；完整 Gate 同时通过 Decision 和 import boundary 等检查。 |
| 独立审查 | 非实施代理覆盖全部第三版代码、Case 与计划，核实保留的独立观察及接受减少的整链组合；修正类型导入后无剩余实质阻断，无需编码规范例外。 |

all 日志：`.log/project-gate/2026-10-24T06-49-38.492Z-1162335-89cdb88f-f6bc-4268-84e2-4e25de59f5b9/`。

本次使用 `0.0.0-local.883a39af14a7` candidate，preparation 复用当前安装；这是交付验证，不是冷构建或受控性能对照。duplicate 功能组此次 3.215 s 通过，只证明该次执行成功。第三版未重跑显式 consumer types、workbench 或正式 release receipt 验收；本轮没有类型契约改动，发布仍需同一正式 tarball 的完整验收。

### 追加清理的证明边界

| 对象 | 当前直接证明与保留的集成边界 |
| --- | --- |
| Gate | 性能规则由领域矩阵证明，adapter 保留总耗时与 Check 分布两个真实日志锚点及 preflight 短路顺序；lane 子集和手工 blocking 副本由现存全集与真实 factory 测试承接。 |
| duplicate | 十次 acquisition 改为直接 Check execution；area/blocking 矩阵直接调用领域 API。保留 scanner exact-input、一次真实 raw-cache 策略重算、零获取、source mutation 和隔离进程；正向 hash 精确次数锁定退出。 |
| Git 与缓存身份 | history failure 保留假进程协议及错误观察，移除未被消费的真实 Git 初始化；cache identity 移除未传入配置的假安装树。 |
| package | collector 接收已渲染输入；类型配置与 manifest 静态批准值在直接入口证明。真实 compiler、法律字节、文件排除、pack/installed 和公开 waiver 调用保留；artifact suite 共享构建次数不变。 |
| Markdown lint | 空 root、零匹配和 missing-root outcomes 在 Product 的直接执行与真实文件系统层证明，Gate 副本移除。 |
| aggregation | 默认 6 组和 custom 4 态矩阵直接调用已有聚合 API；真实 Run 保留 effective selection、非默认返回传播、错误清理和默认 publication。 |
| 第三版集成收窄 | installed waiver 留 cold Finding→公开 Record identity→applied→machine Records，reason/unused/removed 在领域 cache-parity 测试证明；duplicate 默认真实 scanner 直接执行 Check。maintenance 专属发布测试退出，领域结果与通用 Run/publication 分别证明，不宣称保留原 builtin 整链组合。 |
| 保留项 | artifact 仅移除私有重导出路径 regex，独立 façade 字节批准值不变；warm-cache/raw-limit 顺序、真实 timer/I/O 与 compiler 物理边界继续保留。 |

第三版新增两个聚合实体、删除一个 maintenance 发布实体并退休其专属 Case，duplicate 实体按连续目的 rename；全树从 781 entities / 192 Cases 变为 782 / 191，数量不作为证明价值指标。生产实现、公开 API、预算、timeout 与 Gate 选择保持不变。

### 前序证据与版本

- 初始实施与后测见[测量报告](../../docs/investigations/measure-gate-test-boundary-simplification.md)：四组局部各两轮通过，routine all 从 43 项变为 41 项包含频率取舍，不能解释为同 workload 的纯执行优化。任务 2.3 表示实测及结果交付完成，不声明预算通过。
- 前序代码/文档审查已保存为 `f998ed4c`、`82f83db7` 和 `9bf26715`。其完整 Gate 中 duplicate timeout 的现场及隔离运行边界见[交付超时报告](../../docs/investigations/record-delivery-duplicate-lane-timeout.md)；前序 package acceptance 的预算状态仍归[对应计划](../consolidate-package-acceptance/tasks.md)。
- 前两版清理、完整编码规范与 AI-ready-docs 复核已保存为 `91903719`。两次 all 均功能通过但性能超预算，第二版显式 consumer types 通过；形成时的具体数值、日志及 781 entities / 192 Cases 账本记录保留在该提交的本文件中，当前验收以上面的第三版结果为准。

### 本次提交前复核

用户授权第三版文档/代码复核、必要提交及 hook 推送。提交保存已验证的清理结果及未闭合性能状态，不表示 Change 已结项。

- 非实施代理以完整编码规范复核全部 7 个变化代码文件及直接受影响上下文，无实质问题或规范例外；本次复核没有追加代码改动。
- 文档审查覆盖三份计划、协调表目标行和四份 Case：更新授权，压缩重复历史，并将 self-match 失败说明归回实际观察它的 Check Case；保留当前性能失败及减少整链观察的边界。
- 独立阅读检查能从实际文本恢复授权、证明分层、当前与历史结果、剩余风险；Markdown 保持各自载体格式。
- 提交前重跑 duplicate constructor 3 项、Product/scripts typecheck、lint、format、validate、全树 Case、Decision 和全部 Change 检查通过。完整 Gate 沿用上表同一代码快照的执行证据，本次文档复核未重跑 Gate。
