# establish-versioned-npm-package-release

建立 Vibe Check 的版本化 npm package 发布单元，使同一 package version
交付正式 CLI、公共 TypeScript 声明文件（`.d.ts`）与明确公开的产品资源。

## 当前状态

本 change 仍在探索阶段。`proposal.md` 与 `package-release` delta spec 只固定已确认的
发布方向；`design.md` 和 `tasks.md` 尚未形成。在设计问题收敛、实施任务形成并完成
阻塞级审计前，不得实施本 change。

## 阅读顺序与权威性

1. 两条活动决策是跨 change 长期方向的 owner：
   [`use-versioned-npm-package-release-unit`](../../../docs/decisions/product-contract/use-versioned-npm-package-release-unit.md)
   确立 npm package 发布单元与 CLI 主要执行界面的关系；
   [`keep-prestable-releases-on-0-0-x`](../../../docs/decisions/product-contract/keep-prestable-releases-on-0-0-x.md)
   确立稳定承诺前的 `0.0.x` package-level 版本策略。
2. [`proposal.md`](proposal.md) 说明本 change 为何存在、已确认范围、影响面与尚待收敛的设计边界。
3. [`specs/package-release/spec.md`](specs/package-release/spec.md) 承接本 change 当前已形成的规范性目标。

本 README 只是阶段状态与阅读入口，不单独定义发布契约。后续讨论应先收敛
`proposal.md` 列出的未决设计边界，再形成 design 和 tasks。
