## Context

本 design 说明如何为现有四种 supported source 接入 Rust ast-grep structural adapter，并以 `function.too_many_parameters` 完成第一条函数级用户可见闭环。当前内容只在 `openspec/changes/integrate-rust-ast-grep-structural-adapter/` 下形成临时变更计划；阻塞级实现前审计已完成，可以按 tasks 进入 source audit，但在归档前不修改现有主规范，也不表示当前 binary 已实现目标能力。

当前 Rust CLI 已完成 normalized scan scope、`tokei` LOC metrics、`cpd-finder` duplicate scanning、统一 warning ordering、gate calculation 和 human / JSON projection。`docs/scanner-dependencies.md` 已把 `ast-grep-core` / `ast-grep-language` 选为多语言结构扫描基座，但 workspace Cargo metadata 和 Rust runtime 尚未接入。开发期 TypeScript quality scripts 已提供 function NLOC、parameter count 和 cyclomatic complexity 的历史风险线索，但该 Lizard-based behavior 不是 Rust CLI release contract。

本 change 必须与并行推进的 CLI/config normalized parameter work 保持边界：structural adapter 只消费 Core 已归一化的 project root 与 supported file paths，不解析 argv、不读取 config file，也不自行从多个位置拼装参数。第一版继续使用 adapter / Core-owned built-in policy。

## Goals / Non-Goals

**Goals:**

- 通过 source audit 和 checked-in characterization 固定可复现的 ast-grep Rust integration boundary。
- 为 TypeScript `.ts`、Go `.go`、Rust `.rs` 和 Python `.py` 提取可稳定命名且带 executable body 的 function metrics。
- 建立跨语言明确的 parameter slot 语义、Vibe Check-owned model 和 deterministic ordering。
- 通过现有 warning envelope 输出 `function.too_many_parameters`，保持 non-blocking gate policy 和 LOC compatibility counters。
- 明确文件级 recoverable diagnostics 与无法信任 adapter result 的 fatal boundary。
- 以 adapter、Core 和真实 CLI contract evidence 证明实现，不扩大 public CLI/config 或 schema surface。

**Non-Goals:**

- 不新增或修改 CLI 参数、config 字段、配置加载、threshold override 或参数汇聚对象。
- 不增加 JavaScript、JSX、TSX 或其它 supported extensions。
- 不扫描 anonymous callback、无稳定 binding 的 closure、signature-only declaration 或无 executable body 的 abstract member。
- 不实现 cyclomatic complexity、function NLOC、code density、baseline comparison、cache、changed-file policy、accepted/suppressed 或 code-area policy。
- 不把 ast-grep tree、pattern 或 native error 暴露到 Core、Output、schema 或 examples。
- 不在本 change 中引入通用 scanner registry 重构、并行 scanner scheduler 或新的 stable report fields。

## Decisions

### Decision 1: Source audit 与 dependency characterization 是实现前技术门禁

实现先在本 change 中新增 `source-audit.md`，引用官方 crate metadata、docs.rs / upstream source 和 resolved Cargo source，记录候选版本、license、MSRV、features、Rust API、language enum、node/range semantics、parser error representation 和 panic / error behavior。审计后选择相互兼容的 exact `ast-grep-core` / `ast-grep-language` versions 与最小 features，并把版本写入 dependency owner 和 Cargo metadata。

加入 dependency 后，先用 checked-in fixtures 直接调用 ast-grep API，证明四种语言、目标 function forms、1-based range normalization、receiver / parameter behavior、syntax error detection 和 UTF-8 path；该 gate 通过前不新增 Vibe Check function model、adapter 或 runtime wiring。若 resolved source、编译或 fixture behavior 与本 design / specs 冲突，先更新 artifacts 并重新完成阻塞级审计。

备选方案是继续调用外部 Lizard，或直接用 regex / 文本遍历实现函数识别。外部 Lizard 与 Rust-first release boundary 不一致，并引入进程、安装和 CSV parsing surface；regex 无法可靠处理四种语言的 nested syntax、parameters 和 source ranges，因此不采用。

### Decision 2: Adapter 只消费 normalized exact files

Core 从 scan scope 构造 Vibe Check-owned structural scan input，包含 normalized project root 与 supported file paths；adapter 按 extension 映射到已审计的 ast-grep language，并逐文件读取与解析。adapter 不接收 CLI command、config path 或 raw include/exclude settings，也不把 project root 交给第三方逻辑做递归发现。

Runtime 在 zero-supported-input 时跳过 adapter并返回 empty structural outcome。该路径是正常 completed state，不产生 diagnostic。这样 scope ownership 继续由 `scan-scope` capability 持有，structural scanner 不与并行 CLI/config 工作形成第二套参数来源。

备选方案是让 adapter 接收 project root 与 glob / ignore rules 后自行扫描。该方案会重复 scan scope、产生不同文件集合并扩大配置耦合，因此不采用。

