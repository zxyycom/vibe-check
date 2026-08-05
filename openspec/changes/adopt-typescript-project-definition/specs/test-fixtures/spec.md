> **核心句：**本 delta 用 import-free TypeScript starter 和 custom ProjectCheckDeclaration fixtures 证明 module loading、public/private resolution、selection、planning、trust 与 disabled boundaries。

## ADDED Requirements

### Requirement: Project Definition contract has direct failure evidence

Repository SHALL 提供 Product-ownedunit/acceptance evidence，覆盖 plain structured export、optional helper
equivalence、top-level await、missing/function/Promise export、wrong API version、Bun import failure、invalid
policy/declaration、duplicate/dangling identity、public CheckDefinition/private binding separation、selection
closure、invocation planner timing、freeze 与 data-fingerprint/cache boundary。Tests MUST 使用 checked-in 或
temporary local modules，不得依赖 network、wall-clock ordering 或 unfixed package state。

#### Scenario: Invalid module matrix stops before work

- **WHEN**required validation 运行 representative load/export/declaration failure fixtures
- **THEN**each case 产生 selected path/stage/reason diagnostic 与 exit `3`
- **AND**controlled probes 证明 runner、planner、scanner、reference、cache 和 artifact work 均未开始

#### Scenario: Planner runs after applicability

- **WHEN**task-based custom check 通过 module resolution 并在本次 invocation 冻结为 applicable
- **THEN**test 证明 private factory 只在 foundation planning context/work handles 准备后调用
- **AND**module evaluation 期间没有构造 final TaskPlan 或注册 Task

#### Scenario: Custom cache is absent

- **WHEN**两次 invocations 使用相同 definition data fingerprint
- **THEN**custom runner 在两次都执行
- **AND**test 不以 module/data/catalog fingerprint 伪造 custom result cache hit

### Requirement: Configured Project Definition fixture

Repository SHALL 提供 minimal deterministic external project fixture，包含 import-free or local-only
`.vibe-check/config.ts`、eligible sources、excluded/generated controls、built-in references、一个 direct
custom declaration、一个 task-based custom declaration 与 README。Custom metadata MUST 解析为 foundation
public CheckDefinitions，functions MUST 只进入 private bindings；fixture 不得依赖 network、ambient secrets
或 uncontrolled subprocess。

Formal CLI acceptance SHALL 分别证明 explicit/discovered source、effective scope、all-custom-requested、
built-in profile semantics、`requiresChecks` closure、applicability、invocation TaskPlan freeze、
CheckResult/QualityRecord independence、definition provenance/fingerprint 与 run/record/report artifacts。
Deterministic built-in backend control 只能使用 Product-ownedtest seam 或 supported operational input。

#### Scenario: Formal entry resolves project declarations

- **WHEN**acceptance 从 fixture root 外运行
  `bun run product:cli -- scan <fixture-root> --config .vibe-check/config.ts`
- **THEN**built-in refs 与 custom declarations 解析为 one public catalog/one private binding table
- **AND**machine provenance 标识 explicit source 与 validated declarative fingerprint

#### Scenario: Custom checks default requested

- **WHEN**fixture 运行 ungated scan 且声明 direct/task custom checks
- **THEN**both custom checks 进入 initial requested set，built-ins 仍服从 Product profile
- **AND**`requiresChecks` 由 orchestration closure 加入 prerequisites

#### Scenario: Fixture preserves public and private boundaries

- **WHEN**reviewer 检查 fixture definition、local functions 和 artifacts
- **THEN**CheckDefinitions/artifacts 不包含 runner、planner、Task functions 或 closure state
- **AND**records/results 只通过 foundation contracts 观察

#### Scenario: Acceptance remains deterministic

- **WHEN**required validation 重复运行 fixture acceptance
- **THEN**normalized policy、public catalog、record order 与 declarative fingerprint 稳定
- **AND**custom functions 仍每次执行且不依赖 opaque function serialization

### Requirement: Project Definition workflow fixture

Repository SHALL 使用 external project fixture 的 independent temporary copies，通过 formal CLI 证明
zero-definition observation、gate prerequisite、TypeScript init/discovery、repeat ensure、explicit
precedence、module/export validation、legacy JSON hard cut、trusted-code provenance 与
`--no-project-definition` non-execution。Test-ownedrunner/scanner support MAY 保持结果 deterministic。

#### Scenario: Clean project proves default and gate boundary

- **WHEN**clean copy 先 ungated scan 再在 same no-definition state gated scan
- **THEN**ungated 使用 neutral default；gated 在 module/check work 前 exit `3`
- **AND**evidence 标识 neutral source 与 module-backed recovery

#### Scenario: Initialized project proves import-free source equivalence

- **WHEN**clean copy 执行 init 且 project 未安装 Vibe Check SDK，再通过 fixed discovery scan
- **THEN**loader 接受 generated import-free `.vibe-check/config.ts`
- **AND**normalized policy/built-in refs/schedule data 等同生成时 neutral definition，且 init 未 evaluate module

#### Scenario: Explicit and invalid modules prove finality

- **WHEN**fixture 有 discovered definition 且 caller 另选 valid/invalid explicit `.ts`
- **THEN**valid explicit controls scan；invalid explicit 返回自身 path/stage error
- **AND**均不回退 discovered/default

#### Scenario: Disabled mode does not execute fixture code

- **WHEN**discovered module 具有 controlled evaluation probe 且 caller 传入 `--no-project-definition`
- **THEN**probe 证明 module/imports 未执行，scan 使用 disabled/neutral provenance
- **AND**该 mode 与 `--config`/gate 组合在 probe 前失败

#### Scenario: Initialization preserves one target safely

- **WHEN**acceptance 覆盖 existing target、existing tool directory、race、handled write 与 legacy-JSON-only copy
- **THEN**initializer 保持 pre-existing bytes、只 exclusive-createmissing `config.ts` 并 cleanup owned partial state
- **AND**legacy case 获得 manual migration 而不创建 second active config

## MODIFIED Requirements

### Requirement: Repository dogfood config is isolated

Repository SHALL 把 complete Project Definition 保存为 `<repo-root>/.vibe-check/config.ts`；canonical
repository definition MUST 是 import-free structured export，Product 从自身 runtime 解析 built-in references。
`quality:*` SHALL 通过 formal trusted discovery 获得 definition，root-only wrapper 原样传递 arguments、streams
与 outcome。Repository MUST 不保留 active `.vibe-check/config.json` 或 generated config schema。

#### Scenario: Dogfood exercises discovery

- **WHEN**quick、full、default 或 gate dogfood entry 运行
- **THEN**CLI 报告 discovered Project Definition 与 trusted-code provenance
- **AND**entry-specific profile/gate behavior 继续使用 owning Product contracts

#### Scenario: Explicit wrapper input retains public precedence

- **WHEN**caller 通过 `quality:scan` 传入 `--config <file.ts>`
- **THEN**CLI 选择 explicit module
- **AND**wrapper 继续作为 transparent root adapter

## REMOVED Requirements

### Requirement: External workflow fixtures consume the semantic config owner

**Reason:** JSON filename、comment grammar 与 sibling schema workflow 被 single-active TypeScript Project
Definition 替代。

**Migration:** 使用 `Project Definition workflow fixture` 分别验证 runtime validators、init/import-free
starter 与 disabled path。

### Requirement: External project configuration workflow fixture

**Reason:** Existing matrix 只证明 JSON document/schema workflow，不能证明 module evaluation、trusted code 或
public/private custom check resolution。

**Migration:** 使用 `Project Definition workflow fixture`。
