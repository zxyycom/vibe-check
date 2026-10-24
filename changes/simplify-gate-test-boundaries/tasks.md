# Tasks

当前交付为第六版四处证明加固、文档与编码规范复核及 Git 保存，允许既有 hook 推送。任务 2.4、2.10 分别保留性能预算与冷集成验收的未完成状态；Change 删除另需授权。

## Readiness

- [x] 0.1 核对 main、已有改动、规则/owner、Case 起点及相关决策，划定子代理单写者责任。
- [x] 0.2 保存修改前完整 Gate 与四组局部两轮测量、命令、输入及资源身份，不重试性能失败。
- [x] 0.3 核对当前 clean main 与全树 Case 起点，限定本版明显问题、单写者范围和保留的真实边界。
- [x] 0.4 核对第三版 clean main、完整 Case 起点及已确认取舍，明确保留的独立观察与撤销的组合证明。
- [x] 0.5 核对第四版 clean main、782 entities / 191 Cases 起点及行为 owner，限定三类断言缺口和三类矩阵下沉，保留必要真实边界。
- [x] 0.6 核对第五版起点的 22 项已有改动、781 entities / 191 Cases 与行为 owner，划定测试单写者及保留边界；不改生产 API、依赖安装或 Gate 资格。
- [x] 0.7 核对第六版 clean main、781 entities / 191 Cases / 16 topics 与行为 owner；确认四处缺口和各自不可再降低的观察层，保持既有测试身份与单写者边界。

## Implementation

- [x] 1.1 删除目录硬约束与构建源码写法锁，将保留的依赖边界测试降层并同步 owner/Case。
- [x] 1.2 将 package 路径、指纹/工具链及文档 guard 错层测试降到真实最窄入口，保留 caller 接线证明。
- [x] 1.3 缩减真实 Git 重复初始化与无关定时等待，保留真实适配边界及测试隔离。
- [x] 1.4 用私有策略缩小 function metrics 容量/取消测试，保持生产默认值和公开 API。
- [x] 1.5 收敛 Gate 命名与 routine/release-only/explicit-only 资格，同步发布接线证据、owner/Case 和长期决策。
- [x] 1.6 以 ai-ready-docs 收敛当前提交文档的主线、owner、重复与状态，将历史细节交回版本引用，并完成独立复核。
- [x] 1.7 按完整编码规范复核当前提交的全部变化模块及直接调用方，只修正实际语义障碍，保留测试与公开契约。
- [x] 1.8 删除 Gate 重复、未消费的 Git/安装准备，将已确认的性能、acquisition、collector 和 installed waiver 规则矩阵降层；同步 Case，不改生产接线、预算或超时。
- [x] 1.9 清理 hash 精确次数、overlap、类型配置、manifest 静态断言及 Gate 内 Product-only outcome 测试，保留真实边界并同步 Case。
- [x] 1.10 收窄 installed waiver 与 builtin Run/发布接线，将 aggregation 矩阵降到已有 API，移除 artifact 私有路径锁定并同步 Case。
- [x] 1.11 修复取消阶段、MD052 位置及 history 写失败断言，先通过目标测试，再下沉输出参数、flags 和模块语法矩阵，继承原 Gate lane 资格并同步已有 Case。
- [x] 1.12 补强预取消零调用、Invocation 等待 prepared 收尾、工具链指纹材料敏感性，再下沉诊断命名非法值矩阵；同步既有 Case 的实际证明范围。
- [x] 1.13 加固非法 source 请求零 Worker 创建、完整 machine Check outcome 和结构化 Record 身份断言；将直接材料 helper 的负例替换为真实 installed README 漂移到 assessment 的接线验证，同步既有 Case。实现与独立审查完成，物理 target 验收仍由 2.10 承接。

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
- [ ] 2.10 完成第六版目标测试、反例验证、显式物理 candidate 集成、全树 Case、工程/材料验证、独立审查及 routine all；分别报告功能与性能、未验证边界，不对性能失败自动重试取绿。

## Evidence

### 当前验证与未完成项

第六版四处代码加固已完成；routine all 的 41 项功能检查通过，性能预算未通过。显式冷 candidate 集成在安装完成前超时，新漂移断言的物理执行仍待验证。提交前复核的状态见下节，Git 保存与两项剩余验收分别记录。

