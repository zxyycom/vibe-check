> **核心句：**本 delta 用 single-active TypeScript Project Definition 取代 JSON project config，并保持政策、选择、初始化与失败边界由 Product Config 归一化为冻结数据。

## ADDED Requirements

### Requirement: Project Definition policy data remains declarative

Selected Project Definition MUST 提供一份 complete typed project-policy input。Scope、built-in check
settings、file policy、named references、`DecisionPolicy`、acceptance、report 与 artifact/cache paths 的
exact fields 和语义 SHALL 继续由对应 Product owner 定义；Project Definition 只提供 authoring envelope，
不得通过 function、class instance 或 backend command object 改写这些 data contracts。

Owner validators MUST 把 accepted data 归一化为 detached、closed、deeply frozen invocation-owned values，
并在 scan work 前完成 unknown field、wrong type、invalid value 和 cross-reference validation。TypeScript
types/helpers 只提供 authoring assistance，runtime validator 仍是 authority。

#### Scenario: Typed policy is normalized once

- **WHEN**selected module 提供满足 owner contracts 的 complete project policy
- **THEN**Config boundary 产生 detached、deeply frozen policy snapshot
- **AND**current、reference、fallback collection、checks 和 decision evaluator 消费同一 resolved value

#### Scenario: Executable policy is rejected

- **WHEN**module 在 policy 或 gate tree 中提供 function 或其它 unsupported runtime object
- **THEN**Config boundary 在 check execution 前报告 field path 与 reason
- **AND**Core 不调用该 value 或把它解释为 custom policy evaluator

### Requirement: Project Definition source selection is single-active

Product CLI SHALL 按以下顺序选择唯一 Project Definition source：

1. `--config <file>` 指定的 `.ts` module；relative path 基于 normalized project root 解析；
2. fixed `<project-root>/.vibe-check/config.ts` module；
3. gate disabled 且 fixed legacy/TypeScript candidate 均不存在时的 Product-owned neutral definition。

Explicit 或 discovered TypeScript module 是 module-backed source，任一 gate MUST 使用 module-backed source。
`--no-project-definition` 是显式 disabled 分支：未组合 `--config`/gate 时跳过 fixed discovery/import 并使用
neutral definition。Explicit path 一经提供即为 final；ordinary discovery 不搜索 parents、startup cwd、
package metadata、alternate extension 或其它 filename。

Legacy fixed `.vibe-check/config.json` 在 ordinary implicit selection 中 MUST 形成 pre-work migration error，
不得读取、兼容、忽略为 default 或与 TypeScript dual-load。Explicit TypeScript source 和 explicit disabled
mode 不额外读取 unselected legacy candidate。

#### Scenario: Relative module uses project root

- **WHEN**caller 从 project root 外启动并传入 relative `--config`
- **THEN**CLI 只选择 normalized project root 下的 explicit `.ts` module
- **AND**launch cwd 不改变定位

#### Scenario: Explicit external module is final

- **WHEN**caller 传入 absolute 或包含 `..` 的 relative TypeScript config path
- **THEN**CLI 按 platform-native resolution 选择该 module
- **AND**load/validation failure 不回退 discovered 或 neutral source

#### Scenario: Fixed TypeScript definition is discovered

- **WHEN**caller 省略 selection flags 且 `.vibe-check/config.ts` 是唯一 active fixed candidate
- **THEN**CLI 选择 `discovered` source 并在 scan work 前 evaluate 一次
- **AND**CLI 不继续搜索其它 location 或 extension

#### Scenario: Missing definition uses neutral observation

- **WHEN**fixed TypeScript/legacy candidate 均不存在且 gate disabled
- **THEN**CLI 选择 complete neutral definition 并报告 default provenance
- **AND**Product 不要求 project 安装 authoring SDK

#### Scenario: Gate requires module-backed policy

- **WHEN**caller 启用 gate 但 explicit/discovered TypeScript definition 不可用
- **THEN**CLI 在 check work 前 exit `3`
- **AND**diagnostic 指向 `init` 和 `--config`

