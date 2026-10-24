# Tasks

当前第七版已实施四处断言补强、一处去重与轻量漂移隔离；本轮接续文档与完整编码规范复核、必要优化和 Git 整理，允许提交及既有 hook 推送。任务 2.4、2.10 保留性能预算与冷集成验收的未完成状态；Change 删除和扩大修复范围另行确认。

## Readiness

- [x] 0.1 核对 main、已有改动、规则/owner、Case 起点及相关决策，划定子代理单写者责任。
- [x] 0.2 保存修改前完整 Gate 与四组局部两轮测量、命令、输入及资源身份，不重试性能失败。
- [x] 0.3 核对前序清理时的 clean main 与全树 Case 起点，限定该阶段明显问题、单写者范围和保留的真实边界。
- [x] 0.4 核对第三版 clean main、完整 Case 起点及已确认取舍，明确保留的独立观察与撤销的组合证明。
- [x] 0.5 核对第四版 clean main、782 entities / 191 Cases 起点及行为 owner，限定三类断言缺口和三类矩阵下沉，保留必要真实边界。
- [x] 0.6 核对第五版起点的 22 项已有改动、781 entities / 191 Cases 与行为 owner，划定测试单写者及保留边界；不改生产 API、依赖安装或 Gate 资格。
- [x] 0.7 核对第六版 clean main、781 entities / 191 Cases / 16 topics 与行为 owner；确认四处缺口和各自不可再降低的观察层，保持既有测试身份与单写者边界。
- [x] 0.8 核对第七版 clean main `25c75e36`、781 entities / 191 Cases / 16 topics 与 test-design 普查结论；以质量为目标划定四处补强、一处去重及私有材料隔离，6.1-sol 子代理负责主要实现，保持单写者和独立审查。

## Implementation

- [x] 1.1 删除目录硬约束与构建源码写法锁，将保留的依赖边界测试降层并同步 owner/Case。
- [x] 1.2 将 package 路径、指纹/工具链及文档 guard 错层测试降到真实最窄入口，保留 caller 接线证明。
- [x] 1.3 缩减真实 Git 重复初始化与无关定时等待，保留真实适配边界及测试隔离。
- [x] 1.4 用私有策略缩小 function metrics 容量/取消测试，保持生产默认值和公开 API。
- [x] 1.5 收敛 Gate 命名与 routine/release-only/explicit-only 资格，同步发布接线证据、owner/Case 和长期决策。
- [x] 1.6 以前序 ai-ready-docs 复核收敛当批文档的主线、owner、重复与状态，将历史细节交回版本引用，并完成独立复核。
- [x] 1.7 按完整编码规范复核前序提交的全部变化模块及直接调用方，只修正实际语义障碍，保留测试与公开契约。
- [x] 1.8 删除 Gate 重复、未消费的 Git/安装准备，将已确认的性能、acquisition、collector 和 installed waiver 规则矩阵降层；同步 Case，不改生产接线、预算或超时。
- [x] 1.9 清理 hash 精确次数、overlap、类型配置、manifest 静态断言及 Gate 内 Product-only outcome 测试，保留真实边界并同步 Case。
- [x] 1.10 收窄 installed waiver 与 builtin Run/发布接线，将 aggregation 矩阵降到已有 API，移除 artifact 私有路径锁定并同步 Case。
- [x] 1.11 修复取消阶段、MD052 位置及 history 写失败断言，先通过目标测试，再下沉输出参数、flags 和模块语法矩阵，继承原 Gate lane 资格并同步已有 Case。
- [x] 1.12 补强预取消零调用、Invocation 等待 prepared 收尾、工具链指纹材料敏感性，再下沉诊断命名非法值矩阵；同步既有 Case 的实际证明范围。
- [x] 1.13 加固非法 source 请求零 Worker 创建、完整 machine Check outcome 和结构化 Record 身份断言；将直接材料 helper 的负例替换为真实 installed README 漂移到 assessment 的接线验证，同步既有 Case。实现与独立审查完成，物理 target 验收仍由 2.10 承接。
- [x] 1.14 补强递归 critical-path、路径/换行指纹、Git clean-source 与 workbench 原字节保护；删除文档层重复指纹实体，保留 manifest/工具链的独立证据并同步 Case。
- [x] 1.15 将 machine drift 写入隔离到五份私有材料；字节负例使用真实 checker，Definition 保留健康基线和单因素修改后的真实 public Run，默认生成行为不变；同步 Case 与 owner，完成窄测试和独立隔离审查。

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
- [x] 2.11 完成第七版目标及邻近测试、反例验证、全树 Case、工程/材料检查、独立代码/文档审查、routine all 和显式 workbench；区分本轮质量验收与仍未闭合的性能及冷集成，不重试性能失败取绿。

