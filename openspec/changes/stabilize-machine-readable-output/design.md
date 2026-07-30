## Context

当前 Product CLI 把 `QualityMetrics` 直接写入 `metrics.json`，把
`warnings.changed` / `warnings.all` 分别写入 `warnings.ndjson` /
`warnings-all.ndjson`。这些 files 已被产品帮助文本描述为 machine-readable artifacts，
但没有 current-product schemas、稳定 transport identity 或统一 acceptance boundary。

当前 output validation 只检查 in-memory core model，并发生在 machine files 写出后。
`quality:annotate` 是唯一实际解析 warning artifact 的 repository consumer；它只检查渲染
所需字段并跳过 malformed records。Workspace verifier 只调度 child checks，dogfood
wrappers 只把参数传给 Product CLI。

前置 changes `make-scan-completeness-observable` 与 `add-ci-quality-gates` 已归档，
completeness、warning channels、`GateResult` 与 process outcome 已进入 main specs。本
change 固定这些数据的 machine projection，不重新设计业务语义。

## Dependencies and Change Boundaries

| Relationship | Rule |
| --- | --- |
| Completed prerequisites | Scan completeness、warning channels、GateResult 与 process outcome 已由归档 changes 和主规范拥有。 |
| External config workflow | Config source/path 可以属于 CLI/config runtime context 和 console；除非该 change 显式修改 output contract，否则不得自动进入 machine v1。 |
| Lizard TypeScript port | Backend、tool metadata values 与 cache identity 可以在 scanner owner 内演进；Machine DTO field set、warning projection 和 artifact predicate 必须保持。 |
| Future machine change | 公开 field、requiredness、type、enum、unit、order 或 meaning 改变时，必须执行新的 repository-wide version cut。 |

这些关系只约束公开 transport，不阻止 core、CLI 或 scanner 在各自 owner 内增加 private
state。实现代理不得从另一个 active change 的 proposal 推断本 change 已经拥有尚未实现的
字段。

## Design Priorities

1. **产品结果优先**：一个已完成 invocation 产生的 machine artifacts 必须能被产品和实际
   automation 一致判断为可信；损坏 input 不产生成功或部分结果。
2. **开发维护优先**：machine contract 与 core models 分离，字段定义只保留一个 runtime
   owner；测试集中证明产品可观察行为和手写 invariants，不复制 schema validator 的全部
   keyword matrix。
3. **单一 current structure**：producer、schemas、examples、validators 与 direct consumer
   同时使用一个 current contract。真正改变公开 projection 时整体硬切；core-only 变化
   不触发 machine change。

## Goals / Non-Goals

**Goals:**

- 为 `metrics.json` 和 warning NDJSON 建立 output-owned v1 DTO、schemas 与 validators。
- 固定 identity、byte framing、cross-artifact invariants、failure mapping 和 direct
  consumer behavior。
- 让 checked-in schemas/examples 可以独立验证，并与 product runtime source 防漂移。
- 保持新增 core 小功能、内部字段或重构不自动扩大 machine contract。

**Non-Goals:**

- Console、Markdown report 与 raw scanner artifacts 不成为 v1 machine transport。
- 不增加 result envelope、manifest、JSON stdout、并行 contract、SDK 或 plugin API。
- 不为当前不存在的跨进程 artifact discovery 或 concurrent writer workflow 增加发布协议。
- 不为 JSON parser/library 已负责的每个通用语法分支建立产品自定义语义。

## Contract Surface

| Surface | Current contract | Owner |
| --- | --- | --- |
| `metrics.json` | `MachineMetricsV1` artifact-set root | Product Output |
| `warnings.ndjson` | ordered `metrics.warnings.changed` stream | Product Output |
| `warnings-all.ndjson` | ordered `metrics.warnings.all` stream | Product Output |
| `quality:annotate` input | one current warning stream | Product warning-stream validator |
| Published schemas/examples | external validation material | Product source + docs validation |
| Console / `report.md` / `raw/**` | existing human/private boundaries | Existing Output/Scanner owners |

## Decisions

### Decision 1: Machine DTO 隔离 core 与 human output

Output 定义 `MachineMetricsV1` 与 `MachineWarningV1`，从 final
`QualityMetrics` / `WarningRecord` 一次性投影。V1 projection 保留 change 生效前
`metrics.json` 已序列化的 field set、nesting 与业务含义，只固定以下 transport
identity：

- `MachineMetricsV1.metadata.schemaVersion = "vibe-check.metrics.v1"`；
- 每个 `MachineWarningV1.schemaVersion = "vibe-check.warning.v1"`。

Metrics 中 `warnings.all`、`warnings.changed`、`warnings.regressions` 与 evaluated gate
的 `blockingWarnings` 都使用同一 `MachineWarningV1` mapping。Core
`WarningRecord` 不携带 transport identity；machine mapper 拥有 metrics identity，因此
core model 与 Markdown report 不需要采用 machine version token。