#### Scenario: Legacy JSON receives a hard cut

- **WHEN**ordinary discovery 只找到 `.vibe-check/config.json`
- **THEN**CLI 在 module/check/artifact work 前 exit `3` 并指向 `.vibe-check/config.ts` migration
- **AND**CLI 不 parse JSON policy、execute command fields 或回退 neutral default

### Requirement: Module-backed policy replaces defaults

Explicit/discovered Project Definition SHALL 提供本次 invocation 唯一 project-policy source。Module
evaluation 和 runtime validation 后，explicit `--top-n` 与 `--artifact-dir` SHALL 只覆盖对应 detached
policy fields；CLI override MUST 不替换 project check declarations、private bindings、schedule metadata、
named policy 或其它 definition metadata。Current、reference 与 Git-failure fallback SHALL 共享 final
resolved policy。

#### Scenario: Selected module is authoritative

- **WHEN**explicit/discovered definition 通过完整 validation
- **THEN**每个 policy field 来自其 normalized policy input，再应用 supported scalar overrides
- **AND**loader 不与 neutral default 或其它 modulepartial-merge

#### Scenario: Scalar override changes only its field

- **WHEN**caller 传入 `--top-n` 或 `--artifact-dir`
- **THEN**resolved policy 对应 field 使用 CLI value
- **AND**其它 policy/declaration/binding/schedule values 保持不变

#### Scenario: One snapshot spans current and reference work

- **WHEN**invocation 执行 current、named reference 或 Git-failure fallback collection
- **THEN**各阶段接收同一 frozen policy snapshot
- **AND**selection、module evaluation 和 normalization 各只执行一次

#### Scenario: Operational dependency input remains independent

- **WHEN**同一 invocation 还有 supported internal dependency override
- **THEN**definition 只决定 project policy/check composition，override 只决定 owning built-in dependency
- **AND**任一方不覆盖或序列化另一方 private fields

### Requirement: Project Definition load failure stops scan work

Config owner SHALL 在 scan core 前完成 selected path 检查、Bun module evaluation、default export/API version
validation、Project Definition envelope validation、declaration resolution、policy normalization 与
cross-reference validation。Missing、non-regular、unreadable、wrong-extension、module resolution/
evaluation、invalid export 或 validation failure MUST 产生包含 path、stage 与 reason 的 config error；CLI MUST
写 stderr 并 exit `3`，且不得回退 default、启动 check/reference/cache 或创建 success artifacts。

Legacy JSON 是 unsupported input。Loader MUST 不 dual-read、transpile、auto-convert、silently delete fields、
generate runner 或 execute legacy command/args。

#### Scenario: Selected module cannot be read

- **WHEN**selected definition missing、not regular `.ts` file 或 unreadable
- **THEN**CLI 报告 resolved path 与 read/type reason 并 exit `3`
- **AND**selection 保持 final 且 scan 不启动

#### Scenario: Module cannot produce valid declaration data

- **WHEN**Bun import 失败、evaluation throw、default export/API version 无效或 declarative validation 失败
- **THEN**CLI 报告 selected path、stage 与 actionable reason
- **AND**不创建 artifacts 或运行 valid subset

#### Scenario: Legacy input is never translated

- **WHEN**caller 显式选择 JSON，或 ordinary discovery 遇到 legacy fixed JSON
- **THEN**CLI 以 exit `3` 提供 single-active TypeScript landing
- **AND**Product 不读取 semantic policy、不执行 commands 也不写 migration file

### Requirement: Runtime validators own Project Definition data contracts

Product Config SHALL 以 Product-ownedruntime validators 作为 Project Definition serializable policy fields、
required/optional status、closed shapes、types、enum、descriptions 与 cross-field constraints 的唯一
acceptance authority。Validator composition MAY 委托 scope、check、file-policy、decision、orchestration 和
output owners，但不得形成 loose second tree。

