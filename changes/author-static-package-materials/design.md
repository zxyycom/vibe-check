# Design

将稳定发布元数据与文本材料交回可直接编辑的文件，保留必要的构建派生与完整性验收；本 Draft 不授权实施。

## Context

当前 `scripts/package/artifact/manifest.ts` 从 `scripts/package/package-contract.ts` 的常量生成 local/formal 共用 manifest；version 来自本次 candidate/release。入口代码、声明、source maps、fingerprint 和 receipts 具有真实生成需求。前轮法律材料修复由 [scope-translated-source-notices](../scope-translated-source-notices/proposal.md) 承接，不重复实施。

直接 owner：[Package lifecycle](../../docs/tooling/package-lifecycle.md)、`scripts/package/artifact/manifest.ts`、`scripts/package/package-contract.ts`、相关 artifact/release tests。

## Goals / Non-Goals

评审 manifest、固定 entry 文本、显式材料清单中各自的事实源与派生边界；不把仓库开发 package.json 原样当发布 manifest，不取消 export/dependency/legal/packaged-bytes 验收，不发布 npm。

## Decisions

### Intended Change

暂定候选是单一 checked-in 发布 manifest 模板，构建只填入 approved version；模板确切位置、占位规则及哪些其它文本应静态化仍待设计。对照『保留现状』『单一静态源加最小投影』『逐项静态化』，不为每段短字符串建立文件，也不复制第二份依赖清单。

### Resulting Impacts

涉及 package-contract、manifest builder/audit、fingerprint、local/formal receipt、artifact 与 installed acceptance，用户说明和维护者 package lifecycle 同步更新。模板内容应进入 candidate identity；验证应独立证明动态字段和稳定材料完整性，而非只比较生成器自己的常量。目标 tests 后运行完整 Gate 与必要 release preparation fixture。

## Risks / Trade-offs

移除重复静态断言不能连带放松 root-only exports、runtime dependencies、法律材料与精确 tarball 边界。模板必须同时服务 local candidate 和 formal release，避免二者漂移。

## Open Questions

静态 owner 放在哪里？version 如何占位且不被误发布？哪些固定文本值得迁移、哪些清单是必要机械契约？必须先确认这些边界再实施。

本轮授权为记录与考虑方案；未批准产品实施、删除、发布或归档。设计确认后再形成 Plan 与 tasks。
