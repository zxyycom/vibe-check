# Tasks

本清单先固定 current candidate/bootstrap 与 20-Check contract，再实施 package-backed Gate，最后用 focused evidence 和同 revision 双入口验收形成 cutover handoff。

## Readiness

- [x] 0.1 已运行 Change/Decision 查询并核对 Configuration、Architecture、Quality Metrics、Output、Script Tooling、Testing 与 Coding Style owner；现有 active decisions 已覆盖 Gate 顺序、project-owned Definition 与 programmatic Product entry，无冲突方向。
- [x] 0.2 已审计当前 legacy catalog、candidate owner 和 private consumer resolution：legacy 共 21 leaves，preparation 是 package import bootstrap；新 candidate-backed graph 应为 20 Checks，required/full 分别执行 14/19。
- [x] 0.3 已审计并固定 candidate Gate adapter grammar、profile/tag flags、expected N/A、failure Record/named policy、per-Check logs、exit mapping、capacity `4` 与 dual-run acceptance；正式 repository/CI Gate contract 不传 disabled tags，但 adapter 不检测 CI 或在行为层禁用 local partial controls；没有需要新增长期 Decision Record 的未决项。
- [x] 0.4 已在 Plan 基线运行包含 strict Test Evidence、current candidate preparation、docs 与正式脚本入口的 required workspace gate；public entry/controls/progress owner 与 legacy category 未在 Plan 后漂移。后续若 fingerprint、public contract 或 catalog 改变，仍须先同步 artifacts 再继续。

## Implementation

- [ ] 1.1 在 `scripts/project-gate/**` 建立 closed descriptor catalog、profile/disabled-tag parser 与 canonical flag/eligibility helpers；catalog 独立拥有 20 个 commands、environment、dependencies、profiles 和 tags，不 import legacy verifier definitions。
- [ ] 1.2 建立 candidate-first adapter：调用唯一 `preparePackageCandidate()`，失败时不 import/run；成功后动态加载 `scripts/quality/project-gate/project-run.ts`，核对 prepared/resolved package entry 完全相同，再创建 unique invocation log directory 并启动 Run。
- [ ] 1.3 在 `scripts/quality/project-gate/**` 建立 descriptor-backed process Check factory、Definition factory 与 bound Run；使用 installed public `vibe-check`，选择 `repository-gate` named policy，启用 Product progress、禁用不需要的 Product effects并固定 scheduler capacity `4`。
- [ ] 1.4 实现每 Check 独立 transcript、zero/nonzero/unavailable/N/A 映射、safe failure Record 和 adapter final closure；只输出 concise bootstrap/summary/log location，不使用 legacy output regex 或把 child transcript 写入 progress target。
- [ ] 1.5 增加 focused catalog/controls/process/log/policy/adapter/package-resolution tests，覆盖 preparation/import guard 与全部 result-to-exit branches；按 `test-evidence-review` 维护 `docs/testing/cases/repository-tooling.md`。
- [ ] 1.6 在行为真正验证后同步 `docs/script-tooling.md` 的 candidate Gate、local partial invocation、正式 repository/CI 无 disabled-tag contract、日志和验证命令；保持 Configuration/Architecture/Quality Metrics/Output 的 Product contract 不变，并刷新直接下游导航摘要。

## Verification

- [ ] 2.1 运行新增 Gate 的最窄 tests、现有 candidate preparation/isolated consumer 与 repository Project Run tests；随后运行 `bun run test-evidence -- check --root .`，证明 current entities 与 Case 语义闭合。
- [ ] 2.2 运行 `bun run typecheck -- scripts`、`bun run lint -- scripts` 与 `bun run format -- check`，并检查局部 diff/关键词，确认新 Gate 不 import Product source、legacy verifier implementation 或 ambient `vibe-check`。
- [ ] 2.3 从 current inputs prepare fresh candidate，记录 version、artifact path、SHA-256、input fingerprint、resolved entry 与 Bun/host；运行 isolated exact-tarball acceptance，并证明 adapter dynamic import entry 与 receipt 完全相同。
- [ ] 2.4 在同一 revision、无 disabled tags 下运行 legacy/new required 与 legacy/new full，记录 14/19 类别矩阵、Check outcomes、named gate、capacity、progress、log 和 exit evidence；另运行至少一个 tag-partial smoke，只作为 N/A 语义证据而不计入 readiness。
- [ ] 2.5 运行 `bun run quality`、`bun run verify:vibe-check-workspace:required` 与 `bun run verify:vibe-check-workspace:full`，确认正式旧入口和 candidate-backed quality 没有回归；旧入口仍是当前门禁，不进行 cutover 或删除。
- [ ] 2.6 从实际证据写 `gate-readiness-handoff.md`，同步下游 cutover Change 的输入/重新验证条件；运行 `bun run decisions -- check`、`bun run validate -- docs`、`bun run change-plan -- check changes/build-candidate-backed-project-gate` 和 `bun run verify:vibe-check-workspace:required`，最后逐项复核 Proposal Success Criteria。
