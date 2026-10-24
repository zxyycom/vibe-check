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

最后一次完整 Gate 的性能失败保持为当前未解决的验收事实；后续优化需另行确定范围，本轮不继续追改其它热点。
