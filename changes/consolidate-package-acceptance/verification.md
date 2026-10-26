# 验证与测量

2026-10-23，本轮三项包/API 验收调整已实施并经独立审查。完整 Gate 的 43 项 Check 均通过，
但原 mean/P95 性能预算仍阻断；本轮没有证明整体稳定提速，不将功能通过表述为 Gate 通过。

## 已改变的工作

- Worker 反例使用四个 Worker/parent 模块、对应 map/source 和独立小 tarball，经过原生产审计入口；不再修改共享 staging。真实产物和 installed Node Worker/取消验收保留。
- 删除 source 与 emitted-JS 两次真实 TypeScript 导出图，保留最终声明图及 source/emitted/installed 各自的 JSDoc 义务。既有 Node consumer 对实际 namespace 与独立公开清单作精确比较。
- candidate preparation、artifact 与 external docs 共享同次 source-derived 文档预期；子进程校验身份和摘要，不跨次缓存。真实 staging/tarball/installed 比较及 Node 示例保留。普通脚本测试的重复实仓正向断言并入既有隔离 fixture。

## 测量方法与输入

前、后各执行一次 `mise exec -- bun run check -- --all`。两轮均为 current candidate 的 warm preparation，
使用同一 pinned 工具链、43 项完整选择和原预算。没有自动重试、修改调度/选择或放宽限制。
后测前显式 `package:build` 重建新候选成功，独立耗时 11.568 s；该准备成本单列，不包含在下面的 warm Gate wall 中。

| 输入 | 前测 | 后测 |
| --- | --- | --- |
| candidate | `0.0.0-local.4a8cfeb642f8` | `0.0.0-local.11aaf5e2c0fd` |
| tarball SHA-256 | `51c0d2363606baad8037c824f4103b0102d5e488fbeab1bebcbfdbccbceb9767` | `eacc71a0a5ae7cc73ac06da7226c6c73d4b1ebc73920fc9888c48d82c316eb76` |
| 工具链 | Bun 1.3.14 / Node 24.18.0 / pnpm 11.1.3 | 相同，快照核对版本与二进制摘要 |

两轮分别在命令前后核对源码、工具链和完整候选文件摘要，运行期间均未变化。
500 ms 进程采样与启动前检查未观察到其它重负载 Gate/test/compiler/package 进程。
这不意味着没有本轮内部竞争：容器为 4 CPU / 6 GiB，前后 CPU throttling 累计约 14.0 / 21.9 s，
memory max events 分别增加 1988 / 5275，均没有 OOM。throttling 是累计量，不是可直接从 wall 扣除的时长。

## 前后结果

以下均为秒；Check duration 是各项 execution 耗时，不是互斥 wall。

| 指标 | 前测 | 后测 |
| --- | ---: | ---: |
| 外层命令 wall | 48.043 | 45.655 |
| elapsed-to-initial-result | 47.169 | 44.885 |
| Product Run | 46.197 | 43.544 |
| package supporting | 4.871 | 10.770 |
| artifact acceptance | 5.100 | 1.860 |
| external docs | 2.004 | 2.706 |
| external runtime | 3.153 | 3.198 |
| external types | 9.651 | 15.028 |
| external provider | 17.472 | 2.181 |
| 其中 install | 17.251 | 1.947 |
| Check mean（预算 2.000） | 2.770 | 2.688 |
| Check P95（预算 5.000） | 7.492 | 9.128 |

两轮均 43 passed / 0 failed / 0 unavailable，因 mean 与 P95 超预算而 exit 1。
后测最慢三项为 external types 15.028 s、package supporting 10.770 s、product lint 9.128 s。

Artifact 本轮减少 3.240 s；整体 wall 仅减少 2.388 s，且未改安装过程本身就减少 15.304 s，
其他部分反而变慢。单对观测无法把这些差值分配为稳定因果收益；尤其不能将安装波动归功于本次修改。
本轮可确认的是重复图/文档计算和共享 staging 故障注入已经退出对应路径，而不是性能门禁已经解决。

## 验证与边界

- gpt-6.1-sol 实施，另一 gpt-6.1-sol 代理按编码规范、行为 owner、测试证据与 ai-ready-docs 独立静态审查通过。
- 42 项目标测试、1 项 Worker 负向矩阵、waiver 精确行号同步后的 4 项测试通过；现有 waiver 仅同步位置，范围和理由未变。
- scripts typecheck/lint、完整 validate、format check、Decision/Change 检查、diff whitespace 通过；Case 闭合 780 entities / 192 Cases / 16 topics。
- 完整后测执行真实 artifact、external types/docs/runtime 和全部其它 Check；独立 cold lifecycle integration target 与 direct artifact 冷构建分支未另外执行，不声称覆盖该独立流程。
- 未改产品源码、内置 Check 自用、依赖、性能预算或选择；未 Git add/commit/push 或删除 Change。

原始输入快照、前后测量 JSON、进程采样、命令输出、实施交接与局部测试日志位于
`.log/package-acceptance-consolidation-20261023/`。完整 Gate 现场分别位于：

