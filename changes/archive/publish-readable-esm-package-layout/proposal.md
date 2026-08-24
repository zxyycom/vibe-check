# Proposal

本 Plan 将本地 candidate 从单文件 bundle 调整为可读、模块化且可恢复源码的 ESM package 布局，并保留唯一公开根路径。

## Why

本 Change 启动时，本地 npm candidate 把全部 Product 运行时打入单个 `index.mjs`。该产物虽可由 Bun consumer 使用，却难以阅读、定位模块边界并将报错还原到权威 TypeScript 源码；当时的严格 audit 也不允许模块树、源码映射与可检查源码进入 artifact。

## Outcome

一个精确的本地 candidate 以可读、未压缩的 ESM 模块树交付运行时：package 根部保留唯一公开入口，`dist/esm/**.mjs` 保留 Product 实现模块，`types/**.d.ts` 提供类型声明，`src/**.ts` 与运行时源码映射支持开发者恢复权威源码；已安装的 Bun consumer 仍只从 `vibe-check` 根路径导入并成功执行程序化 API。

## Scope

### Intended Change

- 将 artifact fingerprint 绑定到实际 Bun/TypeScript toolchain，并让 build 从权威 `src/index.ts` 的传递模块图逐模块 emit，生成 `dist/esm/**.mjs`、类型声明、源码映射和源码恢复树；只规范 ESM 静态 import、re-export 和动态 import 中的相对模块引用，不改写普通字符串。
- 让根 `index.mjs` 转发内部运行时入口，扩展 manifest/tarball audit 的物理文件清单，并保留 `exports["."]` 这一唯一公开边界。
- 同步 package README、artifact/candidate 证据、长期 artifact layout 决策和本 Change 的交接材料。

### Resulting Impacts

- 第三方运行时 import 作为版本精确的 manifest dependencies 随 candidate 安装，不再嵌入每个生成模块。
- 产物会因模块树、源码映射与源码树增大；内部 `dist`、`types` 和 `src` 路径仍不构成公开 subpath API。
- audit、artifact test、隔离 Bun consumer 与 Project Gate 必须共同证明打包链、公开入口、类型声明与源码恢复边界。

## Success Criteria

- 精确 tarball 同时包含根 `index.mjs` facade、`dist/esm/**.mjs`、对应源码映射、`types/**.d.ts` 与 `src/**.ts`，且没有运行时 `.js`、min、CJS 或 browser artifact。
- manifest 只公开 `"."` 的 import/types conditions；安装后的 Bun consumer 能从 `vibe-check` 根路径通过 typecheck，并执行既有程序化 API fixture。
- 生成的 ESM import、re-export、动态 import 与 side-effect import 均被规范和审计为可解析的 `.mjs` target，普通相对 `.js` 字符串不被改写。
- package artifact/candidate 证据、scripts checks、Test Evidence 与 required Project Gate 全部通过。

## Affected Owners

- [脚本工具：Package artifact 与 candidate](../../docs/script-tooling.md#package-artifact-与-candidate)
- [脚本工具：Documentation, validation, and package material](../../docs/script-tooling.md#documentation-validation-and-package-material)
- [测试策略：Case 账本](../../docs/testing.md#case-账本)
- [可读 ESM package layout 决策](../../docs/decisions/publish-readable-esm-package-layout.md)