Producer 每次只构造一个 `MachineMetricsV1`。`warnings.ndjson` 与
`warnings-all.ndjson` candidates 分别从该 DTO 的 `warnings.changed` /
`warnings.all` 序列化，不再从 core warnings 建立另一条 projection path。

新增 core field、内部重构或 human-only option 不自动进入 DTO。只有明确需要提供给 machine
consumer 的数据才修改 DTO 和 contract。

`MachineMetricsV1` 只固定 task 1.1 baseline 中已经存在的 metadata fields。未来
`add-external-project-config-workflow` 提出的 config source/path 不预先进入 v1；如果它们
后来需要成为 machine-visible contract，必须由显式 output change 决定 projection 与
version，而不是通过 core object spread 泄漏。

### Decision 2: Runtime schema 是唯一字段定义 owner

Product runtime 内的 JSON-serializable schema definitions 是 field set、requiredness、
type、closed enum、nullability、numeric constraints 与 dynamic-map value shape 的 source
of truth。`MachineMetricsV1` / `MachineWarningV1` TypeScript types 必须从该 source 派生，
或通过 compile-time structural check 与其保持一致；不维护第二份手写 field inventory。

Published schemas 位于：

| Artifact | Instance identity | Schema `$id` | Canonical path |
| --- | --- | --- | --- |
| metrics | `vibe-check.metrics.v1` | `urn:vibe-check:schema:metrics:v1` | `docs/schemas/vibe-check-metrics.schema.json` |
| warning | `vibe-check.warning.v1` | `urn:vibe-check:schema:warning:v1` | `docs/schemas/vibe-check-warning.schema.json` |

Schemas 使用 JSON Schema 2020-12。Metrics schema 通过 warning schema 的 immutable URN
引用同一 warning definition；runtime 与 docs registries 都显式注册两份 schemas。Fixed
objects closed；真正 dynamic maps 使用 typed `additionalProperties`。

Published files 是 runtime definitions 的 deterministic projection。Drift validation 比较
generated projection 与 checked-in files；product runtime 不读取 `docs/**` 或
`scripts/**`。

### Decision 3: 正向 grammar 与公开 set invariants 定义 conformance

Machine bytes 使用 UTF-8 without BOM：

- `metrics.json` 包含一个 JSON object；
- warning stream 是 zero-byte input，或一个以上由 LF 结束的 JSON object records；
- 每个 non-empty record segment 解析为一个 object，并通过 current warning schema；
- Product serializer 为每个 warning 使用 compact JSON 并追加 LF；
- JSON object key order 与 insignificant JSON whitespace 不改变 parsed conformance。

Artifact-set validator 在 schema validation 之外证明以下公开 invariants：

1. Parsed `warnings.ndjson` 与 `metrics.warnings.changed` 在 length、order 与 values 上
   deep-equal。
2. Parsed `warnings-all.ndjson` 与 `metrics.warnings.all` deep-equal。
3. `scanCompleteness.overall` 与 serialized capability results 一致。
4. Evaluated gate 的 policy/channel、evaluated count、blocking list/count、list order 与
   passed/failed status 一致；`blockingWarnings` 等于 selected channel 中没有
   `acceptedReason` 的 records，并保持原顺序。

Core validator 在 projection 前继续证明其拥有的其它业务 semantics。Machine set validator
不复制 scanner、warning generation、gate evaluation 或其它 core business logic。

### Decision 4: 一个 contract 提供两个实际边界入口

Product 暴露两个 validator entrypoints：

| Entrypoint | Input | Proof |
| --- | --- | --- |
| artifact-set validator | metrics bytes + changed/all warning bytes | 完整 schema、framing 与 set invariants |
| warning-stream validator | one warning byte stream | warning framing、每个 record schema 与 all-or-nothing parse |

两个入口复用同一 warning identity、schema definition、byte decoder、record parser 和
diagnostic mapping。它们只接受 current v1 structure，但不会让 record-only consumer 承担
adjacent metrics/set validation。

Contract failure 返回 actionable diagnostic：包含 logical artifact，以及适用的 JSON
Pointer 或 record line/index。具体 parser wording 不成为稳定 product contract。

Docs validator 独立编译 checked-in schemas，并重新检查 examples 的 framing 与公开 set
invariants；它不成为 product runtime dependency。

### Decision 5: Producer 验证 candidate 后发布

Producer 使用固定顺序：

1. 验证 final core model。
2. 投影一个 machine DTO，并从该 DTO 生成三个 candidate byte sequences。
3. 对 candidate 调用 artifact-set validator。
4. 清理同一路径的 prior canonical machine files 并写入全部 validated candidates。
5. Publication 成功后才打印可信 artifact paths 并返回 `success` / `gate-failed`。