Public authoring types/JSDoc MUST 从相同 owner contracts 导出。TypeScript compiler、optional identity
helpers 与 editor language service 不得取代 runtime validation。Repository MUST 不再发布或生成 project
config JSON Schema 或 sibling editor schema。

#### Scenario: Types and validators cannot drift

- **WHEN**public policy/declaration field 或 cross-reference contract 变化
- **THEN**runtime validator、optional authoring type、starter、fixture 和 owner docs 同步
- **AND**required drift validation 在 materials 不一致时失败

#### Scenario: Plain object remains runtime-validated

- **WHEN**import-free definition 没有使用 authoring helper
- **THEN**production loader 仍按 same runtime contracts 验证实际 value
- **AND**不存在 brand、schema file 或 compiler artifact 可覆盖结果

### Requirement: Neutral Project Definition is Product-owned and import-free

Product Config SHALL 持有 complete、repository-neutral built-in Project Definition。它 MUST 使用 current API
version、Product-owned built-in references/bindings、current neutral policy 与 scheduler policy，并通过与
module-backed input 相同的 declarative validators 产生 frozen values。它 MUST 不 evaluate project code、
resolve project imports 或从 environment 补 project policy。

Neutral definition 只服务 gate-disabled observation 和 `--no-project-definition`。它不是 persisted gate
policy；`init` starter 首次 normal load 时 MUST 解析为与生成时 neutral definition 相同的 policy、built-in
references、selection inputs 与 serializable schedule data。

#### Scenario: Neutral observation executes no project module

- **WHEN**Config 选择 neutral definition
- **THEN**runtime 获得 pathless、detached、invocation-owned data 和 Product-owned built-in bindings
- **AND**project module/imports 不被解析

#### Scenario: Neutral source cannot enable gate

- **WHEN**gate request 与 default 或 disabled source 组合
- **THEN**CLI 在 check work 前 exit `3` 并要求 module-backed policy
- **AND**Product 不把 in-memory default 伪装为 project-reviewed gate config

### Requirement: Init writes one import-free TypeScript Project Definition

Product CLI SHALL 提供 non-interactive `init [project-root]` 并只 ensure
`<project-root>/.vibe-check/config.ts`。Generated UTF-8/LF candidate MUST 是 deterministic、import-free、
structured default export，包含 literal `apiVersion: "1"`、complete neutral policy、Product-resolved
built-in references 与 scheduler policy；production loader round-trip MUST 得到生成时 neutral data。

`.vibe-check` missing 时 Init SHALL 创建；existing normal non-symlink directory SHALL 复用。Existing normal
non-symlink `config.ts` MUST 保持 bytes 并 no-op；missing target MUSTexclusive-create。Unsafe target、race 或
write/close failure MUST exit `3`。Cleanup 只处理 invocation-created entries，tool directory 只在本次创建
且 empty 时删除。

Init MUST 不 import/evaluate existing/new module。Legacy `.vibe-check/config.json` 存在且 `config.ts`
missing 时，Init MUST 保留 legacy bytes、拒绝 auto migration 并提供 manual landing。

#### Scenario: Init materializes import-free neutral definition

- **WHEN**project root 可写且 target 可创建
- **THEN**init 创建 deterministic `.vibe-check/config.ts` 并 exit `0`
- **AND**starter 在 project 没有 SDK dependency 时仍可由 Product loader 执行

#### Scenario: Repeated init preserves existing module

- **WHEN**target 是 existing normal non-symlink file
- **THEN**init 保持 bytes、不 import module 并 exit `0`
- **AND**stdout 报告 same target 与 already-present state

#### Scenario: Existing tool directory is reusable

- **WHEN**`.vibe-check` 是包含其它 entries 的 existing safe directory 且 target missing
- **THEN**init 只 exclusive-create `config.ts`
- **AND**existing entries 保持 bytes

#### Scenario: Unsafe target preserves caller state

- **WHEN**target unsafe、concurrent creator wins 或 write fails
- **THEN**init 保留 pre-existing entries 并 exit `3`
- **AND**只 cleanup invocation-owned partial state

