# Proposal

本 Change 保留 built-in descriptor 的正式声明式 `.replace()` / `.append()` API，并删除只为 object-spread method recovery 与任意对象重建存在的反射、全局 registry 和 dynamic-`this` 协议。

## Why

项目作者需要的是：从 Product-owned built-in 默认值出发，以类型安全、不可变、字段感知的方式修改 options 和 leaf-local scheduling fields。当前实现额外支持 `{ ...descriptor }.replace(...)`，因此 methods 必须可枚举，并通过 `descriptorInputs`、WeakMap、property descriptor scan、Reflect 和 metadata recovery 从 copied object 反推原 descriptor state。

spread copy recovery 没有增加新的声明式配置能力，却扩大了输入信任边界、实现复杂度和测试矩阵。用户已经明确：`.replace/.append` 必须保留；spread copy 不需要继续拥有 adjustment methods。

## Outcome

- Product-issued frozen descriptor 可直接作为 Check leaf，并具有 non-enumerable、closure-bound 的 `.replace()` 与 `.append()`。
- 每次 adjustment 返回新的 Product-issued frozen descriptor，保持 built-in identity、private binding、immutability、chainability 与现有 field-aware semantics。
- `{ ...descriptor }` 是普通 JavaScript data copy，没有 adjustment methods，也不是有效的 Product-issued built-in descriptor。若它以 `kind: "built-in"` 进入 Check tree/`defineConfig`，validation 必须 fail closed。
- 合法 custom Check node 继续按自己的 closed contract 验证，不因 built-in issuance boundary 被误拒绝。

## Scope

- 简化 `src/product/definition/adjustments.ts` 的 descriptor issuance、method binding、materialization 和 validation path。
- 保持 descriptor-specific typed patches、fixed/scalar replacement、omitted branch preservation、open-map whole-field replacement，以及 `dependsOn`/`mutex` append+stable-dedupe。
- 删除 spread-copy chaining tests 和只服务该行为的 `descriptorInputs`、dynamic receiver、Reflect/property-descriptor recovery。
- 保留并调整 forged/accessor/invalid patch tests，使它们证明新的 issuance 与 closed-validation boundary。
- 同步 Configuration、current public-contract、examples 和 test Case evidence；只读核对下游 package acceptance，不修改 package Change。

### Out of Scope

- 不新增 generic deep merge、builder、registry 或 package-level helper API。
- 不改变 built-in identity/defaults、Check tree inheritance、Task/Core architecture、public callable export inventory 或 package consumer model。
- 不支持 borrowed methods、serialization/rehydration、Proxy/class descriptors 或 copied-object recovery。

## Success Criteria

- Product-issued descriptor 上的 `.replace()`/`.append()` 保持类型安全、immutable、chainable、field-aware 和 deterministic。
- Adjustment methods 不可枚举，不进入 normalized declarative data、fingerprint、Core、output 或 private binding projection。
- non-issued built-in-like object 在 Check tree/`defineConfig` fail closed；合法 custom node 仍由自己的 validator 接受或拒绝。
- 实现中不存在 global `descriptorInputs`、dynamic-`this` source recovery 或 Reflect/property-descriptor reconstruction path。
- public-contract tests、Case evidence、typecheck、lint 与 workspace verification 证明 supported authoring API 未退化。

## Affected Owners

- `src/product/definition/adjustments.ts`、`adjustment-patches.ts`：descriptor issuance 与 patch semantics。
- `src/product/definition/built-ins.ts`、`project.ts`、Check tree normalization：creation/materialization/closed-validation boundary。
- `src/product/definition/project.test.ts`、相邻 descriptor tests、`docs/testing/cases/**`：semantic evidence。
- `docs/configuration.md`、`src/product/public-contract/current.ts`：正式 authoring contract。
- `docs/decisions/configuration/use-field-aware-built-in-check-adjustments.md`：已对齐的长期 API direction。
- `changes/establish-api-only-npm-product-boundary/**`：只读 downstream handoff；后续 candidate acceptance 只验证 supported chains，不依赖 spread-copy behavior。
