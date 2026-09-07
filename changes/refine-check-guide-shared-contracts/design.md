# Design

本 Draft 以 AI 可从单一 owner 恢复共同规则、又能从每个 Check guide 恢复其不可替代差异为准则，处理遗留的文档审查而非重写已有成果。

## Context

**已确认事实**

- 前轮 documentation Change 已完成 README/API/工具 guide/内部 owner 调整；follow-up 已修复 waiver example、四 Check summary、function analyzer detail owner、Markdown parse-facts cache owner 与 SCC 3.7 旧对照。
- 当前仍需要系统审查 files source 的 glob-array replacement、waiver 共同规则及 parser 调用说明的重复/owner 边界。
- `codeAreas` 的领域语义、threshold/default、overlap/duplicate behavior、exact input 和 parser/adapter failure 仍因 Check 而异，不能为缩短文档而统一。
- `docs/development/project-files.md` 当前拥有 selection/source/exact input 的内部实现事实；未来 public file tool 及其随包消费者 guide 尚未获方案或实施批准。

**暂定建议**：先写每一规则的“权威 owner—引用者—Check-local exceptions—consumer task”清单；只有跨 Check 语义完全相同且引用不丢失必要上下文时，才移动为共同说明。

## Goals / Non-Goals

**Goals**

- 找到 files glob arrays、common waiver grammar 和 parser invocation 说明的唯一或最小共同 owner，消除会误导 AI/consumer 的重复与矛盾。
- 保持每个 Check guide 局部自足：读者仍能找到 files selection、领域阈值、overlap、rejection、security、waiver identity 和 unavailable boundary。
- 为可能出现的随包 public file-tool guide 定义推荐的导航关系与消费者共同契约的自足落点，不假设该 tool 已存在或让现有 Check 依赖它。

**Non-Goals**

- 不重做已完成的 README/API/tool guide、summary、function waiver example、analyzer/cache owner 或 SCC cleanup。
- 不通过统一 glob/waiver/parser 文案来统一 `codeAreas` 语义、领域默认值、threshold、overlap、duplicate comparison 或 Check contracts。
- 本轮 Draft 不实施 public file collection、修改 runtime/测试或变更 package docs inventory，也不把未来 guide 伪装成当前硬依赖；未来实施按实际随包材料影响决定是否更新 inventory。

## Decisions

### Intended Change

**暂定建议**：在 Plan 前完成一份 rule matrix，并据此选择以下收敛方式：

- selection/source/glob-array 的内部实现事实与 collection boundary 继续由 project-files owner 承接；若未来公共 file tool 获批，其随包 guide 承接消费者共同 grammar/用法并自足链接到必要边界。各 Check guide 只说明自身 default、area composition、accepted/rejected exact inputs 与特殊 source policy。
- waiver 的通用 `{ identity, reason }` authoring、reconciliation/audit lifecycle 由 finding-waivers guide 承接；各 Check 保留 identity shape、可 waiver/不可 waiver 的 finding scope、security和 result effects。
- parser 调用的一般“谁解析、何时调用、何时 failure/unavailable”仅在确有共同 stable semantics 时提炼；adapter/protocol、cache、supported grammar 和 input rejection 仍留在 owning Check 或 scanner-dependencies。
- 若 public file tool 将来获批，新的随包 guide 可作为 files 消费操作的共同契约 owner，Check guide 到它的链接应是推荐阅读顺序；在工具不存在前不建立 broken link、硬依赖或伪造公开能力。

### Resulting Impacts

- 任何移动都须同步 navigation、交叉链接、published docs inventory/example projection 与 docs validation，使 AI 实际拿到的文本能恢复 owner 与 exception。
- 每个 Check guide 必须在引用共同 owner 时保留最小本地语境，特别是 domain-specific `codeAreas`、defaults、threshold、overlap、identity、rejection 和 safety boundary。
- rule matrix 若发现只属单一 Check 或共性不足，则保留在 local owner，并把“不收敛”记录为刻意结论。
- 若 public file tool Draft 形成实际 contract，需重新审阅这份 Change，确认 docs relation、链接和 consumer workflow；本 Draft 不替代其 API/design/implementation evidence。

## Risks / Trade-offs

过度抽取会令读者必须跨多个文档拼接安全或 failure semantics，反而不利于 AI 消费；保留部分重复则能保住 local self-containment。未来 file tool 未确认时抢先写 guide 会造成虚假能力或链接漂移。将 parser wording 当作纯文案可能隐去 Check-specific adapter/cache/input boundary，故任何合并必须以实际 owner 和局部测试/事实复核为依据。

**验证建议（尚未执行）**：形成 matrix 后对每个受影响 Check 进行代表性 consumer-reading review，核对 links/owner navigation；实施文档调整后运行 docs API projection、docs validation 与 diff check。此前 Gate 36/36 仅覆盖前轮 docs/code，不证明本 Change 的 future documentation revision。

## Open Questions

1. files source 的 glob arrays 哪些是完全共同 grammar，哪些 Check default 或 source policy 必须在 local guide 保留？
2. waiver guide 是否已足以承接所有共同 reconciliation/audit 规则；还缺何种最小本地语境才能避免 identity/scope 误用？
3. parser 调用在四个 Check 间哪些措辞真有共同语义，哪些仍是 scanner/adapter/cache-specific？
4. public file tool 若被确认，哪些 Check guide 应链接到其 guide，推荐阅读次序如何避免成为 runtime 或 configuration hard dependency？
5. 是否存在未完成的事实 owner 更新，还是问题仅限交叉文档重复；若答案是后者，如何避免扩大为重复整理？
