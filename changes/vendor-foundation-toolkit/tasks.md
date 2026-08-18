# Tasks

任务先冻结 foundation 输入与恢复路径，再完成受限转换、owner 同步、编码规范审计和跨边界验证。

## Readiness
- [x] 0.1 已核对唯一 gitlink、内层 Git pointer、迁移开始时 foundation 的未提交内容、所有本仓 submodule 引用及 Product 用户项目 submodule 功能的独立边界。
- [x] 0.2 已确认用户指定迁移开始时的 foundation 工作树为 vendor 输入，不访问上游；已建立 aligned 长期 Decision Record 和本 Change 的非目标。
- [x] 0.3 已在转换前创建并验证工作区外的 foundation 内容与 history recovery backup，并在 design observations 记录精确位置和校验信息。

## Implementation
- [x] 1.1 已将唯一 `160000` gitlink 转换为主仓普通文件 entries，移除 `.gitmodules`、inner `.git` pointer、foundation-local submodule config，并只移动精确 foundation module database 到 recovery backup。
- [x] 1.2 已修改 project-environment setup/check，删除 toolkit submodule 初始化与固定 revision 假设，并以 `env:check` 和 source audit 验证安全入口；未运行有安装副作用的 env:setup。
- [x] 1.3 已同步 script-tooling、coding-style 与相邻当前事实；保留 foundation workspace/package boundary、root aliases、imports 和 Product 用户项目 submodule capability。
- [x] 1.4 已确认 pnpm workspace/lockfile、Oxfmt/Oxlint 与 full verifier gate 仍正确覆盖普通目录，并修复未提交转换状态下的 product gitlink traversal self-cycle 与 config-only fallback 文件系统失败隐蔽。
- [x] 1.5 已按编码规范收敛 scripts/product private foundation 的具名边界输入、只读数据、`unknown` 校验与可行动失败，并迁移全部仓内 consumer、测试和 Case。

## Verification
- [x] 2.1 已证明 root index 不含 foundation gitlink，worktree 内无 `.git` pointer，`.gitmodules` 和 foundation submodule config 不存在，并复核 vendor 文件与 backup 输入一致。
- [x] 2.2 已运行 foundation typecheck/lint/format/test、env:check 与 env:setup source audit、scripts/product lint/typecheck、docs validation、test-evidence 及目标 quality-input 测试。
- [x] 2.3 已串行运行 required/full workspace verifier，审查 diff 未移除 Product 用户项目 submodule scan 能力；独立复审后已对齐 Decision Record 与 Change Plan。
- [x] 2.4 已使用 `ai-ready-docs` 审核并优化本 Change 文档，复核当前 owner、Decision、Change Plan、Case 与实际代码一致；已完成根级格式、类型、lint、测试证据、docs、决策、Change Plan、required/full 验证。
