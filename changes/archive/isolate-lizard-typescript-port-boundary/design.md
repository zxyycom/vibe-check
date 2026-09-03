# Design

本设计记录 `analyzer/port-facade.ts` 与 Product adapter 收口既有深导入、evidence 和质量例外的实施模型；稳定当前规则由对应 docs owner 承接。

## Context

### Current facts

- `analyzer/**` 是 Lizard 1.23 的 source-aligned port root，production source 不反向导入 Product；`analyzer/port-facade.ts` 是其唯一目录外 production entry，且不是 package export。
- `measurement.ts` 在 Product 边界读取 admitted exact source、执行 resource/cancellation policy，并启动 one-shot Worker；Worker 验证 transport 后调用 `analyzer-adapter.ts`，adapter 是 façade 唯一 production consumer，target-files 同样仅消费 adapter capability。
- current oracle、malformed、reader mapping、identity 与 deviation evidence 位于 `analyzer/fixtures/lizard-1.23.0/evidence/`；root provenance inventory 是唯一 machine-readable mapping。identity test 从它 fail-closed 地验证 42 translated source/range references、37 translated targets（包括 `extensions/protocol.ts` 的 additional target）、81 class identities 与 792 symbol/host-seam mappings；current source/tests 不读取 archive。
- development product lint、format 和 typecheck 保持完整普通 selection、零 translated-only 例外；Gate 三个 repository-quality Check 已应用 `definition.ts` 的精确硬编码 14-path/20-rule-path-instance 最小 ledger。configuration test 读取 root provenance 并校验每个受排除 target 的 source header；它验证硬编码 policy，不在 runtime 从 ledger 导出 selection。package root 只导出 `"."`，Worker 仍仅是 compiler-root/artifact requirement。

### Design terms

| Term | Design meaning |
| --- | --- |
| **port façade** | `src/package-checks/function-metrics/analyzer/port-facade.ts`；`analyzer/**` 内唯一的目录外 production entry，提供 suffix capability 与 `{ filename, sourceCode }` in-memory analysis，使用私有 Lizard-domain request/result。 |
| **Product adapter** | port 外的 `analyzer-adapter.ts`；唯一 façade production consumer，负责 Product support/error interpretation 与 `FunctionMetric` mapping。 |
| **deep import** | Product code/test 绕过 Product adapter，直接导入 port core、registry、reader、extension 或 façade。 |
| **translated-only quality profile** | 对 provenance-qualified translated production files的最小 Gate exception ledger；development lint/format 保持完整普通 inputs、零新增例外，绝不是整个 port 目录的免检。 |

## Goals / Non-Goals

**Goals**

- 建立可从路径、类型和测试恢复的单向责任链，分离翻译语义与 Product policy。
- 让上游同步局限于 port 与其 source/fidelity evidence，除非真实 façade contract 改变。
- 用最小、可审计的 14-path/20-instance Gate exception ledger 保留 source alignment，同时保留 development lint/format、行为、边界和 legal proof。
- 保持现有 functionMetrics public contract、exact-input safety、failure semantics、package privacy 和 legal closure。

**Non-Goals**

- 不公开 port、façade、adapter 或 Worker，不新增 subpath export、backend substitution、parser service 或 plugin framework。
- 不采用新 Lizard version、不改变支持语言/metrics、不实现 deferred extension body，也不以“同步”为由优化翻译结构。
- 不将 filesystem discovery/decoding、resource limits、cancellation、Worker scheduling、Finding/Record/final settlement 移入 port。
- 不修改 archived Change；它只保存历史，迁移的是 current evidence 的 owner relation。

## Decisions

### Intended Change

1. **唯一调用链和责任。**

   ```text
   functionMetrics Check/execution
     → measurement: exact-path I/O, decode, limits, cancellation, Worker lifecycle
     → Worker: message validation and Product adapter invocation
     → Product adapter: Product support/error + FunctionMetric mapping
     → analyzer/port-facade.ts: Lizard-domain suffix capability + in-memory analysis
     → source-aligned port internals
   ```

   `target-files.ts` 和 Worker 只调用 Product adapter。port façade 不接收 root、filesystem handle、AbortSignal、Worker 或 Product execution context，也不使用 Check/Record/Finding/Project/`FunctionMetric` DTO。Worker 保持 package-private compiler-root contract。

2. **目录与 import policy。**

   port root 继续是 `analyzer/**`；唯一新 façade leaf 固定为 `analyzer/port-facade.ts`，不使用非根 `index.ts`，也不重组 translated core/readers/shared/extensions。仅为旧 Product 调用存在的 registry alias 移除或收回 façade 内部。port 只依赖自身 modules 与 faithful translation 所需 host-runtime primitives，禁止反向依赖 Product。port façade 不经 `src/index.ts`、package exports 或 public declarations 公开。

   静态 layout/dependency test 按路径扫描 production 与 tests，并 fail closed：

   - `analyzer/port-facade.ts` 是唯一目录外 production entry，Product adapter 是它的唯一 production consumer；
   - Worker、target-files、Check/measurement 与 port 外 Product production code 不导入 port 或 façade；
   - port-root fidelity/unit tests 可深导同目录 internals；仅验证 façade boundary 的测试也位于 port root；
   - port 外 Product tests 仅经 Product adapter，不深导 core、registry、readers、extensions 或 façade；
   - public entry/declaration/package export 不泄漏 port、façade、adapter、Worker 或 deep path。