| 验证 | 实际结果 |
| --- | --- |
| 目标测试 | 固定 Bun 1.3.14，I/O session 与 machine publication/validation 共 3 文件 8 项通过；all 后再次通过。 |
| 反例 | 隔离副本分别把 Worker 创建提前到请求校验前、清空 final data、将结构化 pair 改为 NUL 拼接比较；三处均为旧断言通过、新断言失败。Worker 由非实施代理独立验证，machine 两处由实施代理自验证；辅助副本均已清理。candidate 漂移接线仅有静态反例分析。 |
| 工程与材料 | Product/scripts typecheck、lint、format（1,022 文件）、validate（507 JSON / 5 schema / 621 Markdown）、全树 Case（781 entities / 191 Cases / 16 topics）、Decision（377）与全部 Change（26）通过。 |
| 独立审查 | 非实施代理按完整编码规范审阅 4 个变化代码文件、直接调用链及 Case/计划，无实质整改项或规范例外；保留 session 创建顺序、projection 字段交接、完整 publication 校验和真实 installation assessment 边界。 |
| routine all | 41 passed / 2 not-applicable，artifact 与 installed docs/runtime 通过。elapsed-to-initial 51.290 s 在原 90 s 内；mean 2.466 s、P95 6.094 s 超原 2/5 s，exit 1。最慢项为 Markdown 功能组 11.816 s、function metrics 扫描 9.598 s、Product lint 6.094 s。 |
| 显式冷 candidate 集成 | `mise exec -- bun run package:candidate:integration` 在既有 30 秒硬边界 ETIMEDOUT / exit 1，无测试结果摘要。未放宽 timeout，未重试取绿。 |

all 日志：`.log/project-gate/2026-10-24T09-27-20.454Z-1400625-c788ac0f-13c6-49dc-a26c-3c9b066670a4/`。本轮因 receipt input mismatch 重建 `0.0.0-local.7416e73b58ad`，preparation 12.438 s；这是交付验收，不是同 workload 性能对照。types、workbench 未选，正式 release receipt 未运行。

冷集成失败现场：`/tmp/vibe-check-package-candidate-ePo1TY/`，用途与清理条件见 `/tmp/vibe-check-package-candidate-ePo1TY.artifact-note.md`。只读检查发现 compiler emit 与 tarball 已形成，consumer 仅有 package.json，安装目录和 preparation receipt 尚未出现。该现场供后续定位阶段使用，精确耗时根因待调查。

### 提交前复核

本次复核覆盖 4 个变化代码模块及直接实现、类型、helper 和调用链，以完整编码规范为判断依据。非实施代理确认无实质整改项或规范例外，并独立重跑 3 文件 8 项目标测试通过；代码保持实施后的状态。

六份文档按 ai-ready-docs 收敛当前目标、owner、授权与阅读顺序，Case 保留可观察行为，计划集中保存验证边界，历史明细转为下节版本引用。独立阅读复核确认能恢复目标、owner、当前与历史证据及未完成项；将含糊的“日常 Gate”澄清为 changed/all，保持默认 fast 的快速反馈边界。

提交前再次通过 3 文件 8 项目标测试、Product/scripts typecheck 与 lint、format、validate、全树 Case、Decision、全部 Change 及 diff 检查。此次复核保持代码不变，未重跑 all、冷集成、types、workbench 或正式 release receipt；上节两项未通过结果继续有效。

### 证明范围与历史依据

当前保留的观察和取舍见 [design](design.md#decisions)。第六版共 4 个代码文件与 6 份文档，复用既有测试实体和 Case；全树仍为 781 entities / 191 Cases / 16 topics。

历史只作形成时依据，详细验证记录可从对应提交的本文件恢复：

| 阶段 | 依据与作用 |
| --- | --- |
| 初始实施与测量 | [测量报告](../../docs/investigations/measure-gate-test-boundary-simplification.md)记录四组局部对照及 Gate 频率取舍；任务 2.3 表示实测及结果交付。 |
| 前序审查与前两版 | 提交 `f998ed4c`、`82f83db7`、`9bf26715`、`91903719` 保存代码/文档审查与形成时验收；duplicate timeout 的现场另见[交付超时报告](../../docs/investigations/record-delivery-duplicate-lane-timeout.md)。 |
| 第三至五版 | `823a25eb`、`29de254a` 保存追加清理、实体连续性及验证明细。前序功能验收已通过，性能预算未闭合；当前结果以上节第六版为准。 |

前序 package acceptance 的预算状态继续由[对应计划](../consolidate-package-acceptance/tasks.md)承接。
