# Proposal

本 Draft 是完整 Project Gate 的最终仓库 cutover：在 candidate-backed Gate 已通过 readiness evidence 后，把它切换为项目唯一的正式门禁入口，并退役旧 workspace verifier。它不再建设 Check、控制契约、renderer 或 npm artifact，而是负责入口、引用、删除和回退边界。

## Why

“已有一个可运行的新 Gate”与“仓库只剩这一个可信门禁”是不同的交付。前者主要承担功能与 package-consumer 风险；后者会修改 CI、开发者命令、文档和旧脚本，若仍混合建设工作便无法清楚判断失败来自功能缺口还是切换错误。

将 cutover 单列后，只有完成 [build-candidate-backed-project-gate](../build-candidate-backed-project-gate/) 的类别映射、exact-tarball 和对照证据，才能移除旧 verifier。公开发布仍在更后续的 [publish-public-api-only-npm-package](../publish-public-api-only-npm-package/) Change 中处理。

## Outcome

完成后，仓库的标准验证入口只调用一个 project-owned Gate command；该 command 通过 package candidate 运行已证明的 Definition/Run，并给出一致的项目拥有的 exit、日志和摘要行为。旧 workspace verifier implementation 及其不再需要的入口被退役；兼容 alias 若保留，也只能转发到同一 Gate implementation。

本 Change 写出 <code>gate-handoff.md</code>，作为公开发布前的最终本地证据：实际切换入口、覆盖类别、candidate identity、controls/output behavior、删除范围、重新验证条件和回退方式。

它只在 [build-candidate-backed-project-gate](../build-candidate-backed-project-gate/) 的 readiness handoff 与 fresh candidate evidence 同时成立时开始切换。完整阶段关系见 [Vibe Check package 与 Project Gate 交付导航](../vibe-check-package-and-gate-delivery.md)。
