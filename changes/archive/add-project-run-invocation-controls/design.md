# Design

本 Design 将一次调用的 project control 收窄为一组简单字符串 flag。flag presence 就是布尔语义；Check 自行检查该集合并作出自己的执行/不适用判断。它不是通用 invocation data channel，也不改变静态调度。

## Context

<code>run(definition, controls)</code> 先验证 Project Definition 和 closed <code>RunControls</code>，随后构造一次 <code>CheckProjectContext</code>，再运行静态 Task graph。实施前 callback context 包含 root、changed files、file configuration、comparison 和 cache，但没有 project-defined control flag。实施后的当前 contract 由 [Configuration](../../docs/configuration.md#invocation-and-results) 与 [Architecture](../../docs/architecture.md#execution-boundary) 拥有；<code>src/product/run/control-validation.ts</code> 和 <code>src/product/run/project-context.ts</code> 是其实现证据。

已对齐的长期边界是：Check-owned <code>options</code> 继续属于 Project Definition，Run Controls 只补充共享 invocation input；project-owned wrapper 决定暴露哪些 control（[由 Check-owned execution options 驱动 Run](../../docs/decisions/drive-run-from-check-owned-execution-options.md)）。每个 executable Check 仍投影到唯一已验证 static Task graph；<code>not-applicable</code> 不等于 scheduler 删除节点，也不自动沿 dependency 传播（[将 executable Check 直接投影到已验证 Task graph](../../docs/decisions/project-executable-checks-into-validated-task-graph.md)）。

Repository Gate 是下游 consumer，但不是本 contract 的 schema owner：它以后可以把自己的 profile/tag 解析为 string flag，再由每个本地 Check 读取。flag spelling、CLI、显示、exit policy 和 gate 对 skip 的约束仍属于 [build-candidate-backed-project-gate](../build-candidate-backed-project-gate/)。

### 目标契约速览

| 边界 | 实施后的 contract | 不负责的语义 |
| --- | --- | --- |
| 调用方 → <code>RunControls</code> | optional <code>flags?: readonly string[]</code>。每个 token 是一个简单 boolean flag；存在为 <code>true</code>，缺失为 <code>false</code>。 | token 的命名、层级、profile/tag 含义或 CLI parsing。 |
| Product validation → project context | omitted、<code>undefined</code> 与 <code>[]</code> 都规范化为 <code>[]</code>；任何非 <code>undefined</code> 的 input 必须是稠密 array（不允许 sparse hole），且每个 array item 都是 non-empty string token。Product 复制、去重、字典序排序并冻结结果。 | boolean map、value-bearing payload 或第二种 input grammar。 |
| <code>CheckProjectContext</code> → Check | required <code>flags: readonly string[]</code>；Check 用 <code>includes</code> 读取本地条件。 | Product-provided flag helper、Check option override 或 dynamic Task registration。 |
| Check → scheduler / gate | Check 可返回既有 <code>not-applicable</code>。 | scheduler-level selection、dependency propagation、gate pass/fail、output 或 telemetry policy。 |

## Goals / Non-Goals

### Goals

- 新增 optional <code>RunControls.flags</code>，并在每个 callback 的 <code>context.project.flags</code> 提供总是存在的 immutable flag collection。
- 将 caller input 规范化为唯一 set semantics：non-empty string token、deduplicated、lexicographically sorted、frozen；presence 表示 <code>true</code>，absence 表示 <code>false</code>。
- 让 Check 在执行自己的工作前用 <code>includes</code> 做本地 eligibility 判断，并能返回既有 <code>not-applicable</code>。
- 保持公共类型根不变：只扩展已导出的 <code>RunControls</code> 与 <code>CheckExecutionContext</code> 的现有形状，不新增 generic surface 或命名的 flag type。
- 用 Package Run 和 exact-package consumer evidence 证明输入、callback exposure、错误边界与静态调度边界一致。

### Non-Goals

- 不接受 string-or-boolean map、任意 JSON tree、Date/Map/class/handle 等 structured project data，也不建立第二种 flag input grammar。
- 不定义 Product CLI 参数、profile/tag vocabulary、disabled-tag propagation、repository command、renderer、logs、exit mapping 或 CI policy。
- 不实现 selected-task API、scheduler-level skip、dynamic Task graph、dependency automatic propagation、caller-controlled capacity 或 per-Check runtime option override。
- 不让 flag 进入 Definition-owned <code>options</code>、declarative fingerprint、Core snapshot、policy input、machine artifact、report 或 publication input。
- 不替代 workspace verifier、不完成完整 Project Gate，也不公开发布 package。

## Decisions

### 1. 公共输入是 <code>flags?: readonly string[]</code>

<code>RunControls</code> 新增 optional <code>flags</code>，而 <code>CheckProjectContext</code> 新增 required <code>flags: readonly string[]</code>。这是一组 token，而不是 value-bearing object：调用方通过包含 token 设置 flag；不包含 token 即未设置。Check 使用 <code>context.project.flags.includes(flag)</code>，不需要 Product 提供 project-specific helper。

选择 string set 而不选择 boolean map 的原因是：两者都能表达 boolean control，但 map 会同时引入 absent/false 的双重表示、key/value grammar 与更多 validation 责任。string set 只有一种真值表示，且能让 project 后续自行把任何本地 CLI input 投影为 token；Product 不解析 token 的命名或层级。

### 2. Validation 在 controls boundary 完成并创建稳定 snapshot

<code>flags</code> omitted、值为 <code>undefined</code> 或值为 <code>[]</code> 时都规范化为 <code>[]</code>。任何非 <code>undefined</code> 的 value 必须是一个稠密 array；array 本身可以为空，但不允许 sparse hole，且每个 item 必须是 non-empty string token。Product 拒绝 array 以外的值、sparse hole、空 string 与非 string item。验证成功后，Product 复制、去重、lexicographically sort 并 <code>Object.freeze</code> 该 array，再创建一次 project context。callback 不保留 caller array reference。

任何 invalid flag input 都沿用既有 <code>kind: "configuration"</code> / <code>invalid-run-controls</code> failure family，并以 <code>controls.flags</code> 定位；它必须发生在任何 Check callback、scanner、cache、reporter 或 Task work 之前。重复 token 合法且不改变结果，因为 collection 的语义是 set。

### 3. Product 传递 flag，Check 解释 flag

Product 不根据 flag admission、remove 或 reorder Task，也不将 flag 转换为 <code>options</code>。每个 Check 的 closure、static tags 和 project rule 决定它是否把某个 flag 视为不适用条件；例如一个 project-owned Check 可在启动 process 前检测 <code>"disabled:docs"</code> 并返回 <code>not-applicable</code>。该 token 只是 test/consumer data，不是 Product vocabulary。

因此 dependent Check 不能推断前置 Check 已被 scheduler-level skip。既有 result/dependency semantics 保持不变；future Gate 仍需自行显示并限制关键 Check 的不适用情况。

### 4. Bound project Run 选择是否转发 flag

Product 只接受已导入的 Definition 与 controls，不发现 project module 或解析 argv。需要 flags 的 project-owned bound Run 把它纳入自己公开的 control subset；不需要的 wrapper 不必暴露它。当前 <code>quality</code> root 不因此获得 profile/tag CLI，完整 adapter 行为仍由 Gate Change 拥有。

## Risks / Trade-offs

- **过度泛化：** 将 flag 重新扩张成任意 invocation data 会迫使 Product 拥有复制、身份与安全语义，并模糊 Check option 边界；本 Plan 只保留 string token set。
- **隐式 false 误读：** 只以 token presence 表示 true，避免 absent 与 <code>false</code> 两条等价路径；consumer 不得依赖 input order 或 duplicate count。
- **错误的部分运行推断：** Check 返回 <code>not-applicable</code> 只描述它自身；不自动允许 gate 通过，也不自动跳过 dependent。
- **公共契约漂移：** <code>flags</code> 改变 package declaration；candidate 在 Gate work 使用前必须按 delivery navigation 刷新。

## Open Questions

无。此 Plan 已采用 string flag set：<code>flags</code> 是 public field name，non-empty token 是最小 Product-level validity rule，presence/absence 是唯一布尔表示。

若未来需要 string value、显式 <code>false</code>、嵌套 data 或任何 Product 对 token 的解释，应停止扩张本 Plan，另建 Decision 和 Change。

## Verification Strategy

实施时应证明：

1. omitted、unique、duplicate、unordered input 分别产生空或 canonical frozen callback collection，且 callback 不能改写它。
2. non-array、sparse hole、empty string 与 non-string token 返回 <code>invalid-run-controls</code> / <code>controls.flags</code>，且没有 callback 被调用。
3. project Check 用一个 local token 返回 <code>not-applicable</code>，但 Task graph admission 与 dependency semantics 未改变。
4. Type declaration、public-contract inventory、exact-package consumer 与稳定 Configuration/Architecture owner 同步此 field；不新增 runtime operation 或 named type root。
5. 测试修改遵循 test-evidence workflow，并在完成时运行最窄 Product/package tests、<code>bun run test-evidence -- check --root .</code>、Change check 与 required workspace verification。
