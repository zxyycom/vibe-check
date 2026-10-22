# 测试质量清理结果

本页保存 2026-10-22 测试质量清理阶段的验收快照，依据见[普查结论](../audit-test-evidence-quality/summary.md)。**56 个目标已实施；阶段最终完整 Gate 的 43 项 Checks 全部通过，但平均耗时超出既有预算，最终 exit 1。**

## 范围与顺序

| 实施分区 | 问题实体 | 来源报告 |
| --- | ---: | --- |
| Repository / package / Markdown | 17 | Gate、Package、Markdown link、Repository；同类的两篇示例目录回收另列。 |
| Run / Definition / Scheduler / outputs | 19 | Run outputs、Scheduler、Run/Definition。 |
| Tools / analyzer / data / JSON / scanners | 20 | Package tools、Analyzers、Data/JSON/command、Scanners/scope。 |
| **合计** | **56** | **按问题实体去重，Gate 合并承接方另有一处必要调整。** |

先完成全组删除/合并，再开放改写。原预计 42 改写、9 局部清理、1 合并、3 fixture 回收和 1 名称收窄是审计分类，不是保留、改写或新增测试配额；实际可用更小删除动作闭合的目标不强行补测试。

## 已完成的删除与合并

- 删除同实参 cache configuration 自比较、primitive isFrozen、手写数组长度、未接线 observations、fixture 自证层、重复 source-map 字段、自造尾元素与 parser 函数对象 identity 断言，以及一行完全重复 Swift 输入。
- 删除弱 throwing-getter 片段，保留已有 canonical boundary 的外部计数证明及其它独立负例；handoff helper 不再返回 expected 伪造 read，保留两个真实 Run 与 consumer/关闭证明。
- native operation 删掉未授予被测执行的目录与 absence 断言，名称收窄为实际 outcomes/Records/cancellation；没有为了维持旧名称补一份无增量测试。
- Gate manifest donor 的 exact keys 和完整 raw required-set 迁入 Definition composition 后，删除重复 donor/golden。原 required metadata 与特殊 runtime lane 的有效 enablement 并非相同观察，二者均保留。

第一阶段最窄测试为 repository 29+1、runtime 14、checks 11，全部通过。Case 删除 donor 并更新 native 名称后，全树从 **766 降至 765 实体，仍为 190 Cases**；static/registration 与映射闭合通过。

## 质量改写与维护整理

| 分区 / 目标 | 实际动作与保留价值 |
| --- | --- |
| Repository — G2/3、P-01/02/03 | owning lint Finding 明确投影；preparation/log/loader 外部计数；独立 TypeScript symbol observer 对真实 source/emitted roots 闭合，识别 direct/alias/wildcard 并删除无效类型片段；manifest 的具体 safety 原因与 equality drift 分开。 |
| Markdown — M1/2 | 完整有效但无终止 newline 的尾行，以及新 session 的恢复；隔离 child 让 append 真正 pending，验证取消后的 finalize 等待、实际写入与幂等。 |
| Repository — R-01/02/03/04 | 真实 ABBA 路径与手算数值、独立正向源码/唯一生成排除、固定 profile 数值、递归 AST/resolution 的 import 边界及合法 public import 正对照。 |
| Repository — R-05 | 三个 CLI 独占目录全部 finally 回收；两篇完整示例在非投影区域添加本例专属资源清理，成功和抛错均回收，投影 bytes 不变。 |
| Runtime — RO-R1 | 两个 gated Checks、独立 heartbeat handles 和真实 settlement 握手，观察首项后仍 active、末项后在终态/close 前取消。 |
| Runtime — SCH-001/002/003/004 | first-fault 外部断言、两种 summary writer 失败确实触发、跨 Run 闭包消费 trace/各 Run outcome、单变量 graph identity。提前失败的 Run 会让握手明确报错并 finally drain，而非等待超时。 |
| Runtime — RD-01/02/03/04/07/08/09 | callback 外部见证、真实 tracked unstaged fixture、精确 unavailable/取消 phase、单变量 fingerprint 和非空 contextNeeds 对照；保留各自调用方结果与失败归属。 |
| Checks — PT-1/2/3 | front matter 放入真正会触发诊断的内容、MD052 helper 有正触发对照、双 computation 入场 barrier 替代固定等待。 |
| Analyzer — AN-001 | actual corpus 长度、独立磁盘 fixture 集合、重复与固定 semantic identity 校验，防止删空矩阵仍通过；Python expected 不变。 |
| Data / JSON / command — DJC-01/02/03/04/05/06/07/08 | 零 getter 调用、真实 argv/env canary、redirect 请求历史及失败结算、unsafe schema 完整 outcome、显式 exclusion 的无负规则对照、本次 owned temps 全清理、区别性 schema identity，以及只描述现有 format annotation 的名称。 |
| Scanners — SS-02/03/04 | 私有隔离 transport 验证双流跨批次累计；完整 secret Run 先确认真实 finding 再检查无泄漏；真实 adapter/execution 在成功前缀后 protocol-failed 不发布 partial facts。 |

