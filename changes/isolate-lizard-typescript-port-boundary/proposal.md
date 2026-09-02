# Proposal

本 Plan 将既有 Lizard TypeScript 转译目录收口为 Check-private 的 source-aligned port；它记录待实施的边界调整，不表示这些边界已经存在。

## Why

当前 `src/package-checks/function-metrics/analyzer/**` 已是不反向导入 Product 的 Lizard 1.23 source-aligned 转译根，但 Product 有两条深导入路径：`analyzer-worker.ts` 直接使用 core/reader registry，`target-files.ts` 直接读取 registry。`reader-registry.ts` 还保留仅供 Product 使用的 alias。持续运行的 identity/oracle 测试也读取 archived Change 的 evidence。多个入口使 port、Product mapping 和持续证据的 owner 难以独立审阅与上游同步。

## Outcome

完成后，`analyzer/**` 仍是 source-aligned port root，并只以一个 **port façade** 向目录外暴露 Lizard-domain 的 suffix capability 与 in-memory analysis。位于 port 外的 `analyzer-adapter.ts` 是其唯一生产消费者，即 **Product adapter**：它解释 Product support/error 并映射 `FunctionMetric`。Check、measurement、Worker、adapter 与 port 形成唯一单向调用链；current evidence 与 translated-only quality profile 均有稳定、可验证的 owner。该 Change 不新增 public API、parser framework 或 Lizard 版本采用。

## Scope

### Intended Change

- 在既有 `analyzer/**` 内建立唯一 port façade；保留 source-aligned internals 的目录和结构，除非同步证据要求，不为“更清晰”重命名或重组翻译代码。
- 在 `analyzer/**` 外建立唯一 Product adapter。`target-files.ts`、Worker 和其他 Product production code 只调用它，不深导 port internals；adapter 独占 Product support/error 解释及 Lizard-domain result → `FunctionMetric` 映射。
- 保持 Product 责任在 port 外：Check/measurement 负责 exact-path admission、读取/解码、资源限制、取消、Worker 生命周期与最终 settlement；Worker 只处理 transport 和 adapter 调用；port 只分析已提供的 source。
- 将持续消费的 identity、oracle、deviation/provenance evidence 移至 current owner，并使其与 `licenses/**` 的 legal inventory 保持单一、可追溯的 owner relation；不改写 archived Change。
- 建立仅覆盖 translated production files 的质量 profile。它的实际 owner 是 `scripts/development/lint.ts`、`format.ts`/`format-targets.ts` 与 `scripts/project/gate/definition.ts`：后者的 `duplicateDetection`、`fileMetrics`、`functionMetrics` 当前均以 `src/**/*.ts` 作为 product-source selection。profile 必须同时定义这些 selection 的一致例外；手写 port façade、Product adapter、Worker、Check 和所有 tests 继续接受各自适用的普通项目检查。具体 glob 仅在 Readiness 0.5 基线后确定。
- 将实现后的当前规则写回稳定 owner 文档，并以既有 active+unaligned Decision 作为长期方向；Change artifacts 不成为稳定规则 owner。

### Resulting Impacts

- functionMetrics imports、Worker contract、target-file admission 和测试需要调整，并以静态边界检查证明唯一调用链与 test 深导入政策。
- evidence 迁移会影响测试、package staging 与 legal/provenance closure；archive 不再作为 current test input。
- development lint/format targets、Project Gate 的三个 repository-quality Check selection 及各自配置测试需要共同表达 translated-only profile，而不以整目录免检掩盖非翻译代码。
- scanner-dependencies、functionMetrics guide、script-tooling 和 Test Evidence Case 需要同步当前 owner、private status 与验证方式；package export/public declaration 不得扩大。

## Success Criteria

- 生产调用方向可从代码和静态检查恢复：`Check/execution → measurement → Worker → Product adapter → port façade → port internals`。port 不导入 Product；port façade 是唯一目录外 production entry；Product adapter 是唯一 façade production consumer。
- `FunctionMetric` mapping、Product support/error、filesystem、资源、取消、Worker 和 settlement 不进入 port；exact-input、case-insensitive suffix、failure、resource、cancellation 与 no-partial semantics 维持现有契约。
- 测试按路径执行 fail-closed 政策：port-root fidelity/unit tests 可深导同目录 internals；port 外的 Product tests 只能经 Product adapter；仅验证 façade boundary 的测试归属 port root。任何 Product production/test 文件不得深导 core、registry、readers 或 extensions。
- current tests 不读取 `changes/archive/**`；identity/deviation evidence 覆盖 translated core、extensions、readers 与 shared ranges，且与 legal/provenance materials 的关系可验证。
- translated-only profile 的实际 selection 同时覆盖 development product lint、development format 与 Project Gate `duplicateDetection`、`fileMetrics`、`functionMetrics` 的 `src/**/*.ts` product-source selection。每项例外有经 Readiness 0.5 确认的 glob、rule/action、source-alignment 理由和 upstream-sync review trigger；TypeScript、运行时、boundary、identity/oracle、provenance/license 检查仍在。不存在 `analyzer/**` blanket disable，手写 façade、非翻译 Product 和所有 tests 仍受各适用检查覆盖。
- package root export、public declarations、subpath exports 和 Worker 的非公开 artifact contract 不变；不引入 parser/plugin/backend framework。相关 stable docs、Decision、Case 和 required/full Gate 证据一致。
- 所有 Implementation task 的开始条件是 Readiness 0.2–0.5 均已实际完成并写回 Plan。

## Affected Owners

- `docs/decisions/isolate-lizard-port-behind-check-private-interface.md`：跨 Change 的 private boundary、quality profile 与 upstream-sync 方向。
- `docs/scanner-dependencies.md`、`docs/checks/function-metrics.md`、`docs/script-tooling.md`：实现后的 Check-private usage、工具与 package status。
- `src/package-checks/function-metrics/**` 及相邻测试：port façade、Product adapter、Worker/measurement、test policy 与 current evidence 的实现事实。
- `scripts/development/**`、`scripts/project/gate/definition.ts` 及其 configuration tests、`scripts/validation/**`、`docs/testing/cases/**`：development/Gate quality selection、layout dependency 与 semantic Case 证据。
- package artifact/legal owners：translated source header、provenance inventory、license materials 与 package staging closure。

## Terms

| Term | Meaning and boundary |
| --- | --- |
| **source-aligned port** | `analyzer/**` 内尽量一比一保留 Lizard source structure/semantics 的 Check-private implementation；不是 Product API。 |
| **port façade** | port root 内唯一可供目录外生产代码调用的私有 Lizard-domain interface；不接受 Product context，不返回 Product DTO。 |
| **Product adapter** | port 外的 `analyzer-adapter.ts`；port façade 的唯一 production consumer，负责 Product mapping、support 与 error interpretation。 |
| **translated production file** | 经 source identity/provenance 认定为翻译的 port production source；只有它可进入 profile。 |
| **current evidence** | 运行时测试和未来上游采用持续消费的 identity/oracle/deviation mapping；必须有当前稳定 owner，不能由 archive 独占。 |
