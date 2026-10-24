# Tasks

末轮代码/文档修正、独立审查、集中工程验证和一次新 all 均已完成；按授权保存最终计划并结项。下列清单按交付责任收敛，前七版逐项历史从提交恢复。

## Readiness

- [x] 0.1 核对 main `4cf52b42`、780 entities / 191 Cases / 16 topics 起点、相关 owner 和决策，确认前序工作及本次单写者范围。
- [x] 0.2 在各追加阶段核对实际 Bun、已有改动、失败现场和授权，保留 Product、lint、预算、timeout 及 Gate 资格边界。
- [x] 0.3 从同次 all 日志与定向采样选择文件发现优化，并固定同树对照次数；局部计时、并发重叠与完整收益分别判断。

## Implementation

- [x] 1.1 前七版完成降层、fixture 减重、断言加固、材料隔离及 Gate 选择分工；稳定 owner、Case 和长期决策已同步，历史见末节。
- [x] 1.2 实施三条引用预算矩阵和单次 config 扫描，保留独立计费、准确位置、进程/输出失败及 static/runtime 闭合证明。
- [x] 1.3 完成隔离禁网安装调查；据追加授权通过 mise 将全局实际 Bun 与项目 pin/lock 升至 1.4.4，保留其它工具和旧二进制。
- [x] 1.4 实施统一严格离线安装、copyfile 隔离、显式 `package:cache:prepare` 与 env:setup 接线，同步 owner/Case。
- [x] 1.5 修正 JSON 内容断言兼容并保留独立安全/身份断言；将包工具 Case 归入独立 Topic，保持语义与实体身份。
- [x] 1.6 将 Worker 物理矩阵收窄为默认继承/过滤两个代表，保留纯参数全矩阵、真实 preload/read/finalize 和原 timeout。
- [x] 1.7 复用发现过程内的 glob，按 include 见证与整树 ignore 条件剪枝，保持完整集合和原诊断，并补齐操作量/反例证明。
- [x] 1.8 用 ai-ready-docs 复核本次全部文档变更，收敛当前主线、重复和迁移残留；保持 Case 语义、报告形成时认识与安全边界。
- [x] 1.9 按完整编码规范审查 scripts 15 个、src 39 个 TypeScript 变化文件及直接调用边界；修正倒置源码/元变量范围接纳，并补强两个 dependency 测试文件四处 readback 状态/引用前提，保持 entity/Case，无额外风格例外。

## Verification

- [x] 2.1 前七版的目标测试、Case、工程检查与独立审查已保存；其性能和冷集成缺口由下列本次实际结果闭合，不把旧结果改写为通过。
- [x] 2.2 预算/扫描改动的目标及邻近测试、Case、工程/材料检查和独立审查通过，前后局部观察与 changed Gate 失败均已记录。
- [x] 2.3 升级、离线安装、断言兼容及 Worker 收窄经局部/工程验证和独立审查；实际联网准备、cold integration、consumer types 与 workbench 通过。
- [x] 2.4 文件发现的固定五次同树对照、目标/邻近测试、反例、Case、工程/材料检查和独立审查通过；第十版唯一一次修改后 all 的功能及原性能预算通过，不覆盖之后的末轮修正。
- [x] 2.5 三份调查报告保存断言兼容、Worker 超时及发现器优化的形成时依据、边界与必要资源；索引和全量检查通过。
- [x] 2.6 非实施代理反查最终代码/文档及实际 diff，完成代表性阅读任务、集中工程验证和修正后唯一一次新 all，记录功能/性能结论与剩余边界并确认无实质阻断。

## Evidence

### 末轮代码与文档复核

完整规范审查覆盖 scripts 15 个、src 39 个 TypeScript 变化文件及直接调用边界，无额外风格例外。
实际新增修正有两项：扫描输出拒绝倒置源码/元变量范围，先红后绿验证为 14 tests；两个 dependency 测试文件的
四处 readback 状态/引用前提补强，目标组合 98 tests / 38 files 通过，定向反例被捕获。entity/Case 均保持不变。

