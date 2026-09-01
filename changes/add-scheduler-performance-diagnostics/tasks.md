# Tasks

任务先固定长期边界与并行 Change 顺序，再实现 Scheduler-owned累计和单条人读 summary，最后用确定性时间证据与代表性 Gate 运行验收。

## Readiness

- [ ] 0.1 使用 Decision Records 演进 diagnostic、per-Check duration、priority 与 no-public-telemetry 判断，固定 `scheduler.summary` 只属于 invocation-local人读诊断，不进入 machine/public result或自动调优。
- [ ] 0.2 审阅 `require-passed-dependencies-and-observe-outcomes`、`add-invocation-fail-fast-policy` 与 `add-named-resource-capacity` 的实际stage和最终Scheduler影响，确定实施顺序；同步本Plan的graph-ready、selected/wait hard-guard facts与effective capacity定义。若任一前置模型尚未稳定，暂停受影响的Implementation任务，不编码短命中间模型。
- [ ] 0.3 为当前实现保存一个可复现before workload：记录runtime、Definition fingerprint、Task membership、diagnostic enabled配置、Scheduler decision数量、日志bytes和重复wall samples；复用既有priority/Gate evidence时明确其workload匹配边界，不声称尚未测量的瓶颈。

## Implementation

- [ ] 1.1 在task-scheduler owner内实现diagnostic-only invocation accumulator与安全monotonic sampling，累计decision/transition own time、decision observation time、Scheduler span、离散counts和timing unavailable containment；pure decision函数保持无clock/logger状态。
- [ ] 1.2 从现有execution state的admit、await、settlement、scope activation/release和terminal transition派生Task chronology、slot/capacity积分、max running、接受的 `wait` intervals及逐次 hard-guard facts、top-three admission delays、last settlement与completion tail，不建立第二套pending/running真相。
- [ ] 1.3 通过private invocation/check-execution handoff只在effective diagnostic logging enabled时启用累计，并在实际进入Scheduler的normal/cancelled terminal路径恰好尝试观察一条有界、稳定的`scheduler.summary`；writer可用时日志恰好包含一条，日志或telemetry失败不得改变Run行为。
- [ ] 1.4 更新Architecture、API mechanics、Testing与语义Cases，说明公式、Task slot而非CPU/线程利用率、overlap边界、diagnostic-only输出和程序化消费禁区；不新增machine schema、public declaration、progress字段或Gate warning。

## Verification

- [ ] 2.1 使用具名scripted-clock fixtures运行最窄task-scheduler tests，精确证明空图、单Task、并行Task、依赖释放、mutex/root/scope hard-guard wait、存在可admit candidate 时仍合法的 policy wait、priority、blocked settlement、running/cancellation drain、相同delay排序、最大并发、利用率分母与tail公式。
- [ ] 2.2 运行Run/diagnostic integration tests，证明disabled零summary/零新增计时、enabled且writer可用时单summary、writer失败沿用既有output failure、pre-work/planning无伪造summary、clock throw/NaN/infinity/倒退只产生timing unavailable，以及admission trace、Task settlement、Check duration/result、progress和machine bytes不变。
- [ ] 2.3 按0.3的同一workload采集after原始wall与diagnostic bytes，复核Task membership、terminal outcomes与配置语义相同；报告observer cost和summary能否解释既有长尾，不把本机样本提升为跨主机budget或硬门禁。
- [ ] 2.4 按Test Evidence流程闭合新增/修改Cases，运行最窄测试、`bun run test-evidence -- check --root .`、typecheck、lint、format、docs与Decisions检查，并运行`bun run verify:vibe-check-workspace:required`；若改动或发布验收范围扩大，再运行full profile。
