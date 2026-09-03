# Proposal

本 Plan 记录既有 Lizard TypeScript 转译目录已收口为 Check-private source-aligned port 的实施范围与剩余验证；稳定规则由相应 docs owner 承接，本 Plan 不替代它们。

## Why

实施前存在 Product 对 analyzer internals 的深导入、仅供 Product 的 registry alias，以及 current tests 对 archived Change evidence 的读取。现已收口为 façade/adapter 单链并迁移 current evidence；本 Plan 保留该 Change 的范围、设计与验证记录，而非稳定 owner。

## Outcome

完成后，`analyzer/**` 仍是 source-aligned port root，并只以 `analyzer/port-facade.ts` 向目录外暴露 Lizard-domain 的 suffix capability 与 in-memory analysis。位于 port 外的 `analyzer-adapter.ts` 是其唯一生产消费者，即 **Product adapter**：它解释 Product support/error 并映射 `FunctionMetric`。唯一调用链、current evidence 的 42 source/range、37 target、81 class、792 mapping 闭合，以及双层质量规则均有可验证 owner。该 Change 不新增 public API、parser framework 或 Lizard 版本采用。

## Scope

### Intended Change

- 在既有 `analyzer/**` 内新增唯一手写 façade `src/package-checks/function-metrics/analyzer/port-facade.ts`；保留 source-aligned internals 的目录和结构，除非同步证据要求，不为“更清晰”重命名或重组翻译代码。
- 在 `analyzer/**` 外建立唯一 Product adapter `src/package-checks/function-metrics/analyzer-adapter.ts`。`target-files.ts`、Worker 和其他 Product production code 只调用它，不深导 port internals；adapter 独占 Product support/error 解释及 Lizard-domain result → `FunctionMetric` 映射。
- 保持 Product 责任在 port 外：Check/measurement 负责 exact-path admission、读取/解码、资源限制、取消、Worker 生命周期与最终 settlement；Worker 只处理 transport 和 adapter 调用；port 只分析已提供的 source。
- 将连续的 oracle、reader observations、reader-extension mapping、identity manifest 与 deviation ledger 迁至 `src/package-checks/function-metrics/analyzer/fixtures/lizard-1.23.0/evidence/`。`licenses/lizard-1.23.0-provenance.json` 是唯一 machine-readable source/range/SPDX/target mapping；evidence 只引用/验证它，不复制竞争 ledger，archive 保持只读历史。
- identity manifest 只以 source/range 引用 root provenance inventory；其静态测试 fail-closed 地闭合 42 个 translated source/range、37 个 translated target（36 个 primary `targetPath` 加 `extensions/protocol.ts` 的 `additionalTargetPaths`）、81 个 class identity 与 792 个 symbol/host-seam mapping，并拒绝 archive current input。
- 形成双层质量规则：development lint、format、typecheck 保持完整普通输入和零 translated-only 例外；Gate `duplicateDetection`、`fileMetrics`、`functionMetrics` 仅使用 `definition.ts` 中精确硬编码的 14 个 provenance-qualified translated path、20 个 rule-path instance。配置测试读取 root provenance 并检查每项 source header，从而对遗漏、非 translated path 或 header 漂移 fail closed；它不是 runtime 从 ledger 导出的 selection。每项 Gate 例外记录精确 path、rule/action、source-alignment 理由和 upstream-sync review trigger；`extensions/protocol.ts` 仍被普通 selection 覆盖，因为无证据支持例外。
- 将实现后的当前规则写回稳定 owner 文档，并以既有 active+aligned Decision 作为长期方向；Change artifacts 不成为稳定规则 owner。

### Resulting Impacts

- functionMetrics imports、Worker contract、target-file admission 和测试需要调整，并以静态边界检查证明唯一调用链与 test 深导入政策。
- evidence 迁移会影响三个测试消费者、fixtures、package staging 与 legal/provenance closure；archive 不再作为 current test input，`licenses/**` 继续单独拥有 shipped legal inventory。
- Gate 三个 repository-quality Check 的 selection 及其配置测试需要实现 14-path/20-instance 的最小闭合集；development lint/format 不获新例外，也不得以整目录免检掩盖非翻译代码。
- scanner-dependencies、functionMetrics guide、script-tooling 和 Test Evidence Case 需要同步当前 owner、private status 与验证方式；package export/public declaration 不得扩大。

