> **核心句：**本 delta 让 Product CLI 选择受信任 TypeScript Project Definition，提供明确 non-executing bypass，并保持 dynamic policy IDs 只在本次 definition 解析后验证。

## MODIFIED Requirements

### Requirement: CLI owner documentation

CLI owner SHALL 记录正式入口、project-root normalization、existing scan flags、Project Definition
selection/trust、console/artifact boundary、process mapping 与 dogfood wrapper 方向，并记录
`--gate <policy-id>`、explicit named reference inputs 及 `run.json`/`records.ndjson` 边界。Product CLI
SHALL 提供 `--profile`、`--baseline`、`--changed-files`、`--config`、`--no-project-definition`、
`--top-n`、`--artifact-dir`、`--skip-baseline`、`--verification-output` 与 `--help`。Relative
`--changed-files` 和 `--config` paths MUST 基于 normalized project root。CLI MUST 不增加
`--with-baseline`、`--format` 或 `--version`。

普通 `scan --help` MUST 不 load/evaluate Project Definition，因此只说明 policy ID 来自本次 resolved
catalog、如何选择以及 ordinary discovery 会执行 trusted same-process code；它不得枚举 built-in、dynamic
或 previous-run policy IDs。Unknown non-empty policy ID MUST 在 definition resolution 完成且 check execution
开始前失败，并列出本次 resolved IDs；empty catalog 必须明确显示为空。

#### Scenario: Navigation exposes the current CLI surface

- **WHEN**reviewer 从 `docs/navigation.md` 查找 CLI behavior
- **THEN**navigation 指向记录 scan flags、Project Definition trust/selection、resolved policy/reference、
  artifacts、status mapping 与 wrapper direction 的 owner

#### Scenario: Existing flags retain parser semantics

- **WHEN**caller 通过正式入口传入 existing scan flag
- **THEN**CLI 保持 project-root rebasing 与 existing parser semantics，并延后 gate value 到 resolved catalog 验证
- **AND**不新增 `--with-baseline`、`--format` 或 `--version`

#### Scenario: Help documents complete configuration input

- **WHEN**caller 运行 `scan --help`
- **THEN**help 说明 explicit `--config <file.ts>`、fixed `.vibe-check/config.ts`、relative path 基准、neutral
  omitted behavior 与 `--no-project-definition`
- **AND**help 明确 module/import 执行 trusted code 且不声称 merge 多个 sources

#### Scenario: Help documents explicit baseline selection

- **WHEN**caller 运行 `scan --help`
- **THEN**help 说明只有 explicit `--baseline <revision>` 提供 `baseline` reference
- **AND**不声称自动发现或推断 comparison reference

#### Scenario: Static help does not enumerate dynamic policy IDs

- **WHEN**caller 在没有加载具体 Project Definition 时运行 `scan --help`
- **THEN**help 说明 `--gate` 接收 resolved policy ID 及来源
- **AND**不 load module 或把 built-in/previous-run IDs 显示为本次完整集合

#### Scenario: Unknown policy reports the loaded catalog

- **WHEN**selected Project Definition 已解析且 caller 提供 unknown policy ID
- **THEN**CLI 列出本次 resolved available IDs 并 exit `3`
- **AND**不启动 check contribution 或创建 scan artifacts

## ADDED Requirements

### Requirement: TypeScript Project Definition workflow commands

Product CLI SHALL 将 `scan [project-root]` 与 `init [project-root]` 路由为 independent operations。Root、scan
与 init help SHALL 共同呈现：ungated neutral observation、explicit/fixed TypeScript source、module-backed
gate policy、trusted-code notice、non-executing disabled path 与 safe single-target initialization。

Init SHALL 只执行 root validation、deterministic import-free `config.ts` generation、target ensure 与 CLI
mapping；它 MUST 不 import/evaluate existing/new module。`init` 接受零或一个 project-root positional 及
`--help`；omitted root 使用 startup cwd，explicit relative root 基于 startup cwd。

#### Scenario: Root help exposes both operations

- **WHEN**caller 运行 root `--help`
- **THEN**help 列出 `scan [project-root]` 与 `init [project-root]`
- **AND**每个 operation 说明用途

#### Scenario: Scan help explains executable selection

- **WHEN**caller 运行 `scan --help`
- **THEN**help 说明 explicit/fixed TypeScript selection、neutral default 和 `--no-project-definition`
- **AND**help 说明 gate 要求 module-backed policy 且 ordinary discovery 执行 trusted code

#### Scenario: Init help explains one import-free target

- **WHEN**caller 运行 `init --help`
- **THEN**help 标明 `.vibe-check/config.ts`、import-free starter 和 missing-file materialization
- **AND**help 说明 existing-file preservation、无 sibling schema 和 legacy JSON manual migration

#### Scenario: Init remains non-evaluating

- **WHEN**init 成功或返回 handled failure
- **THEN**CLI 只执行 initialization responsibility 且不 import existing/new module
- **AND**first/repeated success 都输出 single target 与 ensure state

#### Scenario: Workflow failures use exit three

- **WHEN**gate 缺少 module-backed policy、selected moduleload/validation 失败、selection flags conflict 或 init
  target unsafe
- **THEN**CLI 向 stderr 写 operation/path/stage/reason diagnostic 并 exit `3`
- **AND**diagnostic 提供 actionable recovery

### Requirement: No-project-definition mode is explicit and non-executing

`scan --no-project-definition` MUST 禁止 `--config` 与 fixed module import，并选择 Product-owned neutral
definition；它只可与 omitted gate 组合。Parser MUST 在 module evaluation 前拒绝 duplicate flag、与
`--config` 组合或与 gate 组合，并 exit `3`。

#### Scenario: Disabled mode skips discovered module

- **WHEN**project 包含 `.vibe-check/config.ts` 且 caller 运行 ungated `scan --no-project-definition`
- **THEN**CLI 不 import file 或 dependencies 并传递 disabled provenance
- **AND**scan 只使用 neutral Product-owned declarations/bindings

#### Scenario: Disabled mode conflicts before code execution

- **WHEN**caller 把 `--no-project-definition` 与 `--config` 或 `--gate` 组合
- **THEN**CLI 在读取/import module 前报告 legal usage 并 exit `3`
- **AND**不启动 check、reference、cache 或 artifact work

## REMOVED Requirements

### Requirement: Configuration workflow command

**Reason:** JSON config/schema two-target workflow 被 TypeScript Project Definition、trusted-code notice 和
single import-free starter 替代。

**Migration:** 使用 `TypeScript Project Definition workflow commands` 和
`No-project-definition mode is explicit and non-executing`。