### Decision 3: 只归一化可稳定命名且有 executable body 的 function forms

已确认：Adapter 只归一化可稳定命名且有 executable body 的 function forms。Adapter 产生 Vibe Check-owned `FunctionMetric`，内部字段至少包括 normalized path、language、kind、display name、start/end line/column 和 parameter count。第一版 kind 为 `function`、`method`、`constructor`；路径使用 project-root-relative `/` separators，source positions 转换为 1-based inclusive coordinates。

Function inventory 按 capability spec 固定：

- TypeScript：named function declaration、带 body 的 method / constructor，以及直接绑定到 identifier 的 arrow / function expression。
- Go：function declaration 与 method declaration。
- Rust：free / nested function、impl method 与带 body 的 trait default method。
- Python：sync / async free function、nested function 与 class method。

Signature-only declaration、`.d.ts` declaration、abstract member、无 body trait signature 和没有 stable declaration / direct binding name 的 anonymous callback / closure 不产生 metric，也不产生 diagnostic。Display name 由 declaration、method key、constructor marker 或 direct binding identifier 得到；第一版不为匿名形态发明位置型 public name。

备选方案是收集所有 AST function-like nodes并用 `<anonymous>` 命名。该方案会把 callback 噪声、语言差异和不稳定 identity 带入第一条用户可见 rule，因此推迟到独立 capability change。

### Decision 4: Parameter count 表示显式调用参数槽

已确认：`parameter_count` 统一表示调用者显式传入的 source-level parameter slots，第一条用户可见 rule 保持 `parameter_count >= 5`、`medium` 和 non-blocking。参数归一化规则为：

- Go receiver 不计入。
- Rust `self`、`&self`、`&mut self` 或 typed self receiver 不计入。
- TypeScript `this` pseudo-parameter 不计入。
- Python direct class-body method 的第一个 receiver parameter 不计入；`@staticmethod` 没有隐式 receiver，因此全部 parameters 计入。
- default、optional、destructured、rest 和 variadic form 各计一个 slot，内部 binding 数量不展开。

Core 对 `parameter_count >= 5` 生成 `function.too_many_parameters`，severity 为 `medium`，`blocking = false`、`accepted = false`、`suppressed = false`。Finding 使用 normalized file、`lines START-END` location，message 包含 display name、实际 count 和 threshold。阈值 `5` 沿用现有开发期 quality policy 的默认风险线索，但在本 change 中成为独立的 Rust CLI built-in contract，不读取旧脚本配置。

第一条 function rule 选择 parameter count，而不是 cyclomatic complexity 或 function length：parameter slots 可以直接从语法结构归一化；跨语言 complexity 需要额外 branch semantics，source line span 也不等同于 Lizard NLOC。后两者留给独立 change。

### Decision 5: 文件级问题 recoverable，adapter invariant failure fatal

已确认：文件级 structural scan 问题保持 recoverable；即使所有 structural inputs 被跳过，只要 LOC / duplicate 与其它 report data 仍可信，也返回带 diagnostics 的 partial report。Adapter 在调用 parser 前检查 exact input 仍存在、是 regular file、可读且为 UTF-8。文件出现 preflight failure、parser error node 或 missing node 时，adapter 跳过该文件全部 metrics，并产生 warning-severity `STRUCTURAL_SCAN_PARTIAL` diagnostic。

Adapter initialization、panic unwind、supported extension 无 language mapping、project root 外 normalized path、invalid source range 或违反唯一 identity / ordering invariant 时返回 scanner fatal；CLI 继续使用 exit code `3` 且 stdout 不写 report。Parser recovery 得到的部分 AST 不进入 function warnings，避免损坏文件产生看似精确的结果。

备选方案是尽量消费带 error node 的局部 AST。该方案难以跨语言证明哪些 ranges 仍可信，会把 parser recovery 细节提升为产品语义，因此第一版保守跳过整文件。

### Decision 6: Structural findings 复用现有 report envelope

Structural outcome 进入 Core report assembly：function metrics 只作为内部 warning input，第一版不向 stable `metrics` 或新的 top-level field 输出函数列表。Function warnings 与 LOC / duplicate warnings 合并后继续按 `(file, location, rule, message)` 排序；summary 和 gate 从统一 warning list 派生。

`function.too_many_parameters` 增加 `summary.warning_count`，但不增加 blocking count，也不单独导致 gate failure。Function metric / warning 数量不改变 LOC totals、language summaries、`metrics.files_measured` 或 `metrics.supported_scanner_findings`。现有 JSON schema 已能表达 warning 和 diagnostic，因此不升级 `schema_version`。

备选方案是立即公开完整 function metrics array。该方案会提前固定 identity、kind、range、complexity 与兼容策略，超出第一条 warning 闭环所需范围，因此不采用。

### Decision 7: Runtime wiring 保持 adapter 可注入，不引入通用 registry

