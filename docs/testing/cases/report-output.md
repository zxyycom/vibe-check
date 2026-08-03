# report-output

## Case AUX-QUALITY-MACHINE-OUTPUT-001: Product output-owned machine contract 稳定
Owner: `docs/output.md#machine-v1-contract-and-ownership`
Entities:
- `bun|src/product/quality-core/src/output/machine/machine-output.test.ts|machine output v1 contract > authors the complete runtime schema contract`
- `bun|src/product/quality-core/src/output/machine/machine-output.test.ts|machine output v1 contract > projects the exact public field set through one warning mapper`
Proves:
- Output-owned JSON Schema 2020-12 source 固定唯一 current metrics/warning identities、canonical paths、immutable `$id`、closed fields、typed maps、required/optional/null/numeric/enum constraints、descriptions 与 metrics-to-warning URN references。
- Machine DTO projection 使用 current metrics/warning v1 identities，且 core `WarningRecord` 不获得 transport identity。

## Case AUX-QUALITY-MACHINE-PROJECTION-001: Product explicit machine DTO projection 稳定
Owner: `docs/output.md#core-to-machine-projection`
Entities:
- `bun|src/product/quality-core/src/output/machine/machine-output.test.ts|machine output v1 contract > projects the exact public field set through one warning mapper`
- `bun|src/product/quality-core/src/output/machine/machine-output.test.ts|machine output v1 contract > serializes deterministic metrics and warning stream matrices`
Proves:
- Explicit DTO projection 保留 baseline field set 与 source array order，替换 transport identities，忽略 private core fields，并让全部 channels 与 gate blocking records 复用同一个 warning mapper。
- 两个 warning stream candidates 只读取 machine DTO 的 `changed` / `all` channels，不建立第二条 core projection path。

## Case AUX-QUALITY-MACHINE-SERIALIZER-001: Product machine serializer 正向 byte grammar 稳定
Owner: `docs/output.md#serialization-and-byte-grammar`
Entities:
- `bun|src/product/quality-core/src/output/machine/machine-output.test.ts|machine output v1 contract > serializes deterministic metrics and warning stream matrices`
Proves:
- Metrics serializer 产生 deterministic two-space JSON 且无 final LF。
- Warning serializer 对 empty channel 产生 zero bytes，并对 single/multiple records 逐条产生 compact JSON + LF。

## Case AUX-QUALITY-MACHINE-VALIDATION-001: Product machine byte grammar validation 稳定
Owner: `docs/output.md#serialization-and-byte-grammar`
Entities:
- `bun|src/product/quality-core/src/output/machine/validation.test.ts|machine output v1 validation > accepts the positive byte grammar matrix`
- `bun|src/product/quality-core/src/output/machine/validation.test.ts|machine output v1 validation > rejects the byte grammar and schema failure matrix without partial values`
Proves:
- Metrics 与 warning validators 从 bytes 执行 fatal UTF-8、BOM、JSON root/record framing 和 current runtime schema validation，并接受规范允许的 JSON whitespace、key order、record 内 non-LF whitespace 与 CRLF。
- 任一 decoding、framing、syntax 或 schema failure 都返回 logical artifact 与适用 pointer/line/index diagnostic，不返回已解析 prefix。

## Case AUX-QUALITY-MACHINE-ARTIFACT-SET-001: Product machine artifact-set predicate 稳定
Owner: `docs/output.md#artifact-set-validation`
Entities:
- `bun|src/product/quality-core/src/output/machine/validation.test.ts|machine output v1 validation > accepts and rejects the complete artifact-set invariant matrices`
Proves:
- Complete artifact-set validation 证明两个 stream/channel deep equality、warning channel order/multiplicity subsequences、stable capability exact membership 与 shared completeness reduction。
- Evaluated gate validation 复用 policy descriptor，并证明 channel/count/blocking order/status 关系；empty accepted reason 保持 blocking，whitespace-only non-empty reason 保持 accepted。

