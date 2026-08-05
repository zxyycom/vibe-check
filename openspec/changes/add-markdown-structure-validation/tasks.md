本tasks artifact仅规划Markdown结构能力，当前仍是未审计临时材料；1.1完成前不得执行任何实现任务。

## 1. 实现前阻塞审计

- [ ] 1.1 **阻塞级审计：本项未完成前不得执行任何实现任务。**核对proposal、design、两个delta specs与tasks均围绕“解析驱动的Markdown结构observations与独立policy findings”，capability/spec IDs命名一致，材料明确临时未审计、未越过本change目录修改长期owner/其它change，且`## Open Questions`无未回答项；对`standardize-quality-capability-contract`核对descriptor exact-input挂点、Observation/Finding/generic typed evidence/MachineMetricsV2 common shape、current-only observations、line-independent identity、显式baseline-only且`regressions ⊆ changed`、sorted registry canonical projection与`semanticRegistryFingerprint`；对`add-file-policy-overrides`核对required core checks不变、optional section缺失不补默认且skipped、neutral-only contribution、override不得创建absent base、array/leaf precedence；逐字段核对complete closed `checks.markdownStructure`的十七个overrideable leaves，尤其`requireFirstHeadingH1`独立、neutral false与heading semantics，并核对quick/full/enabled/no-input状态；逐项核对四个check IDs、全部exact finding codes、evidence key/kind/required/order/identity/redaction、message非机器语义source、六个metric ID/unit/subject combinations、semantic order、accepted registry、line-independent subject/finding identity及explicit-baseline-only comparison；确认注册check/metric/evidence catalogs只更新expected fingerprint/examples/producing-revision validators，不修改immutable machine-v2 schema bytes/shape。审计记录完成前不得开始下列任何任务。

## 2. 解析事实与结构度量

- [ ] 2.1 在 `src/product/**` 建立不泄露 parser 的 GFM semantic-tree adapter，并保留 front matter、代码块、table、list、heading 与 source location 事实。
- [ ] 2.2 实现 document、section、paragraph 的 prose text projection 和 spec 定义的 Unicode `words`/`chars` 度量。
- [ ] 2.3 实现heading depth/skip、single-H1、first-visible-heading-H1与maximum-depth facts/policy，并把每个exact finding code投影为catalog-valid typed evidence。
- [ ] 2.4 注册optional complete config fragment、neutral/override metadata与feature descriptor，使selector只消费normalized inventory和resolved `checks.markdownStructure`选择exact inputs。

## 3. 契约、测试与验证

- [ ] 3.1 同步owner docs、十七-leaf composed config/editor schema、canonical examples、accepted IDs、observation/finding-evidence projection及expected `semanticRegistryFingerprint`；验证producing-revision registry validator拒绝missing/wrong-kind/out-of-order evidence且immutable machine-v2 schema bytes/shape不变。
- [ ] 3.2 为front matter、GFM table/list/code、Unicode度量、semantic order、section/paragraph identity、四类heading rules、exact finding codes/evidence、per-file override、前置空行与显式/省略baseline建立产品测试和fixtures，并按项目测试证据流程维护Case。
- [ ] 3.3 运行受影响的产品 import/typecheck/lint/test、config/output 契约检查与 `bun run verify:vibe-check-workspace:required`，记录无法执行的验证与原因。
