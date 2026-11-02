# Proposal

按既定流程准备并交接 `@zxyycom/vibe-check@0.0.5`，本 Change 保存本次发布事实与未完成事项。

## Why

0.0.5 的产品变化、随包文档和两轮独立文档审查已在 main 收口；正式发布仍需绑定冻结提交、正式 tarball、完整 Gate 与最终包语义结论。

## Outcome

同一份 0.0.5 正式 tarball 获得完整验收和独立文档确认，交由发布者交互发布；成功后按新增授权完成分发核验、版本标签、合回 main 与证据归档。

## Scope

### Intended Change

- 按 [Package release](../../docs/tooling/package-release.md)建立发布分支实现工作区和 detached 冻结工作区。
- 补入 Gate 建设指南的版本说明，prepare 正式产物并执行同 receipt 的完整验收。
- 以既有全包审查和后续指南专项审查为基线，由独立代理确认最终包的覆盖与差异。
- 记录本次 registry 观察、身份、验证、归档和交互发布交接。

### Resulting Impacts

- main 不承接发布过程中的临时记录；发布后才按授权合入。
- 修改任何发布输入都须重选 S、重新 prepare 和完整验收，旧结果不沿用为新包证明。
- 发布认证、tag、合入与清理分别保留实际授权边界；不自动发布或采集认证秘密。

## Success Criteria

- 干净冻结 S 生成 0.0.5 / latest 的正式 receipt，tarball 摘要及身份闭合。
- 同一 receipt 的完整 routine Gate 与 installed types/docs/runtime 验收通过。
- `Manual CR:` 对全部用户文档和必要公开 JSDoc 的阅读结论适用于最终正式包，无阻断缺口。
- 产物、receipt、日志和非敏感 evidence 按固定位置归档且字节核对通过。
- 发布者完成临发布核验及交互发布，分发结果与 Git 交接分别留证；未获授权的后续动作明确待办。

## Affected Owners

[发布流程](../../docs/tooling/package-release.md)、[产物](../../docs/tooling/package-artifact.md)、[安装](../../docs/tooling/package-lifecycle.md)、[文档审查](../../docs/tooling/documentation.md#对外文档使用者审查)、[Change 协调](../../docs/governance/change-coordination.md)。
