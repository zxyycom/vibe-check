# Design

本设计保存 Network Link Check不可降低的安全边界，并把当前缺少的输入 acquisition与真实 consumer列为恢复条件。

## Context

**长期安全约束。** [Check-owned 网络授权决策](../../docs/decisions/require-check-owned-network-authorization.md)要求网络权限由 owning Check options 显式 opt-in；[敏感材料临时化决策](../../docs/decisions/keep-sensitive-quality-record-material-ephemeral.md)禁止 raw credential URL 进入公共或持久边界。

**现有传递能力。** Product 的 [private handoff](../../docs/guides/check-dependencies.md) 允许 `handoff: true` provider 在 accepted `passed` 后，向同 Run 的直接 `dependsOn` consumer 交付对象/函数引用；引用不进入 canonical final data、快照、输出或缓存。它不提供 target acquisition、SSRF policy、网络授权或资源释放保证，不能单独解除本 Plan 的安全恢复条件。

离线 Markdown Link Check的首版范围明确停止于本地 file/anchor validation和 external classification；它不会保存可供 Network Check重放的 raw request material。没有真实 consumer时，不应为了未来网络能力先扩展 Core/Run。

## Goals / Non-Goals

**Goals**

- 保留显式授权、SSRF防护、资源上限和敏感材料临时化的硬边界。
- 在恢复时选择与当前 Product一致且不持久化 raw URL的输入 acquisition。
- 让 network domain verdict、transport unavailable与 caller aggregation保持分层。

**Non-Goals**

- 不在首次公开版本实现网络访问。
- 不把 network opt-in放入 Run flags、Project Gate selection、environment或 shared capability。
- 不使用公网 smoke作为本次 planning验证，也不查询任何外部服务。

## Decisions

### Intended Change

1. **显式 Check-owned授权。** Future ordinary value默认 `enabled: false`；只有完整 closed options中 `enabled: true`且全部 target/resource policy有效时才能做任何 DNS/network I/O。
2. **输入 acquisition 必须先评审。** 恢复时依次完成：
   - 优先评估已有 private handoff，并与 Network Check 在自己的 execution 内重解析 approved Markdown inputs 的局部方案比较。
   - 核对真实 provider、直接依赖授权、只读引用、敏感材料生命周期与 caller 资源释放责任。离线 Check 目前不交付 raw request material，handoff 的存在不等于已有安全输入。
   - 仅在两个已有方案均不足且 consumer 证据明确时，以独立长期 Decision/Change 评审新的 private invocation service；不能用 Core final data 模拟。
3. **Transport逐 hop验证。** URL normalization、DNS resolution、address classification、connect target、TLS host和 redirects在同一 private boundary；每次 hop重新授权，限制 schemes、ports、redirect count、timeout、bytes与 concurrency。
4. **不传播 ambient credentials。** 禁止 userinfo、cookies、Authorization、netrc、ambient proxy auth和 query/value写出；记录只使用 safe host classification、status class、closed reason与 source occurrence identity。
5. **四态分层。** 可复现的 policy/reachability defect可 `failed`；临时 DNS/TLS/timeout/transport uncertainty默认 `unavailable`，除非 future consumer明确不同 policy；caller aggregation单独决定 Gate结论。

### Resulting Impacts

- 恢复实施必须同时提供 hermetic DNS/HTTP fixture、credential canary、resource-limit与 redirect/rebinding evidence。
- 离线 Link Check不因本 Plan增加 fields、dependencies或 side effects。

## Risks / Trade-offs

- 同一内容重解析会重复工作，但比持久化 raw URL或提前扩展 Core更安全、更局部。
- Network结果随时间变化；future docs必须说明它是 invocation observation而不是稳定 repository事实。

## Open Questions

- 首个真实 consumer、允许访问的 target类别与输入 acquisition方案。
- Transport uncertainty在该 consumer中应返回 `failed`还是 `unavailable`。

## Implementation Observations

2026-08-24：当前无安全 private cross-Check handoff与命名 consumer，本 Change后置且不阻塞首版。

## Resume Conditions

1. 用户明确提供真实 network-check consumer与实施优先级。
2. 输入 acquisition不要求把 raw URL写入 Core/machine/cache/log。
3. 可运行 hermetic SSRF/redirect/DNS/credential测试，且不会访问真实公网。
