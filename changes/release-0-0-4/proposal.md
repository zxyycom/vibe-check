# Proposal

以同一份正式 tarball 的验收与证据交接完成 0.0.4 发布；已完成从 `4e3294a9` 构建的正式包发布与分发核验，当前推进 Git 交接。

## Why

初次正式包验收后，用户文档与材料测试已进一步改进，并完成 `ai-ready-docs` 与项目编码规范复审。用户已确认以 `4e3294a9` 重新冻结；最终材料需要绑定新的源码、receipt、同包验收和独立复核结论。

## Outcome

`@zxyycom/vibe-check@0.0.4` 的正式包通过同包完整验收与独立文档确认，发布、分发核验、Git 交接和归档均可追溯。
重新冻结、正式打包、receipt 验证、一次完整 Gate、独立复核及准备期本地归档已完成。发布者交互发布后，已确认 canonical registry 的 `0.0.4/latest` 身份，下载 bytes 与已验收 tarball 一致；当前按新增授权完成提交、tag、合回并推送 main、推送版本标签及后续 evidence 归档。所有工作区、旧产物和 Change 保留，不执行清理。

## Scope

### Intended Change

- 沿用 [Package release](../../docs/tooling/package-release.md) 的固定发布规则，在 `release-0-0-4` 实现工作区维护材料和证据。
- 对本次全部修改的 Markdown 再审用途、主线、负向边界、迁移表达与组织；代码以完整 [编码规范](../../docs/development/coding-style.md) 审查职责、类型、控制流、异步、输出和失败路径，邻近实现只作事实参考。
- 保持已确认的材料测试分工和 5 秒实体预算：真实 workflow 直接证明分发、等待与失败，既有材料验收负责完整内容，薄进程接线由明确 Manual CR 承担。
- 审查与验证后按授权提交，从最终 clean S 生成并验证正式 tarball；发布时使用该同一产物。

### Resulting Impacts

- 文档只调整表达和阅读路径，保留准确历史、安全边界、公共契约、示例及发布范围；本次不新增 Product 行为。
- 修改后的 package material 须形成新 candidate，并复核与既有整包阅读结论的关联；旧冻结包仅证明其原材料。
- 测试观察可按规范收紧，但不搬移全量扫描、扩大预算或改变自动化与 Manual CR 的职责。必要时同步 owner 与原 Case。
- 严格 JSON 优化草案和网络调查保留原证据；草案本轮不采用，网络专项排查已停止，正式包验收要求不变。
- 当前计划、调查与稳定 owner 各承接自己的内容；旧轮实验细节通过调查和归档恢复，不挤占当前发布步骤。

## Success Criteria

- 本次文档和代码通过相应规范审查、独立复核及受影响验证，必要改动按授权提交。
- 正式 receipt 闭合 clean S、版本、tag、完整 inventory、SHA-256 与 SRI，同一 tarball 的完整 Gate 通过。
- `Manual CR:` 覆盖全部随包用户文档、示例和对外 JSDoc，取得适用于最终正式包的独立结论。
- 实际发布前核验 freshness、registry、publisher authority 和精确写入授权；发布后核对下载产物 bytes。
- tag、合入、归档和保留边界有真实记录，认证秘密不进入证据。

## Affected Owners

- [发布流程](../../docs/tooling/package-release.md)、[候选包生命周期](../../docs/tooling/package-lifecycle.md)、[Package artifact](../../docs/tooling/package-artifact.md)与 [Change 协调](../../docs/governance/change-coordination.md)。
- [文档使用者审查](../../docs/tooling/documentation.md#对外文档使用者审查)、[编码规范](../../docs/development/coding-style.md)与 [知识治理](../../docs/governance/knowledge-maintenance.md)。
- [仓库材料验证](../../docs/tooling/repository-material-validation.md#material-task)、[测试策略](../../docs/testing/strategy.md)和 [Case 维护](../../docs/testing/case-maintenance.md)。