Validation、cleanup 或 write failure 都使用现有 runtime/output failure，Product CLI exit
`2`；已计算 GateResult 不覆盖 output failure。Files 的存在本身不证明 current run
成功，调用者结合 producing invocation outcome 判断可信度。

一个 Product CLI invocation 在运行期间拥有其 artifact directory；需要并行 scan 的调用者
使用不同 artifact directories。本 change 不增加 manifest 或 multi-file transaction。
Console、report 与 raw artifact 的既有生成边界不因 machine version 改变，相关 write
failure 继续保持 output failure priority。

### Decision 6: Annotation contract failure 是 infrastructure failure

`quality:annotate` 以 bytes 读取一个 warning stream，并调用 product-owned
warning-stream validator。Validator 对完整 input 返回 success 后，annotation 才映射 schema
声明的 render fields：

- conforming non-empty input：render filtered non-blocking annotations，exit `0`；
- conforming zero-byte input：render zero annotations，exit `0`；
- 参数、读取、decoding、framing 或 schema failure：render zero annotations，报告
  actionable diagnostic，exit `2`。

Quality warning 的内容仍不阻断 Product gate；exit `2` 表达 annotation infrastructure
不可用，而不是 metric threshold failure。需要让 annotation step best-effort 的 CI 调用方
在 orchestration 层选择 non-blocking step behavior。

Workspace verifier 只调度 producer-to-annotation acceptance 并按 child exit 分类。
Dogfood wrappers 与 package `quality:*` 继续传递 Product CLI args/outcome，不解析
machine artifacts。

### Decision 7: Examples 与 tests 证明产品行为，不复制 validator implementation

Current examples 位于：

```text
docs/examples/artifacts/<outcome>/
  metrics.json
  warnings.ndjson
  warnings-all.ndjson
```

固定 outcomes 为 `complete-passed`、`complete-warning`、`legitimate-empty`、
`gate-failed` 与 `scan-incomplete`。每组 files 从 fixed core fixture values 经过 production
DTO/serializer 生成；timestamp、repository/path、commit 与 tool version 在 serialization
前注入固定值，重复 generation byte-stable。

Required proofs 包括：

- canonical sets 通过 runtime 与 independent docs validation；
- identity、representative required/type/enum/closed-shape、byte framing 与
  changed/all mismatch 会使 owning validator 返回 failure；
- 每个手写 set invariant 有直接 success/failure test；
- published schema drift 必须失败；
- formal producer output 可以被实际 annotation CLI 消费，invalid input exit `2` 且没有
  partial annotations。

Tests 不为 schema 中每个 field/keyword 重复相同 mutation；AJV compilation、representative
schema mutations、DTO/schema structural check 与 canonical examples 共同证明通用 field
constraints。Projection baseline 只用于建立 regression tests，不进入 canonical example
tree。

Retired `vibe-check.report.v1` schema/examples 保持历史 path 和 ownership label，不进入
current metrics/warning validation registry。

### Decision 8: Observable contract change 执行仓库级硬切换

任何 repository revision 只定义一个 current machine structure。未来若必须改变公开 field
set、requiredness、type、nullability、enum、unit、semantic order 或 meaning，独立 change
同时替换 DTO projection、instance identities、schema `$id`、canonical schemas/examples、
validators、direct consumers、tests 与 owner docs。

Canonical filenames 可以保持不变，但完成后的 repository 不保留另一个 accepted
structure。Core-only 或 human-only change 只要 serialized projection 不变，就不触发
machine contract 切换。

## Risks / Trade-offs

- [首个 stable identity 改变 change 生效前的 bytes] → 所有 repository-owned producer、
  schemas、examples 与 direct consumer 在同一 change 切换。
- [Closed DTO 使公开 field 变更需要显式 hard cut] → Core/DTO 分离让普通内部功能和重构
  不触发该成本。
- [Runtime validation 增加少量 final-output work] → 只验证三个 candidate files，不重复
  scanner work；真实 quick/full runs 用于确认没有明显产品回归。
- [Runtime definitions 与 published projection 可能漂移] → deterministic generation 与
  required drift check 阻断。

## Hard-cut Plan

1. 保存 producer、consumer 与 observable output baseline，仅用于 projection tests。
2. 建立 runtime schema source、machine DTO mapping 与 focused contract tests。
3. 接入 byte validators、cross-artifact invariants 与 pre-publication validation。
4. 生成 canonical schemas/examples，并接入 independent docs validation。
5. 将 annotation consumer 硬切到 current warning-stream validator，接入 required
   producer-to-consumer acceptance。
6. 同步 owner docs/case ledger 并重放 formal entry、dogfood 与 workspace validation。

回滚以 repository revision 为单位，同时恢复 producer、schemas/examples、annotation、
tests/docs 与 required check，使每个 revision 内仍只有一个 current contract。
