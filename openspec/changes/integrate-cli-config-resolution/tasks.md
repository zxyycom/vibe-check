## 1. 实现门禁

- [x] 1.1 审计门禁：确认 pinned commit public API、submodule/path dependency、现有 `serde_json`、metadata-derived first-issue key registry 和 owned config boundary 可执行；proposal、design、specs、tasks、rollback 与验证路径一致且无阻塞问题。

## 2. Owner 文档与验证资料基线

- [ ] 2.1 新增 Config owner 文档，记录 canonical field、JSON `output.format` path、`VIBE_CHECK_FORMAT`、explicit CLI > env > explicit config > static default、无隐式 discovery、首个 structural error、leaf canonical validation、typed boundary 和配置诊断；同步 `docs/navigation.md` 的入口与规则所有权。
- [ ] 2.2 更新 `docs/architecture.md` 和 `docs/cli.md`，明确 CLI bootstrap/config handoff、Config resolution 时点、resolved config 留在 scan pipeline context、`ScanRequest` 保持既有职责、meta command bypass 和 stdout/stderr/exit code compatibility。
- [ ] 2.3 更新 `docs/script-tooling.md` 的新 checkout 初始化说明，使 `git submodule update --init --recursive` 同时覆盖 toolkit 与 Rust dependency submodule；检查 workspace verifier 的环境 preflight，若缺失 `subrepos/cli-config-resolution` 时没有可行动诊断，则补充该诊断。
- [ ] 2.4 按 `docs/testing.md` 与 case-maintenance 规则登记 `CONFIG` 白盒责任域、dependency/config cases 及其 proof target，状态标记为 planned；测试落地时同步 implemented `@case` 标记，并更新既有 CLI case 的 proof target。

## 3. Dependency 接入与 characterization gate

- [ ] 3.1 将 `zxyycom/cli-config-resolution` 作为 `subrepos/cli-config-resolution` submodule 固定到审计 commit，更新 `.gitmodules`、root workspace exclude/path dependencies、`crates/vibe-check/Cargo.toml` 和 `Cargo.lock`；复用现有 workspace `serde_json`，不新增配置格式 parser，并用 `cargo metadata --locked --no-deps --format-version 1` 证明 nested workspace 边界正确。
- [ ] 3.2 新增最窄 dependency characterization tests，直接证明 command augmentation、只提取 explicit CLI value、`FieldStringEnum` enum/static default、config path extraction、Replace precedence、invalid selected candidate 和 overridden invalid candidate trace 语义；在 case 账本登记唯一 proof target，状态标记为 planned。
- [ ] 3.3 运行 characterization test、目标仓库记录的 locked all-target tests 和 `cargo check -p vibe-check --all-targets --locked`；若任何已记录 API/行为不成立，停止应用逻辑实现并先更新 proposal/design/specs/tasks。

## 4. Canonical Config owner

- [ ] 4.1 新增职责单一的 config 模块入口和 Vibe Check-owned resolved config 类型；将 `OutputFormat` 放到可由 CLI、Config 和 Output 共同消费的稳定实现归属，并实现 `FieldStringEnum`，移除并行 accepted-value/default 常量。
- [ ] 4.2 用 `FieldDefs` 或等价单一 `FieldDefSet` 声明 `output_format` 的 `--format`、`VIBE_CHECK_FORMAT`、`output.format`、string-enum validation、Replace 和 static `human` metadata；用局部 invariant test 证明 canonical definitions 可构造。
- [ ] 4.3 实现 UTF-8 JSON loader：接受顶层 `{}`，拒绝读取失败、非 UTF-8、无效 JSON 和 non-object root；用 metadata-derived key registry 返回首个 unknown-key/non-object-intermediate failure，并把 declared leaf value 交给 canonical validation。
- [ ] 4.4 实现 explicit config、environment 和 explicit CLI source extraction，按 `100 < 200 < 300` 稳定注册来源，调用 resolver 并 all-or-nothing typed-materialize；用 Config-owned opaque input/result 隔离 dependency types。
- [ ] 4.5 将 load/extraction/resolution/materialization failures 映射为现有 user/config error category；确保 higher-priority valid Replace candidate 可覆盖 lower invalid candidate，而 selected invalid candidate 阻止 materialization。
- [ ] 4.6 增加 Config 单元测试，覆盖 no-source default、config/env/CLI precedence、`{}`、缺失 field、首个 unknown key / non-object root or intermediate、空文件、invalid UTF-8/JSON/value/enum、overridden invalid leaf 和 Vibe Check-owned result boundary。

