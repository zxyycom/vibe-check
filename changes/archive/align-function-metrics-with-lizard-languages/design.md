# Design

本设计已将 Lizard 1.23.0 的正式 reader capability 映射为 functionMetrics adapter 的显式输入白名单，并保留 unknown text 的拒绝边界。

## Context

functionMetrics 是 owning Check 的 private Lizard adapter consumer。adapter CLI protocol、area-owned metric limits 与 finding policy 保持既有边界；此前 local target selection 只接受 TypeScript/Rust 类路径。Lizard 对未知显式文本可使用 CLike parser，故“可被 backend 解析”不是受支持 source eligibility 的依据。

## Goals / Non-Goals

**Goals**

- 将本地 pinned Lizard 1.23.0 official reader registry 的完整 extension mapping 显式映射为 functionMetrics eligibility。
- 保持 exact-path source collection、case-insensitive matching 与 unknown-extension rejection。
- 对扩大语言集合后的 target selection、exact-input handoff、adapter、no-input、area-overlap 与 output behavior 提供直接证据。

**Non-Goals**

- 不升级、替换或移除 Lizard，不引入 TypeScript analyzer、fallback parser 或 Product-wide language registry。
- 不改变 scanner CLI protocol、public scanner options、metric thresholds、area overlap 或 blocking policy。
- 不把 Lizard 的 CLike fallback 作为未知文件支持承诺；不引入 cache、cache identity 或 invalidation work。

## Decisions

### Intended Change

1. **Official mapping as data.** adapter-owned immutable set 包含 55 个 lower-cased official reader extensions；target selection 使用路径末段 extension 的 case-insensitive comparison，`.cjs` 属于支持范围。
2. **Filter before handoff.** exact collection 可由 areas 选择 paths，但只有 extension set 中的 files 进入 Lizard adapter；Markdown、JSON、YAML、无 extension 和其它 unknown paths 不进入 CLike fallback。
3. **Preserve policy flow.** accepted inputs 继续沿既有 dedupe、area membership、metric comparison、Record publication 与 final-status flow 处理；functionMetrics 没有 cache 或 cache identity。
4. **Table-driven evidence.** target-selection test 覆盖完整 official set、uppercase cases 与 fallback rejection；现有 adapter/Check evidence 覆盖 exact-input/no-input/area-overlap，而非虚构每种语言的独立 parser fixture。

### Resulting Impacts

- TypeScript/Rust-only predicate 已由完整 mapping 替换；supported set 的变化不会创建另一条 policy branch。
- 当前 docs 已准确表述官方 reader extension table 与 CLike fallback boundary。
- machine schema/example 和 cache material均未因本 Change 变化，无需修改。

## Risks / Trade-offs

- Lizard 版本或 reader registry 更新时，language/extension mapping 必须与 pinned baseline 一起复核；不从当前 set 推导永久支持承诺。
- external executable 的 availability/process/parser failure 继续按 existing unavailable boundary 结算，不因范围扩大而放宽。

## Open Questions

无。