Runtime 增加独立 `StructuralScannerAdapter` boundary 与 `StructuralScanOutcome`，沿用现有 collector / LOC / duplicate adapters 的 test injection 风格。Structural adapter 在 scan scope 后执行，report builder 接收 normalized function metrics 和 diagnostics。具体 helper 参数布局可以在实现时按合并后的 Core request model调整，但不得解析 CLI/config 或从多个位置自行获取参数。

本 change 只抽取 structural adapter 需要的最小 owned types 和 handoff，不借第三个 scanner 引入动态 registry、capability discovery、parallel scheduler 或 trait-object plugin system。需要通用 scanner planning 时另开 architecture change，并以至少三个已实现 adapter 的真实差异作为输入。

### Decision 8: Characterization、adapter、Core 与 CLI 各证明一个边界

Dependency characterization tests 直接证明 ast-grep source facts，不断言 Vibe Check warning。Adapter tests 证明 language mapping、function inventory、parameter count、range/path normalization、ordering、partial diagnostics 和 fatal invariants。Core tests 证明 threshold、warning fields、summary、gate 与 LOC compatibility。Fixture-backed CLI tests 只证明真实 binary 的 human / JSON warning、schema validity、diagnostic / exit-code boundary 和 non-blocking gate behavior。

测试使用 checked-in、hand-written、offline fixtures，并按 testing owner 流程登记新的 `STRUCTURAL` responsibility、planned / implemented cases 和唯一 `@case` marker。测试代码不生成或改写 scan input。

## Risks / Trade-offs

- [Risk] ast-grep 两个 crates 的版本、features 或 language enum 兼容性可能变化。→ Mitigation：source audit 后使用 exact compatible versions，锁定 Cargo resolution，并设置直接 API characterization gate。
- [Risk] Tree-sitter grammar node kinds 在语言或 dependency 升级时变化。→ Mitigation：把 node-kind mapping 限制在 per-language adapter module，并用四语言 fixtures 固定 supported forms；升级必须重跑 characterization。
- [Risk] Python receiver 与 TypeScript bound function 判断存在语言惯例。→ Mitigation：把 receiver / stable binding 语义写成 Vibe Check contract，并用边界 fixtures证明，不透传第三方 taxonomy。
- [Risk] 对含 parse error 的整文件跳过会漏报其它有效函数。→ Mitigation：返回显式 partial diagnostic；后续只有在能定义跨语言可信 recovery contract 时再放宽。
- [Risk] 每个 supported file 增加一次 parse 会提高扫描成本。→ Mitigation：只读取 exact supported files、只执行单次 parse / traversal，并在实现验证记录代表性 fixture timing；没有基线证明前不引入 cache 或并行复杂度。
- [Risk] Runtime / report assembly 可能与并行 Core request 变更产生合并冲突。→ Mitigation：dependency、fixtures、adapter modules 与 tests 先保持隔离，最终 wiring 基于合并后的 normalized Core input完成，禁止恢复 ad-hoc 参数获取。

## Migration Plan

1. 完成 blocking implementation audit，确认 proposal、spec deltas、design、tasks、capability IDs、开放问题和验证路径一致。
2. 新增 `source-audit.md`，固定官方 source facts、exact dependency versions / features 和 characterization targets；冲突时先更新 artifacts 并重新审计。
3. 先更新 scanner dependency、quality metrics 与 testing owner docs，登记 planned cases，并通过文档 / OpenSpec validation。
4. 加入 exact Cargo dependencies 和 checked-in characterization fixtures；characterization gate 通过后再实现 owned model 与 adapter。
5. 实现 per-language extraction、parameter normalization、deterministic ordering、diagnostics 和 fatal mapping。
6. 基于合并后的 normalized Core request 接入 runtime、warning generation、summary / gate，并保持 schema 与 compatibility counters 不变。
7. 完成 adapter、Core、CLI contract evidence 与 workspace verification，再对账 implementation status 和 case ledger。

如果实现前 characterization 证明 ast-grep 无法满足四语言、range、error 或 build constraints，停止后续 application code，移除未交付的 Cargo dependency / fixtures，并更新或撤销本 change。实现已接线后的回滚路径是同时移除 structural runtime handoff、function warning、adapter dependency 和对应 planned/implemented cases；现有 LOC、duplicate、CLI 与 JSON schema contract保持可独立运行。

## Open Questions

已收敛：用户已确认 Decision 3 的 stable-named executable function inventory、Decision 4 的 explicit parameter slot / threshold / non-blocking policy，以及 Decision 5 的 all-input structural partial policy。无待确认项，可以进入 source audit。Exact crate versions、features 和具体 API symbols 由 Decision 1 要求的 source audit 在任何 Cargo manifest 或 Rust application code 变更前固定；若该事实改变 capability contract，则必须先更新 artifacts 并重新完成阻塞级审计。
