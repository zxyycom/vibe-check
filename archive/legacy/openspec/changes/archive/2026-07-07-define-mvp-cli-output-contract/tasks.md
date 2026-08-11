本 tasks 清单把 MVP CLI 与输出契约拆成可执行实现步骤。

## 1. 实现前阻塞审计

完成 1.1-1.5 前，不得执行第 2-6 组实现任务。

- [x] 1.1 审计 proposal、design、specs 和 tasks 是否都围绕“定义 MVP CLI 与输出契约”这一核心目标，且没有把 scanner 具体算法、完整配置系统或长期架构改写塞入本 change。
- [x] 1.2 审计 capability ID `cli-contract` 和 `output-contract` 是否符合长期 owner 命名规则，且没有把 change 名称误用为 capability。
- [x] 1.3 审计 apply 后的长期 owner 落点是否清晰：CLI 与 Output 规则进入 `docs/` owner 文档，OpenSpec delta、schema、examples 和测试只作为规划或证明材料。
- [x] 1.4 审计 `design.md` 的 `## Open Questions` 是否没有未回答问题或已收敛歧义。
- [x] 1.5 审计验证路径是否足以证明 CLI surface、退出码、stdout/stderr、JSON envelope、schema/example 和 empty-state 行为。

## 2. Owner 文档与导航

- [x] 2.1 新增或更新 CLI owner 文档，记录 MVP command surface、路径/config 归一化入口、输出模式、stdout/stderr 归属和退出码映射。
- [x] 2.2 新增或更新 Output owner 文档，记录 human output、JSON output、CI 消费边界、schema/example owner、empty-state 行为和格式校验边界。
- [x] 2.3 更新 `docs/navigation.md`，让 CLI、Output、schema/example 和验证入口指向对应 owner。
- [x] 2.4 用 `docnav outline` 或等价方式检查新增/更新文档结构，并用局部 diff 确认只改目标范围。

## 3. Rust workspace 与 CLI skeleton

- [x] 3.1 创建初始 Cargo workspace 和 `vibe-check` CLI crate，保持模块边界与 `docs/architecture.md` 的 CLI/Core/Scanner/Output 分层一致。
- [x] 3.2 实现 `vibe-check scan [project-root]` 参数解析，并覆盖省略 project root、显式 project root、help/version 和无效 invocation。
- [x] 3.3 实现 `--format human|json` 和 `--config <path>` 的解析与校验。
- [x] 3.4 建立 CLI 到 core scan request 的归一化边界，保证 CLI 不解析 scanner 私有输出。

## 4. 输出模型与退出码

- [x] 4.1 定义最小 report data、diagnostic、warning、gate 和 error category 类型，支持 CLI/output contract 测试。
- [x] 4.2 实现退出码映射：`0` success、`1` gate failure、`2` user/config error、`3` scanner fatal、`4` output failure。
- [x] 4.3 实现 stdout/stderr 归属，保证 human/json report 写 stdout，顶层 diagnostics 和 errors 写 stderr。
- [x] 4.4 使用 fixture-backed 或最小内置 scanner result 证明 CLI/output 行为，不在本 change 中接入真实 scanner adapter。

## 5. JSON 与 human output

- [x] 5.1 实现 JSON envelope 字段：`schema_version`、`tool`、`run`、`scope`、`summary`、`metrics`、`warnings`、`gate`、`diagnostics`。
- [x] 5.2 实现 human output sections：summary、gate result、warning findings、存在时的 accepted/suppressed warnings 和 scanner diagnostics。
- [x] 5.3 实现 empty-state 输出，覆盖空 scan scope、零 warnings 和零 supported scanner findings。
- [x] 5.4 确保 human output 和 JSON output 都从同一 report data 投影；未来新增 CI summary 或 annotation 时也必须复用同一 report data。

## 6. Schema、examples 与验证

- [x] 6.1 新增 JSON output owner schema，并写入 passing、gate-failing、empty-scope 和 diagnostic examples。
- [x] 6.2 新增 schema/example 校验脚本或测试，证明每个 example 可通过 owner schema。
- [x] 6.3 新增 CLI 集成测试覆盖输出模式、退出码、stdout/stderr 归属和显式配置路径。
- [x] 6.4 运行 `cargo fmt`、`cargo clippy --all-targets --all-features`、`cargo test --all`，并在涉及 schema/examples 时运行对应校验命令。