独立审查以实际 diff 核对全部 54 个 TypeScript 文件、文档 owner 和公开影响，未发现实质阻断。
代表性阅读任务能恢复离线失败的显式准备路径、Case 闭合不执行正文、局部性能证据的因果边界，以及提交后 finalize 的授权与顺序。
15 个迁移 Case 与基线逐块一致；仅精确化现有 Case 的 Worker 代表范围和 profile 排除描述，未增加测试义务。
Product 实现和公开契约未变，测试辅助被产物清单排除，公开材料无需同步。

集中验证通过：两 scope typecheck/lint、format（1,028 文件）、508 JSON / 5 schema / 625 Markdown、
789 entities / 192 Cases / 17 topics、125 Investigation 及其当前索引、377 Decision、26 Change 和 diff 检查。

2026-10-24 23:41（Asia/Shanghai），最终修正后的唯一一次 `mise exec -- bun run check -- --all` 为
**41 passed / 0 failed / 2 not-applicable，exit 0**。总反馈 26,854.5 ms / 90,000 ms、mean 1,700.3 ms / 2,000 ms、
P95 3,905.6 ms / 5,000 ms 均通过；累计执行 69,714.3 ms，不是墙钟。
最慢三项为 Markdown 5,149.9 ms、function metrics 4,191.3 ms、Gate tooling 3,905.6 ms。
日志：`.log/project-gate/2026-10-24T15-41-41.566Z-1815622-aed0e7f3-0b5b-462b-be18-5b5ad4fc63c7/`。
仍使用 candidate `fc12ad0a3171`，preparation 413.3 ms、adapter/setup 517.1 ms、Product Run 25,924.1 ms。
本轮未重跑 cold integration、consumer types/workbench 或正式 release receipt；前序对应证据保持各自边界。

这次验收针对新修正，不是重复原输入取绿；没有改变 lint、timeout、预算、调度或 Check 粒度。
单次验收通过不证明长期稳定，也不把与前轮的耗时差解释为本轮断言/边界修正的性能收益。下节保留第十版基线。

### 第十版完整 Gate 基线

第十版修改后唯一一次 `mise exec -- bun run check -- --all`：**41 passed / 0 failed / 2 not-applicable，exit 0**。
功能、artifact 和 installed docs/runtime 全部通过；性能仍使用原口径与门槛：

| 指标 | 实测 | 预算 |
| --- | ---: | ---: |
| 总反馈 | 25,987.6 ms | 90,000 ms |
| mean | 1,682.5 ms | 2,000 ms |
| nearest-rank P95 | 4,879.7 ms | 5,000 ms |

日志：`.log/project-gate/2026-10-24T15-21-45.271Z-1735231-baeba634-1ad4-4ab1-a37b-1683e8d2a78a/`。
Candidate 为 `fc12ad0a3171`，tarball SHA-256 为 `a7922d1a2055c0156a4a41547ba9dca79b386747b1928ba264524fd230872fa0`；
preparation 329.5 ms、adapter/setup 529.9 ms、Product Run 25,128.1 ms。累计执行 68,983.7 ms 不是墙钟。
最慢三项为 Markdown tests 6,764.0 ms、Gate tooling tests 5,166.0 ms、supporting Check tests 4,879.7 ms，lint-product 约 4,600 ms。

P95 余量仅约 120 ms，mean 和累计执行也未比起点更低；本次通过不证明未来持续达标或发现器独自造成全部改善。
没有追加完整重跑，也没有改变 lint、timeout、预算、调度、Check 粒度或选择。

第十版代码收尾集中检查通过：789 entities / 192 Cases / 17 topics，508 JSON / 5 schema / 625 Markdown，125 Investigation；
该阶段独立代码/文档/报告审查无实质阻断。最终修正后须由 2.6 记录新一轮机械与语义结论。
consumer types/workbench 的升级后证据见下节，此次 all 未重跑它们；正式 release receipt 未运行，本 Change 不提供正式发布证据。

### 升级后 package 与测试验收

