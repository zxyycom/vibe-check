核心句：本 change 只在 `openspec/changes/stabilize-scan-input-path-and-ignore-semantics/` 下形成待审计临时计划，用于在实现前选择并稳定相对 `--changed-files` 输入路径基准与 fallback walker ignore 语义；它不影响现有其它文档或主规范。

## 1. 阻塞级实现前审计

- [ ] 1.1 **阻塞级审计/选择门禁：未完成本项前不得执行 2.1 及之后任何实现、文档或验收任务。** 基于正式入口、dogfood wrapper、不同 launch cwd、Git 不可用/失败环境的 characterization 证据，分别从 normalized project root 与 process launch cwd 中选择唯一的相对 `--changed-files` 路径基准，并从 pinned best-effort 与经界定的 VCS ignore parity 中选择唯一的 fallback policy；若选择 parity，还必须界定 ignore sources、precedence、path normalization 与失败行为。把答案持久化为连续编号的 design Decisions，删除对应 Open Questions，收敛两个 delta 的条件分支与后续 tasks。审计同时确认 proposal、design、specs、tasks 均围绕开头核心句，`cli-contract`/`scan-scope` capability ID 复用正确，本 change 仍只是待审计临时计划且未修改其它文档或主规范，changed-files entries、metrics、warnings、artifact/report、summary status 与进程状态映射边界未扩张，并确认验证路径足以证明最终合同。
- [ ] 1.2 在 1.1 解除门禁后，重新读取产品化 change 归档后的 `cli-contract` 与 `scan-scope` 主 specs，按完整 requirement block 修正本 change delta（如需要），并运行 strict change validation，确认没有开放歧义或同义 capability。

## 2. 相对 changed-files 路径合同

- [ ] 2.1 为选定路径基准补充失败优先的定向测试，覆盖从 project root 内外启动、显式 project root、正式入口与 dogfood wrapper，并证明相对列表路径只使用一个基准。
- [ ] 2.2 在现有 CLI/path normalization 边界内实现选定基准，不增加第二套 parser、wrapper rebasing 或通用路径抽象。
- [ ] 2.3 补充绝对列表路径与列表 entries 回归测试，证明绝对路径不重写、entries 仍作为 project paths，且现有错误与进程状态映射不变。

## 3. Fallback ignore 合同

- [ ] 3.1 为选定 fallback policy 补充失败优先的定向测试，稳定触发 primary Git collection 失败，并覆盖 include、exclude、generated-file 与 VCS-ignored path 的期望集合。
- [ ] 3.2 在现有 collection/fallback 边界内实现选定 policy；若选择 best-effort 则不引入 ignore parser，若选择 ignore parity 则只实现审计界定的规则与失败行为，不扩展成通用规则引擎。
- [ ] 3.3 补充 Git-first 与 fallback 回归测试，证明 collection 使用选定 policy，且 metrics、warnings、artifact/report、summary status 与进程状态映射未被改变。

## 4. Owner 同步与验收

- [ ] 4.1 同步现有 CLI 与 scan-scope owner 文档、help/示例中受影响的路径和 fallback 说明，不新建同义 owner 或 capability。
- [ ] 4.2 按仓库 package scripts 运行 product import、typecheck、lint、test、dependency 与正式入口检查，并运行 `bun run verify:vibe-check-workspace:required`。
- [ ] 4.3 运行 `openspec validate stabilize-scan-input-path-and-ignore-semantics --type change --json --strict --no-interactive`，检查局部 diff 只覆盖已审计范围，并记录所有验证证据后再申请验收。
