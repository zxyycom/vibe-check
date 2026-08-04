本 design 说明通用 content observation/finding 与 capability input 基础怎样落入现有 Product pipeline；它是临时 change artifact，必须通过实现前审计后才能执行。

## Context

见 [proposal.md](proposal.md) 的动机。当前 `runCurrentRevisionScan` 手写三个 capability，scan completeness 与 machine artifact-set validator 又各自维护相同 membership；`WarningRecord` 强制 numeric `value` 并携带 metric comparison fields。Normalized scope 已能提供稳定 inventory，但 scc、Lizard 与 jscpd selectors 仍按当前三项能力分散组织。

Public semantic config v1 是 complete、closed、tool-neutral contract。本 change 不提前加入具体内容检查配置或 per-file merge；这些由 `add-file-policy-overrides` 和各 feature change 独立拥有。

## Goals / Non-Goals

**Goals:**

- 建立一个 capability descriptor 事实源，并从它派生 execution planning、final-result membership 与 machine validation。
- 在保持 metric comparison 语义的同时，可靠承载不具有 numeric value 的 content/security findings。
- 让成功内容能力发布非阻断current numeric observations，使“没有阈值违规”的度量仍可经machine/human output观察。
- 让后续 capability 只实现自己的 selector、runner、normalizer 与规则，不复制 scope、completeness、gate 或 output orchestration。
- 以 single-active machine v2 完成 breaking transport migration，并保持 current canonical artifact filenames。

**Non-Goals:**

- 不实现 Markdown、链接、JSON、schema、path、secret 或 network 规则。
- 不引入 plugin loading、任意第三方 capability ID 或 project-defined executable。
- 不改变 public config v1；config v2 与 per-file overrides 属于独立 change。
- 不让 content/security findings 自动获得 baseline regression 语义。

## Decisions

### Decision 1: 一个 descriptor registry 拥有 capability execution identity

Product Core 建立 closed descriptor registry。每个 descriptor 声明 stable ID、profile/explicit request predicate、normalized-inventory selector、runner、result normalizer，以及optional observation/finding catalogs；current execution、empty metrics、core validation与artifact-set membership都消费该registry的投影。按semantic ID排序并包含request/result owner及check/metric/evidence semantics的public catalog canonical projection产生`sha256:` registry fingerprint；portable machine v2 schema只验证stable record structure/fingerprint grammar，不从revision-specific registry生成identifier enum。

Selector 在 Core boundary 接收 normalized project-relative inventory、code-area classification 与当前 resolved policy，只返回 exact paths 和 capability-owned immutable policy。Runner 不接收 project root 用于发现输入。选择 registry 而不是继续在 engine、validators 与 output 中维护并行 ID arrays，可消除新增 capability 时的 partial membership 风险；不采用 runtime plugin registry，因为 public config/tool-neutral 与 closed contract 尚无 plugin consumer。

### Decision 2: 使用 closed discriminated finding union

Core 将现有 metric warnings 映射为 `kind = metric`，并预留 `kind = content` 与 `kind = security` 的完整 closed variants。共同字段只承接 gate/report/acceptance 真正共享的 identity、severity、path/location、message/suggestion、changed state 和 accepted reason。Content/security可携带generic closed typed evidence entries；每个check的descriptor catalog拥有key/kind/required/order/redaction/identity语义。

Metric variant 独占 numeric value、metric、comparison basis、baseline 与 delta；content variant 使用 finding code、可选内容无关 fingerprint与catalog evidence；security variant 使用 rule/fingerprint、脱敏message与只允许redacted semantics的catalog evidence，model type 中不存在raw secret/native evidence字段。选择 discriminated union加typed evidence而不是“大量 optional fields”或untyped JSON object，使validator既能拒绝illegal field combination，也能让feature公开pointer、threshold与secondary location；不使用 `value = 1`，因为它会让 aggregate、baseline 与消费者误读为真实 metric。

### Decision 3: Capability failure 与 finding channels 保持正交

Runner 只有在全部 eligible work 完成且 normalized result 有效时才返回 `succeeded` 和 zero-or-more observations/findings。Unavailable、execution、parse/normalization failure 只产生 failed `CapabilityResult`；任何 partial observations/findings 在 boundary 被丢弃。

`all`接受所有finding variants。Descriptor为每个finding产生Core-only causal input path set；single-input finding至少包含primary path，multi-input链接/schema finding还包含实际参与结论的approved target/transitive paths。`changed`按该set与resolved changed scope的交集选择，使target删除或reference变化不会被primary-path-only判断漏掉。`regressions`只从`changed`中接受capability明确提供、且调用者有效显式指定baseline的comparable result，继续满足既有channel subsequence invariants。省略baseline时不从Git、cache、上一提交、location或dependency state推断。Observations不进入任何finding channel、acceptance或gate。Foundation 不为 content/security finding或observations自动 materialize baseline comparison。Gate 继续按 policy descriptor 选择一个 final channel，并仅按 accepted reason 计算 blocking set。

### Decision 4: machine v2 保持文件名但 hard-cut record contract

