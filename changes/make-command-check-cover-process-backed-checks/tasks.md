# Tasks

按公共类型与执行边界、代表性 consumer 迁移、owner 同步和完整验证的顺序推进。

## Readiness

- [x] 0.1 审核现有 command Check、ordinary Check、Gate consumer 与相关 Decision 的责任边界。
- [x] 0.2 用隔离产品类型 fixture 验证默认、ordinary 与 typed `afterCommand` 推断，并据真实 consumer 排除 handoff。
- [x] 0.3 固定 resolver 失败语义、after-command 完整性准入和两个首轮 Gate consumer。

## Implementation

- [x] 1.1 实现 `resolveEnvironment` / `afterCommand` 的公共输入、返回类型、closed validation、snapshot 与 package-root exports。
- [x] 1.2 重构 command execution，保持默认分类并在 transcript 完成后调用符合准入条件的 `afterCommand.execute`。
- [x] 1.3 覆盖 resolver 成功、互斥输入、非法返回、throw、取消、完整/non-complete process result、callback settlement 与默认兼容测试。
- [x] 1.4 扩展安装包 type acceptance，证明默认、ordinary、typed-provider 推断及无效组合拒绝。
- [x] 1.5 将 `prepared-external-package-consumer` 和 `lint-product` 迁移到 `commandCheck`：采用 Product `process.log` format/path、artifact isolation 与 settled-before-callback 准入；保留 Gate-owned projection 与 provenance，明确未迁移 adapter 继续拥有旧 transcript schema/reason/fallback。
- [x] 1.6 同步 command Check 指南、API projection、公共类型 inventory 和调用方完成阶段 Decision 的实际对齐状态。

## Verification

- [x] 2.1 运行 command Check、Gate process/consumer 和 package acceptance 的最窄行为与类型测试。
- [x] 2.2 运行产品与脚本 typecheck、lint、format、test-evidence、文档、Decision 和 Change Plan 检查。
- [x] 2.3 运行 `bun run check`，并由非实施代理基于最终 diff 反查产品行为、文档 owner 和首轮迁移边界。
