---
title: "外部消费者安装超时的网络等待定位"
id: "261019-diagnose-external-consumer-install-timeout"
formedAt: "2026-10-19T09:58:21Z"
question: "完整 Gate 的 external consumer 安装为何超过三十秒，能否在不改变验收语义或预算的前提下定位责任边界？"
tags:
  - "external-consumer"
  - "network"
  - "package-candidate"
  - "project-gate"
relations: []
---

## 形成时背景

发布准备中的材料测试已按独立证明义务重分工，严格 JSON 优化草案已从交付工作树分离；
5 秒测试预算未改变。前序完整 Gate 在 2026-10-19 16:50、16:52（Asia/Shanghai）两次出现
`prepared-external-package-consumer` 的 30 秒 command-timeout，另三项消费者验收未执行。
当时只通过进程快照定位到 Bun install，未取得安装内部阶段证据。

17:22 开始的后续完整 Gate 对最终输入取得 43/43 passed；这是实际完成的一次同包验收，
不是安装可靠性已经修复。当前证据保存于
[发布准备记录](../../changes/release-0-0-4/current-evidence.md#当前候选与完整-gate)。
用户允许继续推进并在需要决策时报告，本轮只调查安装阻塞，不提交、重新冻结或发布。

本轮问题不同于[测试必要性调查](reassess-validation-test-boundaries.md)：它回答外部安装的
阻塞阶段与责任边界，而不是材料测试应怎样证明。前报告仅提供触发背景，不建立认识演进边。

## 调查目的

1. 判断安装超时是否依赖 full Gate 的并发负载，或单独调用真实 provider 即可发生。
2. 区分解包/文件操作、依赖解析、网络等待与后续 types/entry-resolution 阶段。
3. 用独立客户端的小请求检验“Bun 安装专属问题”解释；保留不能定位的网络责任。
4. 在不放宽预算、不改变依赖选择或验收语义的前提下，确定下一步应改项目还是处理运行环境。

## 调查范围与依据

实现工作区为 `/home/dev/.codex/worktrees/package-release-preparation/vibe-check`，分支
`release-0-0-4`，HEAD 为 `b8cf54f4801397002b739c7945bf83e2ae6806ac`。使用 mise 锁定的
Bun 1.3.14、Node 24.18.0、Linux x64，`CLK_TCK=100`。本轮未修改正式源码、测试或 Gate 配置。

候选为 `0.0.0-local.1cbe23f0f7d6`，实际 tarball SHA-256 为
`b00b89a4dbfa8c66e2c0e8ce971874f36448e9f42416479fbe692abe131f2fd2`；公开
`package:status` 确认 current。本轮前后重验摘要一致，包是此前 43/43 通过的同一产物。

实际读取 package lifecycle、Gate、provider、material、输入验证及命令失败映射。真实路径是：
创建 ancestry-external fixture → `bun install --no-save --ignore-scripts <exact tarball>` →
types fixture → public entry resolution → containment 核对。安装的 stdout/stderr 被
`spawnSync` 捕获，只有命令结束后才交给失败断言；因此外层超时前通常没有安装进度日志。

现场诊断在 17:54:17–17:58:36 进行，早于报告形成的证据和随后补齐的独立 GET 均明确保留实际时点：

- 真实 provider 使用原源码、exact tarball 和独占临时 root；诊断外层在 30 秒终止自己的进程组。
  每 500 ms 尽力取得本任务进程的 CPU ticks、I/O、wait channel 与 socket 数量。
- 第二轮只将安装命令加 `--verbose`，在相同 manifest 的新临时根直接运行，不经过 provider。
  两轮末首重叠 3166 ms；它们用于判断阶段，不是受控速度比较。没有其它本任务 compiler 或测试竞争。
- 四个串行条件 GET 读取同一个公开 npm metadata URL，交错使用 curl 与 Bun fetch；
  Accept、If-None-Match 与 User-Agent 显式一致。不改变代理、TLS、registry、全局 cache 或认证配置，
  不读取认证配置或环境值。请求上限 30 秒，31 秒外层保护均未触发；不保存响应正文。
- curl 使用 `-q` 不读取 curlrc，其余宿主环境继承；Bun fetch 与安装器不是同一高层流程。
  独立客户端结果只用于检验网络等待可否脱离安装器发生，不宣称传输路径逐项等价。

已有缓存会被正常安装读取和更新；没有清空、复制、强制冷却或人为刷新缓存。操作系统缓存、
宿主其它负载和外部网络状态不受控。进程采样有观察开销；stdout/stderr chunk 的接收时点不是
每项系统调用的精确起止点。详细输出只保留影响判断的事件，不将服务器 Date 当成本地计时。

## 调查结果与边界

### 已确认的阻塞阶段与原因判断

**真实 provider 停留在 Bun install，30 秒内未完成；同产物 verbose 安装及独立 GET 证据将本轮
主要阻塞指向 registry 元数据网络等待，不是新的材料测试超时。** 元数据事件来自第二轮，
不是第一轮 provider 的同进程直接日志；原因判断是对多轮证据的综合推断。

| 观察 | 实际结果 | 可以支持的判断 |
| --- | --- | --- |
| 单独真实 provider | 30042 ms 被诊断 watchdog 终止，stdout/stderr 为空 | 不需要 full Gate 的本任务并发即可复现；不是 provider 正常返回或 Gate 新失败记录。 |
| 安装子进程末次采样 | 最后采样累计 CPU 650 ms；主线程 `do_epoll_wait`，其余主要为 epoll/futex；最多 64 个连接 | 30 秒并非持续占用 CPU；单凭 wait channel 还不能认定网络原因。 |
| verbose 安装 | 约 411 ms 完成 tarball 提取，30 秒仍未结束 | 解包已完成，不能把整个等待归因于 tarball 大小或跨挂载点复制。 |
| verbose 请求与阶段 | 观察到 56 条 metadata GET、50 条 `304 Not Modified`；29.57 秒仍有 11 个任务待完成 | 缓存验证仍发生联网等待；尚未走到 types fixture 或入口解析。 |

日志中 `micromark-util-html-tag-name` 的版本请求报告约 27.60 秒，
`get-east-asian-width` 约 29.12 秒；这些是 Bun 的单任务显示，不是整次安装耗时。
没有观察到 200 响应并不证明没有其它未记录请求；56/50 是取得的日志行计数，不是网络抓包统计。
56 条 GET 涉及 55 个不同 URL，含一条重试；待完成任务数也不能当作未回包数。

### 独立客户端对照

目标均为 `https://registry.npmjs.org/micromark-util-html-tag-name`，无认证、无响应正文下载：

| 顺序 | 客户端 | 实际结果 |
| --- | --- | --- |
| 1 | curl | 304；总计 18.689 秒；DNS 0.0067 秒、TCP connect 累计 0.0080 秒、TLS 完成累计 15.2007 秒。 |
| 2 | Bun fetch | 304；响应 headers 14.655 秒，零 body bytes。 |
| 3 | curl | exit 28；约 30.002 秒 connection timeout，未取得 HTTP 响应。 |
| 4 | Bun fetch | 304；响应 headers 13.518 秒，零 body bytes。 |

这些串行小请求没有解包、依赖图解析或安装并发，仍出现显著等待及连接失败。因此，本轮有独立
证据表明**当前宿主到公开 registry 的网络访问存在延迟/失败**，不能把症状解释为仅 Bun installer
或仓库测试的 CPU 开销。curl 的 `time_appconnect` 是累计值，不能直接称为 TLS 自身独占耗时。

### 仍未确认与不采用的动作

- 尚未区分本机/宿主网络设施、转发路径、远端服务或其组合的具体责任。没有网络配置、认证、
  抓包或服务端证据；不写成“npm 故障”或“代理配置错误”。
- 本轮重现解释的是当前时间窗口，不能反向证明 16:50、16:52 两次历史失败具有完全相同根因；
  也不能用网络证据解释此前 candidate preparation 的全部 66 秒。
- 没有源码修复事实，也没有新的完整 Gate 结果。17:22 的 43/43 仍是最近一次完整验收，
  本轮诊断失败另列，不能改写成 39/43 或用成功覆盖不稳定性。
- 不放宽 5 秒测试或 30 秒 provider 预算，不自动重试直到绿，不改 registry/TLS/代理，
  不升级 Bun、不换包管理器、不固定新的依赖版本。
- 不用复制仓库 `node_modules`、复用旧 consumer 或删除 external acceptance 来规避问题；
  这些不能代替当前 ancestry-external exact-tarball 安装证明。
- 离线缓存、固定 lockfile 或“优先旧 metadata”会改变依赖选择/新鲜度及失败条件，不能当作
  无语义变化的速度修复。[Bun 当前安装文档](https://bun.com/docs/pm/cli/install)说明这些模式的
  不同含义，但本项目固定 Bun 1.3.14，当前网页不是该版本能力证明；本轮没有试改相关 flags。

### 建议与重新调查条件

当前最小动作是保存诊断并保留已有测试修复，**不修改 Product 或安装策略来补偿网络等待**。
当相同公开 metadata 的有界请求不再出现十几秒等待/连接失败后，再运行一次真实 provider 和一次
完整 Gate；两者通过也只构成届时输入的验证，不外推长期可靠性。

如小请求恢复而真实 provider 仍稳定超时，再对其尚未完成阶段继续调查；若决定引入固定依赖图、
离线验收或工具链升级，应先单独确认目标和证明边界。当前不需要用户改变测试方案，但后续提交、
冻结与发布仍须取得对应授权。本轮新建临时安装根均由 probe 在结束后清理；原始诊断及脚本保留在
`tmp/external-consumer-install-20261019/`，不属于 current test surface 或发布材料。

## 随附资源

- [本轮进程、安装阶段及独立请求证据](./_resources/261019-diagnose-external-consumer-install-timeout/evidence.json)
