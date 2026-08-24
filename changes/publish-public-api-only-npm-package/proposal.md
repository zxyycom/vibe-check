# Proposal

本 Draft 是 npm 产品交付的最后阶段：在 Project Gate、public API/documentation 与 repository layout已完成，并且首版五项 Checks 已实现、current optimized Gate 与 local package acceptance重新绑定同一 exact artifact 的基础上，准备并在获得单独授权后公开发布 `vibe-check`。

## Why

迁移后 candidate 的 build、pack、isolated install 与完整 Project Gate consumer 只能证明 artifact 及核心用途可交付；它们不能证明 npm registry 的名称控制权、认证主体、目标版本可用性、公开 legal materials、不可逆 publish 写入或发布后从 registry 安装的结果。新增 `json-validation`、`json-schema-validation`、`markdown-structure-validation`、`markdown-link-validation` 与 `maintenance-reminders` 会改变 public inventory、dependencies、README和 candidate bytes，因此形成于这些 Changes之前的 receipt或 tarball digest不能作为 release evidence。

这些外部事实会在发布时变化，且 publish 不能撤回。因此发布必须是独立 Change：它消费已验证 candidate，而不是重新构建产品边界，并在每次外部操作前取得明确授权。

## Outcome

当五项首版 Checks及其 public/package证据完成，matching candidate preparation receipt、current Gate/documentation handoffs、fresh registry checks和明确 publish authorization都满足时，普通 Bun consumer能从 npm registry安装一个精确版本的 API-only `vibe-check` package。该版本同时交付已验证的 runtime、declarations、README/API guide、完整 Project Gate consumer evidence、MIT legal/release materials和可审计的发布后安装证据。
