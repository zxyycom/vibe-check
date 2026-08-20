# Tasks

本清单按“已闭合 Readiness → root target cutover → legacy deletion → final evidence”推进；实施者从 1.1 开始，并在每个删除动作前满足相邻证据门禁。

## Readiness

- [x] 0.1 已恢复脚本/测试 owner、直接相关 Decisions、root/direct-source/Codex/document callers 与 CI/workflow 状态，并确认 hard cut 约束 implementation 而非 root name；完整结果见 `readiness-evidence.md`。
- [x] 0.2 已重算 15-file Gate manifest，确认 matching candidate version/fingerprint/tarball/installed entry，并通过 11 个 focused Gate tests 与 strict Test Evidence；完整 identity 见 `readiness-evidence.md`。
- [x] 0.3 已在 tracked state 不变的同一工作树依次通过 legacy/new required、legacy/new full 与一个 docs-disabled partial invocation；完整 counts、logs 和证据边界见 `readiness-evidence.md`。
- [x] 0.4 已审阅 fresh evidence：20-Check mapping、14/19 complete-profile eligibility、progress/transcript/policy 与 exit closure 均成立；除 evidence 声明的 input/manifest drift 外，1.1 可直接开始。

## Implementation

- [ ] 1.1 在 `package.json` 将现有 `verify:vibe-check-workspace`、`:required`、`:full` targets 直接重绑到 `scripts/project-gate/index.ts` 及对应 profile；不增加 legacy forwarding/fallback，正式入口均不传 disabled tags，`quality` 保持唯一 dogfood root。
- [ ] 1.2 重新发现 CI/workflow 与仓库 callers；迁移 direct-call/import `scripts/vibe-check-workspace/**` 的配置和 `.codex/rules/vibe-check.rules` 中的旧 source-path permission。只通过保留 root names 调用的 environment、instructions 与 active Change 不改名。
- [ ] 1.3 按 `test-evidence-review` 更新 Project Gate tests 的 current-authority 表述、Case Owner/Proves 与 root-binding evidence，并标记随 legacy implementation 删除的 workspace adapter/profile entities。
- [ ] 1.4 从重绑后的 root scripts 运行无 disabled-tag required/full；通过后确认 legacy tree 外没有 runtime/test imports，再删除 `scripts/vibe-check-workspace/**`、专属 tests 和只证明该 implementation 的 Cases。
- [ ] 1.5 同步 `docs/script-tooling.md`、`docs/navigation.md`、`docs/testing.md`、`docs/decision-and-change-governance.md`、Active Change Portfolio 与 package/Gate delivery navigation，明确保留 root names 已直接绑定唯一 Project Gate、`quality` 是唯一 dogfood root，并记录实际 CI/workflow 状态与 handoff 分层。

## Verification

- [ ] 2.1 运行 Project Gate adapter/Definition/process focused tests 与受影响的 root-binding tests，再运行 `bun run test-evidence -- check --root .`，证明 current entities/Cases 闭合且不存在 legacy workspace verifier entity。
- [ ] 2.2 运行 `bun run typecheck -- scripts`、`bun run lint -- scripts`、`bun run format -- check` 与 `bun run validate -- docs`。
- [ ] 2.3 从实际 root bindings 运行 `bun run verify:vibe-check-workspace:required`、`bun run verify:vibe-check-workspace:full` 与 base `bun run verify:vibe-check-workspace`，记录它们已到达 Project Gate、无 disabled-tag selection、candidate identity、20-Check outcomes、exit、elapsed 和 invocation log directories；另运行 `bun run quality` 证明 dogfood root 未回归。
- [ ] 2.4 运行 repo-wide legacy audit：全部正式 root targets 到达 Project Gate；current direct-call/import 对 `scripts/vibe-check-workspace/**` 为零；legacy source tree 不存在；CI/workflow 全部绑定新实现或明确不存在；保留 root names 与非当前 evidence references 不计为 legacy implementation。
- [ ] 2.5 写出 `gate-handoff.md`，记录实际 bindings、candidate/manifest、required/full 与 partial evidence、output/exit/log behavior、legacy retirement/audit、重新验证条件，以及由 Plan `baseCommit` 与精确 path set 表达的 VCS rollback boundary；同步下游 handoff links，不宣称后续优化或 publish 已完成。
- [ ] 2.6 复核最终 diff 只包含底层 cutover，运行 `bun run validate -- docs`、`bun run change-plan -- check changes/replace-workspace-verifier-with-project-gate` 与最终 `bun run verify:vibe-check-workspace:full`，逐项对照 proposal Success Criteria 后再请求归档授权与相关 Decision alignment 核对。
