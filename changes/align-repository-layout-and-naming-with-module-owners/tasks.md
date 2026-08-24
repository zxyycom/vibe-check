# Tasks

任务先闭合布局/命名账本与行为基线，再按 Product、scripts capability、private Project consumer 和 package lifecycle 的依赖顺序迁移，最后同步 owner 与完整证据。

## Readiness

- [x] 0.1 已审计 Product 与 scripts 的 tracked module tree、正式入口、跨一级目录 value imports、public candidate entry、private consumer 和 root commands，确认两棵 value-import graph 当前均无循环。
- [x] 0.2 已由用户确认同时调整 `src/**` 与 `scripts/**`、取消 `src/product` 包装层、让同级模块位于同一父目录，并进一步确认目录名、文件名和入口名必须共同表达职责，`index.ts` 只能是逐项批准的极少数例外；已用 AI-ready 文档消费契约复核目标树、owner、命名、依赖方向、当前/未来边界和验收出口。
- [x] 0.3 已建立并审核活动未对齐决策 `align-source-layout-and-naming-with-module-owners.md`，确认删除临时 Product CLI diagnostic、只预批准 `src/index.ts`，并恢复 API-only public surface、Gate-before-release、Foundation assurance 与 pinned Bun entry 等直接相关长期约束。
- [x] 0.4 已在 `readiness/baseline-evidence.md` 记录 commit、锁定环境、命令、退出状态、digest/inventory、失败归因和 ignored 原始输出路径；Product/scripts import graph 均无循环，Test Evidence closure 与 exact candidate prepare 通过，quality facts 已分类，full workspace Gate 为 14/14。
- [x] 0.5 已建立并 strict-schema 验证 `readiness/layout-naming-ledger.json` 与相邻 schema，覆盖 322 个 Product、scripts、tests、configs、current docs/registries、Case 及 active Change consumer；320 个非删除 target 唯一，唯一 `index.ts` 例外为 `src/index.ts`，无遗漏、重复 source、目标冲突、一级 owner 或 public export 漂移。
- [x] 0.6 已在 `readiness/active-change-impact.md` 逐项分类 active Change handoff，确认 publish Draft 为 `update`、陈旧 feature Plans 为 `defer`、无 current-path 依赖者为 `not-applicable`；五个 implementation batches、focused checks、回退边界和全部 start-gate 条件已闭合，提交本 Plan snapshot 后从 1.1 开始。

## Implementation