Bun 1.4.4 已通过 mise 安装；全局既有 `bun=latest` 配置保持，其链接和仓库外调用均为 1.4.4，项目 pin 与 Bun-only lock 同步。
旧 1.3.14/1.4.2 二进制保留。回退到 1.3.14 还须回退依赖原生 offline/Assert 的实现，单改 pin 不足。

实际公网准备经新增 `package:cache:prepare` 成功执行，随后 `package:build` 以离线安装生成候选；facade/lint 修正后重建用于后续验收。
安装测试证明可用 registry 下冷缓存零请求失败、准备后断网两次 fresh install 和 copyfile 隔离；局部 8 tests 与 scripts 工程检查通过。

| 验证 | 结果与证明边界 |
| --- | --- |
| 显式 cold integration | 原 30 s 进程限制内 6 tests / 1 file 通过，9.98 s；覆盖 cold build/install/reuse、installed README/license drift、missing dependency reinstall 和 malformed receipt rebuild。 |
| consumer types + workbench | focused 4 passed / 39 not-applicable，exit 0；新建 external consumer 的 types 和 workbench 通过，不评估性能预算。 |
| 断言兼容 | Bun 1.4.4 下 89 tests / 37 files、两 scope typecheck/lint 和 format 通过；Node 24.18 的 canonical-data、closed-values、strict-document 共 11 tests 通过。 |
| Worker 收窄 | 公开工具链单文件 4 tests / 384 ms，相邻 Markdown Link 45 tests / 2.42 s；product typecheck/lint/format、完整 Case 与独立审查通过。 |
| 文件发现 | 同树各五次返回精确相同 298 files；每次目录读取 796→129、目录项 7,784→1,284，中位数 77.347→5.070 ms。目标 7、Test Evidence 18、Gate tooling 51 tests 及 scripts 工程检查通过。 |

Types/workbench 日志：`.log/project-gate/2026-10-24T14-01-12.957Z-1620669-2081061b-7c24-4562-aef1-1938c71d9429/`，candidate `fc12ad0a3171`。
它与第十版 all 使用相同候选内容，但 external consumer 各轮 fresh，不是同一 consumer 或正式 receipt。

三份报告分别保存可独立复核的过程，以下是形成时结果，不互相覆盖：

- **断言兼容：**[报告](../../docs/investigations/diagnose-bun-strict-assertion-compatibility.md)保存首次 all 的 47 个失败节点、四运行时对照、helper 取舍、引用安全及窄验证；形成时修复后的 all 尚待执行。
- **Worker 超时：**[报告](../../docs/investigations/record-worker-host-test-delivery-timeout.md)保存第二次 all 的宿主超时、延迟失败、局部对照和五次到两次物理启动的取舍；底层卡顿根因未确认。
- **P95 与文件发现：**[报告](../../docs/investigations/diagnose-gate-p95-test-discovery.md)保存第九版功能全过但 P95 5,388.372 ms 的现场、采样限制、同树原始观测、三个变异及独立 561 组差分/1,070 项剪枝检查；同轮追加唯一一次完整 all 通过。

### Bun 升级前的预算与扫描证据

第八版使用 Bun 1.3.14；本节保留尚未在前七版提交中保存的依据，不作为升级后的验收。

| 对象 | 实际结果与限制 |
| --- | --- |
| Markdown 预算 | 同文件起点 6 tests / 1.83 s，大场景 1,218.06 ms；小矩阵后 6 tests / 628 ms，矩阵 81.23 ms。均单样本，fixture 工作量改变，不是同输入解析加速。 |
| 单次扫描 | 同树 295 files，四次扫描 767.51 ms、单次 config 403.30 ms；780 native matches 按 ruleId/file/offset 规范化后深比较一致。此计时只覆盖健康 corpus；新增负例另证异常和闭合。 |
| 测试与工程 | 扫描 16 tests、四条真实 YAML rule-tests；集中 Markdown Link/lint 与 Test Evidence 78 tests / 28 files；两 scope typecheck/lint、format、材料、Decision/Change 和独立审查通过，Case 为 785/191/16。 |
| changed Gate | 36 passed / 7 not-applicable；总反馈 35.850 s、mean 2.565 s、P95 9.413 s 超原 30/2/5 s 预算，exit 1。仅运行一次，仍使用升级前安装策略。 |

