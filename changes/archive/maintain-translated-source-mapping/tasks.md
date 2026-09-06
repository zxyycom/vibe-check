# Tasks

任务先固定唯一编辑源与不可推导边界，再比较维护路径，并用来源、identity 和行为各自的证据验收。

## Readiness
- [x] 0.1 阅读当前 provenance、source identity、package legal-material audit、Case 和长期许可 Decision，确认本 Change 不重开已完成布局计划。
- [x] 0.2 确认 ledger 是 target inventory 唯一编辑源；identity JSON 的 symbol/host-seam 选择与 `classes`/`symbols` 计数不可由 ledger 推导。
- [x] 0.3 比较直接 target closure 与持久 derived count 的实际消费者、维护收益和全输入预验证下的零写入失败边界：未持久化无消费者的 count；package legal-material audit 消费 provenance SHA-256 pin，sync 在预验证后更新该 pin 并由目标测试覆盖拒绝零写入与写失败恢复。

## Implementation
- [x] 1.1 在 package legal-materials owner 中实现选定的 source-mapping maintenance path：默认只读 `check`；只有确认有独立收益的派生字段才提供显式 `sync`。
- [x] 1.2 让 provenance/identity 和 package legal-material audit 使用同一 target closure，并保留既有 fail-closed source、hash、SPDX 与 license 边界。
- [x] 1.3 在脚本工具 owner 说明唯一编辑源、选定的派生字段、`check` 与任何显式 `sync`，以及来源/identity/行为证据的独立性。
- [x] 1.4 更新连续 Case 或新增真实 maintenance-command Case；只写入已由稳定测试实体证明的维护边界。

## Verification
- [x] 2.1 运行 source-mapping command 的目标测试、package legal-material audit 与 source-identity 测试；确认 default check 无写入，以及 sync 的写入范围、预验证失败零写入与可捕获写异常恢复：`bun test scripts/package/legal-materials/source-mapping.test.ts scripts/package/legal-materials.test.ts src/package-checks/function-metrics/analyzer/source-identity.test.ts` 为 5/5；`bun scripts/package/legal-materials/source-mapping.ts check` 为 0 updates，三份 curated material SHA-256 前后一致。
- [x] 2.2 运行 `bun run test-evidence -- check --root .`、`bun run validate -- docs` 与 `bun run change-plan -- check changes/maintain-translated-source-mapping`：Case closure 为 550/550、124 Cases/15 topics；docs validation 通过（77 JSON、5 schema、4 examples、373 Markdown links）；Plan check 通过。
- [x] 2.3 运行范围匹配的 Project Gate；最终跨 package/脚本边界需要时运行 `bun run check -- --all`，并区分已有或环境失败：root 实际运行 `bun run check -- --all`，36/36 pass、0 fail/N/A/unavailable，candidate `0.0.0-local.abec6a7f14f3`，日志 `.log/project-gate/2026-09-05T11-39-48.940Z-2345190-e8f3f17b-93c5-49fd-82ce-a208d21126f2`。
