# Tasks

第四、五版测试整理已完成，当前按授权复核文档和代码并保存 Git，允许既有 hook 推送。当前 changed Gate 的已选功能通过，完整交付的性能验收仍待任务 2.4 闭合；Change 删除另需授权。

## Readiness

- [x] 0.1 核对 main、已有改动、规则/owner、Case 起点及相关决策，划定子代理单写者责任。
- [x] 0.2 保存修改前完整 Gate 与四组局部两轮测量、命令、输入及资源身份，不重试性能失败。
- [x] 0.3 核对当前 clean main 与全树 Case 起点，限定本版明显问题、单写者范围和保留的真实边界。
- [x] 0.4 核对第三版 clean main、完整 Case 起点及已确认取舍，明确保留的独立观察与撤销的组合证明。
- [x] 0.5 核对第四版 clean main、782 entities / 191 Cases 起点及行为 owner，限定三类断言缺口和三类矩阵下沉，保留必要真实边界。
- [x] 0.6 核对第五版起点的 22 项已有改动、781 entities / 191 Cases 与行为 owner，划定测试单写者及保留边界；不改生产 API、依赖安装或 Gate 资格。

## Implementation

- [x] 1.1 删除目录硬约束与构建源码写法锁，将保留的依赖边界测试降层并同步 owner/Case。
- [x] 1.2 将 package 路径、指纹/工具链及文档 guard 错层测试降到真实最窄入口，保留 caller 接线证明。
- [x] 1.3 缩减真实 Git 重复初始化与无关定时等待，保留真实适配边界及测试隔离。
- [x] 1.4 用私有策略缩小 function metrics 容量/取消测试，保持生产默认值和公开 API。
- [x] 1.5 收敛 Gate 命名与 routine/release-only/explicit-only 资格，同步发布接线证据、owner/Case 和长期决策。
- [x] 1.6 以 AI-ready-docs 收敛当前提交文档的主线、owner、重复与状态，保留历史证据的形成时边界。
- [x] 1.7 按完整编码规范复核当前提交的全部变化模块及直接调用方，只修正实际语义障碍，保留测试与公开契约。
- [x] 1.8 删除 Gate 重复、未消费的 Git/安装准备，将已确认的性能、acquisition、collector 和 installed waiver 规则矩阵降层；同步 Case，不改生产接线、预算或超时。
- [x] 1.9 清理 hash 精确次数、overlap、类型配置、manifest 静态断言及 Gate 内 Product-only outcome 测试，保留真实边界并同步 Case。
- [x] 1.10 收窄 installed waiver 与 builtin Run/发布接线，将 aggregation 矩阵降到已有 API，移除 artifact 私有路径锁定并同步 Case。
- [x] 1.11 修复取消阶段、MD052 位置及 history 写失败断言，先通过目标测试，再下沉输出参数、flags 和模块语法矩阵，继承原 Gate lane 资格并同步已有 Case。
- [x] 1.12 补强预取消零调用、Invocation 等待 prepared 收尾、工具链指纹材料敏感性，再下沉诊断命名非法值矩阵；同步既有 Case 的实际证明范围。

## Verification

- [x] 2.1 非实施代理独立审查实际 diff、公开 API/默认值、测试证明和文档影响，清除实质阻断。
- [x] 2.2 最窄测试、全树 Case、typecheck/lint/format、材料、Decision/Change 等受影响工程验证完成。
- [x] 2.3 停止本轮其它负载后完成同类局部后测及正常 Gate 验收，区分删义务/改频率与执行优化，报告实际功能/性能结果与未验证边界。
- [ ] 2.4 闭合完整交付 Gate 的功能及性能验收；未通过时保留现场和未完成状态。
- [x] 2.5 完成最小测试清理的目标测试、全树 Case、工程/材料验证和非实施代理证明审查，交接延后项与当前完整 Gate 结果。
- [x] 2.6 验证第二版目标测试、真实 artifact/installed/type acceptance、全树 Case、工程与文档检查，由非实施代理核对证明迁移，分别报告功能和性能结果。
- [x] 2.7 完成第三版最窄测试、全树 Case、工程/材料检查、独立审查及一次完整 Gate，明确未覆盖的组合与性能边界。
- [x] 2.8 完成第四版最窄测试、全树 Case、工程/材料验证、独立审查及 changed Gate，交付实际结果和保留边界。
- [x] 2.9 完成第五版目标测试、全树 Case、工程/材料验证、独立审查及 changed Gate，区分独立材料敏感性、真实运行资格与未完成的性能验收。

