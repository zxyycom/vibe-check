# Tasks

本 Plan 先确认 artifact contract，再实施可读模块树，并以精确 candidate consumer 和 workspace Gate 闭合交付。

## Readiness

- [x] 0.1 读取 package artifact/candidate owner、编码规范、测试账本与现有 candidate build/audit/consumer 证据。
- [x] 0.2 建立并核对长期 artifact layout 决策：唯一公开根路径、Bun 宿主、无 CJS/min，内部路径不构成 subpath API。

## Implementation

- [x] 1.1 以锁定 TypeScript emit 从权威 Product 源码生成可读 `dist/esm/**.mjs`、类型声明、源码映射和 staged `src/**.ts`。
- [x] 1.2 添加根 facade、扩大 manifest/tarball allowlist，并将全部直接运行时依赖 externalize 到精确 candidate manifest closure。
- [x] 1.3 通过 parser 识别静态 import、re-export、动态 import 与 side-effect import，规范并 audit 相对 ESM specifier，避免改写普通字符串。
- [x] 1.4 更新 package README、artifact assertions 与现有 semantic Case，记录源码恢复和 audit 边界。
- [x] 1.5 按 `ai-ready-docs` 与编码规范复审文档和代码，收敛稳定 owner、职责模块、边界校验与测试证明责任。

## Verification

- [x] 2.1 运行 artifact test，证明模块树、源码映射/源码副本、公开 facade、公开导出清单和依赖 manifest。
- [x] 2.2 运行 scripts typecheck、lint 与 format，证明新的 build/audit/parser code 可检查。
- [x] 2.3 运行完整 test-evidence check，证明既有 Case entity 与更新后的证明仍闭合。
- [x] 2.4 从精确 tarball 运行 candidate preparation 与祖先目录外的 Bun consumer type/runtime smoke。
- [x] 2.5 运行 required Project Gate，证明 package change 与 workspace assurance 共同通过。
- [x] 2.6 复审优化后重跑文档投影/验证、目标测试、scripts typecheck/lint/format、Test Evidence、Decision、Change Plan 与 required Project Gate。
