# Proposal

本 Change 统一 package 第三方法律材料路径，并把依赖许可覆盖从选择性复制改为实际安装图审计。

## Why

当前 artifact 同时发布 `licenses/` 与 `third-party-licenses/`，但二者都承载第三方材料，目录差异来自功能分批引入而非稳定责任边界。后者只含三个手工选择的依赖文本，而发布 manifest 有十七个直接 production dependencies，当前完整隔离安装包含一百一十四个 dependency package directories，因此现状既增加认知成本，也容易被误读为完整依赖清单。

## Outcome

发布包只保留一个 `licenses/` 第三方材料目录；package candidate 对本次当前平台实际安装的完整依赖包集合核对明确且由当前 policy 接受的许可声明，文档清楚区分随包材料与安装时依赖图。

## Scope

### Intended Change

删除普通 npm dependencies 的三个选择性镜像 license text 及 artifact `third-party-licenses/` 路径；translated/embedded source 的全部物理第三方材料继续统一由 `licenses/` 承载。增加隔离 candidate 安装目录的完整 package license-declaration audit，并同步 notice、package lifecycle、长期决策和测试证据。

### Resulting Impacts

Package contract、artifact fingerprint/staging/tar/installed/release receipt、candidate 安装验收、README 与维护者文档均需使用统一路径；测试 Case 需覆盖完整安装集合、legacy metadata normalization 与 fail-closed license policy。普通 npm dependencies 仍由 package manager 独立安装，不把动态传递图固化成发布包内静态文本集合。

## Success Criteria

- Candidate manifest 与 tar inventory 不再包含 `third-party-licenses/`，所有因 translated/embedded source 主动携带的第三方文本和 provenance 只位于 `licenses/**`。
- 隔离 candidate 安装验收枚举所有已安装依赖包，拒绝缺失、无法解释或当前 policy 未接受的 license declaration；当前图完整通过。
- Notice、README、package lifecycle 与长期决策不再把三个文件暗示为完整依赖清单。
- 目标测试、Case 完整性、package candidate、文档/类型/静态校验和 complete Project Gate 通过。

## Affected Owners

- `scripts/package/**` 的 package artifact、candidate、release 与 legal-material owner。
- `docs/tooling/package-lifecycle.md`、`README.md` 与 `THIRD_PARTY_NOTICES.md`。
- `docs/decisions/**` 的长期 package legal-material/dependency audit 判断。
- `docs/testing/cases/repository-tooling.md` 与相邻 package tests。