## Evidence

### 提交前复核

非实施代理按完整编码规范审阅全部 18 个 TypeScript 变更文件及直接上下文，无必须整改项或规范例外；独立运行 9 个精确实体及 eligibility/Core closure 两文件 8 项测试，均通过。9 份文档经 AI-ready-docs 收敛并独立审查，能恢复当前 owner、范围、保留与减少的观察、证据和授权；摘要已明确区分 changed 的已选功能与完整交付验收。

主线程重跑 21 文件 73 项目标测试、Product/scripts typecheck/lint、format（1,022 文件）、validate（507 JSON / 5 schema / 621 Markdown）、全树 Case（781 entities / 191 Cases / 16 topics）、Decision（377）、全部 Change（26）及 diff 检查，均通过。文档收敛后 quality 为 5 passed / 38 not-applicable，日志：`.log/project-gate/2026-10-24T08-43-49.912Z-1389892-efd45018-9183-42a2-8bc5-2110c6b8f49b/`。本次未重跑 changed/all/types/workbench/release，未修改实施后的代码；下列 changed 性能失败继续有效，Git 保存不表示任务 2.4 完成。

### 当前验证与未完成项

以下为第五版最终代码的验证；已选功能全部通过，性能预算未通过。任务 2.4 保持未勾选，不能把本轮测试清理完成解释为整个 Change 已验收。

| 验证 | 实际结果 |
| --- | --- |
| changed Gate | 33 passed / 10 not-applicable，artifact 与 installed docs/runtime 通过；elapsed-to-initial 34.529 s、mean 2.500 s、P95 7.020 s 超原 30/2/5 s 预算，exit 1。最慢项为 Markdown 功能组 9.027 s、function metrics 扫描 7.020 s、function metrics 功能组 4.948 s。 |
| quality focused | 5 passed / 38 not-applicable；最终辅助文件通过原 file metrics policy，不新增 waiver 或放宽限额。此 preset 不评估性能预算。 |
| 目标测试 | 固定 Bun 1.3.14：预取消、compiler/toolchain cache、prepared lifecycle、generic terminal effects 与命名测试，共 7 文件 26 项通过；最后 helper 收敛后已重跑。 |
| 工程与材料 | Product/scripts typecheck、lint、format（1,022 文件）、validate（507 JSON / 5 schema / 621 Markdown）、全树 Case（781 entities / 191 Cases / 16 topics）与全部 Change（26）检查通过；最终 helper 修改后重跑 Product typecheck/lint/format、目标测试及 Case，最终证据文档经材料、Case、Change 与 diff 复核。 |
| 独立审查与反例 | 非实施代理复核 5 个变化代码文件、直接上下文与 Case，无规范例外。隔离副本中 6 个错误实现均被新增断言拦住：两个预取消 guard 删除、两处 completion await 删除、漏算 platform executable、固定合法 digest。恢复后目标测试通过，临时目录已清理；helper 复用后重验两处 await，最后仅收敛相同输出矩阵及冗余 wrapper，barrier 与调用链不变。 |

最终 changed 日志：`.log/project-gate/2026-10-24T08-18-31.715Z-1382271-e1e4040f-56a7-4eca-b38c-5c7d63576bca/`。
最终 quality 日志：`.log/project-gate/2026-10-24T08-17-54.374Z-1378215-a6ee29f1-a42f-43d6-b625-ee10018f920a/`。

本轮继续复用 `0.0.0-local.883a39af14a7` candidate，未修改生产实现或依赖安装；这是交付验证，不是冷构建或受控性能对照。第五版未重跑 routine all、显式 consumer types、workbench 或正式 release receipt；changed 实际执行受影响 artifact/installed docs/runtime，未选项目不宣称本轮通过，发布仍需同一正式 tarball 的完整验收。

本轮修复与重验边界：