Runtime 最终 18 文件 **59 pass / 0 fail**，Product typecheck、定向 lint/format 通过；15 组隔离 old/current 对照均为旧测试假绿、改写后由目标外层断言拒绝。Checks 最终 18 文件 **75 pass / 0 fail**，Product typecheck、定向 lint/format 通过，10 个隔离反例被目标断言拒绝。新故障注入仅增加 owner-local test support，没有新增 Product API 或生产代码。

Repository 最终 9 文件 **57 pass / 0 fail**、artifact 目标 **1 pass / 0 fail**；最后 import paths 修订后的 command 文件另 **5 pass / 0 fail**。公开 `bun run typecheck` 两 scope、Product lint、scripts/docs 定向 lint、18 文件 format 与 `bun run docs:api` 通过。两篇当前完整 `.ts` 示例在 Node 24.18 与既有 installed candidate 下成功/强制 throw 均回收目录，严格 TS7 验证通过；同产物完整 consumer 验收由最终 Gate 另行证明，不以这个预验收替代。

三个互斥分区合计 **17 + 19 + 20 = 56**，独立 reviewer 已按实体去重核对。没有新增测试节点，删除一个 donor；native operation、跨 Run closure、format annotation 三个名称与 Case 映射同步，Case ID 连续。未把 optional/待证增强并入本次实施。

## 阶段验收

- 全树 Test Evidence 为 **765 实体 / 190 Cases**；官方前后查询差分仅 donor 删除与三处名称收窄，Case IDs 不变。多数清理发生在测试内部，56 是问题目标数，不是删除配额。
- 源码修复后，统一 validate、Test Evidence、format（997 文件）、24/24 Change 与 Decision 检查通过；新增材料的 7 处本地链接及 fragments 有效。
- 独立 reviewer 直接审查 diff、承接证明和修后 helper/callers，并独立运行 9 项 Runtime 测试、SCC stdout/stderr 与 secret child，均通过；实施方最窄测试与反证单独归因。早期 fixture/profile 错误和 Gate 失败日志保留，修正后才记录通过。

| 验收阶段 | 结果与处理 |
| --- | --- |
| 首次 all | 40/43 Checks passed；Function metrics、Duplicate detection、File metrics failed。初步失败，性能预算未评估。 |
| 实质修复 | export observer 按 graph/type-only edge/export space 分责；共同 child 生命周期、固定 assessment 和 execution fixture 复用；并发 support 完整拥有 gates/race/finally drain，外层结果断言保留。 |
| 修后 quality | 5 passed / 38 not-applicable，exit 0；focused 不评性能预算，不替代完整验收。 |
| 修后 all | 43 passed / 0 failed / 0 unavailable / 0 not-applicable；平均时长超标，最终 exit 1。 |

首次诊断为 export observer CC 18 / 63 code lines / nesting 8、五处 clone、两个测试文件 308/322 code lines。修复按真实职责和共同不变量组织，保留领域输入、失败原因、请求历史及外层可证伪断言，没有新增 waiver。

## 最终完整 Gate

`bun run check -- --all` 绑定 candidate `0.0.0-local.cb8d0137e8f7`，行为、类型/lint、质量、产物和隔离 consumer 全部通过，性能 contributor 阻断：

| 预算项 | 实际值 | 既有预算 | 结果 |
| --- | ---: | ---: | --- |
| 启动至初步结果 | 35780.8 ms | 90000 ms | 通过 |
| 43 项 Check 平均执行时长 | 2034.7 ms | 2000 ms | **阻断** |
| Check P95（nearest-rank） | 4835.6 ms | 5000 ms | 通过 |

累计 Check execution 为 87492.9 ms，不是墙钟时长。最慢三项为 function-metrics 6017.5 ms、tests-product-function-metrics 5589.4 ms、tests-scripts-admission-workbench 4835.6 ms。单样本不证明本轮清理的性能因果收益或回退。

## 现场与记录边界

原始日志在 ignored `.log/test-quality-cleanup/20261022-vfdqet/`。各目录保留该次 Gate 的结果与可用过程事实；修后 all 的 `gate.log` 保存原始 timing、预算、统计和 candidate 身份，`machine/run.json` 保存 Product Checks。以下目录均位于 `.log/project-gate/`：

| 场景 | Gate 目录 | 终端日志 |
| --- | --- | --- |
| 首次 all | `2026-10-22T09-22-42.704Z-3488465-c18270e5-ba49-479d-b6ce-001ac0b53fa5` | `full-gate.log` |
| 修后 quality | `2026-10-22T09-36-42.950Z-3500795-c5afeead-7446-4420-bbc7-56177221a91c` | `quality-gate-after-fixes.log` |
| 修后 all | `2026-10-22T09-38-37.920Z-3505517-adbf2f11-0b41-4d2d-a82b-8846d8fae617` | `full-gate-after-quality-fixes.log` |

完整重验发生于实际源码修正之后；没有对同一源码重试取绿，也未改变预算、规则或 Check 粒度。本阶段预算文件 SHA-256 为 `4e4e2dca26dfd8b3c869d2a1522dd1ea0a13ea9e04c2997612b44749209bfd80`。剩余问题是 2000 ms 平均预算尚未满足。

本阶段验收记录形成时，工作保留在 main，未执行 Git stage/commit、Change finalize/delete 或远端写入；8 个受保护既有文件、原删除、HEAD 与暂存区已核对，原预算升级改动保留。后续版本保存另按当前授权办理。
