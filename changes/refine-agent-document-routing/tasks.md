# Tasks

已完成局部修订、独立复核和验证；本轮按用户授权整理提交，保存完整完成态后正常结项。

## Readiness

- [x] 0.1 核对 main、已有改动、当前 owner 与活动判断；将三位审查代理和主代理确认的发现收敛到 proposal/design，区分必要边界与可选扩充。

## Implementation

- [x] 1.1 补齐提交/hook、内部文档、Change 前置核对与 evidence README 的定向引用，不复制规则或改变授权。
- [x] 1.2 分开正文与投影写入流程，按当前选择语义修正 Gate 的 required 术语。
- [x] 1.3 校准 scanner owner 与输出引用标签，在同页内重排 Scheduler/Project files，保持全部行为、安全、失败与成本边界。
- [x] 1.4 从源码补齐自定义 Check 的完整可执行 region，同步 Markdown/JSDoc，并核对公开用法与结果读取。

## Verification

- [x] 2.1 由非实施代理基于实际 diff 反查文档影响，并完成代表性任务阅读复核；记录 Manual CR、覆盖与限制。
- [x] 2.2 通过文档投影、validate、Test Evidence、Decision 与 Change 检查；确认引用、锚点和目标范围。
- [x] 2.3 运行完整 routine Gate，验证受影响的类型、工程、package material 与 installed docs/runtime；记录实际结果及未覆盖的 release-only/explicit-only 范围。

### 验收证据（2026-10-27）

- `Manual CR:` 非实施代理 `independent_docs_review`（6.1 Terra）从实际 diff 反查全部本轮稳定文档、示例源与 Markdown/JSDoc 投影，未发现需修正的实质缺陷。代表任务覆盖 Product 配置、Gate 选择、发布/worktree、Change/Decision、测试、正文/示例、内部文档/缺失 owner、提交 hook 和自定义 Check；可定位必要 owner、动作前授权和验证边界。未把此审查扩张为所有未修改专题的全文复审。
- 实际安装包限定范围 `Manual CR:` 审查者只凭 `scripts/project/node_modules/@zxyycom/vibe-check/` 中的 README → callbacks → extending-check-lifecycle、公开 `types/index.d.ts` 与 `types/check/check.d.ts` 恢复完整示例和预期 `failed` 结果，Markdown 与 JSDoc 代码一致，无须内部说明。审查者静态阅读并重算 tarball 摘要，未独立重做安装目录与 tarball 的逐文件一致性验收；后者及示例实际执行由 Gate artifact / installed docs/runtime Checks 证明。此结论不是全包或正式发布审查。
- 包身份：`0.0.0-local.4e0bcf393fe5`；`build/artifacts/zxyycom-vibe-check-0.0.0-local.4e0bcf393fe5.tgz`；SHA-256 `ed49add981d06469216e7503463fd3b4044f800a86a94367c2081e605ee79efd`。`bun run package:status` 报告 current；公开入口为 `index.mjs` 和 `types/index.d.ts`。
- `bun run docs:api:write` 后 `bun run docs:api` 通过；`bun run validate`、`bun run decisions -- check`、`bun run change-plan -- check-all changes` 与 `git diff --check` 通过。Scheduler/Project files 的重排除新增标题外逐行非空内容多重集保持，既有标题锚点保留。
- `bun run test-evidence -- check --root .` 首轮与 Gate 的候选包准备并发执行时返回 static-only 注册缺口；未修改测试或账本。Gate 内同一检查通过后，独立串行重跑通过：791 个实体、192 个 Case、17 个 topic。这里保留失败和重跑事实，不把并发时序推断为已证实根因。
- `bun run check -- --all` 通过：43 项中 41 passed、2 not-applicable、0 failed/unavailable，24.4 秒。日志根为 `.log/project-gate/2026-10-27T02-41-01.606Z-927533-ca54bee2-f220-4440-87f2-f7f13e31a662/`，包含类型、lint、format、Markdown、材料和 installed docs/runtime 验收。未选择 release-only consumer types、explicit-only workbench，也未执行正式 receipt 验收或物理 candidate integration；本轮不涉及这些流程。
- 实施阶段交付为工作区修改；用户随后明确授权整理提交与结项。本轮先保存最终全勾 Plan，再按预检及 finalize 门禁删除目录；普通提交的受限自动推送遵循已启用的仓库 hook，未授权 package 发布或其它额外 Git 操作。
- 提交整理：`96cae25fee4a` 保存文档路由与维护流程，`222627f93b43` 保存公开运行示例及投影。提交前重新运行 `bun run docs:api`、`bun run validate`、`bun run test-evidence -- check --root .`、`bun run decisions -- check`、`bun run change-plan -- check-all changes` 和 `git diff --check`，均通过；产品与示例内容未再变化，完整 routine Gate 沿用上方已记录证据，未重复运行。
