# Tasks

任务先闭合策略、directed readiness与诊断依赖，再实现显式配置、历史模型和纯critical-path选择，最后用确定性测试与重复workload证据验收。

## Readiness

- [x] 0.1 确认 `extract-scheduler-admission-selection-policy` 与 `expose-custom-admission-selection-policy` 已归档，`separate-passed-dependencies-from-settled-observations` Decision 已闭合最终edge/blocked模型，并记录fail-fast、named resource与performance diagnostics的实际集成顺序。
- [x] 0.2 使用 Decision Records 建立并审核 learned-history 专项记录，固定通用 package 能力、static 默认、learned 显式本地启用、无 per-Check 手工估时、现有 effective priority 同分 tie-break、模型公开但非兼容承诺与 history failure 非质量结算边界。
- [x] 0.3 保存当前static policy的required/full workload、admission trace、slot utilization、tail和wall-time基线；确定同candidate、同membership、交错A/B测量入口。
- [x] 0.4 按 `test-evidence-review` 恢复Definition、preflight、duration、Scheduler、diagnostic和installed consumer Case owner，确认新增/修改测试的独立证明义务。

## Implementation

- [x] 1.1 在保留当前 `static | custom` authoring/fingerprint/fault contract 和 Check authoring grammar 的前提下扩展 closed Definition scheduler policy union；实现 static/learned defaults、显式 local state directory validation、normalization、deep-freeze、fingerprint、public declarations 与类型负例。
- [x] 1.2 建立单一Product-private scheduler-history owner：解析versioned untrusted envelope，维护每identity最近32项Task active duration/Scheduler settlement kind与最多4096个series，并atomic publish到显式state directory。
- [x] 1.3 在 admission 前按 model version、Check ID、canonical authored-options digest 和 flags 构造 immutable prediction snapshot，按 learned、project prior、cold-start 顺序形成 estimate 与 model digest；不得为取得 prepared options 调用或前移 task-local preflight。
- [x] 1.4 实现一次反向 graph score 计算和 learned-critical-path admission policy，使其在 relation/mutex eligible candidates 与 capacity facts 上作 select/wait；Scheduler 只守 selected next-option hard conditions 与 wait-drain，不保存或解释 policy fairness/starvation state；模型不修改 priority，现有 effective `admissionPriority` 只在同一 selection layer 的 critical-path 同分时保持自己的优先。
- [x] 1.5 让learned mode启用既有Scheduler measurement collector；在Scheduler闭合后从terminal raw measurement提取有效admitted-to-settled interval及settlement kind交给history owner。包含实际admitted的preflight-blocked/非通过/取消Task，排除flag-control pre-admission result、dependency/cancel-before-admission、timing unavailable与public `checkDurations` fallback；missing/invalid/read/write/concurrent覆盖只降级优化，不改变Run settlement或result kind。
- [x] 1.6 增加有界diagnostic history/model/admission facts，确保不输出raw options、flags、identity inputs或完整samples，并与scheduler performance summary的time owner区分。
- [x] 1.7 更新 Configuration、Architecture、API mechanics、testing、package consumer 示例和 public inventory；明确 static/learned 模式、既有 custom callback 不变、本地 cache-like state lifecycle、无 per-Check 手工估时、cache 非 owner、当前模型公开但非兼容承诺、heuristic 非最优与故障降级。
- [x] 1.8 用最终Gate Definition执行交错A/B；只在required/full均不退化且至少一项改善时启用learned setting，否则保留Product能力和static Gate并记录证据。

## Verification

- [x] 2.1 运行 Definition scheduler authoring、validation、fingerprint、declaration build 与 installed external consumer tests，证明省略 policy 兼容、learned 必须显式提供 local state directory，且第一版 Check authoring grammar 不增加 estimate 字段。
- [x] 2.2 运行history missing/invalid/version mismatch/read failure/write failure、32-sample window、series eviction、atomic publication、concurrent last-writer和secret non-persistence tests。
- [x] 2.3 运行 cold start、首样本、rolling mean、project prior、downstream score、effective priority tie、无状态重算、dependency/observation、mutex/capacity 和 cancellation/fail-fast Scheduler tests；分别证明 task-local preflight 计入样本，pre-admission 与 timing-unavailable Task 不产生样本。
- [x] 2.4 运行diagnostic有界渲染与disabled零开销测试，证明history失败、model digest和selected score可解释且不改变Check/Record/machine/progress/result contracts。
- [x] 2.5 运行 `bun run test-evidence -- check --root .`、format、typecheck、lint、dependency/public-entry检查、目标测试和`bun run verify:vibe-check-workspace:required`；跨public/output边界后运行full Gate。
- [x] 2.6 按编码规范审阅 history、snapshot 和 policy 的 owner、错误边界、异步 I/O、closed data、命名与文件规模，并由 AI-ready 文档审阅确认后续实现者能恢复 setting、local state 数据流、priority 同分语义、当前模型与兼容承诺的区别和非目标。