3. **current evidence 与 legal relation。**

   current test/fidelity evidence subtree 固定为 `src/package-checks/function-metrics/analyzer/fixtures/lizard-1.23.0/evidence/`。它承接 oracle observations、malformed observations、reader-extension mapping、`lizard-1.23-source-identity.json` 与 deviation ledger；测试只读此 owner，不读取 archive。`licenses/lizard-1.23.0-provenance.json` 是唯一 authoritative machine-readable source/range/SPDX/target mapping，`licenses/**` 继续拥有 shipped legal inventory；evidence 仅引用和验证该 mapping，绝不复制 range/hash/SPDX/target ledger。

   identity/deviation validation 必须覆盖 42 source/range、37 translated targets（36 个唯一 `targetPath`，以及 `extensions/protocol.ts` 的 `additionalTargetPaths`）、81 classes 与 792 symbol/host-seam mappings。archive 是不可修改的形成时历史；current `src` 不得把它作为 production 或 test input。fixture subtree 不作为 Product runtime input 或 package payload。

4. **translated-only quality profile。**

   development lint、format 与 typecheck 维持各自完整的当前输入，**零 translated-only 例外**。

   Gate `duplicateDetection`、`fileMetrics`、`functionMetrics` 的最小 exception ledger 是 `definition.ts` 中的精确硬编码：仅 14 个 distinct provenance-qualified translated paths、共 20 个 rule-path instances。三条规则分别为 duplicate-token comparison 的 1 path、file-metrics `code-lines` 的 6 paths、function-metrics cyclomatic complexity/function-code-density 的 13 paths；共享路径按各 rule instance 计数。`readiness-quality-audit.md` 保存 path/rule/action、source-alignment 理由与 upstream-sync review trigger；configuration test 读取 root provenance 并校验 source header，对硬编码 policy fail-closed 验证，而非在 runtime 导出 ledger。`extensions/protocol.ts` 属于 37-target identity closure，但没有有证据的 Gate finding，继续被普通 selection 覆盖。

   profile 不可排除 TypeScript parse/type/build、运行时、import-cycle/path identity、dependency direction、source identity/deviation、oracle/reader/extension behavior、façade/adapter/Worker/Check boundary 或 provenance/license checks。手写 façade、Product adapter、Worker、Check、tests 和 fixtures 不继承 Gate exceptions；`analyzer/**` blanket lint/typecheck/test disable 无效。

5. **stable documentation and Decision。**

   active+aligned Decision 保存跨 Change 方向；implementation 完成并通过 stable owner 与代码验证后，才可审查 alignment。stable docs 说明 private boundary、current evidence owner、profile 与 upstream-sync procedure；Change 只保存本次的范围、设计和执行证据。

### Resulting Impacts

1. **Integration behavior.** 改写 Worker、target-files 与 adapter tests 时必须保持 case-insensitive suffix、exact-input membership、whole-request failure、cancellation、resource limits、source-unavailable 与 no-partial-record semantics。
2. **Evidence/package closure.** evidence path 迁移会影响三个测试消费者及其五个输入、fixtures、test guards 和 package staging；必须证明 archive 无 current reads，同时保留 source headers、唯一 legal mapping、legal inventory、third-party notices 和 non-public Worker artifact shape。
3. **Tooling and Test Evidence.** development lint、format、typecheck 保持无例外；Gate 三个 quality Check 用精确硬编码实现 14-path/20-instance ledger，并由 provenance/header configuration test 验证。quality configuration、静态 dependency tests 和 42/37/81/792 identity tests 的变更需要对应 target/config tests 与 native Case 维护。
4. **Documentation synchronization.** stable owner docs 更新后才描述实现事实；Decision 不记录 task progress，Change 不取代稳定规则。
5. **No framework expansion.** façade 和 adapter 只服务 functionMetrics；不得获得任意 reader/parser registration 或新的跨 Check extension contract。

## Risks / Trade-offs

- façade 可能演变为第二层 analyzer abstraction 或隐性 public API；closed private DTO、import-boundary test 和 package inventory 是控制点。
- evidence relocation 若复制或错配 legal materials，会破坏 fidelity 或发布闭包；唯一 mapping、37-target guard 与 package checks 是控制点。
- Gate selection 若有未证实 path、或 lint/format 被误排除，会让翻译文件或手写 Product 路径失去覆盖；fail-closed ledger、configuration tests 和保留 checks 是控制点。
- 结构调整可能改变 input/failure 语义；measurement/Worker/target-files 的最窄行为测试和 required/full Gate 是验收边界。

## Open Questions

无。Readiness 0.2–0.5 已由同目录 boundary、evidence 与 quality audits 写回为上述实施决定；它们提供详细事实和基线，不取代 stable owner。Implementation 1.1–1.7 已完成；剩余 verification tasks 按本 Plan 的验证顺序结算。
