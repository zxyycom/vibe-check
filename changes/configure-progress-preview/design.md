# Design

本 Draft 将 Core Check facts 与 human terminal renderer 分层，讨论受限 presentation configuration，而不是扩展 Check result contract。

## Context

**已确认事实**

- renderer 目前以固定常量分别预览前 5 条 Record、前 5 条 message，并在 escape 后将每段 terminal text 限为 240 code points。
- public `outputs.progressRendering` 当前仅有 `enabled`；progress 是 Product-owned terminal presentation，可另 tee 到 `RunControls.progressLogFile`。
- renderer 负责 terminal escaping 和 bounding；Core Check 负责 message/Record/Finding 的事实、排序、安全字段与业务含义。
- `docs/guides/presenting-findings.md` 已说明每个 Check 最多十条 Finding message 与 progress 的五条 message/Record preview 是不同层次；这不是待修 bug。

**暂定建议**：把“各类条目数量”和“text truncation”建模为 renderer 局部 presentation policy；候选 formatter 为同步 `formatter({ kind, checkId, counts }) => displayText`。其返回文本仍必须经过 renderer escape/bound；调用契约要求 formatter 不直接写 stdout，但作为 trusted host callback，Product 不能将此约束表述为对副作用的 sandbox。

## Goals / Non-Goals

**Goals**

- 决定 Record 和 message 的 preview count 是否独立、默认值如何与现状兼容、并确定 count/text truncation 的明确范围。
- 若保留 hook，定义其可见输入、返回值限制、同步或 async、throw 行为与 output failure priority。
- 决定 configuration 属于 Definition、RunControls 或两层覆盖，以及对 declarative fingerprint、冻结 snapshot 与 privacy 的影响。

**Non-Goals**

- 不让 renderer 改写 Check 产生的 Finding facts、message/Record 排序、安全字段、waiver 语义或终态结果。
- 不把 formatter 设计为 Product 提供 stdout、filesystem、network、Check context 或未过滤 Record data 的能力；formatter 是 caller 提供的 trusted host code，调用契约不能阻止其自行使用既有宿主权限或产生副作用，也不建立通用 console plugin system。
- 本 Draft 不修改公共 API、Definition grammar、RunControls、renderer、文档或测试；用户尚未批准 API 实施。

## Decisions

### Intended Change

**暂定建议**：优先比较最小的 declarative count configuration 与可选的、严格受限同步 formatter，而不是将它们捆绑为一个必然方案。

- count 候选应显式区分 Record 与 message，并保留现有 5/5 默认；必须决定零、正整数、未知字段、上限与 overflow row 的语义。
- formatter 候选只接收 `{ kind, checkId, counts }` 等最小 metadata，并按调用契约返回 display text；renderer 仍是唯一处理该返回文本的 escape、code-point bounding、color 和 output writer owner。这不限制 trusted callback 在其自身宿主环境中产生的独立副作用。
- 不预设 formatter 能看 message/Record 正文；若 consumer 需要内容级 format，应单独证明 privacy、安全和稳态 compatibility，不能从本候选自然推论。
- 是否放入 Definition outputs、RunControls per-invocation override 或两者继承，须以持久 Definition identity 与单次环境 presentation 的差异决定；在该判断前不承诺 fingerprint 行为。

### Resulting Impacts

- 若定义层公开：同步 closed authoring/resolved schema、normalization、deep freeze、fingerprint、inherit/defaults、package export/declarations 与 API docs。
- 若 RunControls 可覆盖：同步 control validation、current-run precedence、output status/readback/failure isolation 和 `progressLogFile` tee behavior。
- 若 hook 存在：必须测试 throw、非法 text、reentrancy/async（若允许）、cancellation 与 writer failure 的结果优先级；不得让 hook 绕过 terminal escaping/bounds。
- 无论方案是否实施，都要保持 Check finding presentation 的独立 owner；进度 docs 只说明预览，不复制 Check-specific Finding policy。

## Risks / Trade-offs

可配置数量可能膨胀 terminal/log output 或泄漏更多 human-visible information；hook 可能带来异常、延迟、non-determinism、fingerprint 语义与隐私责任。将 ephemeral presentation 放入 Definition 可能无谓地改变 fingerprint；仅放 RunControls 又可能不能满足 committed project display policy。同步 hook 简化 lifecycle 和 failure isolation，但可能不足以满足复杂 format 需求。

**验证建议（尚未执行）**：方案获批后，增加 schema/default/fingerprint、renderer escaping/bounding、count overflow、hook failure 和 invocation output-priority tests；再运行 project-run 目标 tests、docs/API projection、declaration/inventory 与 installed-consumer acceptance。此前 Gate 36/36 不覆盖未来配置行为。

## Open Questions

1. count 是仅正安全整数还是允许 `0` 禁用某类 preview；是否需要合理最大值以保护 terminal/log？
2. text truncation scope 是每条 message/Record、overflow row、display name 还是仅 hook 返回文字？240 code points 是否仍是默认？
3. formatter 是否真正需要存在；若存在，必须同步吗，hook throw 应令 `outputs.progressRendering` failed 还是回退默认文本？
4. 哪些字段可安全交给 hook，是否允许 checks count 之外的信息？
5. configuration 的 Definition/RunControls 归属与 override precedence 是什么，何者进入 fingerprint，何者只影响本次 Run？
