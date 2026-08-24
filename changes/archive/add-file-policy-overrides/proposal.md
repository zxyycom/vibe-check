# Proposal

本 Plan 退出旧的 Product-wide file-policy resolver 方案，并把文件级差异交还给各 producing Check 的 closed options。

## Why

旧计划形成时假设 Project Definition 会提供共享 base policy、ordered partial patch、provenance 与 `explain-config`。当前稳定边界已经不同：`ProjectDefinition.quality` 只拥有全局文件范围，普通 Check 自己拥有 options、execution 与结果语义；长期决策 [`use-check-owned-file-overrides.md`](../../docs/decisions/use-check-owned-file-overrides.md) 也明确拒绝 Product-wide merge engine。继续实现旧方案会增加一套没有共同消费者的公共配置层。

## Outcome

Active Change portfolio、首版 Check 计划和发布路径不再依赖共享 file-policy Change。需要按文件改变行为的 Check 在自己的完整 options 中定义匹配与 precedence，并且只能缩小该 Check 从全局 scope 获得的 eligible inputs。

## Scope

### Intended Change

- 从全部 active Check plans 移除 `add-file-policy-overrides` 前置、shared schema projection、generic patch、provenance 与 `explain-config` 假设。
- 保留 `ProjectDefinition.quality` 作为唯一全局 scope owner；不修改当前 Product runtime 或 public API。
- 允许后续 producing Check 在出现真实需求时，以自己的 closed options 定义 include/exclude 或局部规则；不同 Check 不因此共享公共 merge contract。
- 更新 Active Change Portfolio 与首版发布顺序，说明本 Change 只负责退出旧方案。

### Resulting Impacts

四项首版离线 Check 必须各自声明完整 options 与 eligibility，不能借此 Change 扩大 inventory、影响 sibling Check 或建立第二配置事实源。

## Success Criteria

- 当前 stable owners、源码和 public declarations 中没有 Product-wide file-policy resolver；`ProjectDefinition.quality` 仍只定义全局 scope。
- Active Check plans 不再把本 Change、shared patch grammar、named reference policy snapshot 或 `explain-config` 当作实施前置。
- Portfolio 与发布 Draft 将本 Change 判读为已完成的计划退出，而不是首版 feature gate。
- Decision、Change Plan、文档与 required workspace verification 均通过；没有产品实现或 public contract drift。

## Affected Owners

- `docs/configuration.md` 与 `docs/scan-scope.md`：只用于核对当前 global scope / Check-owned options 边界，不需要改变稳定事实。
- `changes/active-change-portfolio.md`：记录退出结果和新的首版分组。
- `changes/add-*-validation/**` 与 `changes/port-lizard-function-metrics-to-typescript/**`：移除旧 shared policy 前置与失效 seam。
- `docs/decisions/use-check-owned-file-overrides.md`：长期方向 owner。
