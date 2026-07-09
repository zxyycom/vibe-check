本 change 定义把 jscpd v5 Rust engine 接入为 Vibe Check duplicate scanner adapter 的执行方案；实现完成并归档前，现有主规范和实现仍以当前仓库状态为准。

## 背景

Vibe Check 当前 Rust CLI 已经通过 `ignore` 收集 scan scope，并通过 `tokei` 产生 LOC metrics、`file.too_many_lines` warning 和 gate result。重复代码检测目前只在 `scripts/tools/quality-core` 中通过 Node / CLI 风格的 jscpd wrapper 参与开发质量观测，不属于 Rust CLI release contract。

项目文档已经把 `jscpd` v5 Rust engine 作为 duplicate scanner adapter 候选，但要求在作为默认 duplicate scanner 前完成 API / 输出验证。本 change 已将这部分上游探索前置沉淀到 `source-audit.md`：当前实现 target 是 `cpd-finder = "0.1.8"` 的 `cpd_finder::orchestrate::{RunConfig, run}` API；`cpd-finder` 负责 file walking、orchestration 和 git blame；相关 crates 当前 metadata 显示 MIT license 和 rust-version `1.87`。实现阶段直接消费 `source-audit.md`，只在 Cargo resolution、编译或 fixture 行为与 audit 冲突时回写文档。

已验证来源：

- https://github.com/kucherenko/jscpd/blob/master/docs/rust.md
- https://github.com/kucherenko/jscpd/blob/master/docs/api.md
- https://github.com/kucherenko/jscpd/blob/master/docs/packages.md
- https://github.com/kucherenko/jscpd/tree/master/rust
- https://crates.io/crates/cpd-finder/0.1.8
- https://docs.rs/crate/cpd-finder/0.1.8/source/src/orchestrate.rs
- https://docs.rs/crate/cpd-finder/0.1.8/source/src/walker.rs

## 接入结论

接入可行，且值得推进第一版。方便程度中等偏方便：调用 API 很简单，难点不在“能不能跑”，而在“能否符合 Vibe Check 的 scanner contract”。

判断依据：

- 方便：`RunConfig` + `run()` 的 API 面很小，`RunResult.clones` 可映射为 Vibe Check-owned model，license 为 MIT。
- 不方便：upstream 要求 Rust `1.87`，并且 `cpd-finder` 会运行自己的 walker；它会在部分文件级失败和阈值场景中 silent skip，所以 Vibe Check 必须补 preflight、diagnostics 和结果对账。
- 需要控制：upstream `CpdClone` 是 pairwise，不是 native N-location group；第一版 warning policy 应保持 `medium`、non-blocking，避免未校准 duplicate noise 直接影响 gate。

推荐：继续接入 `cpd-finder = "0.1.8"`，但第一版只输出 `duplicate.code_fragment` warning，不让 duplicate 单独 fail gate。

## 目标 / 非目标

目标：

- 在 scan scope collection 之后新增 Rust duplicate scanner adapter path，通过 `cpd-finder` 调用 jscpd v5 Rust API。
- 在 Core warning generation 前，将 duplicate clone output 归一化为 Vibe Check-owned `DuplicateFinding` / location types。
- 使用现有 `WarningFinding` shape 生成 deterministic duplicate-code warnings，避免 Output 消费 jscpd-native structures。
- 保留 scanner diagnostics：unavailable dependency / API mismatch、unsupported input、partial file failures、parse / normalization failures 和 fatal scanner failures 都必须可观察。
- 用 checked-in fixtures 证明 cross-file duplicates、same-file duplicates、threshold filtering、excluded scope inputs 和 failure mapping。

非目标：

- 不把 JavaScript、JSX、TSX、Markdown、Vue、Svelte、Astro 加入 Rust CLI supported source classification。
- 不把 TypeScript quality observability schema、cache format、baseline comparison 或 code-area model 迁入 Rust CLI。
- 不在 stable JSON output 中暴露 raw jscpd JSON、reporter output 或 `cpd-finder` native structs。
- 不新增 accepted / suppressed warning configuration semantics。
- 当 Rust API 无法编译时，不默认 fallback 到外部 `jscpd` 或 `cpd` process；process wrapper 是另一个 dependency decision。

## 决策

### 决策 1：第一实现目标使用 `cpd-finder` Rust API

实现 SHOULD 优先尝试 `cpd_finder::orchestrate::{RunConfig, run}`，因为 upstream 将它记录为 jscpd v5 的 Rust integration API。这比 shell out 到 `jscpd` / `cpd` 更符合 Vibe Check 的 Rust-first dependency baseline。

替代方案：继续使用现有 TypeScript wrapper，或调用 v5 binary 作为 external process。这样能减少短期 API 不确定性，但会让 duplicate detection 继续停留在 Rust release boundary 之外，并重复引入 process / error handling。

影响：实现必须以 `source-audit.md` 作为 dependency / API snapshot。如果 Cargo resolution、编译或 fixture 行为与该 snapshot 冲突，先停止实现并更新 `source-audit.md`、本 design 和受影响 specs。

### 决策 2：duplicate input 限制在 normalized supported scan scope

adapter input SHOULD 来自 Rust CLI scan scope 已收集的 supported files，第一版为 `.ts`、`.go`、`.rs`、`.py`。adapter MUST NOT 独立扫描整个 project，从而绕过 Vibe Check scan scope exclusions。

