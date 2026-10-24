---
title: "完整 Gate 中的 Node Worker 宿主测试超时与边界收窄"
id: "261024-record-worker-host-test-delivery-timeout"
formedAt: "2026-10-24T14:19:57Z"
question: "五次真实 Node/Worker 宿主组合测试的超时证明什么，怎样缩小重复执行而保留必要边界？"
tags:
  - "markdown-link-validation"
  - "test-execution"
  - "timing"
relations: []
---

## 形成时背景

2026-10-24，在 Bun 1.4.4 的旧断言兼容修复后，第二次完整 Gate 为 39 passed / 2 failed / 2 not-applicable。
Markdown 测试 lane 中，`preserves parent preload context for file-backed Workers under Node string-input hosts`
在 5,016.83 ms 超过既有 5,000 ms 限制，runner 报 `killed 1 dangling process`。另一个 Gate 失败是测试文件
301/300 行，已独立修复，不属于本报告。

该宿主测试和 helper 在此轮 Gate 前没有改动。它串行运行五个 Node child，每个实际启动文件 Worker：普通 V8 flag、
两种 input-type 名称各自的 split/等号形式；相同参数规则另有直接纯函数矩阵。
用户随后明确授权收窄重复物理矩阵，保留代表性 Node/Worker 验收，不提高 timeout 或改变 Product。

## 调查目的

说明此次失败、窄跑通过与缩小物理矩阵分别能证明什么；从 owner 契约选择不可再省的实际边界，保留参数组合的
独立观察。不声称已识别底层卡顿原因，也不以局部通过替代完整 Gate。

## 调查范围与依据

现场为 `.log/project-gate/2026-10-24T14-13-33.295Z-1680396-d4a79ab8-8439-4d6d-a9b2-6b2f3decb3ad/`，
candidate `0.0.0-local.fc12ad0a3171`。Markdown transcript 为
`checks/check-y4DbTM66zezGpKEubvwfrlcoLXAi2xurx4dmUCpJlDw/process.log`；完整 lane 报 60 pass / 2 fail、15.86 s。
该目录是可清理本地现场，以下保留影响判断的摘要。

检查对象为 `io-session.test.ts`、`io-session.test-support.ts`、fixture cleanup 与
[I/O owner](../development/markdown-link-resolution.md#私有-io-会话与收束)，以及对应 Case。
公开工具链是 `mise exec -- bun test ...`；实际 Bun 为 1.4.4，`VIBE_CHECK_NODE_CMD` 指向现存的 mise-owned
Node 24.18.0。child 自有 timeout 为 10,000 ms，test 默认 5,000 ms，二者本轮均未改变。

先检查失败 transcript，再窄跑与修改。一次未绑定 mise 的起点直跑使用了默认 Node 26.8.2，4 tests 通过、716 ms；
该结果只提示必须核对宿主，不能充当 Node 24 验收。显式指定 Node 24 的直跑起点为 4 pass、857 ms，首测试 739.23 ms；
同方式修改后为 4 pass、354 ms，首测试 264.15 ms。它们是单样本局部观察，不是完整 Gate 同负载对照。

最终公开工具链下，单文件 4 pass / 384 ms；Markdown 相邻组 45 pass / 2.42 s。product typecheck、lint、format
及全树 Test Evidence（787 entities / 192 Cases / 17 topics）通过。报告形成时尚无修复后完整 Gate 结果。

## 调查结果与边界

### 已确认与未知

失败测试确实超过原 5 s；后续 `keeps simultaneous resolver cancellation isolated...` 节点下出现的错误栈仍来自前一个
`assertNodeStringInputWorker`，断言为 `--input_type module` child 的 status `null` 对预期 `0`。
这支持“前测试超时后仍有同 helper 的延迟失败被报告”，不证明第二个 cancellation 场景独立失效。
日志没有足够的各 child 阶段、signal 和资源采样来判定 Node 挂起、宿主竞争或 runner 清理的精确因果。

同 Bun 的较早完整 Gate 未在此测试报超时，Node 24 的隔离起点也通过，因此不能声称稳定复现或 Bun 1.4.4 的产品回归。
五次物理启动是从源码直接确认的重复工作量，不是对现场 CPU 或 I/O 瓶颈的推断。

### 采用的最小调整

仅将 helper 的五行 flags 集合改为两个代表：`--max-old-space-size=1024` 覆盖无 input-type 的默认继承，
`--input_type module` 覆盖过滤分支。每次仍启动真实 Node/Worker，实际验证源文件读取、Worker preload marker、
finalize 和 `io.failed === false`。纯函数矩阵继续覆盖两个名字 × split/等号共四种形式，并确认其它参数保留及无此参数时
返回默认继承；没有新增测试实体、并行、重试或生产 seam。

保留两个代表是因为默认继承与显式过滤是不同路径，而拼写组合属于同一纯参数规则。代价是不再逐一实跑全部拼写，
不把 Node 对每种 CLI 拼写的解析视为本项目持续重复验证的义务。该取舍经用户授权，并同步到 Case 与内部 owner；
Product 仍支持原四种形式，公开承诺不变。

真实启动次数从五降为二；局部耗时支持减重，但 workload 已减少，不能宣称相同输入的执行加速或任意负载下都低于 5 s。
本轮未修改 Node/Bun、Product、timeout 或调度预算，完整 Gate 通过与性能预算仍需各自证据。若代表性场景再次超时，
应收集真实 child 阶段及资源证据，而不是继续删去默认继承/过滤的真实边界或自动提高门限。