## Case AUX-DOCS-MACHINE-ARTIFACTS-001: Independent docs machine artifact acceptance 稳定
Owner: `docs/testing.md#machine-output-proof-layers`
Entities:
- `bun|scripts/tools/validators/schema/machine-artifacts.test.ts|independent docs machine artifact validation > accepts exactly the five canonical sets and positive grammar variants`
- `bun|scripts/tools/validators/schema/machine-artifacts.test.ts|independent docs machine artifact validation > rejects focused mutations with locations and detects reversible generated drift`
Proves:
- Docs tooling 从 checked-in current schemas 与原始 example bytes 独立验证 exact 五组 current sets、正向 JSON/NDJSON grammar、stream/channel、capability/completeness 与 evaluated-gate invariants，不复用 product validator；historical report materials 不进入 current example traversal。
- Focused identity/schema/grammar/set mutations 产生带 path 及适用 pointer/line/index/relationship 的整体 failure；schema/example generation drift 使 owning required check 失败并可恢复。

## Case AUX-QUALITY-MACHINE-PUBLICATION-001: Product validated machine publication 稳定
Owner: `docs/output.md#validated-publication-and-evidence`
Entities:
- `bun|src/product/quality-core/src/output/machine/publication.test.ts|validated machine artifact publication > rejects an invalid candidate set before writing canonical files`
- `bun|src/product/quality-core/src/output/machine/publication.test.ts|validated machine artifact publication > cleans prior canonical and owned temp files before publishing all candidates`
- `bun|src/product/quality-core/src/output/machine/publication.test.ts|validated machine artifact publication > best-effort cleans every canonical and owned temp after handled file failures`
- `bun|src/product/quality-core/src/engine.test.ts|quality scan process outcome > publishes the same warnings and GateResult across successful outputs`
- `bun|src/product/quality-core/src/engine.test.ts|quality scan process outcome > returns failed when artifact output fails after a failed gate was computed`
- `bun|src/product/quality-core/src/engine.test.ts|quality scan process outcome > does not publish a computed failed gate when output validation fails`
- `bun|src/product/cli-omitted-gate-baseline.test.ts|formal CLI current projection regression baseline > records the complete-passed projection and outcome`
- `bun|src/product/cli-omitted-gate-baseline.test.ts|formal CLI current projection regression baseline > records the complete-warning projection and outcome`
- `bun|src/product/cli-omitted-gate-baseline.test.ts|formal CLI current projection regression baseline > records the legitimate-empty projection and outcome`
- `bun|src/product/cli-omitted-gate-baseline.test.ts|formal CLI current projection regression baseline > records the scan-incomplete projection and outcome`
- `bun|src/product/cli-omitted-gate-baseline.test.ts|formal CLI current projection regression baseline > returns output failure without a partial canonical machine set`
- `bun|src/product/cli-gate-acceptance.test.ts|formal CLI quality gate acceptance > fails an all gate for an all-only warning channel`
Proves:
- Producer 在 core validation 后只投影一个 DTO，并在任何 canonical write 前验证三组 in-memory candidates；prior canonical/owned temps 在 same-directory temp writes 与 renames 前清理，全部三个 canonical 完成后才暴露 paths。
- Candidate/core validation 在写前 best-effort 清除 prior canonical 与 owned temps且不产生 current canonical；handled cleanup、temp-write、rename 与 report-output failure 同样清除 machine set，保持 output `failed` / exit `2` 优先于 computed gate。
- Complete passed、complete warning、legitimate empty、gate failed 与 scan incomplete 的正式入口均以原始 bytes 通过 production artifact-set validator；scan incomplete 保持 contract-valid domain failure，report 与 raw scanner artifacts 继续消费 core/scanner-owned data。

## Case AUX-QUALITY-ANNOTATION-001: Direct warning consumer 严格验证后渲染
Owner: `docs/script-tooling.md#quality-annotation-consumer`
Entities:
- `bun|scripts/quality/annotate.test.ts|quality annotation CLI > accepts the conforming stream, defaults, filtering, and limit matrix`
- `bun|scripts/quality/annotate.test.ts|quality annotation CLI > fails closed for argument, read, decoding, framing, syntax, and schema errors`
Proves:
- Annotation CLI 固定 `[warnings-path] [limit]`、canonical default path、default `5` 与 safe canonical positive-decimal limit；conforming non-empty/zero-byte streams 分别产生 limited non-blocking annotations/zero output 并退出 `0`。
- Consumer 以 bytes 调用 shallow Product warning-stream validator，完整成功后才过滤 `info` 与应用 limit；argument、read、decoding、framing、syntax 或 schema failure 向 stderr 返回 actionable diagnostic、stdout 不产生 partial annotation command 并退出 `2`。

