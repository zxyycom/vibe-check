# Design

本 Draft 以 Check-specific facts 和 waiver semantics 为先，评估仅限 internal presentation helper 的可复用边界。

## Context

**已确认事实**

- 四个 Check 已复用 `presentCheckFindings`，各自产生至多 10 条 detail message 与一条可选 overflow；这些 messages 是 Check terminal result 的一部分。
- `presentCheckFindings` 的输入 mapper 已允许每个 Check 保持自身 message code、level、text、排序和 overflow wording。
- 真实差异包括 Finding sort key、安全字段/secret redaction、input rejection、waiver identity 和 audit 文案；这些不属于共同 formatter 的可自由合并部分。
- Product progress renderer 对结果做独立的五条 message/Record terminal preview；它不是本 Change 的 owner。

**暂定建议**：先从每个 call site 建立“输入事实—排序—detail/overflow—waiver audit—result append”的差异矩阵，再评估 private helper 或 preset，避免从固定 10 这一数字推导全局 policy。

## Goals / Non-Goals

**Goals**

- 识别确有稳定共同契约的 formatting、level、overflow 或 waiver-audit 编排，并保留每个 Check 的明确 input/output responsibility。
- 比较 private common presenter/preset 与维持现状，给出可审计的取舍及最小验证边界。
- 保持 message detail 上限与 progress preview 的层级说明准确、可从各 owner 恢复。

**Non-Goals**

- 不统一四个 Check 的排序、Finding field、input rejection、waiver identity、blocking policy 或安全/redaction 规则。
- 不新增 global presentation option、全局 preset、跨 Check domain model 或公共 API，除非未来独立 proposal 有被确认的 consumer outcome。
- 不触及 progress renderer 的 count/truncation/hook 候选；那是 `configure-progress-preview` 的独立 Change。

## Decisions

### Intended Change

**暂定建议**：将实施选择限制为以下两条路径，并要求差异矩阵证明其中任一条：

1. 维持 `presentCheckFindings` 加各 Check local mapper，若重复仍承载业务差异或提取会遮蔽 security/waiver contract。
2. 新增 private common helper/preset，仅接收由 Check 已完成排序、过滤、identity/security judgement 后的 presentation-neutral facts；Check 继续构造 message 和 waiver/audit semantics，helper 不解释领域数据。

固定 10 条可以保持为各 Check local policy，除非审计证明它是稳定共同 contract；即使成为 private default，也不自动成为 consumer-configurable global option。

### Resulting Impacts

- 若选择 private helper：修改 shared helper 与四个 local call sites，并对每个 Check 保留或新增 golden tests，以证明 message codes、levels、order、overflow、waiver audits 和 secret-safe fields 不变。
- 若保持现状：记录重复是有意的边界，必要时只补强 owner docs/test comments，不为“去重率”重构。
- 任何共同文档只承接真正共同的 message-presentation contract；Check guides 继续拥有 selection、threshold、parser/adapter、rejection、identity 与 security differences。
- 在实施前审查 package root exports；private consolidation 不得意外扩大 public surface 或 declarations。

## Risks / Trade-offs

过度提取会将安全和 waiver identity 的细微差异抹平，使后续 Check 被错误套用 preset；保持 local 代码则保留表面重复。共享 helper 若接受 raw Finding data，可能重新暴露本应被各 Check redaction 的字段。只以当前四项的 10 条上限为证据会把偶然相同的数字误判为领域无关的公共 policy。

**验证建议（尚未执行）**：先审计 call-site matrix；若实施，运行四个 Check 的最窄 message/waiver tests 和 shared presenter tests，随后执行 docs validation、diff check 与相关 package public-inventory/consumer checks。前轮 Gate 36/36 不属于本 Change 的 implementation proof。

## Open Questions

1. 四项 Check 的 10 条 detail limit 是可替换的 local policy、共同 private default，还是仅当前相同的实现常量？
2. 哪些 level/overflow/waiver-audit wording 在不丢失 Check identity 的条件下可共享？
3. private helper 的最小输入是否能避免接触 raw findings、secret material、identity 或 input rejection？
4. 是否存在第五个真实 consumer（而非内部 Check）需要 public presentation policy；若有，应建立独立 Change 吗？