changed 日志：`.log/project-gate/2026-10-24T13-33-51.350Z-1539384-cd6a3ff5-2f10-4e1e-98b7-17a7698e75d0/`，candidate `0.0.0-local.7416e73b58ad`。
最慢三项为 Markdown 9.436 s、function metrics 9.413 s、external preparation 6.286 s；是交付负载而非受控 Gate 对照。

### 升级前的隔离安装 probe

当时项目 Bun 1.3.14、ambient Bun 1.4.2。使用 exact `7416e73b58ad` tarball、全新仓库外 consumer 及私有缓存副本
（145 个包体、380 个 metadata）；进程私有 libseccomp 禁止 socket/connect/sendto/sendmsg/sendmmsg/io_uring_setup，
先以 IPv4/IPv6 socket 返回 EPERM 自证。仓库 node_modules 和共享缓存未作为写入目标。

| Probe | 结果 |
| --- | --- |
| Bun 1.3.14 `install --no-save --ignore-scripts <exact-tgz>` | 0.213 s 失败，metadata 请求被禁网边界阻断。 |
| 同上加 `install.prefer="offline"` | 0.220 s，同样失败。 |
| Bun 1.4.2 原生 `--offline` | 0.580 s 成功，实际安装 146 packages；另一次从 manifest 保存 lock 的隔离安装 0.552 s。 |
| Bun 1.3.14 消费该 lock v2 | 拒绝 `Unknown lockfile version`。 |

[Bun 1.4.1 功能说明](https://bun.com/blog/bun-v1.4.1#bun-install-offline)与 probe 共同支持升级后使用原生 offline 的方向；
原生 offline 与允许 miss 联网的 prefer-offline 不是同一边界。保留旧 Bun、另造 consumer lock/禁网组合的候选未采用，
根 pnpm lock 也不证明 consumer lock 可用。probe 只证明安装可行性，types/docs/runtime 与 Gate 由后续实际验收提供。
私有 probe 目录已清理。

### 证明范围与历史依据

当前取舍见 [design](design.md#risks--trade-offs)。前七版形成时记录从下列提交的本文件和固定 artifacts 恢复；
它们解释已完成工作，不作为本次新增验收或当前规范。

| 阶段 | 恢复依据 |
| --- | --- |
| 初始测量 | [四组局部对照及 Gate 频率取舍](../../docs/investigations/measure-gate-test-boundary-simplification.md)。 |
| 前序审查与前两版 | `f998ed4c`、`82f83db7`、`9bf26715`、`91903719`；另见[duplicate lane 超时报告](../../docs/investigations/record-delivery-duplicate-lane-timeout.md)。 |
| 第三至五版 | `823a25eb`、`29de254a`：追加清理、实体连续性、功能通过及性能未闭合。 |
| 第六版 | `c73ec649`：四处证明加固、独立复核、性能失败和 cold integration 超时。 |
| 第七版 | `4cf52b42`：四处断言补强、一处去重、machine drift 隔离、功能通过及 all 性能未闭合。 |

第六版 cold integration 超时现场 `/tmp/vibe-check-package-candidate-ePo1TY/` 及
`/tmp/vibe-check-package-candidate-ePo1TY.artifact-note.md` 未由本轮清理；当时 compiler emit/tarball 已形成，consumer 仅有 package.json，
安装及 receipt 尚未出现。根因未确认，重新调查前须确认现场仍可用；本次 cold integration 通过闭合验收缺口，但不解释旧超时。
文件发现的短期基线/采样目录已清理，原始十行观测由报告资源保存，失败 Gate 日志保留。

前序 package acceptance 的自身预算状态仍由[对应计划](../consolidate-package-acceptance/tasks.md)承接。