## Success Criteria

- 生产调用方向可从代码和静态检查恢复：`Check/execution → measurement → Worker → Product adapter → analyzer/port-facade.ts → port internals`。port 不导入 Product；façade 是唯一目录外 production entry；Product adapter 是唯一 façade production consumer。
- `FunctionMetric` mapping、Product support/error、filesystem、资源、取消、Worker 和 settlement 不进入 port；exact-input、case-insensitive suffix、failure、resource、cancellation 与 no-partial semantics 维持现有契约。
- 测试按路径执行 fail-closed 政策：port-root fidelity/unit tests 可深导同目录 internals；port 外的 Product tests 只能经 Product adapter；仅验证 façade boundary 的测试归属 port root。任何 Product production/test 文件不得深导 core、registry、readers、extensions 或 façade。
- current tests 不读取 `changes/archive/**`；`fixtures/lizard-1.23.0/evidence/` 是 continuous test/fidelity owner，identity/deviation evidence 直接闭合 37 translated targets，并可验证地只引用 root provenance mapping。
- development lint、format、typecheck 均保持零 translated-only 例外；Gate `duplicateDetection`、`fileMetrics`、`functionMetrics` 的硬编码例外恰为 14 distinct provenance-qualified paths/20 rule-path instances，并由 root provenance/header configuration test fail-closed 验证。每项例外有精确 path、rule/action、source-alignment 理由和 upstream-sync review trigger；TypeScript、运行时、boundary、identity/oracle、provenance/license 检查仍在。不存在 `analyzer/**` blanket disable，手写 façade、adapter、Worker、Check、非翻译 Product 和所有 tests 仍受各适用检查覆盖。
- package root export、public declarations、subpath exports 和 Worker 的非公开 artifact contract 不变；不引入 parser/plugin/backend framework。相关 stable docs、Decision、Case 和 required/full Gate 证据一致。
- 所有 Implementation task 的开始条件是 Readiness 0.2–0.5 均已实际完成并写回 Plan。

## Affected Owners

- `docs/decisions/isolate-lizard-port-behind-check-private-interface.md`：跨 Change 的 private boundary、quality profile 与 upstream-sync 方向。
- `docs/scanner-dependencies.md`、`docs/checks/function-metrics.md`、`docs/script-tooling.md`：实现后的 Check-private usage、工具与 package status。
- `src/package-checks/function-metrics/**` 及相邻测试：port façade、Product adapter、Worker/measurement、test policy 与 current evidence 的实现事实。
- `scripts/development/**`、`scripts/project/gate/definition.ts` 及其 configuration tests、`scripts/validation/**`、`docs/testing/cases/**`：development/Gate quality selection、layout dependency 与 semantic Case 证据。
- package artifact/legal owners：translated source header、唯一 provenance inventory、license materials 与 package staging closure。

## Terms

| Term | Meaning and boundary |
| --- | --- |
| **source-aligned port** | `analyzer/**` 内尽量一比一保留 Lizard source structure/semantics 的 Check-private implementation；不是 Product API。 |
| **port façade** | `analyzer/port-facade.ts`；port root 内唯一可供目录外 production code 调用的私有 Lizard-domain interface；不接受 Product context，不返回 Product DTO。 |
| **Product adapter** | port 外的 `analyzer-adapter.ts`；port façade 的唯一 production consumer，负责 Product mapping、support 与 error interpretation。 |
| **translated production file** | 有 root provenance inventory 的 translated target；只有有实际 Gate finding 的此类文件可进入 Gate exception ledger。 |
| **current evidence** | `analyzer/fixtures/lizard-1.23.0/evidence/` 下由连续测试和未来上游采用消费的 identity/oracle/deviation materials；不能由 archive 独占，也不是 shipped legal inventory。 |
