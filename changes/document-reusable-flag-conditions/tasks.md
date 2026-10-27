# Tasks

先补现有指南与受管示例，再完成限定范围独立审查及包验收；用户已授权保存 Git 完成态并正常结项。

## Readiness

- [x] 0.1 核对当前公开 grammar、活动判断、示例 registry 与消费入口，确定两个受管 regions 和局部影响范围。

## Implementation

- [x] 1.1 在原指南补命名条件与 helper 用法，说明变量名/token、完整 enablement 共享和 propagation 边界。
- [x] 1.2 添加受管示例与 registry 接线，运行核对共享条件、helper 组合和同名 token 的独立性，同步协调视图。

## Verification

- [x] 2.1 完成 renderer 目标测试、投影、validate、Test Evidence、Decision 与 Change 检查。
- [x] 2.2 通过完整 routine Gate 和显式 consumer types，证明安装后的运行与公开类型用法。
- [x] 2.3 由非实施代理仅凭实际随包指南与公开声明完成命名复用任务，再基于 diff 反查影响，记录 Manual CR 与边界。

### 验收证据（2026-10-27）

- 源码与投影：`reusable-flag-conditions.ts` 的两个 regions 投影到现有指南，consumer 执行共享条件、helper、完整 enablement 与同名 token 对照。提交前收敛重复否定并复核主线与层级；没有产品逻辑、public export、schema 或发布路径变化，不新增名义 Case。
- `bun test scripts/docs/package-api/render.test.ts` 为 2 pass；投影 write/check、`bun run validate`、Test Evidence、Decision、Change 集合与 `git diff --check` 均通过。Test Evidence 为 791 实体、192 Case、17 topic；Change 12/12 valid。
- `bun run check -- --all`：41 passed、2 not-applicable、0 failed/unavailable，22.6 秒；日志 `.log/project-gate/2026-10-27T03-28-33.701Z-1009619-1e943b16-4a18-468e-92b9-ae28d799927a/`。包含 installed docs/runtime 和材料验收，未选择 explicit-only workbench，非正式 receipt 验收。
- `bun run check -- --consumer-types`：3 passed、40 not-applicable、0 failed/unavailable，4.9 秒；日志 `.log/project-gate/2026-10-27T03-29-14.341Z-1015962-45519503-885f-4349-85cc-d80992ed9594/`。它补充 installed consumer types，不替代 routine-complete。
- 最终候选 `0.0.0-local.1dc56bab973e`；tarball `build/artifacts/zxyycom-vibe-check-0.0.0-local.1dc56bab973e.tgz`，SHA-256 `ca12ab0c355a2ec534ee54d7662d86a4da7ad7a472fa146469a511cb5fc0aca0`；安装根 `scripts/project/node_modules/@zxyycom/vibe-check/`，`package:status` 为 current。
- `Manual CR:` 非实施代理 `remaining_guides_review`（6.1 Terra）从安装包 README 进入三篇目标指南与必要公开声明，恢复正常/过宽 waiver、schema 文件与 `$id` 前提、命名条件/helper 及 token 区分任务；复核重心、重复否定、迁移残留、篇幅与 Markdown 层级，无实质问题。三页 bytes 与仓库一致，摘要独立重算；随后反查实际 diff、示例和必要 owner，propagation/changeFlag 约束保留。审查为静态限定阅读（未变部分沿前次完整阅读），未执行 Gate/示例；整体 tarball/安装关联由主代理 Gate 证明，不是全包或正式发布审查。
- 同批局部改进：waiver 正常消费先行、过宽审计单列，两处受管 regions 经 runtime acceptance；JSON Schema 最小片段从该安装包提取，用 Node 在独占临时目录运行，正常输入退出 0、根 `$id` 不匹配退出 1，临时目录已清理。它们不改变本 Change 的 Outcome。
- 用户已授权提交与正常结项；最终 Plan 保存后执行 finalize，移除协调条目，并将派生 flag 评估中的当前实施交接引用换为稳定指南。提交保留既有 hook 的限频自动推送，不执行 publish。