- [x] 1.1 增加或收紧 source/import/path/name characterization，机械验证 Readiness ledger completeness/schema、Product 不导入 scripts、普通 Project consumer 不深导入 Product、package artifact只构建 public entry、machine docs只读取 approved output entry，并为目标一级模块建立无环检查、`index.ts` allowlist 和未经审核泛化名称检查。
- [x] 1.2 将 `src/product/**` 迁到 `src/**`，建立 `src/index.ts` public entry，把 public inventory 与 Definition effect defaults 分离到 `contract` 和 `definition` owner，并更新 product tsconfig、package docs source discovery 与 declaration root，不改变 approved exports/types。
- [x] 1.3 按 ledger 将 built-in execution/input/measurement/scanner、Core facts/session、machine publication、Run、Scheduler 与 Foundation 迁到 `checks`、`core`、`output`、`run`、`scheduler` 与 `foundation`；以描述职责的 basename 替代未批准 `index.ts` 和模糊旧名，移除 `quality-core`、`scan-command` 与 `scanner-dependencies` 伪 owner，并保持测试与源码共置。
- [x] 1.4 删除 `src/product/cli/**`、`product:cli` root command、当前 CLI owner 文档和对应 Test Evidence Case/catalog 引用；证明 package 无 `bin`、无替代命令且 archive 未被机械改写。
- [x] 1.5 将 scripts Foundation 从历史 `tools/foundation/src|test` 形态迁到 `scripts/foundation/**`，将 validators 与 root validate 迁到 `scripts/validation/**`，按命名 ledger 更新 development、docs、test-evidence、Gate 与 root command imports；不恢复 Foundation package/gates。
- [x] 1.6 将 package API docs 和 machine artifact generation按 `scripts/docs/package-api` 与 `scripts/docs/machine-artifacts` 归位，将 environment 与 Decision adapter 改为具有描述性 basename 的模块入口，保留 `development` 与 `test-evidence` 的现有 capability owner但审查其 existing `index.ts`。
- [x] 1.7 建立 `scripts/project/package.json` private candidate consumer root，把 neutral quality 与 Project Gate 完整迁为 `scripts/project/quality`、`scripts/project/gate` 同级模块，合并 Gate 两棵目录并将 locked quality workflow归给 quality；使用描述性 command/adapter basename并更新日志、controls、dynamic entry 与 exact installed-entry 校验。
- [x] 1.8 从 package candidate 提取唯一 `scripts/package/artifact` build/manifest/pack/audit owner，将 local cache/receipt/install/reuse 收敛到 `scripts/package/candidate`；构建 `src/index.ts`，为其它入口选择描述性 basename，安全使旧 receipt/install失效，不创建 release adapter或执行 registry operation。
- [x] 1.9 更新 `package.json`、TypeScript、lint、format、test、ignore、workspace 与 CodeGraph/source-scope配置到目标路径和名称；删除仅经 caller/fixture audit 证明无消费者的 support/fixture，不删除仍由当前 docs/schema/tests/active Change消费的材料。
- [x] 1.10 使用 `test-evidence-review` 同步所有 moved/renamed test entity IDs、Case Owner/Proves、runner profile 与 focused commands并闭合 CLI Case 退出；同步 package API registry、generated JSDoc/README inputs和 current schema/example source refs，修复而不手改 generated output。
- [x] 1.11 同步 `AGENTS.md`、Navigation、Architecture、Coding Style、Script Tooling、Configuration、Output、Scanner Dependencies、Quality Metrics、Testing 与直接受影响 active Change handoff，使当前 owner只声明目标路径、名称与依赖且不再声明 Product CLI；archive和 established Decision形成时背景保持不动。

## Verification

- [x] 2.1 运行 ledger schema/completeness 与目标 source/import/path/name检查，确认每个 tracked current consumer只有一个已实施 ledger结果，current source不含退役目录、临时 CLI diagnostic、顶层 scripts command 文件、未批准 `index.ts` 或未经审核的泛化名称；Product/scripts value-import graph均无循环，禁止依赖方向和 package→project consumer backedge均为零。
- [x] 2.2 运行最窄 Product Definition、built-in Checks、Core、Run、Output、Scheduler 与 Foundation tests，并运行 Product typecheck/lint/format；用迁移前相同输入比较 structured result 与 machine v4 bytes，并确认 CLI source/root command/test已退出。
- [x] 2.3 运行 development、scripts Foundation、validation、docs、Decision adapter、Test Evidence、project quality/Gate 与 package artifact/candidate focused tests，以及 scripts typecheck/lint/format。
- [x] 2.4 构建并审计 exact local candidate，比较 public runtime exports、declaration inventory、tarball allowlist和 dependency closure；在新 private consumer 中 isolated install/typecheck/runtime execute，并确认旧 receipt、旧 install path和 ancestor dependency不能满足 reuse。
- [x] 2.5 运行 `bun run test-evidence -- check --root .`、package API docs check、`bun run validate`、`bun run decisions -- check` 与本 Change strict check；用代表性 AI task确认它能从实际交付文本为任一 file恢复唯一 ledger action/target/验证、为名称例外找到永久 owner，并在 public rename、额外 `index.ts`、行为差异或发布操作请求时命中 stop condition而不继续猜测。
- [x] 2.6 运行 `bun run quality`、`bun run verify:vibe-check-workspace:required` 和 `bun run verify:vibe-check-workspace:full`，比较迁移前 Gate identity membership、aggregate、exit mapping与日志边界，复核最终 diff除已授权退出临时 CLI diagnostic 外未引入产品语义、public contract、release materials或外部状态变化。
