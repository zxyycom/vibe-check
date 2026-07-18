本 tasks 将 external project configuration workflow 拆成可验证步骤；当前 change 仅在 `openspec/changes/add-external-project-config-workflow/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## 1. 阻塞级实现前审计

- [ ] 1.1 审计 proposal、design、scan-configuration/CLI/scan-scope/test-fixtures deltas与本 tasks 是否围绕“每个外部项目显式拥有一份可发现或可生成的 config”这一核心句；确认 capability IDs合规、本 change仍是临时计划、未修改其它 docs/specs、验证覆盖 explicit/discovered/missing/init/dogfood migration，并确认现有 exact-input 规范的实现缺口已作为直接 bug fix 合入且有外部项目回归证明。该门禁完成前不得执行任何 2.x 及后续实现任务。
- [ ] 1.2 回答 starter config 使用单一 mixed scope还是多个 presets的问题，将答案写入 Decision、help contract与fixtures，并删除已回答的 Open Question。
- [ ] 1.3 审计当前 complete `QualityConfig` 中 tool paths、report text和code areas，列出不得进入repository-neutral starter的Vibe Check-specific values。

## 2. Configuration selection

- [ ] 2.1 定义 config source/provenance model：explicit或discovered、resolved path和version。
- [ ] 2.2 实现只在 normalized project root查找 `vibe-check.config.json` 的 discovery。
- [ ] 2.3 保持 `--config`最高优先级，并证明 explicit与discovered configs不merge。
- [ ] 2.4 在两种 config都缺失时，于scanner/banner/artifact前返回actionable config error。
- [ ] 2.5 确认current、baseline与Git-fallback复用一次加载的selected config。

## 3. Initialization workflow

- [ ] 3.1 增加 `init [project-root]` CLI routing和help，不进入scan core。
- [ ] 3.2 实现deterministic complete starter config generator及JSON formatting。
- [ ] 3.3 拒绝覆盖existing config，并保留原文件bytes。
- [ ] 3.4 确认generated config不含source-checkout绝对路径或Vibe Check-specific globs/areas。
- [ ] 3.5 输出created path、config source说明和下一步scan命令。

## 4. Dogfood migration and fixtures

- [ ] 4.1 把当前Vibe Check DEFAULT_CONFIG内容迁入checked-in dogfood config owner。
- [ ] 4.2 让 `quality:*` 与wrapper显式传入repository root和dogfood config。
- [ ] 4.3 扩展external project fixture以覆盖init、discovery、explicit precedence、missing config和launch-cwd independence。
- [ ] 4.4 增加config source metadata、help、error text和no-scanner-on-failure assertions。

## 5. Documentation and verification

- [ ] 5.1 更新CLI、Configuration、Scan Scope、Architecture、Testing与Script Tooling owner materials和case ledger。
- [ ] 5.2 运行config/unit/entry/dogfood tests、typecheck与lint。
- [ ] 5.3 从仓库外cwd重放init、discovered scan、explicit scan与missing-config smoke。
- [ ] 5.4 运行 `bun run validate` 与 `bun run verify:vibe-check-workspace:required`。
- [ ] 5.5 运行OpenSpec strict validation并汇总config precedence、provenance和dogfood isolation证据。
