# Design

本设计以 port façade 与 Product adapter 收口既有深导入，并把 evidence 和质量例外变为有 owner 的可验证契约；除明确标为 Current 的项外，均为待实施设计。

## Context

### Current facts

- `analyzer/**` 是 Lizard 1.23 的 source-aligned port root，production source 不反向导入 Product；它不是 package export。
- `measurement.ts` 已在 Product 边界读取 admitted exact source、执行 resource/cancellation policy，并启动 one-shot Worker；`analyzer-worker.ts` 目前直接导入 core 和 reader registry，`target-files.ts` 也直接导入 registry。
- current identity/oracle tests 仍读取 `changes/archive/replace-lizard-with-typescript-function-analyzers/evidence/**`；identity manifest 尚未直接闭合全部 translated core/extensions/readers/shared ranges。
- development product lint 与 format 目前覆盖 `src/**/*.ts`，显式排除的是 analyzer oracle fixtures；Project Gate `duplicateDetection`、`fileMetrics`、`functionMetrics` 的 product-source selection 也都是 `src/**/*.ts`。尚无 translated-only profile。package root 只导出 `"."`，Worker 仅是 compiler-root/artifact requirement。

### Design terms

| Term | Design meaning |
| --- | --- |
| **port façade** | `analyzer/**` 内唯一的目录外 production entry，提供 suffix capability 与 `{ filename, sourceCode }` in-memory analysis，使用私有 Lizard-domain request/result。 |
| **Product adapter** | port 外的 `analyzer-adapter.ts`；唯一 façade production consumer，负责 Product support/error interpretation 与 `FunctionMetric` mapping。 |
| **deep import** | Product code/test 绕过 Product adapter，直接导入 port core、registry、reader、extension 或 façade。 |
| **translated-only profile** | 只对已认定 translated production files 生效的统一 selection/exception 契约：同时约束 development lint、development format 和 Project Gate 三个 `src/**/*.ts` repository-quality Check；不是整个 port 目录的免检。 |

## Goals / Non-Goals

**Goals**

