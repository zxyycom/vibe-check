# Design

本 Design 是 `simplify-built-in-descriptor-adjustments` 的 supported behavior owner。它定义哪些对象可调整、哪些输入可 materialize，以及哪些实现细节不得重新形成 copy-recovery protocol。

## Context

- `proposal.md` 定义目标与范围；本文件定义 supported behavior；`tasks.md` 定义 readiness、实现和验证顺序。
- 本 Change 没有产品决策阻塞。用户已经明确 spread-copy chaining 不属于目标 API，且当前 package 尚未发布稳定版本，因此本次迁移采用 hard cut，不保留 compatibility shim。
- Readiness 仍须盘点 current public-contract、declarations、examples 和 package acceptance 中的 spread-copy references；找到的引用是必须同步删除或改写的 migration targets，不是重新打开兼容性决策的理由。

### Terminology

| Term | Meaning |
| --- | --- |
| Product-issued descriptor | 由 Product descriptor factory 创建并带有 private issuance identity 的 frozen built-in authoring value；只有这类值可 materialize 为 built-in Check。 |
| Declarative descriptor data | descriptor 中可枚举、可验证、可 fingerprint 的 public fields；不包含 methods、private binding 或 issuance identity。 |
| Adjustment method | Product-issued descriptor 自有的 non-enumerable `.replace` 或 `.append` closure；调用后返回新的 Product-issued descriptor。 |
| Built-in-like copy | spread、serialization、forging 或手写产生的 non-issued object，即使其 `kind`、metadata 和 options 与 issued descriptor 相同，也不获得 built-in identity。 |
| Custom Check node | 由 custom Check contract 定义的合法 node；它不通过 built-in issuance path，并继续由自己的 closed validator 负责。 |

## Goals / Non-Goals

### Goals

- 只保留项目作者实际需要的 typed、immutable、field-aware `.replace/.append` chains。
- 让 descriptor issuance、materialization 和 validation ownership 可局部审计。
- 让 copied/forged built-in-like objects 在明确 boundary fail closed。

### Non-Goals

- 不支持 borrowed methods、spread-copy chaining、serialization/rehydration、Proxy/class descriptor 或 generic deep merge。
- 不改变 built-in identity/defaults、Check tree inheritance、Task/Core architecture 或 package consumer model。

## Decisions

### Supported Behavior Matrix

| Input or operation | Required result |
| --- | --- |
| Product-issued descriptor directly placed in Check tree | Accepted and materialized from its private canonical data. |
| `issued.replace(validPatch)` | Returns a new frozen Product-issued descriptor with existing descriptor-specific replacement semantics. |
| `issued.append(validPatch)` | Returns a new frozen Product-issued descriptor with stable-deduped local collections. |
| Chained adjustments | Every step returns a new issued descriptor; the original and prior values remain unchanged. |
| `{ ...issued }` | Produces ordinary enumerable data without `.replace`/`.append`; it is not a valid built-in descriptor. |
| Non-issued object claiming `kind: "built-in"` | Rejected at Check tree/`defineConfig` without metadata recovery, getter execution or raw built-in reinterpretation. |
| Legal custom Check node | Evaluated only by the custom-node closed contract. |
| Borrowed method, invalid patch, Proxy/class/accessor input | Unsupported or rejected by the owning closed boundary; no recovery path is attempted. |

### Confirmed Implementation Contract

#### Issuance and materialization

`createBuiltInDescriptor(input, state)` creates frozen declarative data and attaches non-enumerable `.replace`/`.append` methods. Each closure captures the canonical constructor input and current state, parses only its descriptor-specific closed patch shape, applies the existing field-aware rule and issues a new descriptor. No method reads dynamic `this`.

Materialization accepts only the exact Product-issued object and returns its closed canonical data. A private WeakMap or equivalent marker may be used solely to prove issuance and retrieve canonical data. It must not index descriptors by `checkId`, infer source from copied metadata, inspect property descriptors, enumerate methods, execute getters or reconstruct a descriptor from arbitrary object state. The global `descriptorInputs` registry is removed.

#### Retained field-aware semantics

- `.replace()` changes only fields owned by that descriptor. Provided scalar/fixed nested leaves replace current values; omitted branches remain unchanged; an open option map is replaced as a whole field.
- `.replace()` may replace leaf-local `maxParallel`, `dependsOn` and `mutex` using their existing validation rules.
- `.append()` accepts only owner-declared appendable collections, currently leaf-local `dependsOn` and `mutex`, and appends in input order with stable dedupe.
- Both methods preserve built-in `checkId`, Record type metadata, private execution binding and frozen non-callable value semantics.
- Check tree group inheritance runs after descriptor adjustment and is not changed by this Change.

#### Package and compatibility boundary

Supported `.replace/.append` chains remain source-compatible. Spread-copy chaining is intentionally outside the supported contract and receives no deprecation shim because such a shim would recreate the mechanism being removed.

The repository root remains a private workspace and the npm package has not been published, so current spread references are migration evidence rather than a stable compatibility promise. `use-field-aware-built-in-check-adjustments` already requires immutable field-aware methods and does not require copied-object recovery. This local hard cut does not require a new decision record；若未来正式版本建立 compatibility policy，应由独立产品决策承接。

### Implementation-Local Choices

The implementation may choose WeakMap, WeakSet plus closure state, or another private issuance marker. This is not a product decision as long as identity is object-specific, methods remain non-enumerable, arbitrary copies cannot materialize, and no private state enters declarative output.

## Risks / Trade-offs

- A consumer of undocumented spread chaining will observe method absence. Docs and tests must state the supported path before package candidate publication.
- Simplifying the carrier must not change deep replacement, whole-map replacement, scheduling append or stable-dedupe semantics; targeted semantic tests are required.
- Closed validation must reject built-in-like accessor/forged inputs without reading accessors, while still routing legal custom nodes to their own validator.
- Closure allocation adds two functions per issued descriptor. Descriptor count is configuration-sized; this local cost is accepted in exchange for a smaller trust and recovery boundary.

## Open Questions

当前没有产品契约未决项。完成 Readiness 0.3–0.5 后即可进入 Implementation；盘点发现的 spread-copy references 全部按 migration inventory 处理。