## Case AUX-QUALITY-PRODUCER-ANNOTATION-001: Formal producer output 被实际 annotation CLI 消费
Owner: `docs/testing.md#producer-to-consumer-acceptance`
Entities:
- `bun|scripts/quality/producer-annotation-acceptance.test.ts|producer-to-annotation acceptance > connects formal non-empty, zero-byte, and invalid producer streams to the actual consumer`
Proves:
- 正式 Product CLI 从临时复制的既有 project fixture 生成 non-empty 与 zero-byte current warning streams，实际 `quality:annotate` package CLI 对两者均退出 `0`。
- Acceptance 从 produced valid record 派生 schema-invalid suffix，证明 direct consumer 返回 validator line/pointer diagnostic、stdout 不含 valid-prefix annotation 并退出 `2`。

## Case AUX-QUALITY-REPORT-001: Quality report 排名和 changed-file 摘要稳定
Owner: `docs/output.md#typescript-product-output-boundary`
Entities:
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > applies configured watchlist visibility and limit independently from ranking top N`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > keeps changed-file watchlist useful without baseline annotations`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > keeps disabled gates silent in human reports`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > labels scc file Complexity as decision-token count and shows total-token share`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > projects a passed all gate for the resolved profile before detailed output`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > projects failed gate blocking warnings in GateResult order`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > shows accepted reasons next to warning records`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > shows actionable diagnostics for failed capabilities`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > shows code-area decision-token hotspots by total-token share`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > shows completeness states and explains an empty quality evaluation`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > sorts rankings by metric without mutating scanner output order`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > uses baseline owner status for comparison-unavailable actions`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > uses failed capability actions for scan-incomplete gates`
- `bun|src/product/quality-core/src/output/report/markdown-report.test.ts|quality report > uses resolved profile and scan scope for no-eligible-input actions`
Proves:
- baseline unavailable 时 changed-file watchlist 仍按风险展示有用文件。
- rankings 排序不修改 scanner output 原始顺序。
- Report config 控制 Changed Files Watchlist visibility 与独立展示上限。
- scc `Complexity` 文件列在人类报告中展示为 decision-token count，并补充热点占比。
- Code Area 汇总表展示 decision-token count 和总量占比，用于定位热点区域。
- 带 `acceptedReason` 的 warning 在报告中贴近对应 warning 展示原因，不从单独质量扫描中消失。
- Disabled gate 保持 report human silence；requested gate section 位于 summary/comparison context 与 detailed output 之间，并投影 state-specific fields。
- Failed gate 按 GateResult ordering 展示 blocking warnings；not-evaluated action 分别来自 capability diagnostic、resolved profile/scope 或 baseline owner status。

## Case WB-OUTPUT-GATE-CONSOLE-001: Product gate console projection 稳定
Owner: `docs/output.md#gate-projection`
Entities:
- `bun|src/product/quality-core/src/scan-command/command-output.test.ts|gate console projection > keeps disabled gates silent`
- `bun|src/product/quality-core/src/scan-command/command-output.test.ts|gate console projection > prints evaluated passed and failed state fields to stdout`
- `bun|src/product/quality-core/src/scan-command/command-output.test.ts|gate console projection > prints not-evaluated reasons and owner actions to stderr`
Proves:
- Disabled gate 不写 human gate output。
- Evaluated passed/failed gate 将 state-specific policy、channel 和 counts 写 stdout。
- Not-evaluated gate 将 closed reason 与 owner-derived action 写 stderr，不伪装成 evaluated conclusion。

## Case WB-OUTPUT-NOTICES-001: Product report notice 所有权和位置稳定
Owner: `docs/output.md#typescript-product-output-boundary`
Entities:
- `bun|src/product/config.test.ts|product report notices > renders current TypeScript/Bun release ownership at the stable notice positions`
Proves:
- 顶部 non-blocking notice 紧随报告标题，并将 TypeScript/Bun 产品 CLI、报告契约和产品测试标识为 release contract。
- Footer notice 保持为报告末行，并将 TypeScript/Bun 产品测试和契约校验标识为 release gates。
- 两处 notice 不再将已退役的 Rust CLI、schema 或测试标识为当前 release owner。
