# Proposal

本 Plan 为 API-only Product Run 增加一组一次调用的字符串 flag。调用方传入 flag；每个 Check 自行检查该 flag 是否存在并决定执行或返回现有 <code>not-applicable</code>。Product 只验证、规范化和冻结 flag collection，不解释任何 flag 的项目语义，也不选择 Task。

## Why

实施前，<code>RunControls</code> 没有 project-defined control flag，<code>CheckExecutionContext.project</code> 也不能读取它。项目若希望某个 Check 因本次运行的简单控制标志而不适用，只能在 Product 外重建控制路径，或错误地把一次调用的开关放进 Definition-owned static <code>options</code>。

一个小的 flag collection 足以覆盖这个缺口：flag presence 表示 <code>true</code>，absence 表示 <code>false</code>。这保留项目自定义的 token vocabulary，也避免把简单 Check-local control 扩张为任意 structured invocation payload。

## Outcome

完成后，<code>run(definition, { flags })</code> 接受 optional <code>readonly string[]</code>。该 array 必须稠密（不允许 sparse hole），但可以为空：省略、<code>undefined</code> 与 <code>[]</code> 都向每个 Check callback 提供始终存在的空 <code>context.project.flags</code>；每个 array item 都必须是 non-empty string token。Product 在任何 callback、scanner、cache 或 reporter work 前验证 input，并对有效 input 去重、规范排序和冻结 snapshot。

Check 用 <code>context.project.flags.includes("some-flag")</code> 自行决定是否返回 <code>not-applicable</code>。Product 不理解 flag token、不把它写入 declarative fingerprint、Core、policy 或 machine output，且不改变 static Task graph、dependency、mutex、capacity、cancellation 或 skip propagation 语义。

## Scope

| 纳入本 Change | 明确不纳入本 Change |
| --- | --- |
| <code>RunControls.flags</code>、<code>CheckProjectContext.flags</code> 的 runtime/declaration contract，以及其 validation、snapshot 和 focused evidence。 | 任意 JSON/host-object invocation payload、泛型化 Project/Check/Run type surface、per-Check runtime option override。 |
| project Check 在本地检查 flag 并返回现有 <code>not-applicable</code> 的证明。 | Product CLI 参数、profile 名称、tag vocabulary、disabled-tag propagation、repository command、renderer、logs、exit mapping 或 CI policy。 |
| 稳定 owner 文档与 package consumer evidence 对同一 flag contract 的说明。 | selected-task API、scheduler-level skip、dynamic Task graph、依赖自动传播、caller-controlled capacity、workspace verifier cutover、package registry 发布。 |

## Success Criteria

1. <code>flags</code> 是 optional 的 <code>readonly string[]</code> input；callback 侧总能读取一个 frozen、去重、排序后的 readonly string collection，省略时为空 collection。
2. 输入是稠密 array 时可为空；每个 token 必须是 non-empty string。非 array、sparse hole、非 string token 或空 string 在任何 Check callback 前按既有 <code>invalid-run-controls</code> configuration failure 拒绝。
3. Check-local flag 检查可产生 <code>not-applicable</code>，但所有 executable Check 仍按既有 static graph admission 与 dependency semantics 处理。
4. <code>flags</code> 不改变 Definition-owned <code>options</code>、scheduler、fingerprint、Core、policy、machine artifact 或 Product-owned CLI 行为。
5. Product tests、exact-package consumer、稳定 Configuration/Architecture owner 文档与 Change verification 均证明同一边界。

## Affected Owners

- Public type 与 callback contract：<code>src/product/definition/project.ts</code>、<code>src/product/definition/custom-check.ts</code>。
- Control validation 与一次性 context construction：<code>src/product/run/control-validation.ts</code>、<code>src/product/run/project-context.ts</code>；focused 行为证据在 <code>src/product/run/flags.test.ts</code>，并以 <code>src/product/run/check-execution.test.ts</code> 的显式 <code>CheckProjectContext</code> fixtures 保持既有 context fixture 完整。
- Package surface 与 consumer evidence：<code>src/product/public-contract/current.ts</code>、<code>src/product/public-contract/current.test.ts</code>、<code>scripts/package-candidate/entry.ts</code> 与 <code>scripts/package-candidate/isolated-consumer.test.ts</code>。
- 实施后才更新的稳定事实 owner： [Configuration](../../docs/configuration.md#invocation-and-results) 与 [Architecture](../../docs/architecture.md#execution-boundary)。
- 长期方向由 <code>docs/decisions/</code> 承接（见任务 0.1）；本目录只拥有本次实现计划，下游关系见 [Vibe Check package 与 Project Gate 交付导航](../vibe-check-package-and-gate-delivery.md)。

## Downstream Handoff

完成后，本 Change 只交付经过验证的 Product flag-control contract。下游 [build-candidate-backed-project-gate](../build-candidate-backed-project-gate/) 可自行规定 flag token（例如某个 local disabled tag）并让所属 Check 解释它；该使用不赋予 Product 解析 CLI、选择 Task 或定义 gate pass/fail policy 的责任。