- `.log/project-gate/2026-10-23T09-01-03.375Z-360666-3af1d0f5-c313-4fa9-8acb-55fa7338c146/`
- `.log/project-gate/2026-10-23T09-18-49.073Z-412657-d9ecd1af-674d-45a8-aac4-0e916a6f2ce3/`

上述 2026-10-23 完整 Gate 的性能失败是形成时未解决的验收事实；后续收尾见下节，不改写原始测量或继续追改其它热点。

## 收尾验收：2026-10-26

### 验收口径与输入

在 main `fe044925f0676f74061878b2ae4952fce47adc36` 核对实现提交 `f998ed4c` 已进入当前基线。
本轮没有修改 Product、scripts、依赖、选择、调度或性能预算；此前 12 个 Change 的结项删除及协调页改动保持独立。

[当前 Gate owner](../../docs/tooling/project-gate.md#selection-presets-and-scheduling)及
[日常、发布与显式义务 Decision](../../docs/decisions/separate-routine-release-and-explicit-gate-selection.md)
已将日常 all 限定为 41 项 routine Checks，consumer types 与 workbench 分别转为 release-only 和 explicit-only。
本轮按既有规则先运行一次 all，再运行一次可组合的 focused types/workbench，不新增参数、不伪造正式 receipt。

两次均在 Linux x64、Bun 1.4.4、Node 24.18.0 下运行，使用 current candidate 的 warm reuse。
启动前未观察到其它 Gate/test/compiler/install 工作负载；此检查不证明没有 host 争用。
两次 machine evidence 中 prepared candidate 与 external provider 的 tarball 摘要一致，跨 invocation 的身份也一致：

| 身份 | 核对值 |
| --- | --- |
| candidate | `0.0.0-local.7374ef1af2cd` |
| input fingerprint | `7374ef1af2cdccee0fc753ee08bd513d9f2a2e16f62a9f5d738a2ba637f2eba5` |
| tarball SHA-256 | `02d24139b3b743108f7e9684106ad038589e1f5ca9e8b9e5d83c1a13641df38b` |
| preparation | 两次均 `reuse / installation-current`；各 invocation 独立建立并清理 external consumer。 |

### 实际结果

| 调用 | Check 结果 | 最终结果 |
| --- | --- | --- |
| `mise exec -- bun run check -- --all` | 41 passed、0 failed、2 not-applicable、0 unavailable | passed / exit 0 |
| `mise exec -- bun run check -- --consumer-types --admission-workbench` | 4 passed、0 failed、39 not-applicable、0 unavailable | passed / exit 0；focused 不评估性能预算 |

All 的同次总反馈为 19199.9 ms（预算 90000 ms），mean 为 1169.6 ms（预算 2000 ms），nearest-rank P95 为
3138.7 ms（预算 5000 ms）。三项均达标；这不是 outer command wall，不能与历史表中的 wall 直接相减。

两次 `machine/run.json` 的 passed Check ID 并集恰为当前 manifest 全部 43 项。focused 相对 all 新增的只有
`acceptance-installed-package-types` 与 `tests-scripts-admission-workbench`；共同的 candidate/external provider 不是额外覆盖。
Artifact 与 installed docs/runtime 在 all 中执行，installed types 在 focused 中执行，都消费上述同一精确 tarball；
不同 invocation 不共享同一个 consumer 目录。

日志与 machine evidence：

- all：`.log/project-gate/2026-10-26T03-21-21.972Z-245839-989743b6-f308-423f-80e4-880f3306de1a/`。
- types/workbench：`.log/project-gate/2026-10-26T03-21-59.705Z-248317-f2623f0d-4e31-4d0a-a394-b25465e42f42/`。

### 结论与边界

本 Change 的实现、前后测量、完整候选材料和当前功能/类型验收已完成；routine all 的现行预算也已通过。
本轮每种选择各运行一次，没有自动重试或放宽阈值。2.2 可以完成，不再把本项扩张为持续的全仓性能优化。

历史 43 项 all 的 mean/P95 失败保持原样。2026-10-26 上轮清理任务的 changed Gate 性能失败也保留在
`.log/project-gate/2026-10-26T03-14-15.899Z-237233-9069467f-7b1d-4798-9d48-12ad91eac2a0/`，不被本次 all 成功覆盖。
当前选择范围、源码和 runtime 均不同于 2026-10-23，不能声称旧 workload 已稳定达标，或把差值归因于本 Change。
focused 的耗时不纳入 all 分布，不构造“合并 43 项预算通过”的结论。

Gate 后仅更新本 Change 的完成记录及协调页，未改变候选包输入；`package:status` 仍为同一 current candidate。
最终文档经完整 `validate`、791 entities / 192 Cases / 17 topics 全树闭合、377 条 Decision 检查和
14 项 Change 检查通过，`git diff --check` 通过。其余 13 个 Change 的 42 个文件哈希未变。

本轮没有新增代码审查；实现阶段的独立审查记录保留。本轮未运行 cold candidate lifecycle integration、正式 release
receipt 验收、远端发布或跨平台认证，不将本地候选结果表述为正式包发布证据。完成态版本保存与 finalize 按当前授权办理。
