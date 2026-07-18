## 1. 审计门禁

- [x] 1.1 完成实现前合同审计：确认 relative changed-files 使用 normalized project root、
  missing list 保留 `ENOENT` exit `3`、current/baseline Git success（包括空集合）具有权威性、
  command failure 使用 config-only fallback；确认 `cli-contract` 与 `scan-scope` owner
  复用正确，proposal、design、specs 与 tasks 无开放选择，并通过 strict change validation。

## 2. 建立行为证据

- [ ] 2.1 在 `src/product/quality-core/src/input/files.test.ts` 增加失败优先 unit test：列表
  文件只存在于 temporary project root，调用时传入相对 `--changed-files` 值，证明读取
  基于 `rootDir` 而非 process cwd；再增加一个从 project root 外启动的正式 Product CLI
  temporary-project test，证明 public entry 组合相同语义。
- [ ] 2.2 增加 absolute list path、基于 root 的 `..` path 与 project-relative entries
  回归测试，证明列表文件可以位于 root 外、entries 不相对于列表文件解析。
- [ ] 2.3 增加 missing changed-files test，证明 error 保留
  `failed to read --changed-files` prefix、原始 cause 与 top-level `ENOENT` 分类，并由
  Product CLI 映射为 exit `3`；普通 read error 仍使用既有 exit `2`。
- [ ] 2.4 使用成对 temporary fixtures 证明 current 与 baseline collection：Git command
  成功时应用 VCS ignore，成功的空结果不触发 walker；Git command 失败时进入
  config-only fallback，匹配 include 且未命中 config exclude/generated 的 VCS-ignored
  path 可进入候选集合，config exclusions 继续生效。

## 3. 实现 scan input 合同

- [ ] 3.1 在同时拥有 normalized `rootDir` 与 raw option 的 existing input boundary 解析
  changed-files list path：相对值按平台原生规则基于 `rootDir` 解析，绝对值保持绝对，
  不增加 project-root containment。
- [ ] 3.2 在包装 changed-files read failure 时保留原始 `cause` 和 `ENOENT` 分类，不修改
  通用 `qualityScanErrorExitCode` table。
- [ ] 3.3 让 current 与 baseline collector 在 Git command 成功时直接使用结果，包括空
  candidate set；只在 command failure 时调用各自现有 config-only fallback，不引入 ignore
  parser 或 runtime dependency。
- [ ] 3.4 保持 Product parser、正式入口和 dogfood wrapper 对 `--changed-files` 的 opaque
  透传，不增加 parser-specific 或 wrapper-specific rebasing。

## 4. 同步 owner 与帮助材料

- [ ] 4.1 更新 `docs/cli.md` 与 CLI help，明确 relative/absolute list path 和
  project-relative entry 语义；在 `docs/cli.md` 记录 missing list 的既有 exit `3`
  mapping。
- [ ] 4.2 更新 `docs/scan-scope.md`，明确 current/baseline Git success（包括空集合）与
  command-failure config-only fallback 的边界，以及稳定 exclusion 由 Config / Scan Scope
  owner 维护。
- [ ] 4.3 扩展 `AUX-QUALITY-CHANGED-FILES-001` 的 proof target，并为 fallback collection
  新增独立 `@case` marker 与 `docs/testing/cases.md` 条目；case 同时覆盖 current/baseline
  success-empty 与 failure fallback，测试文档不重新定义 CLI 或 Scan Scope 合同。

## 5. 验收

- [ ] 5.1 运行 changed-files、file collection、Product CLI 与 dogfood wrapper 定向测试，
  确认 root、entries、stdout/stderr、exit `2` / `3` 与 success/fallback 状态转移。
- [ ] 5.2 运行 `bun run typecheck:product`、`bun run lint:product` 和
  `bun run test:product`。
- [ ] 5.3 运行 `bun run validate` 与
  `bun run verify:vibe-check-workspace:required`，确认 docs、OpenSpec、diff 和 product
  workspace gates 通过。
- [ ] 5.4 运行
  `openspec validate stabilize-scan-input-path-and-ignore-semantics --type change --json --strict --no-interactive`，
  复核局部 diff 只覆盖本 change 的路径、error mapping、collection fallback 与对应验证
  材料，并记录验证证据后申请验收。
