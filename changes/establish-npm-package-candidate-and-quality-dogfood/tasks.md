# Tasks

按最小 package proof 推进：生成一个 Bun-only 本地安装包，让 canonical repository `quality` 通过物理安装消费它，再用同一 `.tgz` 完成 focused isolated acceptance。Checked readiness 只表示方向和当前起点已核对，不表示实现或 package evidence 已存在。

## Readiness

- [x] 0.1 确认本 Change 只交付 local package candidate、repository dogfood 与 Gate handoff；公开发布、完整 Gate 和 cutover 属于后继 Change。
- [x] 0.2 从 current-contract owner 固定四个 functions、三个 ordinary Check values 与 named type roots，并执行 Bun-only host Decision。
- [x] 0.3 审计 root manifest、Product runtime imports、`scripts/quality` call path、jscpd manifest/bin、scanner cache owner、Bun/Node tool pins 和后继 Change 输入。
- [x] 0.4 选择一个 fully-derived staging 和一个 `.tgz`；repository 与 isolated consumer 必须安装同一 digest，不把 local build label 当作 public version。
- [x] 0.5 选择 `scripts/quality` private package context 承接 physical local install，保留 canonical Definition/Run；`quality` 在 `index.ts` 建立的 pinned Bun/mise 环境内、scan 前自动准备 candidate，不要求手动准备命令。
- [x] 0.6 收敛 scanner 和投入边界：普通 `jscpd@5.0.11` production dependency + Bun direct bin target；不新增 `.env` protocol、cache redesign、package-manager tracing、完整隔离仓库扫描或 performance SLO。
- [x] 0.7 使用 `test-evidence-review` 完成证据审计：public projection、scanner default/cache、repository bound Run 与 test discovery 已有 Case；自动准备、物理安装与隔离消费没有现成证据，实施时按 Design 的 Test evidence handoff 新增 package-candidate Case，并更新实际修改的既有 Case 映射。

## Implementation

- [ ] 1.1 生成只含 approved public ESM runtime、declarations 和实际 production dependencies 的 candidate staging/manifest；使用 `0.0.0-local.<short-fingerprint>` 作为本地 semver。
- [ ] 1.2 用 `bun pm pack` 生成一个 `.tgz`，实现 allowlisted inventory、exports/types、production dependency 和 artifact identity audit；不要求重复 gzip byte equality。
- [ ] 1.3 在 `scripts/package-candidate/**` 实现唯一自动准备 owner 与 `run-quality.ts`：以 Product/package/build/locked production inputs 和 pinned Bun version 计算 fingerprint；在 `.cache/vibe-check/package-candidate/` 保存 staging、`.tgz` 与 preparation receipt；变化时 build、pack、install，未变化时复用；准备失败时不运行 consumer 或回退旧 candidate。不要建立手动准备前置或通用 artifact cache。
- [ ] 1.4 将 `jscpd@5.0.11` 放入 candidate production dependencies；从已安装 manifest 解析 declared bin target，以 Bun `process.execPath` 执行 availability/scan，并只调整现有 cache backend normalization 所需部分。
- [ ] 1.5 只把 `scripts/quality/project-definition.ts` 与 `project-run.ts` 的 Product imports 迁移到 `vibe-check` public entry；增加 distinct private `scripts/quality/package.json`，并让 nested install 退出 Git、test-evidence、lint、format、typecheck 与 quality traversal；让 `index.ts` 在 pinned 环境中进入 `scripts/package-candidate/run-quality.ts`。让 scripts typecheck 与目标 Project Run test 复用 preparation owner；给 workspace verifier 增加一个 preparation task，并让 typecheck-scripts、test-evidence 和 quality tasks 依赖它。不得增加 source/path alias，保持 root `quality`、`scan.ts`、repository policy 和 annotation consumer 的既有职责。
- [ ] 1.6 建立 repository ancestry 外的临时 Bun consumer，安装 accepted `.tgz`，typecheck approved imports，并在小型 fixture 上运行包含 `duplicateDetection` 的最小 Definition/Run。
- [ ] 1.7 从实际证据写 `candidate-handoff.md`，并只同步已经实施改变的 `AGENTS.md`、architecture/configuration/scanner/script-tooling owner。

## Verification

- [ ] 2.1 对照 current-contract、candidate entry/declarations 和 consumer imports，证明 public inventory 完整且没有 internal、legacy、wildcard、source-path 或 executable `bin` export。
- [ ] 2.2 审计 accepted `.tgz` 的 manifest、exports/types、local identity、production dependencies 和 allowlisted files，并记录 digest。
- [ ] 2.3 从清空 candidate local state 的条件分别运行 scripts typecheck、目标 Project Run test、test-evidence check、`bun run quality` 和 workspace verifier，证明它们共享 preparation owner、无需手动 prepare 且没有并发改写。记录 installed `vibe-check` entry、candidate digest 和 installed jscpd bin/version；无变化重跑不执行 build/pack/install；改变受管 input 后自动 rebuild/reinstall；失败 fixture 不运行 consumer 或回退旧 candidate。证明 nested install 没有进入 test discovery、lint、format、typecheck、quality scope 或 Git status。
- [ ] 2.4 在 isolated consumer 安装同一 digest，完成 public typecheck 和 focused duplicate-detection Run；证明 resolver 与 jscpd 都来自该 consumer install，而非 repository source/devDependency/ancestor fallback。
- [ ] 2.5 运行 scanner default/cache、Project Definition/Run 和 repository Project Run 的最窄 tests；证明 Bun switch 使旧 backend cache identity 失效、不同 install path 不碎片化 default identity，并保持 explicit override 与 external scanner typed outcomes。
- [ ] 2.6 运行受影响 Product/package/quality tests、typecheck、lint、`bun run test-evidence -- check --root .`、`bun run decisions -- check`、`bun run validate`、Change check 和 `bun run verify:vibe-check-workspace:required`。
- [ ] 2.7 运行 `bun run verify:vibe-check-workspace:full` 和 candidate-backed quality；记录一次代表性的原路径、candidate rebuild 与 unchanged-reuse 耗时作为非门禁诊断，完成 `candidate-handoff.md` 并确认没有 registry/publish action。
