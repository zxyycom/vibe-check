---
title: 用 string getter 读取 direct dependency final data
status: active
alignment: aligned
createdAt: 2026-08-23T11:13:59Z
purpose: 让 downstream Check 安全复用 upstream canonical final data，而不建立第二事实源。
background: 决策形成前，direct dependency 已提供顺序，Core 已保存 final data，但 callback 尚无 runtime read capability。
decision: 用 non-generic string getter 授权 direct read，并由 producer-owned parser 恢复同一个 data contract。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: let-dependent-checks-read-settled-upstream-outputs.md
---

## 目的

- 让多个 downstream Checks 复用同一个 upstream Check 的 settled primary result，避免重复工作、扩大project-wide context或通过closure传递未记录数据。
- 让dependency read始终来自existing Core Check fact，并以runtime direct-edge authorization拒绝undeclared、transitive、live或partial access。
- 让producing Check拥有自己的data contract和类型恢复方式，不让Product建立business schema、parser registry或第二output store。

## 背景

以下是决策形成时的背景，而不是当前 Product capability；当前实现以稳定 owner、代码和测试为准。

- 在决策形成前，`dependsOn` 已用 normalized string IDs 建立完整静态 Task graph，但 callback context 不能读取 upstream result。
- 当时 Core 已把 `passed` / `failed` final data materialize 为 detached、deep-frozen `CanonicalJsonObject`；`not-applicable` / `unavailable` 没有 final data。Supplemental Records 是独立的多-fact contract。
- TypeScript 不能替代 runtime access control。把 dependency literals、Check identity 和 getter return 组成跨 Check generic 会扩大 authoring 与 declaration 复杂度，但 runtime 仍必须按 effective direct IDs 授权。
- Parser 附着在 producer Check value 上是 consumer capability，不是 producer execution 步骤。Producer 与 consumer 同版本且 provider 保证 shape 时，parser 可以只作为 type anchor；这不验证 historical、cross-version、JavaScript/cast 或 untrusted data。

## 决策

- 采用: `dependsOn`继续使用exact/inherit string collection；downstream通过`dependencies.get(checkId: string)`读取dependency data，getter不接收Check object、parser或caller generic。
- 采用: Runtime只授权current Check的normalized effective direct dependency IDs。Undeclared、transitive或malformed ID fail closed，并且不返回upstream facts。
- 采用: `passed` / `failed` read返回原status与同一个Core canonical final data；`not-applicable` / `unavailable`返回closed no-data failure。四种outcome都完成normal dependency settlement，ordinary`unavailable`不再伪造成generic Task failure。
- 采用: Typed executable provider可以声明synchronous `parseData(CanonicalJsonObject): Data`。Parser return锚定provider-local `Data`，同一个`Data`约束该provider的`passed` / `failed` execution result；consumer在getter成功后显式调用parser。
- 采用: Product不调用parser、不拥有parser error vocabulary，也不提供unchecked identity-cast helper。Public JSDoc保留type-anchor启发及其失效边界，provider拥有validation、versioning、round-trip tests和error policy。
- 采用: Dependency view从existing settled Core Check派生，只在callback invocation内存在；不复制或持久化data，不读取Records，不增加Core entity或machine field。
- 采用: 首版不提供supplemental Record getter、query、parser registry、transitive/live read或multi-Check aggregation。出现final data无法承接的named consumer时再建立独立方向。
- 不采用: Callback closure传值、global mutable output store、compile-time dependency-ID authorization、Check-object getter或让presentation hiding改变structured facts。
