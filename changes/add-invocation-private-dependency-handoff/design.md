# Design

本设计用一个无 parser 的泛型 marker 关联 provider result 与 typed dependency read，并让 canonical facts store 和 invocation-private handoff store 承担不同生命周期。

## Context

长期方向由 [`provide-invocation-private-dependency-handoff.md`](../../docs/decisions/provide-invocation-private-dependency-handoff.md) 承接。现有 [`check-dependencies.md`](../../docs/guides/check-dependencies.md) 中，`dependencies.get(checkId)` 从 settled facts 读取 canonical data，`parseData` 只负责从 detached 或 cross-version facts 恢复 provider 业务类型。

两个通道的契约如下：

| Contract | Canonical `data` | Private `handoff` |
| --- | --- | --- |
| Value semantics | canonicalize、detach、deep-freeze | 保留 producer 返回的 object identity |
| Consumers | Core、RunResult、machine 与 dependency readers | 同一 Run 的 direct `dependsOn` consumer |
| Type recovery | provider `parseData` | provider marker 泛型；无序列化往返和 parser |
| Ownership | Product 验证 canonical grammar | Producer 验证 opaque object 并管理 immutability/cleanup |

## Goals / Non-Goals

### Goals

- 用一个 marker 关联 provider authoring、result 和 direct dependency read 的精确类型。
- 在 dependency API 内同时提供 canonical facts 和 private object，不依赖 caller-global registry。
- 保持 fan-out consumers 的 reference identity，并隔离每次 Run。

### Boundaries

- Core、machine、cache、diagnostics、fingerprint、string dependency read 和 `list()` 只处理 canonical data。
- Handoff 没有 Product parser、schema、clone、deep freeze、serialization、cache、replay 或 disposer。
- 可见性仅授予 direct `dependsOn`；业务 shape、mutation discipline 与资源 cleanup 由 producer owner 管理。

## Decisions

### Intended Change

1. **Marker and authoring.** 公开无配置的 branded `defineCheckHandoff<T extends object>()`。只有带 marker 的 executable provider 才接受 `passed` result 中的 `handoff: T`；新增泛型使用 defaults 保持既有调用兼容。
2. **Definition boundary.** Runtime validation 只接受 helper 创建的 genuine marker，并将它保留到 normalized executable Check。Declarative snapshot 与 fingerprint 像处理 callback 一样省略 marker。
3. **Settlement-gated publication.** Execution owner 先按现有边界验证并结算 canonical result；只有 `passed`、handoff 为非空 object 且 settlement 已接受时，才把原始引用写入当前 Run 的 private store。其他终态和结算失败不发布 partial handoff。
4. **Provider-aware read.** `dependencies.get(provider)` 依据 provider literal `checkId` 与 marker 泛型返回 canonical data 和 typed `handoff`，runtime 只授权 normalized direct `dependsOn`。String `get(checkId)` 和 `list()` 延续 canonical read；无权限或不可用 provider 返回 closed read error。
5. **Identity and ownership.** Fan-out consumers 读取同一引用；每次 Run 创建独立 store，并在 terminal completion 后释放。Product 只管理 marker authenticity、settlement 和 relation authorization，producer 管理领域验证、immutable observation 与外部资源 cleanup。
6. **Public evidence.** 更新 package exports、public/internal owners 和 changelog；测试覆盖 type inference、runtime rejection、strict identity、fan-out、authorization、Run isolation，以及所有 publication surfaces 中 handoff 的缺席。

### Resulting Impacts

- `defineCheck` overload 与内部 `Check` generic 扩展，需要 type tests 保护 ordinary/typed provider、prepared options 与 parser inference。
- Private store 位于 Run/check-execution owner，并通过 settlement seam 接收 handoff；`CheckOutcome`、Core session 和 Scheduler contract 不变。
- Provider-object overload 是新的 typed 入口；string overload 的返回 shape、authorization 和 error codes 由回归锁定。
- Public docs 将 runtime domain validation 与 deep immutability 明确归给 producer，而不是 marker generic 或 `readonly`。

## Risks / Trade-offs

- 保持 identity 意味着 Product 无法同时保证任意对象的 deep immutability；可信 producer 必须确保 fan-out consumer 只做约定的观察。
- Private store 延长对象到当前 Run terminal completion；实现不得形成跨 Run cache、history 或 disposal registry。

## Open Questions

无。