- 建立可从路径、类型和测试恢复的单向责任链，分离翻译语义与 Product policy。
- 让上游同步局限于 port 与其 source/fidelity evidence，除非真实 façade contract 改变。
- 用最小、可审计的 translated-only profile 保留 source alignment，同时保留行为、边界和 legal proof。
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
     → port façade: Lizard-domain suffix capability + in-memory analysis
     → source-aligned port internals
   ```

   `target-files.ts` 和 Worker 只调用 Product adapter。port façade 不接收 root、filesystem handle、AbortSignal、Worker 或 Product execution context，也不使用 Check/Record/Finding/Project/`FunctionMetric` DTO。Worker 保持 package-private compiler-root contract。

2. **目录与 import policy。**

   port root 继续是 `analyzer/**`。translated core/readers/shared/extensions 维持原有结构；仅为旧 Product 调用存在的 registry alias 移除或收回 façade 内部。port 只依赖自身 modules 与 faithful translation 所需 host-runtime primitives，禁止反向依赖 Product。port façade 不经 `src/index.ts`、package exports 或 public declarations 公开。

   静态 layout/dependency test 按路径扫描 production 与 tests，并 fail closed：

   - port façade 是唯一目录外 production entry，Product adapter 是它的唯一 production consumer；
   - Worker、target-files、Check/measurement 与 port 外 Product production code 不导入 port 或 façade；
   - port-root fidelity/unit tests 可深导同目录 internals；仅验证 façade boundary 的测试也位于 port root；
   - port 外 Product tests 仅经 Product adapter，不深导 core、registry、readers 或 extensions；
   - public entry/declaration/package export 不泄漏 port、façade、adapter、Worker 或 deep path。

3. **current evidence 与 legal relation。**

   在实施前由 package/legal owner 确认 current evidence subtree。它承接 oracle observations、source identity manifest 和 range/deviation mapping；测试只读此 owner，不读取 archive。`licenses/**` 继续拥有 shipped legal inventory。两处通过一份 authoritative machine-readable mapping 建立关系，不能形成相互独立的来源事实副本。identity/deviation validation 扩展到全部 translated core、extensions、readers 和 shared ranges。

4. **translated-only quality profile。**

   profile 只匹配有 source identity/provenance 依据的 translated production files，不匹配手写 port façade、Product adapter、Worker、Check、tests 或 fixtures。它由 `scripts/development/lint.ts`、`format.ts`/`format-targets.ts` 与 `scripts/project/gate/definition.ts` 共同实现：development product lint、development format，以及 Gate `duplicateDetection`、`fileMetrics`、`functionMetrics` 的 product-source selection 必须引用同一份确认后的 selection policy。可排除 project naming、function/file length、complexity、project duplication heuristic，以及无证据的统一抽象压力。任何额外 format/lint/Gate selection exception 必须在实施前由对应 command/Check 基线与 source-alignment evidence 证明必要，并记录 glob、rule/action、理由和 upstream-sync review trigger；在 Readiness 0.5 前不预设具体 glob。

   profile 不可排除 TypeScript parse/type/build、运行时、import-cycle/path identity、dependency direction、source identity/deviation、oracle/reader/extension behavior、façade/adapter/Worker/Check boundary 或 provenance/license checks。若任何工具只能目录级排除，配置与测试必须另证手写 façade、全部非翻译 Product 与所有 tests 仍经其适用 development/Gate 检查；`analyzer/**` blanket lint/typecheck/test disable 无效。

5. **stable documentation and Decision.**

   active+unaligned Decision 保存跨 Change 方向；implementation 完成并通过 stable owner 与代码验证后，才可审查 alignment。stable docs 说明 private boundary、current evidence owner、profile 与 upstream-sync procedure；Change 只保存本次的范围、设计和执行证据。

### Resulting Impacts

1. **Integration behavior.** 改写 Worker、target-files 与 adapter tests 时必须保持 case-insensitive suffix、exact-input membership、whole-request failure、cancellation、resource limits、source-unavailable 与 no-partial-record semantics。
2. **Evidence/package closure.** evidence path 迁移会影响 fixtures、test inputs 和 package staging；必须证明 archive 无 current reads，同时保留 source headers、legal inventory、third-party notices 和 non-public Worker artifact shape。
3. **Tooling and Test Evidence.** development targets 与 Gate `duplicateDetection`/`fileMetrics`/`functionMetrics` selection 必须由同一 confirmed policy 驱动或相互 characterization；quality configuration、静态 dependency tests 和 identity tests 的变更需要对应 target/config tests 与 native Case 维护。
4. **Documentation synchronization.** stable owner docs 更新后才描述实现事实；Decision 不记录 task progress，Change 不取代稳定规则。
5. **No framework expansion.** façade 和 adapter 只服务 functionMetrics；不得获得任意 reader/parser registration 或新的跨 Check extension contract。

## Risks / Trade-offs

- façade 可能演变为第二层 analyzer abstraction 或隐性 public API；closed private DTO、import-boundary test 和 package inventory 是控制点。
- evidence relocation 若复制或错配 legal materials，会破坏 fidelity 或发布闭包；authoritative mapping 与 package checks 是控制点。
- development 与 Gate selection 若只调整其中一处，会让 translated files 在另一条质量路径意外产生 findings 或被遗漏；同一 confirmed policy、selection configuration tests、普通手写/非翻译 Product 覆盖与保留的运行时/边界/fidelity checks 是控制点。
- 结构调整可能改变 input/failure 语义；measurement/Worker/target-files 的最窄行为测试和 required/full Gate 是验收边界。

## Open Questions

以下问题是 Implementation 的硬门禁；Readiness 0.2–0.5 全部有实际证据并写回 Plan 前，不得开始任何 Implementation task。

1. package/legal owner 必须确认 current evidence 的准确 subtree、authoritative mapping，以及它与 `licenses/lizard-1.23.0-provenance.json` 的唯一 owner relation。
2. 需要核对 port façade 和 `analyzer-adapter.ts` 的最终路径、test path classification、Worker compiler-root 与 public-surface impact。
3. 必须采集 development product lint、development format、typecheck，以及 Project Gate `duplicateDetection`、`fileMetrics`、`functionMetrics` 对当前 `src/**/*.ts` product-source selection 的基线，得到最小命名 exception set；这不改变必须保留的 type/runtime/import-path/boundary/fidelity coverage。
