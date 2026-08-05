> **核心句：**本 delta 将 scan-completeness 收敛为 invocation-wide terminal-run 与 coverage 集合 owner；它机械汇总每项 CheckRun，却不产生 overall 质量 verdict。

## RENAMED Requirements

- FROM: ### Requirement: Current capabilities produce one final result
- TO: ### Requirement: Every resolved check produces one terminal run
- FROM: ### Requirement: Overall completeness controls result trust
- TO: ### Requirement: Invocation coverage summary preserves independent check evidence

## MODIFIED Requirements

### Requirement: Every resolved check produces one terminal run

Product Core SHALL 从 frozen CheckDefinition catalog 与 resolved selection 形成完整 invocation set，并为每个 definition 产生且只产生一个 final CheckRun。Run 必须满足 `quality-checks` 定义的 `skipped | completed | failed` 状态与 nullable CheckResult sum；invocation summary 不得遗漏、重复或增加 unknown check/run。

Skipped definition 不进入 applicability 或 execution；requested/not-applicable definition 不进入 execution 并闭合为 completed/not-applicable；applicable definition 必须取得 exactly one terminal ExecutionReport 后 finalize。Missing/duplicate report 或 record identity-integrity conflict 使整个 final snapshot 无效，不得通过伪造 terminal run 补齐。

#### Scenario: Quick profile skips duplicate detection

- **WHEN**resolved selection 不请求 duplicate-detection
- **THEN**其 final CheckRun 为 skipped、result 为 null 且 coverage/counts 为 zero
- **AND**Product 不解析 applicability、创建 contribution 或启动 dependency

#### Scenario: Requested capability has no eligible input

- **WHEN**requested check 在 execution 前冻结为 not-applicable
- **THEN**其 final run 为 completed 并包含 not-applicable CheckResult 与 zero coverage
- **AND**Product 不创建 execution contribution 或用 empty record set 推断结论

#### Scenario: Successful measurement can produce zero findings

- **WHEN**applicable execution 正常返回 valid CheckResult 但没有提交 record
- **THEN**final run 为 completed 且保留 runner 返回的 passed 或 failed verdict
- **AND**zero records 不被重新分类为 skipped 或 not-applicable

#### Scenario: Required component is unavailable

- **WHEN**applicable binding 返回 terminal unavailable ExecutionReport
- **THEN**final run 为 failed、result 为 null 且 diagnostic kind 为 unavailable
- **AND**diagnostic 说明 safe reason 与恢复动作

#### Scenario: Measurement execution or result validation fails

- **WHEN**execution report 为 execution-failed、returned result 无效或 record protocol 违规
- **THEN**final run 按 foundation precedence 成为 failed 并保留 manager-owned coverage/valid records
- **AND**任何 partial evidence 都不能把该 run 改成 completed

### Requirement: Invocation coverage summary preserves independent check evidence

Product SHALL 从 final CheckRun set 机械派生一个只读 invocation coverage summary。Summary MUST 包含 definition/run 总数、各 run status 与 result verdict counts、domain-work planned/finished/unprocessed sums 和 unique committed record count；全部 counts 必须与底层 runs/records 逐项相等。Summary 不得包含 `complete | empty | failed` overall 状态，不得产生 passed/failed 质量结论，也不得覆盖独立 run/result/diagnostic。

是否允许 skipped、not-applicable、failed 或 unprocessed evidence 只由 selected DecisionPolicy 决定。Gate disabled 时，summary 保持观察数据；final-model integrity failure 发生时不得发布看似完整的 summary。

#### Scenario: Succeeded and no-input capabilities form a complete result

- **WHEN**final set 同时包含 completed/passed 和 completed/not-applicable runs 且没有 Product integrity failure
- **THEN**summary 精确计数两类 runs、coverage 和 records
- **AND**不把组合压缩成 overall complete 或自动 gate passed

#### Scenario: No capability performs measurement

- **WHEN**全部 definitions 为 skipped 或 requested/not-applicable
- **THEN**summary 显示 zero applicable execution、实际 status/result counts 与 zero domain coverage
- **AND**Product 不声称全部质量检查通过

#### Scenario: Any required measurement fails

- **WHEN**任一 CheckRun failed 且其它 runs completed
- **THEN**summary 同时保留 failed 和 completed evidence 及各自 coverage/counts
- **AND**failed run 不抹除其它 records，也不由 summary 固定全局 outcome
