# Tasks

任务按 readiness、owner-bounded implementation 和 final verification 推进。每个 implementation batch 都先全量轻筛本批条目，只对风险/改动触发 focused/deep review；完成出口是本批 final-hash ledger 闭合、accepted finding 处置、最窄验证完成并经独立 reviewer 接受，而不是“每个文件都有 diff”。

## Readiness

- [ ] 0.1 创建 `evidence/code-scope.json` 与 Change-local verifier，固定290个基线代码源、33个可编辑行为配置、2个生成配置的 selectors、candidate guard、exclusions、discovery 与 SHA-256 规则。
- [ ] 0.2 生成初始 manifest 与 ledger，固定字段、review level、disposition、severity/defer、tombstone、batch coverage review 和 manifest/ledger 双向闭合规则。
- [ ] 0.3 运行并记录起始 Test Evidence、format、product/scripts lint/typecheck、workspace validation、quality 与 Full Project Gate，使既有失败不能被归因给后续批次。
- [ ] 0.4 按下列 owner batch 分配互斥写入范围、调用链依赖、primary agent 和不同 reviewer；测试与紧邻实现归同一批次。
- [x] 0.5 完成 Plan AI-ready、结构与交接审计：proposal、design、tasks 与 portfolio 可独立恢复范围、审查层级、批次协议、evidence freshness、验收与非目标，且 Change Plan 校验通过；本项只证明计划可交接，不替代 0.1–0.4。

## Implementation

- [ ] 1.1 审计并仅按 accepted finding 改进 public-authoring batch：`src/index.ts`、`src/bun-test.d.ts`、`src/contract/**`、`src/foundation/**`、`src/definition/**` 及其共置测试。
- [ ] 1.2 审计并仅按 accepted finding 改进 execution batch：`src/core/**`、`src/scheduler/**`、`src/run/**` 及其共置测试。
- [ ] 1.3 审计并仅按 accepted finding 改进 Check/input/measurement batch：`src/checks/**` 及其共置测试。
- [ ] 1.4 审计并仅按 accepted finding 改进 machine publication batch：`src/output/**` 及其共置测试。
- [ ] 1.5 审计并仅按 accepted finding 改进 development substrate batch：`scripts/bun-test.d.ts`、`scripts/foundation/**`、`scripts/development/**`、`scripts/environment/**` 以及由其消费的 root toolchain/build/package behavior configs。
- [ ] 1.6 审计并仅按 accepted finding 改进 validation/governance batch：`scripts/validation/**`、`scripts/docs/**`、`scripts/test-evidence/**`、`scripts/decision-records/**`，连同共置测试与 Test Evidence behavior configs。
- [ ] 1.7 审计并仅按 accepted finding 改进 delivery/consumer batch：`scripts/package/**`、`scripts/project/**` 及其共置测试和 `scripts/project/package.json`。
- [ ] 1.8 审计并仅按 accepted finding 改进 example/fixture batch：package API examples、configured-typescript fixture TS 与两个 executable wrapper。
- [ ] 1.9 审计并仅按 accepted finding 改进 repository/Skill control-plane batch：`.codex/skills/**/*.mjs`、`.d.mts`、Skill/Codex configs、`AGENTS.md`、`.gitattributes`、`.gitignore`、`.rgignore` 与两个 generated environment configs。
- [ ] 1.10 重新发现最终语料，处理新增、删除、rename、untracked、tombstone 与过期摘要，闭合 manifest、ledger、S0–S3 finding、deferred 路由和最终 diff。

## Verification

- [ ] 2.1 核对每个修改条目的最窄语义证据、影响相称的 product/scripts typecheck/lint/format 或集成检查，以及每个 owner batch 的 independent reviewer 结论。
- [ ] 2.2 对所有触发测试证据维护的改动完成最窄测试、前后 strict Test Evidence、Case Owner/Proves 语义复核和最终全树闭合。
- [ ] 2.3 对实际触及 public entry、Core/Run/Output、schema/example、package candidate、quality/Gate 或文档投影的批次完成对应 owner 的 contract、candidate、consumer 与 docs evidence。
- [ ] 2.4 运行最终 ledger verifier、workspace validation、Decision check 与 `git diff --check`，确认无 unknown/unstable candidate、S0/S1、未受控 S2、`blocked` 或未交接边界。
- [ ] 2.5 运行最终 format、product/scripts typecheck/lint、quality 与 Full Project Gate，记录命令、结果、独立复核结论和未覆盖边界，并逐项确认 proposal Success Criteria。
