# Design

本设计先恢复工具可读的可信集合，再审计三个互补语义切面并统一实施，最后收敛为可直接恢复最终状态的 AI-ready 交接。

## Context

`decision-records` 已从 v49 更新到 v53，索引 definition 从 10 升至 11。当前 206 条 archived 记录中有 22 条使用 `alignment: null`；21 条可从 Git 历史恢复最后状态，`260803-defer-lizard-runtime-unification` 从首次建立起即为 archived/null，只能依据正文判断。隔离模拟表明补齐这些字段并全量重建索引后，316 条记录可通过新版严格检查。

## Goals / Non-Goals

目标是恢复兼容性，以完整集合审计并补齐直接演进关系摘要、记录边界、alignment 和 tags，再消除本轮文档中的状态残留、重复证据与结构歧义。非目标是改写决策采用方向、因主题相似而机械合并记录、删除历史记录、把一次性手工例外变成正常维护规则，或改变产品运行时行为。

## Decisions

### Intended Change

先按可信 Git 历史原位修复 21 条 alignment；对唯一无历史值的记录，根据其正文明确描述尚未实施的未来方向而采用 `unaligned`。随后全量重建索引并严格校验。三个只读 Terra 审计切面分别输出关系摘要、生命周期/记录边界和 tags 提案，主代理按 Decision v53 契约核对后实施证据充分的修正。203 条 summary 使用 CLI 事务；CLI 无法表达的 20 条按用户明确授权只补 summary，再全量同步。最后以 AI 消费契约检查 skill、Decision 和 Change artifacts，只做语义保真的结构与表达修正。

### Resulting Impacts

alignment 修复保持 status、createdAt、正文和关系不变。关系结果维持由后继指向真实直接前序、图无环且 summary 不超过 40 个 Unicode 码点；一次性手工批次只匹配既有 type/target，随后严格检查完整图。tags 调整必须有正文依据。AI-ready 编辑只统一 adopted-clause marker、拆分极端长语义单元，并把逐项证据留在结构化 artifact；skill 中当前安全/兼容契约与 archived Decision 的历史含义继续保留。

## Risks / Trade-offs

集合规模大，主题相似不等于演进关系；代理提案由主代理统一审计。历史 null alignment 的唯一无直接证据项存在语义推断风险，但正文持续把方向描述为未实施的未来目标，`unaligned` 比 `aligned` 更符合 v53 定义。一次性手工 summary 没有 CLI transaction 证据，因此必须明确记录授权、精确字段范围与最终图检查。正文拆分存在语义漂移风险，需通过摘要字段不变、关系身份不变和局部 diff 复核约束。

## Open Questions

无。现有 CLI 对 multi-successor per-source summary 的表达缺口仍存在，但用户已授权本 Change 以精确手工补写完成这 20 条边；该例外不要求或授权工具源码变化。

## Implementation Observations

- 22 条 archived alignment 已恢复；21 条直接来自 Git 历史，`260803-defer-lizard-runtime-unification` 依据其“尚未实施的未来方向”正文恢复为 `unaligned`。v11 索引重建后 316 条来源通过严格检查。
- Terra 全量审计确认 223 条既有边的 type/target 均有直接演进依据，不新增、删除或改变关系身份。183 个 source 的 203 条边已逐 source 完成 preflight 和正式 `evolve` 事务；17 个 source 的 20 条边已按一次性授权手工补 summary 并同步。
- tags taxonomy 保持九项；13 条记录补充已有 tag。生命周期 frontier 保持 110 active / 206 archived，没有合并、拆分、归并、重划、archive 或 reactivate 动作；`260805-keep-sensitive-quality-record-material-ephemeral` 经当前 secretDetection owner、实现与测试核对后已用 CLI 标为 aligned。
- AI-ready 复审把三份审计 Markdown 从 824 行收敛为 195 行，结构化证据显式区分 baseline/final/implementation；39 份 Decision 的 191 个全角 adopted-clause marker 已统一，极端长语义单元已按原句边界拆分。
