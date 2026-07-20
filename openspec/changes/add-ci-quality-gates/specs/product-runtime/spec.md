## MODIFIED Requirements

### Requirement: 正式入口和 dogfood 入口共享同一核心

系统 SHALL 提供 `bun run product:cli -- scan [project-root]` 作为正式本地入口，并 SHALL 让仓库 `quality:*` 命令通过薄 wrapper 调用同一产品实现。Repository SHALL 新增 opt-in `bun run quality:gate`，通过 wrapper 对仓库根执行 full `regressions` gate；既有 `quality:check`、`quality:full-check` 与 `quality:scan` MUST 保持省略 gate 的观察行为。

#### Scenario: 正式入口执行扫描

- **WHEN** 调用者运行 `bun run product:cli -- scan [project-root]` 并传入受支持的 scan flags
- **THEN** 产品入口把归一化 project root、gate request 与其它 flags 交给同一扫描核心

#### Scenario: 省略 project root

- **WHEN** 调用者运行 `bun run product:cli -- scan` 且没有提供 project root
- **THEN** 产品入口使用启动 cwd 作为 project root

#### Scenario: 既有仓库命令保持观察行为

- **WHEN** 仓库 automation 调用 `quality:check`、`quality:full-check` 或 `quality:scan`
- **THEN** wrapper 显式传入 Vibe Check 仓库根并执行同一扫描核心
- **AND** invocation 不隐式选择 gate policy

#### Scenario: 仓库显式 dogfood regression gate

- **WHEN** 调用者运行 `bun run quality:gate`
- **THEN** thin wrapper 对 Vibe Check 仓库根执行 `--profile full --gate regressions`
- **AND** comparison prerequisite、GateResult 与 process exit 使用正式产品 contract