Machine identity 升级为 `vibe-check.metrics.v2` / `vibe-check.warning.v2` 与对应 immutable schema URNs；runtime schema source、schema-derived DTO、observation/finding mappers、serializers、byte validators、artifact-set validator、published schemas/examples 和 annotation consumer 原子迁移。Metrics v2包含generic current observations；canonical `metrics.json`、`warnings.ndjson`、`warnings-all.ndjson` filenames 保持，避免没有产品收益的路径迁移。

V2 warning record 是 finding union 的 transport projection。Repository 不保留 v1 reader、dual writer 或 union-of-versions validator；迁移诊断和 release note 明确 consumer 必须同步升级。保留 warning filenames 是兼容路径选择，不表示 content/security finding 必须有 numeric warning 语义。

### Decision 5: Registry membership 是 candidate-set invariant

Machine candidates 必须包含 producing revision registry 中每个 descriptor ID 恰好一次。Metrics metadata与每个warning record携带同一`semanticRegistryFingerprint`。Immutable v2 schema只验证capability/check/metric/unit/subject/evidence identifiers、generic record kinds与fingerprint grammar；artifact-set validator先把fingerprint绑定到本revision canonical registry，再检查capability missing/duplicate/unknown、observation catalog、finding check/evidence catalog和overall reducer。这样新增registered ID改变catalog fingerprint但不改变同一immutable schema URI的bytes或meaning。Capability presentation order仍非 semantic；observations、evidence与finding channels按各自owner声明的semantic order。

此设计不允许 output validator启动 capability或重新计算 finding；它只验证 final public relationships。

### Decision 6: Cache identity 按 capability 与 resolved exact input 投影

每个 capability cache key 只包含该 descriptor 的 normalized exact-input fingerprint、measurement-relevant resolved policy 和 internal dependency identity。Foundation 提供 key composition boundary，但具体 capability 决定其 semantic projection。不得使用全量 config hash，也不得让另一个 capability 的 override 无关地失效缓存。

### Decision 7: 后续 feature changes 只扩展已声明挂点

后续独立 changes 必须新增 stable capability/check IDs、selector、runner/normalizer、config schema section、finding rules与targeted validation；会发布numeric facts时还必须注册metric ID/unit/subject-kind catalog与semantic order；需要structured finding data时必须注册typed evidence catalog。它们不得重新定义observation/finding common fields、completeness reducer、gate channels或 machine publication。`add-file-policy-overrides` 独立建立 config v2 与 file policy resolution；foundation 只消费其最终 immutable policy projection。

### Decision 8: Observation 是独立 current fact，不是 finding variant

Core增加closed `ObservationRecord`，字段固定为capability/metric semantic identity、project-relative path、subject、finite value与unit。Descriptor catalog拥有允许的metric/unit/subject组合。`MachineMetricsV2.observations`是唯一machine projection；warning streams不复制，report只从同一records呈现。

选择独立record而不是第四种finding variant，因为结构长度在完全合规时仍需可见，却没有severity、acceptance或blocking语义。Foundation只承诺current observations；baseline趋势或observation regression需要独立change，不从location变化或cache推断。

## Risks / Trade-offs

- [Machine v2 是 breaking change，所有 direct consumers 必须同版本迁移] → 原子更新 schemas、examples、annotation acceptance、docs 和 fixture；禁止 dual contract，并提供明确 migration note。
- [Descriptor registry 容易变成持有所有实现的巨型模块] → registry 只组合 typed descriptors；selector、runner、normalizer 与 check rules 留在 capability-owned modules。
- [Generic evidence 退化为无类型扩展包] → machine只允许closed scalar/location entry kinds；descriptor catalog固定每个check的key/type/required/order/redaction，unknown catalog data使capability invalid-result，backend object永不进入模型。
- [某 capability failure 会使 overall failed，增加扫描脆弱性] → descriptor 先明确 requested/skipped/no-input，只有被请求且有 eligible input 的 required work失败才 failed；联网 capability的 opt-in/temporary failure由其独立 change定义。
- [Registry catalog 与 portable machine schema责任混淆] → Immutable schema只拥有stable structure、fingerprint grammar与non-empty identifiers；artifact携带canonical registry fingerprint，producing-revision validator证明fingerprint和closed catalog/membership，tests证明新增ID只改fingerprint而不mutate v2 schema bytes。

## Migration Plan

1. 建立 descriptor/observation/finding Core types 与 tests，先把现有三项 capabilities无行为变化地迁移到 registry。
2. 将 warning generation、channels、acceptance、gate 与 report改为消费 metric finding variant，并用现有行为 fixture证明等价。
3. 生成并验证 machine v2 runtime schema、DTO、observation/finding mappers、byte/set validators与 canonical examples；同步 annotation consumer和 owner docs。
4. 删除 v1 runtime/publication paths与 current v1 publications，运行 full workspace、producer-consumer和 schema drift验证。
5. 只有阻塞审计与全部 v2 acceptance通过后，后续 content capability changes才能进入实现。

Rollback 以完整回退本 change 为单位恢复 v1；不得在同一 revision保留 runtime switch或双写。

## Open Questions

无未回答开放问题，可以进入实现前审计。
