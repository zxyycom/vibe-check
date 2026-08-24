# Design

本设计用一个 package-private strict JSON boundary支撑 `json-validation`，并保持 parser、领域 data 与缺陷语义归 owning Check。

## Context

当前 Check callback 收到 validated `options`、`project.root`、global file scope、Record reporter 与 cancellation signal。`collectScanFiles` 已提供稳定排序的 normalized candidates；Core 只要求每个 Record 在 owning Check 内拥有唯一 `id` 和 canonical object data。Product 没有 shared file policy、comparison/reference channel、Record catalog 或 feature-local scheduler。

首版排序由 [`complete-first-release-check-set-before-publication.md`](../../docs/decisions/complete-first-release-check-set-before-publication.md) 确认；`json-schema-validation` 只复用本 Change 的 private document result，不依赖本 Check 的运行结果或 public final data。

## Goals / Non-Goals

**Goals**

- 用成熟、可审计的 parser boundary 处理严格 bytes/grammar/duplicate-key 语义。
- 让缺陷 Records、final counts、失败与 no-input 结果可预测且不泄露原文。
- 把所有公共变化限制在一个 ordinary default Check value 与自己的 options type。

**Non-Goals**

- 不提供 public parser、JSON AST、formatter、repair 或 schema API。
- 不建立 per-file shared override、cache、baseline/comparison 或新 Core entity。
- 不把 JSON Schema document/instance verdict 混入本 Check。

## Decisions

### Intended Change

1. **输入来自现有 global scope。** Callback 调用现有 file collector，再按 `.json` 选择 eligible paths；所有 normalized paths 必须保持在已收集集合内。首版不增加 per-file override，真实 consumer需要时再由 JSON Check独立演进 options。
2. **读取和解析有明确预算。** 在读取前检查 `maximumBytes`，使用 fatal UTF-8 decoder；BOM 与超限作为正常 document defect，filesystem/read/cancellation 作为 `unavailable`，不能被伪装成 clean result。
3. **优先使用成熟 parser dependency。** Readiness 审计候选 dependency 的 Bun compatibility、license、strict-mode errors、source offsets 与 duplicate-key visitor；只有无法满足时才实现最小 lexer/parser，不复制完整 JSON tooling。
4. **Private result 不泄漏 parser types。** Boundary 返回 normalized success value或 closed issues（`invalid-utf8 | bom | syntax | trailing-content | duplicate-key | too-large`），包含安全 pointer/key/offset信息；JSON Schema owner可在同进程复用该 result。
5. **Records 使用 Check-local identity。** ID 由 normalized path、reason、safe semantic subject 与同类 occurrence ordinal组成；line/column仅进入 data 导航字段。Records按 path、offset、reason排序后提交。
6. **Status 由 owning Check 直接折叠。** 无 inputs 为 `not-applicable`；正常完成且 issues 为零为 `passed`，否则 `failed`；final data包含版本与 counts。Callback/read/parser protocol failure返回受控 `unavailable`，已接受 Records遵守现有 Core 保留规则。
7. **Public surface 按 current owner 接线。** `default-checks.ts`、runtime option validation、`src/index.ts`、public contract inventory、README/JSDoc/example 与 package candidate 同步；不增加 subpath 或 CLI。

### Resulting Impacts

- JSON Schema Check 必须调用相同 private strict-document implementation，避免同一 bytes 在两项 Checks 中产生不同 grammar/duplicate-key判断。
- Parser dependency若进入 installed runtime，必须进入 production dependency closure 与 package/license evidence。

## Risks / Trade-offs

- Duplicate-key detection 容易被普通 `JSON.parse` 丢失；必须在对象 materialization 前观察 decoded property names。
- 大文件或大量 issues 可能放大内存；首版使用明确 byte limit 与 deterministic issue cap，达到 cap 时仍返回 failed并在 final data 标明截断，而不是静默通过。
- 不公开原文或 parser message 会减少即时细节，但稳定 reason、path、pointer和位置足以行动，并避免 backend wording成为契约。

## Open Questions

无。候选 parser package 是 readiness 的可替换实现选择，不改变上述产品契约。

## Implementation Observations

2026-08-24 已按当前 `src/{checks,definition,core,run,output}/**` seam 重置；旧 `src/product/**`、TaskPlan/Manager、named reference、comparison/cache 与 shared file-policy内容不再适用。
