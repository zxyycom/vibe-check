# Proposal

本 Draft 是完整 Project Gate 的最终仓库 cutover：在 candidate-backed Gate 已通过 readiness evidence 后，把它切换为项目唯一的正式门禁入口，并退役旧 workspace verifier。它不再建设 Check、控制契约、renderer 或 npm artifact，而是负责入口、引用、删除和回退边界。

## Why

“已有一个可运行的新 Gate”与“仓库只剩这一个可信门禁”是不同的交付。前者主要承担功能与 package-consumer 风险；后者会修改 CI、开发者命令、文档和旧脚本，若仍混合建设工作便无法清楚判断失败来自功能缺口还是切换错误。

已归档的 [build-candidate-backed-project-gate](../archive/build-candidate-backed-project-gate/) 已证明这套 Gate implementation 形成时的类别、candidate identity、controls、progress、logs 与 `0/1/2` closure。cutover 只需在当前 revision 重新准备 matching candidate、完成新旧 required/full 对照并从实际 root/CI bindings 验收，不应等待 native Check authoring、typed Record、result presentation 或 package documentation 优化。

这些优化属于 cutover 后、公开发布前的工作。它们会使形成时 behavior/artifact evidence 需要刷新，但不会撤销“仓库只有一个权威 Gate”的 binding 事实，也不要求恢复旧 verifier。公开发布仍由更后续的 [publish-public-api-only-npm-package](../publish-public-api-only-npm-package/) Change 处理。

## Outcome

完成后，仓库全部正式验证调用只到达一个 project-owned Gate implementation；root script 的具体名称只是仓库接线，不是产品契约。该 implementation 通过 package candidate 运行已证明的 Definition/Run，并给出一致的项目拥有的 exit、日志和摘要行为。正式 repository/CI 调用只使用无 disabled tags 的 required/full；local direct adapter 仍可执行显式 partial invocation，且不检测 ambient CI。旧 workspace verifier implementation 及已无调用者的转发、测试和说明被退役。

本 Change 写出 <code>gate-handoff.md</code>，证明实际 repository/CI bindings、覆盖类别、cutover candidate identity、controls/output behavior、legacy reference audit 结果、重新验证条件和 VCS 回退方式。它是权威 binding 与 legacy retirement 的 owner，不冒充后续优化完成后的最终发布证据。

它只在归档 [readiness handoff](../archive/build-candidate-backed-project-gate/gate-readiness-handoff.md) 的能力边界仍成立，并由当前 matching candidate 与切换时对照验收重新证明时开始切换。完整阶段关系见 [Vibe Check package 与 Project Gate 交付导航](../vibe-check-package-and-gate-delivery.md)。

归档 readiness 已存在，但本 Change 仍为 Draft；Draft 本身不授权更改正式 binding 或删除 legacy verifier。形成 Plan 后必须先执行当前 revision 的 revalidation，再执行 hard cutover。