替代方案：直接把 project root 传给 `cpd-finder`，依赖它自己的 walker。这样接线更快，但可能扫描 Vibe Check 判定为 unsupported 或 excluded 的文件，导致 scope counts 和 warnings 不一致。

影响：`source-audit.md` 已确认 `RunConfig.paths` 会逐个传给 upstream walker，individual file paths 可以作为 scan roots。实现应传 exact supported file paths，设置 jscpd `formats` 为 `typescript`、`go`、`rust`、`python`，设置 `no_gitignore = true`，并让 jscpd ignore / pattern filtering 为空。fixture tests 必须证明该策略保持 Vibe Check scan scope。

### 决策 3：jscpd 数据停留在 Vibe Check-owned model 之后

Core SHOULD 定义 normalized duplicate findings，包含 project-root-relative paths、稳定 location fields、token count、line span，以及足以生成 warning 的 duplicate group identity。`source-audit.md` 已确认 upstream `CpdClone` 是 pairwise，即 `fragment_a`、`fragment_b`、`token_count`，不是 native N-location group；第一版可以把每个 pair 视为一个 Vibe Check duplicate group，除非实现明确增加 deterministic graph coalescing。

替代方案：解析 jscpd JSON reporter output 并直接投影到 Rust CLI report data。这会复用已有脚本语义，但也会把 reporter shape 变成 stable contract，破坏 scanner boundary。

影响：本 change 不需要为了 raw duplicate list 新增 schema 字段；推荐第一版只通过 existing warnings 暴露用户可见结果。

### 决策 4：第一版 duplicate warning 为 non-blocking

Duplicate findings SHOULD 每个 group 生成一条 warning，rule id 为 `duplicate.code_fragment`。warning SHOULD 使用 deterministic first location 作为 `file`，并在 location 或 message 中紧凑标识所有 duplicate fragment locations。第一版 severity SHOULD 为 `medium`，blocking 为 `false`。

原因：accepted / suppressed 配置尚未实现，duplicate thresholds 也还需要 fixture calibration。此时直接让 duplicate fail gate 容易制造噪声。

替代方案：只把 duplicates 放进 diagnostics。这样能证明 scanner connectivity，但正常报告里看不到重复代码风险。

影响：duplicate findings 会进入正常输出，但不改变 gate behavior。后续要让部分 duplicate blocking，应另开 change，先补配置和 false-positive 控制。

### 决策 5：scanner unavailable 和 API mismatch 必须显式

如果 Rust dependency 无法编译、初始化，或无法提供稳定 clone data，implementation MUST NOT 静默报告 zero duplicates。`source-audit.md` 已确认 upstream 可能对 walk errors、open / mmap failure、non-UTF-8 content 和 threshold filters 做 silent skip；因此 Vibe Check 必须拥有 preflight checks、result normalization diagnostics 和 adapter-wide fatal mapping。

替代方案：把 duplicate scanning 做成 best-effort，失败时忽略。这样会让 CLI 在 scanner 坏掉时看起来仍然 clean。

影响：tests 必须分别覆盖 recoverable diagnostics 和 fatal adapter failures。

## 风险 / 取舍

- [Risk] `cpd-finder` 仍是 `0.1.x`，API 可能变化。Mitigation：target 固定为 `cpd-finder = "0.1.8"`，以 `Cargo.lock` 记录实际 resolved source；若 API 冲突，先更新 source audit。
- [Risk] upstream Rust engine 要求 rust-version `1.87`，可能高于尚未声明的 release target。Mitigation：实现时在 scanner dependency docs 记录 MSRV；如果 Vibe Check 需要更低 MSRV，则保持 duplicate scanning unsupported。
- [Risk] upstream 会在部分文件问题或 token / line threshold 下 silent skip。Mitigation：adapter 做 file existence、readability、UTF-8 preflight，并把 below-threshold 文件视为正常 no-finding。
- [Risk] jscpd v5 token counts 可能与 v4 略有差异。Mitigation：fixture assertions 优先验证相对行为、location / group 存在性，不把 token internals 当作 Vibe Check 稳定语义，除非 Vibe Check model 明确 owning 该数字。
- [Risk] duplicate warnings 可能在 generated / vendor / cache paths 上很吵。Mitigation：只使用 Vibe Check scan scope 作为 input，并证明 excluded paths 不产生 warnings。
- [Risk] duplicate warnings 未来可能需要 blocking。Mitigation：第一版保持 non-blocking，把 policy 放在 `quality-metrics`，后续默认 blocking 需要单独 change。

## 迁移计划

1. 读取 `source-audit.md`，确认实现仍以 `cpd-finder = "0.1.8"` 为 target；apply 阶段只做依赖解析、编译和 fixture 验证，不做大范围上游探索。
2. 使用已审计 dependency target 添加 Cargo metadata；如果 Cargo resolution 或编译与 `source-audit.md` 冲突，先更新 change artifacts。
3. 在 scanner boundary 后新增 adapter，并将 findings 归一化为 Vibe Check-owned types。
4. 增加 warning generation 和 gate tests，再增加 fixture-backed CLI tests。
5. 更新 owner docs 和 validation materials。
6. 如果 dependency 无法通过 compile / API / scope validation，保留显式 unsupported diagnostic path，并更新 design / tasks 记录 blocker，不强行落地脆弱 fallback。

## Open Questions

无未回答开放问题。上游 API / version / source exploration 已前置记录在 `source-audit.md`；实现前只需读取并消费该文档，除非 Cargo resolution、编译或 fixture 行为与该文档冲突。