## 5. CLI 与 scan pipeline 集成

- [ ] 5.1 保留原生 `project-root` / `--config`，通过 Config wrapper 的 `augment_command` 注册 `--format`，并移除手写 format default/validation；验证 unknown argument、leading-dash positional、help/version 快路径和 flag discoverability。
- [ ] 5.2 在 parser/config boundary 用 `extract_cli` 建立 opaque explicit CLI source；dependency-owned `Source` 不越过 Config boundary，canonical command projection mismatch 作为应用 invariant error 处理。
- [ ] 5.3 在路径归一化后、scanner execution 前加载显式 config、读取声明过的 environment、resolve 并 materialize；把 resolved config 留在 `ScanPipelineContext`、把 output format 交给既有 output dispatch，并保持 `ScanRequest` 及 normalized config path report metadata 语义不变。
- [ ] 5.4 确认所有 CLI/config failure 在 scan 前返回 exit `2`、stderr diagnostic 和空 stdout；help/version 在非法 `VIBE_CHECK_FORMAT` 下仍跳过 config resolution 并退出 `0`。

## 6. 外部契约测试与 fixtures

- [ ] 6.1 增加 checked-in JSON fixtures，至少覆盖合法 `{"output":{"format":"json"}}`、`{}`、unknown field、non-object root/intermediate、invalid enum、invalid JSON 和空文件；fixture 测试不得在运行时创建或修改 config input。
- [ ] 6.2 扩展真实 binary CLI contract tests，证明 default human、无隐式 config discovery、config-selected JSON、env overrides config、explicit CLI overrides env/config、selected invalid CLI/env/config exit `2`、合法高优先级 CLI 覆盖 lower invalid leaf、structural file error 始终阻塞、stdout/stderr purity、config path metadata 和 scanner execution gate。
- [ ] 6.3 调整 CLI test helpers，使每个 child process 默认 `env_remove("VIBE_CHECK_FORMAT")`，只有目标 case 通过 `Command::env` 注入值，避免宿主环境和并行测试污染。
- [ ] 6.4 覆盖 root help、scan help 和 version 在非法 environment 下仍成功且不输出 scan report；scan help 只断言 `--format` 与 `--config` 可发现。
- [ ] 6.5 将 dependency/config case 状态更新为 implemented，更新既有 CLI case 的 `Proves:` / Mermaid 叶子和 `Code:`，并在对应测试入口放置唯一 `@case` 标记。

## 7. 契约同步与兼容审计

- [ ] 7.1 对照实现同步 Config、CLI、architecture、navigation、testing 和 script-tooling owner docs；稳定行为只由对应 owner 定义，dependency type、numeric priority、parser/help 细节留在 design 或测试证据中。
- [ ] 7.2 检查 report schema、examples、human labels、warning/gate semantics 和 scanner adapters 无需变化；用局部 diff 与关键词搜索证明本 change 只改变 input/config resolution 和相关验证材料。
- [ ] 7.3 审计 downgrade/rollback：恢复手写 `--format` 后显式 CLI 行为仍等价；记录旧版本会忽略新 env/config surface，并确认没有 persisted data migration。

## 8. 最终验证

- [ ] 8.1 运行 Config/CLI/characterization 最窄 Rust tests，并执行 `cargo fmt --all --check`、`cargo clippy --all-targets --all-features -- -D warnings` 和 `cargo test --all`。
- [ ] 8.2 运行 `bun run validate`，确认 docs、case ledger、OpenSpec、links、JSON/schema/examples 和 whitespace validation 通过。
- [ ] 8.3 运行 `bun run verify:vibe-check-workspace:full`，确认 submodule checkout、toolkits、Rust、scripts、quality 和完整 workspace gate 通过。
- [ ] 8.4 运行 `openspec validate "integrate-cli-config-resolution" --type change --json --strict --no-interactive`、`git diff --check`、局部 diff 和 submodule status 审计，确认只修改目标范围且记录全部验证证据。
