# Tasks

任务先闭合策略、directed readiness与诊断依赖，再实现显式配置、历史模型和纯critical-path选择，最后用确定性测试与重复workload证据验收。

## Readiness

- [ ] 0.1 确认 `extract-scheduler-admission-selection-policy` 与 `expose-custom-admission-selection-policy` 已归档，`require-passed-dependencies-and-observe-outcomes` 已闭合最终edge/blocked模型，并记录fail-fast、named resource与performance diagnostics的实际集成顺序。
- [ ] 0.2 使用Decision Records建立并审核successor，演进现行static-priority/no-history判断，固定static默认、learned显式启用、priority同分tie-break与history failure非质量结算边界。
- [ ] 0.3 保存当前static policy的required/full workload、admission trace、slot utilization、tail和wall-time基线；确定同candidate、同membership、交错A/B测量入口。
- [ ] 0.4 按 `test-evidence-review` 恢复Definition、preflight、duration、Scheduler、diagnostic和installed consumer Case owner，确认新增/修改测试的独立证明义务。

## Implementation

- [ ] 1.1 扩展closed Definition scheduler policy union和executable-only `expectedDurationMs`，实现defaults、validation、normalization、deep-freeze、fingerprint、public declarations与类型负例。
- [ ] 1.2 建立单一Product-private scheduler-history owner：解析versioned untrusted envelope，维护每identity最近32项duration/outcome与最多4096个series，并atomic publish到显式state directory。
- [ ] 1.3 在preflight后按model version、Check ID、prepared-options digest和flags构造immutable prediction snapshot，按override、learned、project prior、cold-start顺序形成estimate与model digest。
- [ ] 1.4 实现一次反向graph score计算和learned-critical-path admission policy，使reservation、scope层级、capacity与candidate guard保持优先，static priority只作同分tie-break。
- [ ] 1.5 在Check execution闭合后把有效monotonic active-duration样本和outcome交给history owner，排除public clock-anomaly fallback；missing/invalid/read/write/concurrent覆盖只降级优化，不改变Run settlement或result kind。
- [ ] 1.6 增加有界diagnostic history/model/admission facts，确保不输出raw options、flags、identity inputs或完整samples，并与scheduler performance summary的time owner区分。
- [ ] 1.7 更新Configuration、Architecture、API mechanics、testing、package consumer示例和public inventory；明确static/learned模式、state lifecycle、cache非owner、heuristic非最优与故障降级。
- [ ] 1.8 用最终Gate Definition执行交错A/B；只在required/full均不退化且至少一项改善时启用learned setting，否则保留Product能力和static Gate并记录证据。

## Verification

- [ ] 2.1 运行Definition/Check authoring、validation、inheritance rejection、fingerprint、declaration build与installed external consumer tests，证明省略policy兼容且override只属于executable Check。
- [ ] 2.2 运行history missing/invalid/version mismatch/read failure/write failure、32-sample window、series eviction、atomic publication、concurrent last-writer和secret non-persistence tests。
- [ ] 2.3 运行cold start、首样本、rolling mean、project prior、override、downstream score、priority tie、sticky reservation、dependency/observation、mutex/capacity和cancellation/fail-fast Scheduler tests。
- [ ] 2.4 运行diagnostic有界渲染与disabled零开销测试，证明history失败、model digest和selected score可解释且不改变Check/Record/machine/progress/result contracts。
- [ ] 2.5 运行 `bun run test-evidence -- check --root .`、format、typecheck、lint、dependency/public-entry检查、目标测试和`bun run verify:vibe-check-workspace:required`；跨public/output边界后运行full Gate。
- [ ] 2.6 按编码规范审阅history、snapshot和policy的owner、错误边界、异步I/O、closed data、命名与文件规模，并由AI-ready文档审阅确认后续实现者能恢复setting、数据流、优先级和非目标。