## Evidence

### 当前验证与未完成项

第七版四处补强、一处去重与漂移隔离已实现；目标测试、工程检查和 Gate 功能验收通过。routine all 的 mean / P95 仍超预算，不能宣称完整 Gate 通过。代码和内部说明不改变公开 API、默认生成行为、Gate 资格、预算或 timeout。Git 保存与 hook 推送结果以实际 Git 记录确认；本 Change 因 2.4、2.10 未完成而继续保留。

下表为第七版实施阶段已取得的证据；追加文档与代码审查见[提交前复核](#提交前复核)。

| 验证 | 实际结果 |
| --- | --- |
| 目标及邻近测试 | 固定 Bun 1.3.14，critical-path/project-files、release、mapping、manifest/compiler、machine validation/workflow 共 18 文件 48 项通过；漂移实施与独立审查也分别通过其最窄测试。 |
| 反例辨错 | 隔离副本的递归 child-score、路径 hash、LF normalization、仅归一化 CRLF、Git 只检查 untracked 等错误均表现为旧断言通过、新断言失败，恢复后通过。workbench 的覆盖后再报错反例已在普查中验证；本轮实际新断言通过正式 candidate binding。反例副本已清理，不是完整仓库 mutation coverage。 |
| 隔离 | 仅复制两份 schema、Definition 与 two-file output。字节负例不执行 Run，Definition 健康基线及变化各执行一次真实 source public Run；实施、独立验证和集中 Gate 前后正式材料 SHA-256 均一致。command 的 root 转发另由实际调用链审查承接，不声称单项变异覆盖。 |
| Case 与工程 | 780 entities / 191 Cases / 16 topics 闭合，比起点仅删除一个重复实体。Product/scripts typecheck、lint、format（1,022 文件）、validate（507 JSON / 5 schema / 621 Markdown）、Decision（377）与全部 Change（26）通过。首次 format 仅 workbench 长 import 不合格式，原实施代理修复后复查通过。 |
| 独立审查 | 非实施代理按完整 coding-style 复核 10 个变化代码文件及直接上下文、4 份 Case 与 owner/计划，未发现实质代码整改或规范例外；删除后的材料敏感性/工具链资格仍有独立证据，公开使用文档无需改变。已修正 tasks 第六版历史指代，避免混入当前状态。 |
| routine all | 41 passed / 2 not-applicable，含 artifact、installed docs/runtime 与全部 routine test lanes。elapsed-to-initial 36.066 s 在原 90 s 内；mean 2.257 s、P95 5.285 s 超原 2/5 s，exit 1。最慢三项为 external-consumer provider 9.600 s、Markdown tests 9.574 s、Product lint 5.285 s。 |
| 显式 workbench | `mise exec -- bun run check -- --admission-workbench` 通过：24 tests / 6 files，1 Check passed / 42 not-applicable，exit 0；包括修改的 CLI 文件。focused 不评估性能预算。 |

all 日志：`.log/project-gate/2026-10-24T11-34-12.841Z-1456490-607045f0-e357-4457-b5da-1b4f1a9ed842/`；workbench 日志：`.log/project-gate/2026-10-24T11-35-02.936Z-1463065-01c35202-330e-46f8-981d-739d6fea5db2/`。本轮复用 `0.0.0-local.7416e73b58ad`，all preparation 0.309 s；没有受控前后测量，不以本次数值主张性能收益。all 未因预算失败重试。

未运行：cold candidate integration、consumer types、正式 release receipt。前者是第六版已知失败，后两者不属于本轮改动的资格边界；不能以当前 all/workbench 的功能验收替代它们。

前序未完成项继续有效：冷 candidate 集成在安装完成前超时，其新增 README 漂移断言的物理执行仍待验证。本轮没有修改该冷集成测试或放宽任何预算/timeout；原 all 预算仍为总反馈 90 s、mean 2 s、P95 5 s。

### 提交前复核

以 ai-ready-docs 收敛十份文档的主线、owner、历史引用与授权；非实施代理反查代码、Case 及保留的指纹证据，
确认公开使用文档无需改变，并将 `materialRoot` 转发的证明明确为调用链审查。性能与冷集成的未完成状态继续保留。

另一非实施代理依据完整编码规范审阅十个变化代码模块及直接上下文，未发现必须整改项或需要规范例外的内容；
测试与 fixture 未获临时用途豁免，代码保持实施后的状态。集中重跑八个目标及邻近文件的 22 项测试通过，
Product/scripts typecheck、lint 与 format 通过。本次未重跑 all、workbench、cold integration、types 或正式 release receipt，
实施阶段的验收与失败记录继续有效。

文档收口后，validate、全树 Case（780 entities / 191 Cases / 16 topics）、Decision、全部 Change 与 diff 检查通过。

### 冷集成失败现场与恢复边界

第六版 `mise exec -- bun run package:candidate:integration` 在既有 30 秒硬边界 ETIMEDOUT / exit 1，无测试结果摘要；未放宽 timeout 或重试取绿。失败现场是 `/tmp/vibe-check-package-candidate-ePo1TY/`，用途与清理条件见 `/tmp/vibe-check-package-candidate-ePo1TY.artifact-note.md`。只读检查发现 compiler emit 与 tarball 已形成，consumer 仅有 package.json，安装目录和 preparation receipt 尚未出现。精确耗时根因待调查，继续定位前须确认现场仍可用。

第六版 routine all 为 41 passed / 2 not-applicable，elapsed-to-initial 51.290 s、mean 2.466 s、P95 6.094 s，exit 1；功能通过但原 2/5 s 分布预算未通过。日志：`.log/project-gate/2026-10-24T09-27-20.454Z-1400625-c788ac0f-13c6-49dc-a26c-3c9b066670a4/`。该轮重建 candidate，属于交付验收而非受控性能对照。

第六版完整测试、反例、工程检查与提交前复核从 `c73ec649` 的本文件恢复；本节仅保留继续工作所需的失败与恢复信息。

### 证明范围与历史依据

当前保留的观察和取舍见 [design](design.md#decisions)。前序任务勾选记录各阶段已完成的工作；其形成时细节从下表所列提交的固定 artifacts 恢复，不作为本轮新增验收结果。

历史只作形成时依据，详细验证记录可从对应提交的本文件恢复：

| 阶段 | 依据与作用 |
| --- | --- |
| 初始实施与测量 | [测量报告](../../docs/investigations/measure-gate-test-boundary-simplification.md)记录四组局部对照及 Gate 频率取舍；任务 2.3 表示实测及结果交付。 |
| 前序审查与前两版 | 提交 `f998ed4c`、`82f83db7`、`9bf26715`、`91903719` 保存代码/文档审查与形成时验收；duplicate timeout 的现场另见[交付超时报告](../../docs/investigations/record-delivery-duplicate-lane-timeout.md)。 |
| 第三至五版 | `823a25eb`、`29de254a` 保存追加清理、实体连续性及验证明细。前序功能验收已通过，性能预算未闭合。 |
| 第六版 | `c73ec649` 保存四处证明加固、完整设计与独立复核；继续工作所需的预算失败及冷集成现场保留在上一节。 |

前序 package acceptance 的预算状态继续由[对应计划](../consolidate-package-acceptance/tasks.md)承接。
