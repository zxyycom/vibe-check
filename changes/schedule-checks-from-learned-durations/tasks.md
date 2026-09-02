# Tasks

任务先闭合策略、directed readiness与诊断依赖，再实现显式配置、历史模型和纯critical-path选择，最后用确定性测试与重复workload证据验收。

## Readiness

- [ ] 0.1 确认 `extract-scheduler-admission-selection-policy` 与 `expose-custom-admission-selection-policy` 已归档，`separate-passed-dependencies-from-settled-observations` Decision 已闭合最终edge/blocked模型，并记录fail-fast、named resource与performance diagnostics的实际集成顺序。
- [ ] 0.2 使用Decision Records建立并审核successor，演进现行static/no-history判断，固定static默认、learned显式启用、priority同分tie-break与history failure非质量结算边界。
- [ ] 0.3 保存当前static policy的required/full workload、admission trace、slot utilization、tail和wall-time基线；确定同candidate、同membership、交错A/B测量入口。
- [ ] 0.4 按 `test-evidence-review` 恢复Definition、preflight、duration、Scheduler、diagnostic和installed consumer Case owner，确认新增/修改测试的独立证明义务。

## Implementation

- [ ] 1.1 在保留当前 `static | custom` authoring/fingerprint/fault contract 的前提下扩展 closed Definition scheduler policy union，并增加 executable-only `expectedDurationMs`；实现 defaults、validation、normalization、deep-freeze、fingerprint、public declarations 与类型负例。
- [ ] 1.2 建立单一Product-private scheduler-history owner：解析versioned untrusted envelope，维护每identity最近32项Task active duration/Scheduler settlement kind与最多4096个series，并atomic publish到显式state directory。
- [ ] 1.3 在admission前按model version、Check ID、canonical authored-options digest和flags构造immutable prediction snapshot，按override、learned、project prior、cold-start顺序形成estimate与model digest；不得为取得prepared options调用或前移task-local preflight。
- [ ] 1.4 实现一次反向graph score计算和learned-critical-path admission policy，使其在relation/mutex eligible candidates与capacity facts上作select/wait；Scheduler只守selected next-option hard conditions与wait-drain，不保存或解释policy fairness/starvation state；static priority只作同分tie-break。
- [ ] 1.5 让learned mode启用既有Scheduler measurement collector；在Scheduler闭合后从terminal raw measurement提取有效admitted-to-settled interval及settlement kind交给history owner。包含实际admitted的preflight-blocked/非通过/取消Task，排除flag-control pre-admission result、dependency/cancel-before-admission、timing unavailable与public `checkDurations` fallback；missing/invalid/read/write/concurrent覆盖只降级优化，不改变Run settlement或result kind。
- [ ] 1.6 增加有界diagnostic history/model/admission facts，确保不输出raw options、flags、identity inputs或完整samples，并与scheduler performance summary的time owner区分。
- [ ] 1.7 更新 Configuration、Architecture、API mechanics、testing、package consumer 示例和 public inventory；明确 static/learned 模式、既有 custom callback 不变、state lifecycle、cache 非 owner、heuristic 非最优与故障降级。
- [ ] 1.8 用最终Gate Definition执行交错A/B；只在required/full均不退化且至少一项改善时启用learned setting，否则保留Product能力和static Gate并记录证据。

## Verification

- [ ] 2.1 运行Definition/Check authoring、validation、inheritance rejection、fingerprint、declaration build与installed external consumer tests，证明省略policy兼容且override只属于executable Check。
- [ ] 2.2 运行history missing/invalid/version mismatch/read failure/write failure、32-sample window、series eviction、atomic publication、concurrent last-writer和secret non-persistence tests。
- [ ] 2.3 运行cold start、首样本、rolling mean、project prior、override、downstream score、priority tie、无状态重算、dependency/observation、mutex/capacity和cancellation/fail-fast Scheduler tests；分别证明task-local preflight计入样本，pre-admission与timing-unavailable Task不产生样本。
- [ ] 2.4 运行diagnostic有界渲染与disabled零开销测试，证明history失败、model digest和selected score可解释且不改变Check/Record/machine/progress/result contracts。
- [ ] 2.5 运行 `bun run test-evidence -- check --root .`、format、typecheck、lint、dependency/public-entry检查、目标测试和`bun run verify:vibe-check-workspace:required`；跨public/output边界后运行full Gate。
- [ ] 2.6 按编码规范审阅history、snapshot和policy的owner、错误边界、异步I/O、closed data、命名与文件规模，并由AI-ready文档审阅确认后续实现者能恢复setting、数据流、优先级和非目标。
