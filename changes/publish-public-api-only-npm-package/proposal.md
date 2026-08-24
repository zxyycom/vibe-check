# Proposal

本 Draft 是 npm 产品交付的最后阶段：在 Project Gate 已替代 workspace verifier，Gate authoring、最小 Record contract、typed dependency outputs、result presentation、public API documentation 与 repository layout/naming migration 均完成，且 current optimized Gate 与 local package acceptance 绑定迁移后同一 exact artifact 的基础上，准备并在获得单独授权后公开发布 `vibe-check`。

## Why

迁移后 candidate 的 build、pack、isolated install 与完整 Project Gate consumer 只能证明 artifact 及核心用途可交付；它们不能证明 npm registry 的名称控制权、认证主体、目标版本可用性、公开 legal materials、不可逆 publish 写入或发布后从 registry 安装的结果。迁移前的 receipt、tarball digest 或旧 source path 不能作为 release evidence。

这些外部事实会在发布时变化，且 publish 不能撤回。因此发布必须是独立 Change：它消费已验证 candidate，而不是重新构建产品边界，并在每次外部操作前取得明确授权。

## Outcome

当 matching candidate preparation receipt、cutover/optimization/documentation handoffs、fresh registry checks 和明确 publish authorization 都满足时，普通 Bun consumer 能从 npm registry 安装一个精确版本的 API-only `vibe-check` package。该版本同时交付已验证的 runtime、declarations、README/API guide、完整 Project Gate consumer evidence、MIT legal/release materials 和可审计的发布后安装证据。