- 两次 quality 分别发现同一 lifecycle helper 为 324、308 code lines，超过原 300 限额；第一次 changed 也以该 308 行问题形成 32 passed / 1 failed / 10 not-applicable，未评估性能。通过复用既有单 Check fixture、将相同 disabled 输出整理为逐策略验证、删除仅转发或类型收窄的 helper 消除重复；保留各次 Invocation、明确终态断言、barrier 与失败清理，没有为行数拆文件或压缩排版。
- quality 失败现场依次为 `.log/project-gate/2026-10-24T08-09-28.101Z-1365458-4b114eed-550c-452f-bbe3-7b5171c73aaf/`、`.log/project-gate/2026-10-24T08-12-45.094Z-1370099-2f1d9b7c-cba7-4ae2-823a-6f98bb1c394f/`；首次 changed 现场为 `.log/project-gate/2026-10-24T08-14-19.049Z-1374494-0b683af1-d611-4501-94a4-605afc869274/`。最终重跑发生在实际代码修复后；没有对性能失败自动重试取绿。

### 第四版验证（第五版起点）

第四版固定 Bun 1.3.14 的 14 文件 47 项目标测试通过；Product/scripts typecheck、lint、format、材料、Case、Decision（377）和 Change 检查通过。非实施代理审阅 13 个变化代码文件及 Case，修复 lane 归属后无规范例外。以下为当时证据，不代替第五版验收：

| 验证 | 实际结果与日志 |
| --- | --- |
| changed Gate | 33 passed / 10 not-applicable，含 artifact/installed docs/runtime；elapsed/mean/P95 为 33.000/2.667/6.413 s，超 30/2/5 s 预算，exit 1。日志：`.log/project-gate/2026-10-24T07-38-58.343Z-1254752-f9c48a33-f533-4dcb-94e0-2044d65d6c3e/`。 |
| quality | 5 passed / 38 not-applicable，不评估性能。日志：`.log/project-gate/2026-10-24T07-38-19.343Z-1254339-c3df14a7-247e-4d58-b2dd-0b62031bb7fb/`。 |

第四版复用同一 candidate，未重跑 all/types/workbench/release。首次 changed 因 constructor 329/300 code lines 失败，后续 quality 因 Case 文档 501/500 行失败；用完整 outcome 精确比较和收敛重复说明修复，保留独立预期与 Case 目的，重验没有放宽限额。失败现场分别为：

- `.log/project-gate/2026-10-24T07-31-06.667Z-1232733-def631c5-d2ea-41f9-b673-a9f2910e35a2/`
- `.log/project-gate/2026-10-24T07-36-16.730Z-1249101-f51e93c3-7729-458e-8a62-91e934bcb002/`

早期 Bun 1.4.2 暴露既有 plain/null-prototype 比较差异，正式验证统一使用项目固定 1.3.14；完整 outcome 曾遗漏 messages，补齐独立公开期望后通过。

### 证明范围与实体连续性

当前保留边界和减少的组合观察由 [design](design.md#decisions) 集中说明。第四版将四个 flags 运算实体合为一个 Run 接线实体，新增两个配对领域实体，并连续 rename MD052 Check；实体从 782 变为 781，Case 仍为 191。第五版只补强既有实体，计数不变。当前交付共 18 个代码文件与 9 份文档；隔离反例副本均已清理。

### 前序证据与版本

- 初始实施与后测见[测量报告](../../docs/investigations/measure-gate-test-boundary-simplification.md)：四组局部各两轮通过，routine all 从 43 项变为 41 项包含频率取舍，不能解释为同 workload 的纯执行优化。任务 2.3 表示实测及结果交付完成，不声明预算通过。
- 前序代码/文档审查已保存为 `f998ed4c`、`82f83db7` 和 `9bf26715`。其完整 Gate 中 duplicate timeout 的现场及隔离运行边界见[交付超时报告](../../docs/investigations/record-delivery-duplicate-lane-timeout.md)；前序 package acceptance 的预算状态仍归[对应计划](../consolidate-package-acceptance/tasks.md)。
- 前两版清理、完整编码规范与 AI-ready-docs 复核已保存为 `91903719`。两次 all 均功能通过但性能超预算，第二版显式 consumer types 通过；形成时数值、日志及账本记录保留在该提交的本文件中。
- 第三版及其独立代码/文档复核保存为 `823a25eb`。该版 all 为 41 passed / 2 not-applicable，mean 2.863 s、P95 6.653 s 超预算；完整证据保留在该提交的本文件，不代替当前验收。
