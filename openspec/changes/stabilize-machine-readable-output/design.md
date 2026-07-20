本 design 起草当前 TypeScript 产品既有 machine artifacts 的首个稳定 contract；当前 change 仅在 `openspec/changes/stabilize-machine-readable-output/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## Context

当前 Product CLI 把完整 `QualityMetrics` 写入 `metrics.json`，把 `warnings.changed` 与 `warnings.all` 分别写入 `warnings.ndjson` 和 `warnings-all.ndjson`。`metrics.metadata.schemaVersion` 目前为未承诺的 `"0.4.0"`，warning record 没有 schema identity；仓库现有 `vibe-check-report.schema.json` 与 JSON examples 则属于已退役 Rust stdout report，shape 与当前 artifacts 不同。

本 change 在 `make-scan-completeness-observable` 与 `add-ci-quality-gates` 收敛后稳定既有 artifacts。它不增加平行 result file，也不把 console 变成 JSON transport。

## Goals / Non-Goals

**Goals:**

- 为当前 `metrics.json` 和 warning NDJSON 建立 versioned JSON Schema。
- 固定 artifact 名称、channel semantics、cross-artifact consistency 与版本演进规则。
- 提供可执行 examples 和 producer/consumer validation。
- 让 repository automation 只读取声明为 stable 的 machine fields。

**Non-Goals:**

- 不恢复 retired Rust `vibe-check.report.v1` envelope 或 JSON stdout mode。
- 不改变 scanner、warning、completeness、gate 或 exit semantics。
- 不新增 `result.json`、manifest、regressions NDJSON 或其它平行 artifact。
- 不把 raw scanner output 纳入 public contract。

## Decisions

### Decision 1: 稳定既有 artifact，而不是设计第二套 envelope

`metrics.json` 继续序列化 product-owned `QualityMetrics`；`warnings.ndjson` 继续逐行投影 `metrics.warnings.changed`，`warnings-all.ndjson` 继续逐行投影 `metrics.warnings.all`。`report.md` 和 console 仍为人读 output，不受 JSON Schema 管辖。

新的 schemas 使用独立文件 `docs/schemas/vibe-check-metrics.schema.json` 与 `docs/schemas/vibe-check-warning.schema.json`。Retired `docs/schemas/vibe-check-report.schema.json` 不被改名或复用；navigation 必须把历史 contract 与 current-product schemas 分开。

### Decision 2: 首个稳定 identity 使用 namespaced v1 token

本 change 落地时：

- `metrics.metadata.schemaVersion` 从 pre-contract `"0.4.0"` 改为 `"vibe-check.metrics.v1"`。
- 每个 `WarningRecord` 增加必填 `schemaVersion: "vibe-check.warning.v1"`，因此 NDJSON 单行可独立识别 contract。
- 两个 JSON Schema 使用对应 token 作为 const，并使用稳定 `$id`。

同一 v1 token 下，字段名称、required/optional、类型、closed enum、nullability、单位、排序含义和语义全部冻结。任何新增/删除字段、requiredness 变化、类型变化、closed enum 扩展或语义变化都 MUST 发布新的 namespaced version、schema、examples 与迁移说明；纯说明澄清只有在不改变任何有效/无效 instance 集合和 consumer 语义时才能保留 v1。该严格规则优先于在 v1 内做“看似兼容”的 optional field 演进。

### Decision 3: Warning NDJSON 是 versioned record stream

两个 NDJSON artifacts 每个非空行都 MUST 独立通过 warning schema；零 warning 使用空文件，不写 header 或 sentinel。Record ordering 与 adjacent `metrics.json` 中对应 channel 完全一致：

- `warnings.ndjson` 等于 `metrics.warnings.changed`。
- `warnings-all.ndjson` 等于 `metrics.warnings.all`。

第一版不增加 `warnings-regressions.ndjson`。需要 regression channel 的 consumer 从 versioned `metrics.json` 读取，避免扩大 artifact surface。

### Decision 4: Producer validation 同时证明 schema 和跨 artifact invariant

Output 在写入前先验证 product model invariants，写入后使用 current schemas 验证 `metrics.json` 和每行 warning record，并验证 version token、channel length、record ordering 与逐项 deep equality。Schema/output validation failure 继续属于 runtime/output failure，使用既有 exit `2`，不得降级为 gate failure或成功 artifact。

Schemas 对 product-owned object 使用 closed fields，避免 typo 悄悄进入稳定 contract。动态 map 的 key space、明确标记的 metadata value 和 scanner-private raw files不因此成为 public extension points。

### Decision 5: Examples 按 observable outcome 组织

Current-product examples 放在与 retired `docs/examples/json/` 分离的 `docs/examples/artifacts/`，至少覆盖：

- complete passed；
- legitimate empty；
- complete warning；
- gate failed；
- runtime/completeness failed。

每个 example 包含可确定验证的 `metrics.json`，并在适用时包含对应 warning streams；动态 timestamp、absolute path 与 tool version 使用文档化 fixture values。Examples 由与生产 serializer 相同的 schema/invariant validator验证，不允许手工 drift。

### Decision 6: Automation 只消费 stable fields

CI annotation、workspace verifier 与 dogfood summary 只能读取 v1 schemas 声明的 fields，并在遇到未知 schema token、缺失 required field 或 schema-invalid record 时 fail closed。Consumer MUST NOT 解析 operational console、Markdown table 或 raw scanner artifact 取得 machine decision。

## Risks / Trade-offs

- [v1 token 与 warning field 是一次 breaking migration] → 只在先行 completeness/gate fields 收敛后发布，并让 producer、examples 与 repository consumers 在同一 change 迁移。
- [closed v1 contract 会提高后续字段演进成本] → 以明确 v2 change 换取 consumer 可预测性；内部 scanner data 继续留在 private boundary。
- [写后 schema validation 增加少量 IO/CPU] → artifacts 规模相对 scanner 工作量很小；保留范围明确的 validation budget和 tests。
- [历史 schema 与当前 schema 同目录可能被误用] → navigation、标题和 owner docs 明确 current/retired 状态，文件名不复用。

## Migration Plan

1. 先归档 `make-scan-completeness-observable` 与 `add-ci-quality-gates`，冻结最终 `QualityMetrics` / `WarningRecord` source model。
2. 审计 pre-contract `0.4.0` artifacts、retired Rust schemas/examples 和所有 repository consumers。
3. 增加 namespaced v1 tokens、current-product schemas 与 serializer validation。
4. 生成并验证 outcome examples与 cross-artifact consistency cases。
5. 原子迁移 CI annotation、workspace verifier、dogfood scripts 与 owner docs。
6. 重放正式入口和 required workspace verification，拒绝 unknown-version 与 mutated fixtures。

回滚必须让 producer 与 repository consumers 回到同一 pre-contract revision；不得 dual-write 第二套 artifact，也不得让 v1 consumer 静默接受 `0.4.0`。

## Open Questions

无。Artifact surface、v1 identity、NDJSON framing、compatibility 与 migration order 均在本 design 中固定。
