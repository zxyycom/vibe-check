# Design

本设计以迁移开始时已验证的 foundation 工作树替换 Git link，同时保持其路径、package boundary 和工具消费方式不变。

## Context

计划建立时，主仓 index 把 `scripts/tools/foundation` 记录为 `160000` gitlink，内层 `.git` pointer 指向主仓 `.git/modules/scripts/tools/foundation`；该工作树已有本仓需要的未提交工具链迁移。`scripts/project-environment/index.ts` 和当时的当前文档仍把它当作需初始化、固定 revision 的 submodule。另一方面，Product quality input 对被扫描用户项目的 submodule/gitlink 支持位于 `src/product/quality-core/input/**`，与此 toolkit ownership 无关。实施中发现，HEAD 保留 gitlink、但 working tree 已替换为普通目录的未提交过渡态会让既有 traversal 回到父仓自身并自循环；config-only fallback 也不能把不可读取的文件系统边界伪装为 empty candidates。这两项都必须以不改变真实 submodule 语义的方式修复。

## Goals / Non-Goals

- **Goals:** 将迁移开始时冻结的 foundation 文件内容作为可恢复 vendor baseline，把它变为主仓普通 tracked 文件；移除本仓 setup/check 的 submodule 依赖；保留独立 foundation package gates；以安全备份和验证证明迁移可恢复；使未提交转换状态不会令 quality input 自循环，且 fallback 文件系统失败保持可观察；按编码规范收敛这两个 private foundation closure 的边界 API 和调用点。
- **Non-Goals:** 不访问上游、不更新 revision、不移动 foundation package 路径、不把 source import 升格为 npm/public contract、不删除其它 Git module database、不移除或重写 Product 的真实 submodule scan 能力、不在本 Change 新增 CI 或重构 pnpm workspace。

## Decisions

- 先在工作区外保存 foundation 普通文件树与 Git history，再对唯一目标路径执行受限 index 转换；不使用 broad `git add -A .`、reset、checkout、clean 或 submodule update。
- 保留 `scripts/tools/foundation` 路径和其 private workspace package；现有 `scripts/**` import、root aliases、Oxfmt/Oxlint 和 full verifier 不需要路径迁移。
- 移除 `.gitmodules` 和 foundation-local Git config 后，`env:setup` 与 `env:check` 不再执行 `git submodule`。环境工具仍负责项目锁定工具与包依赖，但不得将“零 submodule”视为失败。
- 把相关文档从 gitlink/pinned upstream 改为仓库自有 toolkit；产品 README 中的历史 lift provenance 不作为本 Change 的删除对象。产品的真实 submodule input capability 保持不变；本 Change 只为 replaced gitlink 过渡态增加独立 worktree 与 self-cycle 防护。
- Gitlink traversal 只在 child 的 canonical Git top-level 等于 child path 时下沉，并在 worktree/revision/materialization 路径维持 canonical visited chain；普通目录替代旧 gitlink 时不被伪装为独立子仓，真实用户项目 submodule 保持原有 current/baseline 行为。
- config-only fallback 无法读取 root 或遍历目录时保留文件系统错误与目标路径；它不是可回退为 empty candidates 的普通无发现状态。
- `scripts/tools/foundation/**` 与 `src/product/foundation/**` 都是仓内 private helper closure。编码规范审计对两者一致要求具名多字段输入、只读跨模块数据、`unknown` 边界校验和可行动失败；它们不要求 byte-identical，且任何内部 API 调整都必须在同一 Change 中迁移全部 consumer、测试和 Case。

## Risks / Trade-offs

- **未提交的 toolkit 修改丢失。** 在 metadata 移除前创建内容归档和 Git history backup，验证路径与校验信息后才移动 module database。
- **转换误伤当前工作树。** 所有 Git index 操作只针对 `.gitmodules` 与 `scripts/tools/foundation`，不暂存或重置其他已有改动。
- **环境脚本遗留 submodule 假设。** 为 setup/check 增加最窄行为测试或相邻验证，并实际运行两条入口。
- **误删或改变 Product 功能。** 用户项目的真实 submodule current/baseline capability 不是移除或重写对象；本 Change 仅修改 `src/product/quality-core/input/**` 中识别独立 worktree、拒绝 ancestor re-entry 的窄安全边界，并以真实 submodule 与 replaced-gitlink 测试分别复核。
- **未提交转换使 quality scan 自循环。** 对所有 gitlink descend 边界确认独立 worktree 身份并拒绝 canonical self-cycle，新增 replaced-gitlink 回归测试，同时保留真实 submodule current/baseline 证据。
- **fallback 吞掉输入失败。** config-only enumeration 遇到不可读取 root 或目录必须返回包含目标路径的错误，并与成功的 empty Git collection 保持不同语义。
- **private helper 收紧破坏 consumer。** 每一项具名输入或只读边界调整先由 TypeScript 定位全部仓内调用点，再运行相应 foundation/product/script 测试、typecheck、lint 与 workspace verifier；不保留兼容重载掩盖未迁移 consumer。

## Open Questions

无。用户已确认 vendor 的输入就是当前本地 foundation 工作树，不需要访问或选择上游 revision。

## Implementation Observations

- 转换前的 foundation 内容与 Git history 保存于 `/tmp/vibe-check-foundation-recovery.8IghN0/`：`foundation-worktree.tar.gz` SHA-256 为 `faef52f4ffbe8baf9c2db70542b19897c7c16eb2fe11dc82c384dc72a3dde5e0`，`foundation-all.bundle` SHA-256 为 `b32839e8c29aa468d236e7a7399eaed236dec84ba9dbce6fa6515715fc955270`；同目录还有移动后的 `foundation-gitdir/` 与 `SHA256SUMS`。该目录位于 `/tmp`，其保留期限由环境清理决定；需要长期恢复时，必须在清理前另行保留。
- bundle、归档和 moved gitdir 已验证。若需要恢复旧 inner repository，应先将 `foundation-gitdir/` 移回 `.git/modules/scripts/tools/foundation` 以恢复其相对 `core.worktree`，再恢复内层 `.git` pointer；这不是当前运行时依赖。
- 转换完成时，恢复归档与 vendored 内容只有 README ownership wording 的预期差异；后续编码规范审计有意调整了 private helper 的内部 API 和边界错误表达。因此 recovery archive 保存的是迁移输入基线，不是当前最终源码的 byte-for-byte 副本。
