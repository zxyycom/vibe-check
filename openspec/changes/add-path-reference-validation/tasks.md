本tasks artifact仅规划文本路径literal检查，当前仍是未审计临时材料；1.1完成前不得执行任何实现任务。

## 1. 实现前阻塞审计

- [ ] 1.1 **阻塞级审计：本项未完成前不得执行任何实现任务。**核对proposal、design、两个delta specs与tasks均围绕“文本absolute/forbidden path literals而非import/dependency graph”，capability/spec IDs命名一致，材料明确临时未审计、未越过本change目录/README修改长期owner或其它change，且`## Open Questions`无未回答项；对`standardize-quality-capability-contract`核对descriptor/Finding/generic typed evidence/MachineMetricsV2 common shape、model-boundary redaction、line-independent identity、explicit-baseline-only且`regressions ⊆ changed`、sorted registry projection与`semanticRegistryFingerprint`；对`add-file-policy-overrides`核对required core checks不变、optional section缺失不补neutral且skipped、present complete、patch不得构造absent base与array replacement/precedence；逐字段核对complete closed `checks.pathReferences`、overrideable/neutral/allow>forbid>absolute exact precedence、quick/full/enabled/no-input、两个check IDs、全部exact finding codes、evidence key/kind/required/order/identity/redaction与message非机器语义source；确认classification/policyRule/sanitizedDisplay/ordinal机器可读，raw project root/absolute/forbidden literal及location不进identity/evidence/output；核对Markdown destination/autolink由canonical `add-markdown-link-validation`独占而visible label仍检查；确认catalog只更新expected fingerprint/examples/fixtures/producing-revision validators，不修改immutable machine-v2 schema bytes/shape。审计记录完成前不得开始下列任何任务。

## 2. 文本字面量检测与政策判定

- [ ] 2.1 在`src/product/**`建立不泄露parser的Markdown/text semantic segmentation，按policy选择visible prose/list/table/code并无条件排除link destination/autolink metadata。
- [ ] 2.2 实现 POSIX、Windows drive/UNC、file URI 与 forbidden literal 的路径-token 分类和边界校验，明确排除 relative paths、URL 与 import/dependency 推断。
- [ ] 2.3 注册optional complete config fragment、neutral/override metadata与feature descriptor，实现resolved allowed/forbidden/code policy、exact finding-code/typed-evidence catalogs及line-independent opaque identity。
- [ ] 2.4 在normalized finding boundary把所有absolute/forbidden values投影为closed sanitized displays，证明raw root/absolute/literal无法到达message、accepted matching、fingerprint、cache或output，且不得读取候选路径或解析import graph。

## 3. 契约、测试与验证

- [ ] 3.1 同步owner docs、composed config/editor schema、canonical examples、accepted IDs、finding-evidence catalogs及expected `semanticRegistryFingerprint`；验证registry validator拒绝missing/wrong-kind/out-of-order/redaction-invalid evidence且immutable machine-v2 schema bytes/shape不变。
- [ ] 3.2 为prose/code policy、`add-markdown-link-validation` destination exclusion、POSIX/Windows/UNC/file URI、project-root/absolute/literal leak canaries、literal precedence、false positives、typed evidence、前置空行identity与显式/省略baseline建立产品测试和fixtures，并按项目测试证据流程维护Case。
- [ ] 3.3 运行受影响的产品 import/typecheck/lint/test、config/output 契约检查与 `bun run verify:vibe-check-workspace:required`，并验证输出不含测试项目根绝对路径。
