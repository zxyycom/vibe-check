# Design

本设计保存 secret detection不可降低的安全/证据边界，并把 detector质量与 provenance列为恢复门禁。

## Context

[`keep-sensitive-quality-record-material-ephemeral.md`](../../docs/decisions/keep-sensitive-quality-record-material-ephemeral.md) 要求 raw敏感材料只存在于 invocation-owned bounded memory。当前 Core接受 arbitrary canonical Record/final data但不做业务级 secret redaction；因此 owning Check必须在调用 reporter或返回 result前完成全部脱敏。Product没有 shared file policy、Manager/TaskPlan、secret catalog或 suppression engine。

首版排序 Decision将 secret detection后置：这不是否定价值，而是因为安全验收和长期 detector维护成本明显高于当前选定的首版 Check集合。

## Goals / Non-Goals

**Goals**

- 只发布不依赖 raw value或其 digest的 safe evidence。
- 让 coverage gap、domain finding与 execution unavailable各有明确语义。
- 在写产品代码前闭合 detector来源、license和 representative corpus。

**Non-Goals**

- 不作为首次公开发布前置。
- 不提供 arbitrary user regex、raw match output、suppression database或 automatic remediation。
- 不扫描 history/environment/home/binary/remote secret systems。

## Decisions

### Intended Change

1. **Detector先审计后实现。** Resume Readiness必须选择 maintained规则/implementation并记录revision、license、derivation/clean-room边界与 corpus结果；只有名称相似或历史计划不足以授权翻译代码。
2. **Bounded classification。** 在 full read前检查 file size；small candidates用 fatal UTF-8与 NUL/binary classifier。Oversize unknown text不调用 detector，并按 closed coverage policy形成 safe gap；known non-text计入 final counts但不产生 secret finding。
3. **Raw material留在 private stack/memory。** Detector API只向上返回 allowlisted rule ID、markerized structural context、range和 ordinal；禁止 raw exception interpolation、writer、persistent cache和 digest。
4. **Safe semantic identity。** Record ID由 rule ID、source path、markerized structural class与 occurrence ordinal组成；不消费 raw match、prefix/suffix、hash或 line。Data可含 current location供导航。
5. **Status分层。** 正常 scanned且无 finding/gap为 `passed`；存在 high-confidence finding为 `failed`。Coverage gap是否 `failed`或 `unavailable`由 resume consumer明确决定；read/detector/protocol throw始终 `unavailable`，不能表示“未发现”。
6. **全 surface canary。** Tests对 success/finding/coverage/read/detector/protocol/output failure后的所有可见和持久 surface搜索 raw canary、substring与 derived digest。

### Resulting Impacts

- Resume时必须同时更新 security docs、production dependency/license、package materials、Cases与 full candidate evidence。
- 任何要求显示 raw match或可逆 fingerprint的 consumer都需要新的长期 Decision，不能局部放宽本 Plan。

## Risks / Trade-offs

- 高置信规则会漏掉未知 secret格式；必须明确 scope，不把产品描述为全面 credential protection。
- Value-independent identity可能牺牲某些去重便利，但避免生成新的敏感关联材料。

## Open Questions

- 首个 detector rule source/implementation及其长期维护 owner。
- Oversize/coverage gap在真实 consumer中应为 `failed`还是 `unavailable`。

## Implementation Observations

2026-08-24：因 detector质量、provenance和 leak-canary验收成本，本 Change后置且不阻塞首版。

## Resume Conditions

1. 用户明确提供实施优先级与目标 consumer。
2. Detector来源、license/provenance和 representative corpus可提交、可复核。
3. 能运行全 surface synthetic leak-canary，无需真实 credential或 host secrets。