#### Scenario: Init refuses implicit JSON migration

- **WHEN**legacy JSON 存在且 TypeScript target missing
- **THEN**init 保持 legacy bytes 并报告 manual migration
- **AND**不并列创建 active module 或 execute legacy content

### Requirement: Resolved Project Definition context is immutable and honest

Product Config SHALL 创建 readonly context，包含 resolved policy、project declarations 到 public/private
registries 的 resolution、serializable schedule data、source（`default | explicit | discovered | disabled`）、
`apiVersion`、data fingerprint 与 module-backed normalized absolute path。Console SHALL 在 module evaluation
前说明 selected source/trust boundary，并在 validation 后报告 resolved provenance。Downstream 只消费 frozen
context，Output 只投影 owned non-sensitive fields。

#### Scenario: Default provenance is pathless

- **WHEN**neutral default 被选择
- **THEN**console 报告 `default (not persisted)` 且没有 module evaluation notice
- **AND**context 使用 pathless default source

#### Scenario: Module-backed provenance identifies load boundary

- **WHEN**explicit/discovered definition 被选择
- **THEN**console 在 evaluation 前报告 source、normalized path 与 trusted-code notice
- **AND**downstream 不重新 import module

#### Scenario: Disabled provenance proves no project load

- **WHEN**`--no-project-definition` 选择 neutral observation
- **THEN**context source 为 `disabled` 且 console 说明 module 未加载
- **AND**machine provenance 不将其标成 ordinary default discovery

## REMOVED Requirements

### Requirement: Explicit scan configuration selection

**Reason:** Selection source 从 JSON config file 改为 single-active TypeScript Project Definition 与 explicit
non-executing disabled mode。

**Migration:** 使用 `Project Definition source selection is single-active`。

### Requirement: Configuration JSON matches complete QualityConfig

**Reason:** Project configuration 不再是 JSON document；各 semantic owner 通过 structured TypeScript
authoring value 和 runtime validators 维护 closed data contract。

**Migration:** 把 complete policy 写入 Project Definition 的 declarative policy tree，并通过 project check
entries 组合 built-ins/custom checks。

### Requirement: Explicit configuration replaces defaults

**Reason:** Authoritative file-backed source 改为 module-backed Project Definition，CLI 只覆盖 detached policy
scalars。

**Migration:** 使用 `Module-backed policy replaces defaults`。

### Requirement: Configuration parse failure stops the scan

**Reason:** Pre-work failure boundary 现在包含 Bun import、export/API、declaration 与 binding resolution，不再是
JSON parse boundary。

**Migration:** 使用 `Project Definition load failure stops scan work`。

### Requirement: Runtime schema owns the semantic document contract

**Reason:** Single JSON document schema 被多个 owner 组成的 Project Definitionruntime validator boundary 替代。

**Migration:** 使用 `Runtime validators own Project Definition data contracts`；TypeScript types 是 authoring
projection 而非 acceptance authority。

### Requirement: Neutral default configuration

**Reason:** Neutral input 现在是包含 Product-owned built-in bindings 的 Project Definition，而不只是 JSON
semantic value。

**Migration:** 使用 `Neutral Project Definition is Product-owned and import-free`。

### Requirement: Project configuration initialization

**Reason:** Init 从 JSON+schema two-target ensure 改为 single import-free TypeScript module ensure。

**Migration:** 使用 `Init writes one import-free TypeScript Project Definition`。

### Requirement: Comment-capable JSON authoring and editor schema

**Reason:** TypeScript module 取代 comment/trailing-comma JSON grammar、`$schema` 和 sibling editor schema。

**Migration:** 使用 structured default export；需要 editor types 时可选安装并使用 authoring package。

### Requirement: Selected configuration context

**Reason:** Resolved context 需要同时表达 declaration/binding separation、disabled source 与 honest data
fingerprint。

**Migration:** 使用 `Resolved Project Definition context is immutable and honest`。
