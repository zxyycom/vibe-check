本 tasks 清单把 content observation/finding foundation 拆成可验证步骤；它是临时 change artifact，任务 1.1 完成前不得执行任何实现任务。

## 1. 阻塞级实现前审计

- [ ] 1.1 **BLOCKING：本项完成前不得执行 2.1 及任何后续实现任务。**审计proposal、`content-findings`、`content-observations`及五个modified capability deltas、design与本tasks是否都围绕capability-specific exact inputs、closed observation/finding/evidence records和single-active machine v2；确认capability IDs符合长期owner命名、artifact未声称已批准/可直接实现、未越过本change目录修改长期材料、`## Open Questions`无未回答问题；确认已完成的`stabilize-quality-comparison`在进入实现前已经归档/同步长期spec，或本审计明确承接其effective delta，使任何材料都不恢复baseline自动推断；同时逐一核对`add-file-policy-overrides`、`add-markdown-structure-validation`、`add-markdown-link-validation`、`add-path-reference-validation`、`add-json-validation`、`add-json-schema-validation`、`add-secret-detection`与`add-network-link-validation`的依赖方向、config/check/metric/evidence catalog责任及dependency-aware causal input sets，确认foundation不预取feature规则或public config fields，`changed`/`regressions`继续满足subsequence、baseline只接受显式指定，并解决immutable schema identity与registry expansion的全部矛盾。

## 2. Capability registry 与 exact inputs

- [ ] 2.1 为descriptor registry、canonical semantic registry fingerprint、profile request、selector subset、missing/duplicate/unknown membership和adapter no-rediscovery contract建立失败测试与语义Case
- [ ] 2.2 建立typed closed descriptor registry及sorted public-catalog canonicalizer，并把file/function/duplicate三项现有执行路径迁移为registry members
- [ ] 2.3 从 normalized inventory 投影 capability-specific exact inputs，保证 current、baseline 与 Git-failure fallback 使用同一 selector/policy snapshot
- [ ] 2.4 按 capability 投影 exact input fingerprint、measurement-relevant policy 与 internal dependency identity，更新 cache tests

## 3. Observation、finding、completeness 与 gate core

- [ ] 3.1 为observation catalog/finite values/location、finding evidence key/kind/order/redaction catalog、metric/content/security illegal field combinations和capability failure时partial observation/finding隔离建立model validation tests
- [ ] 3.2 实现closed `ObservationRecord`、closed typed `FindingEvidence`、common finding base与closed metric/content/security variants，并把现有metric warnings无行为变化地迁移到metric variant
- [ ] 3.3 将all/changed/regressions、acceptance和gate evaluator迁移到finding common fields与descriptor-owned causal input path sets，证明dependency-derived finding不被primary-path-only漏掉、两个channel subsequence invariant保持、baseline只接受显式指定、observations始终非阻断且existing metric channel/order/verdict等价
- [ ] 3.4 从registry生成完整final capability results并验证registered observation catalogs，再用shared reducer验证`skipped`、`no-input`、`succeeded`、`failed`与overall completeness

## 4. Single-active machine v2

- [ ] 4.1 为MachineMetricsV2/MachineWarningV2 identities、semantic registry fingerprint equality/grammar、observation/finding schemas、producing-revision registry membership、immutable-schema registry-growth、stream equality、subsequence和gate invariants建立schema/byte/set failure matrices
- [ ] 4.2 实现runtime schema source、schema-derived DTO、explicit observation mapper与单一variant-aware finding mapper，保留canonical artifact filenames
- [ ] 4.3 更新 serializers、warning-stream validator、artifact-set validator与 publication chain，并删除 v1 reader/writer/accepted structure
- [ ] 4.4 重新生成 current metrics/warning v2 schemas与 canonical complete/warning/empty/gate-failed/scan-incomplete examples，运行 independent acceptance与 exact drift checks

## 5. Consumer、报告与迁移材料

- [ ] 5.1 更新report/console observation与finding rendering，确保non-metric findings无虚构value、observations不进入warning/gate且security variant只显示脱敏字段
- [ ] 5.2 更新 annotation consumer 与 producer-to-consumer acceptance，使 zero/non-empty/invalid v2 streams仍保持 all-or-nothing behavior
- [ ] 5.3 同步Scan Configuration context、Scan Scope、Quality Metrics、Output、CLI/consumer owner docs、navigation、migration note与相关Case catalog
- [ ] 5.4 更新 public shallow exports、fixtures与 consumers，确认 repository 没有 current v1 schema/identity/reader残留

## 6. 验收

- [ ] 6.1 运行最窄 model、scope、engine、gate、machine output、publication与annotation tests，并完成 `bun run test-evidence:check`
- [ ] 6.2 运行 product/scripts typecheck、lint、schema/example drift、`bun run validate` 与 dependency/import boundary checks
- [ ] 6.3 运行 `bun run verify:vibe-check-workspace:full` 和 full dogfood scan，确认现有三项 capability 的 observable metric/gate behavior仅发生已声明 v2 transport migration
- [ ] 6.4 复核所有后续 content/security changes 仍处于独立 OpenSpec 审计门禁之后，未随 foundation 偷渡实现
