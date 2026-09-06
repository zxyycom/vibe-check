# Proposal

本 Change 让首次发布前的 package discovery metadata 与常用 supporting type 命名入口保持完整、可验证。

## Why

生成的 npm manifest 尚无 description 与 keywords，GitHub description 仍把已经迁移到 Node 的 Product 描述为 Bun 项目；同时部分已出现在公共函数签名中的 supporting types 不能从 package root 直接命名，增加 helper、结果适配器与复用配置的成本。

## Outcome

npm 与 GitHub 使用同一段准确的通用项目质量门禁描述，npm 提供小而稳定的检索关键词；消费者可从 package root 直接导入经真实使用场景审定的最小 supporting type 集合，而不会把全部内部 declarations 变成公共 API。

## Scope

### Intended Change

在 generated manifest closed contract 中增加 description 与 keywords，不增加 homepage；同步 README 的产品定位和 GitHub repository description；审定并增加最小 package-root supporting type exports 及其 public inventory 和 consumer acceptance。

### Resulting Impacts

Package manifest writer、closed audit、artifact tests、public export inventory、declaration/runtime parity、external consumer type acceptance、README、exact candidate 与 GitHub repository metadata 需要保持一致。新增 root type names 是 additive public contract；GitHub 远端写入必须最后单独回读验证。

## Success Criteria

- npm candidate manifest 与 GitHub repository 使用同一段已确认 description，且 README 不再保留冲突产品定位。
- npm manifest 包含审定 keywords，不包含 homepage。
- 新增 root type exports 逐项有 consumer 命名理由并通过 installed external consumer import/type acceptance。
- Manifest closed fields、public inventory、runtime/declaration parity、package material 与完整 Project Gate 全部通过。

## Affected Owners

- `scripts/package/package-contract.ts`、`scripts/package/artifact/manifest.ts` 与 package artifact tests
- `src/index.ts`、`scripts/package/public-api-inventory.ts` 与 external consumer type acceptance
- `README.md` 与 GitHub repository metadata
- Exact candidate、Change Plan 与相关长期 Decision owners
