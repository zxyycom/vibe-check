# Proposal

本 proposal 记录将迁移开始时的 foundation toolkit 工作树 vendor 为主仓普通目录、消除最后一个开发工具 gitlink 的可改写实施计划。

## Why

形成此 Change 时，`scripts/tools/foundation` 是唯一仍由 Git submodule 提供的开发工具，但实际使用的 lint、format 和 package gates 已依赖其未提交的本地迁移。继续保留 gitlink 会让 fresh clone 得到旧入口，且环境脚本需要初始化外部 checkout，和仓库自有工具链的目标冲突。

## Outcome

foundation 保持既有路径和 workspace package 身份，但作为主仓普通文件被追踪；开发环境不再初始化或检查本仓 toolkit submodule，仓库中的源代码和 package 入口可由普通 clone 直接复现，同时不改变 Product 扫描用户项目 submodule 的功能。本 Change 后续的编码规范审计可以收紧这个 private package 的内部 helper API，但必须迁移所有仓内 consumer，且不把它升级为 npm/public contract。

## Scope

- 将迁移开始时的 `scripts/tools/foundation` 工作树安全转换为主仓普通目录，移除 `.gitmodules`、gitlink、内层 Git pointer 与 foundation-local submodule config。
- 同步项目环境 setup/check、当前脚本工具文档、编码规范和必要验证材料，保留目录路径、pnpm workspace package、imports 与 package gates。
- 使用 `ai-ready-docs` 审核当前文档 owner、术语、默认行为和恢复边界；使用编码规范审核本次代码，允许对 private foundation helper 作最小的具名输入、只读输出和显式边界失败调整，并同步所有仓内调用点与测试证据。
- 修复转换尚未提交时既有 gitlink traversal 会把普通目录误认成子仓、递归回父仓自身的过渡态自循环；保留真实用户项目 submodule 的 current/baseline 支持，并让 config-only fallback 的文件系统读取失败保持显式。
- 在工作区外保存迁移前 foundation 内容和 Git history 的可恢复备份；验证后才移走精确的 foundation module database。
- 不同步上游、不重写 foundation 历史、不移动 package 路径、不删除其它历史 module database，且不改动 Product 对用户项目 gitlink/submodule 的扫描能力。

## Success Criteria

- 主仓 index 中 `scripts/tools/foundation` 不再是 `160000` gitlink，工作树内不存在 `.git` pointer，`.gitmodules` 与 foundation submodule config 均已移除。
- 普通 clone 不需要 `git submodule update` 即可得到 foundation 源码、format/lint/typecheck/test 入口与 full verifier toolkit gates。
- `env:setup` / `env:check` 不再执行或要求本仓 submodule；产品扫描用户项目 submodule 的 current/baseline 契约保持不变，并已同步其针对 replaced gitlink 的安全修复、测试和 Case。
- HEAD 仍含旧 gitlink 而工作树已是普通目录时，quality input 也会快速终止且只进入实际独立的子仓；真实 current/baseline submodule 测试继续通过，config-only fallback 读取不到 root 时返回包含该路径的错误而不是 empty candidates。
- foundation package gates、scripts lint/typecheck、文档验证、test-evidence、required/full verifier 和差异检查通过，并保留可定位的恢复备份路径。
- 当前 owner 文档、Decision、Change Plan 与 Case 能从实际文本恢复 toolkit 的私有边界、验证 profile、恢复路径和产品输入失败语义；private foundation helper 的内部 API 调整由类型检查、最窄测试和完整 verifier 证明没有遗留 consumer。

## Affected Owners

- `scripts/project-environment/index.ts`：开发环境 setup/check 的 Git checkout 责任。
- `docs/script-tooling.md` 与 `docs/coding-style.md`：工具 ownership、环境和 import 边界的当前事实。
- `scripts/tools/foundation/**`、`package.json`、`pnpm-workspace.yaml`：保留的 workspace package 和开发入口。
- `src/product/foundation/**` 与 `docs/testing/cases/quality-runtime.md`：Product runtime 内对应 private helper 的边界实现和测试证据。
- `scripts/vibe-check-workspace/**` 与 `docs/testing/cases/repository-tooling.md`：package-boundary gate 与对应测试证据。
- `src/product/quality-core/input/**` 与 `docs/testing/cases/scan-scope.md`：用户项目 gitlink traversal 的过渡态安全边界。
- `docs/decisions/vendor-foundation-as-repository-owned-script-tool.md`：长期 ownership 判断。
