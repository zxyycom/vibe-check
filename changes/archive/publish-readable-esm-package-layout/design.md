# Design

本设计从权威 Product 源码逐模块生成运行时，并由根 facade 保持唯一公开入口。

## Context

本 Change 实施前，artifact owner 从 `src/index.ts` 生成单一 Bun bundle `index.mjs`，再配合类型声明、README 和严格 tarball audit 形成 local candidate。既有公开 contract 只包含根路径 `"."`、Bun 宿主与程序化 API；内部 tarball 路径不构成公开 subpath API。

用户已确认可读 ESM 模块树、源码恢复材料和单一公开根路径的方向，并明确不要求 CJS、`require`、browser 或压缩产物。Product `src/**` 仍是权威运行时，`scripts/package/**` 负责从它生成 artifact。

## Goals / Non-Goals

### Goals

- 用逐模块 TypeScript emit 生成 `dist/esm/**.mjs`，并让第三方依赖保留为 manifest dependencies，而不是重复 bundle。
- 让 package 根 `index.mjs` 只转发 `dist/esm/index.mjs` 的公开导出；manifest 的 `exports` 只公开 `"."`。
- 在 tarball 中包含 `types/**.d.ts`、运行时 `.map` 文件和运行时 TypeScript 源码树，并审计文件完整性、可解析的内部模块引用以及源码映射与源码的对应关系。
- 安装精确 tarball 后，通过 Bun 程序化 consumer、声明 typecheck 与既有运行时 fixture 证明公开根路径仍可用。

### Non-Goals

- 修改 `src/**` Product 语义、公开任何内部 subpath、增加 CJS、`require`、browser 或 min artifact，或建立手工维护的第二套运行时源码。
- 将 package 内部文件的物理存在表述为公开 API、Node.js 宿主支持或已经发布 registry package。

## Decisions

### Intended Change

1. artifact fingerprint 记录实际 Bun、`tsgo` 与 TypeScript parser 版本；artifact build 以锁定 `tsgo` 对 `src/index.ts` 的传递 Product 模块图执行 ESM emit，生成源码映射和类型声明；构建后只在生成的相对模块引用与源码映射 metadata 中将 `.js` 规范化为 `.mjs`。
2. staging 把同一权威运行时源码清单复制到 `src/**.ts`；源码映射内嵌对应源码内容，不建立手写或并行的第二套运行时实现。
3. manifest 的 `files` allowlist 扩展为根 facade、`dist`、`types`、`src` 与 README，`exports` 仍只包含 `"."` 的 `import` 和 `types` conditions。
4. audit 将 allowlist 从单一 bundle 放宽为上述布局，但继续验证 manifest identity、dependencies、公开导出、运行时公开 symbols、文档声明以及 tarball/staging 文件清单一致性；它显式拒绝 `.js` 运行时 artifact 和无法解析的相对 ESM 模块引用。

### Resulting Impacts

- package tarball 体积会因源码映射与 TypeScript 源码增加；这是为可读性与可恢复性接受的显式取舍。
- package artifact、candidate installation、文档模板、tests 和验证证据必须共同更新；consumer 只通过根路径 import，不赋予内部模块路径稳定 API 语义。

## Risks / Trade-offs

- TypeScript 的标准 ESM emit 使用 `.js` specifier，因此 artifact build 必须把生成文件名、相对引用与源码映射 metadata 一起受控地改为 `.mjs`；audit 和安装后 smoke 防止遗漏。
- 源码映射与复制源码会暴露比 bundle 更多实现细节，但它们只帮助检查，不改变 `exports` contract。
- 逐模块 ESM 不应 bundle 生产依赖；manifest closure 与 consumer dependency-resolution checks 继续防止祖先依赖回退。

## Open Questions

无。

## Implementation Observations

- 2026-08-24：candidate 已以根 facade、`dist/esm/**.mjs`、`types/**.d.ts`、运行时源码映射和 `src/**.ts` 通过 artifact、精确 tarball、外部 Bun consumer 与 required Project Gate 验证。Change 已收敛为 active Plan，依当前授权不归档。
- 2026-08-24：按 `ai-ready-docs` 与编码规范复审后，当前稳定 package 布局已回写脚本工具 owner；artifact code 进一步分离 package contract、文件清单、ESM specifier 与源码映射责任，并补充精确 facade 和 parser failure audit。
