本tasks artifact仅规划离线Markdown链接能力，当前仍是未审计临时材料；1.1完成前不得执行任何实现任务。

## 1. 实现前阻塞审计

- [ ] 1.1 **阻塞级审计：本项未完成前不得执行任何实现任务。**核对proposal、design、两个delta specs与tasks均围绕“离线确定性Markdown链接分类、本地验证与safe external handoff”，capability/spec IDs命名一致，材料明确临时未审计、未越过本change目录/README修改长期owner或其它change，且`## Open Questions`无未回答项；对foundation核对descriptor/Finding/generic typed evidence/MachineMetricsV2 common shape、line-independent identity、explicit-baseline-only regressions、changed/regressions subsequence、sorted registry projection与`semanticRegistryFingerprint`；对file-policy核对required core checks不变、optional section缺失不补neutral且skipped、present complete与patch不得构造absent base；逐字段核对complete closed `checks.markdownLinks`、overrideable/neutral/quick/full/enabled/no-input、三个check IDs、全部exact codes与evidence key/kind/required/order/identity/redaction、message非机器语义source、causal source/actual-target changed membership；逐字段对照canonical `add-network-link-validation`，确认candidate identity只用sourcePath/linkKind/sanitized scheme-host-port-path-ordered-query-key shape/ordinal，query value/userinfo/fragment/location不参与，raw/full URL仅bounded transient且不进log/cache/artifact/public DTO，external candidate不是finding且network不回写；确认catalog只更新expected fingerprint/examples/fixtures/producing-revision validators，不修改immutable machine-v2 schema bytes/shape。审计记录完成前不得开始下列任何任务。

## 2. 离线链接语义

- [ ] 2.1 在 `src/product/**` 建立不泄露 parser 的 GFM link occurrence adapter，提取 inline/reference/image links、位置和必要 source metadata。
- [ ] 2.2 实现 mutually exclusive 的离线分类、UTF-8 percent-decode、query/fragment 处理和 `gfm-heading-slug-v1` heading index。
- [ ] 2.3 实现 project-root-aware 的 local target/anchor validation，并在读取前强制 lexical containment 与 existing-target realpath/symlink containment。
- [ ] 2.4 仅为external URL产生精确包含sourcePath/linkKind/classification/safeUrlShape/ordinal/semanticIdentity的sanitized `ExternalLinkCandidate`；把location与closed raw/canonical request values分别放入identity-keyed bounded ephemeral lookups并由request boundary读取后释放，证明query value/userinfo/fragment/location不进candidate identity或任何log/cache/artifact/public DTO，并将network work留给`add-network-link-validation`。
- [ ] 2.5 注册optional complete config fragment、neutral/override metadata与feature descriptor，使selector只消费normalized inventory和resolved `checks.markdownLinks`，且不依赖structure check状态/阈值。
- [ ] 2.6 实现三个checks的exact finding-code/typed-evidence projection与descriptor-owned causal path sets，使target-only change可进入changed且regressions保持显式baseline下的changed subsequence。

## 3. 契约、测试与验证

- [ ] 3.1 同步owner docs、composed config/editor schema、canonical examples、accepted IDs、finding-evidence catalogs及expected `semanticRegistryFingerprint`；验证registry validator拒绝missing/wrong-kind/out-of-order/redaction-invalid evidence且immutable machine-v2 schema bytes/shape不变。
- [ ] 3.2 为inline/reference/image、全部分类、typed evidence、encoded targets、query/userinfo/fragment sanitization、duplicate slugs、missing targets/anchors、target-only changed、symlink escape、前置空行identity与显式/省略baseline建立产品测试和fixtures，并按项目测试证据流程维护Case。
- [ ] 3.3 运行受影响的产品 import/typecheck/lint/test、config/output 契约检查与 `bun run verify:vibe-check-workspace:required`，证明扫描没有网络 I/O 并记录无法执行的验证。
