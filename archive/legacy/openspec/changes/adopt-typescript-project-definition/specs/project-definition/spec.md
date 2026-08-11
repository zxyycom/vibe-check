> **核心句：**本 delta 定义受信任 TypeScript Project Definition 如何声明 project checks，并把 authoring declarations 解析成 foundation 公共 metadata 与私有 execution bindings；它不把函数或 TaskPlan 提升为公共 CheckDefinition。

## Purpose

让项目通过一个 Bun 托管的 TypeScript module 组合内置与自定义 checks，同时向 Product Core 交付经过验证、冻结且职责分离的 Check metadata、execution bindings、政策数据与调度声明。

## ADDED Requirements

### Requirement: Project Definition has a structured import-free contract

Selected module default export MUST 是 closed `ProjectDefinitionInput` object，至少包含 literal
`apiVersion: "1"`、typed declarative project policy、one invocation-wide scheduler policy 与 ordered
project check entries。Runtime validator 与 API version MUST 是 acceptance authority；default export 不要求
由 helper 创建、携带不可伪造 brand 或解析任何 package import。

Product MAY 在可安装 package 的 `vibe-check/project` subpath 提供 `defineProject`、`defineCheck` 与相关
TypeScript types/JSDoc。Helpers MUST 只是可选 typed identity/authoring aids：相同 plain structured object
通过 runtime validation 时 MUST 获得相同行为，helper 缺失或未使用不得使 definition 无效。

Canonical `init` starter MUST 使用 import-free structured default export，使未在被扫描项目安装 Vibe
Check SDK package 时，Product 自身的 Bun loader 仍能执行并验证它。Starter MAY 说明安装 package 后如何
opt in helpers/editor types，但该说明不得增加 runtime import prerequisite。

#### Scenario: Import-free starter loads without a project SDK dependency

- **WHEN**project 没有可解析的 `vibe-check/project` package 且使用 canonical init starter
- **THEN**Product loader 直接接纳其 structured default export 并按 runtime contract 验证
- **AND**module 不会仅因缺少 authoring helper package 而 load 失败

#### Scenario: Optional helper and plain object are equivalent

- **WHEN**两个 modules 分别用 `defineProject` 和 plain object 产生相同 runtime value
- **THEN**loader 产生相同 normalized data、catalog 与 execution binding inputs
- **AND**helper 不作为 brand、security token 或 runtime schema owner

#### Scenario: Type checking cannot replace runtime validation

- **WHEN**module 使用 type assertion、JavaScript interop 或运行时组合产生 invalid definition
- **THEN**loader 仍按 Product-ownedruntime validators 拒绝实际 value
- **AND**TypeScript editor/compile success 不构成 runtime evidence

### Requirement: ProjectCheckDeclaration separates metadata from execution

Project check entries MUST 是 closed union：

- built-in reference 只包含 Product-owned built-in check ID 及允许的 serializable authoring data；loader
  从当前 Product runtime 解析对应公共 metadata 与 private binding，不从 project module 接收 built-in runner；
- custom `ProjectCheckDeclaration` 包含 serializable check metadata candidate、serializable schedule
  metadata，以及 exactly one private execution authoring variant。

Loader SHALL 把每个 custom metadata candidate 交给 `quality-checks` owner 验证并解析为一个 public
`CheckDefinition`；该 definition MUST 不含 function、module、command、TaskPlan 或 execution handle。
Loader SHALL 同时把 execution variant 交给 owning adapter 验证并解析为一对一 private
`CheckExecutionBinding`。Direct variant 持有 opaque runner function；task variant 持有 private binding/
planner factory。两种 function 都只存在于 private registry，后续由 foundation 产生 opaque
`CheckExecutionContribution`，不得进入 public catalog 或 machine model。

Project Definition loader 只验证公共 envelope、serializable declarations 与 variant routing；它 MUST 不
inspect function source、调用 factory 来猜测 shape 或重实现 foundation/scheduler 对 execution handle 的
validation。

#### Scenario: Custom declaration resolves into two owned tables

- **WHEN**valid custom declaration 提供 record-aware metadata 和 direct runner
- **THEN**`quality-checks` 接纳一个 serializable CheckDefinition，direct adapter 接纳一个 private binding
- **AND**resolved public catalog 不包含 runner 或 binding payload

#### Scenario: Task declaration keeps its factory private

- **WHEN**valid custom declaration 选择 task execution variant
- **THEN**serializable schedule metadata 进入 orchestration resolution，private factory 进入 task binding
- **AND**CheckDefinition、definition fingerprint 与 machine output 都不包含 factory

#### Scenario: Built-in reference resolves Product-owned implementation

- **WHEN**import-free definition 引用 built-in check ID
- **THEN**当前 Vibe Check process 从自身 built-in registry 解析 metadata 与 binding
- **AND**project file 不携带另一 Vibe Check 版本的 runner handle 或 CLI implementation

### Requirement: Module evaluation yields one versioned definition per CLI invocation

Selected Project Definition SHALL 作为 Bun ESM module 在同一 CLI process invocation 内 load/evaluate 恰好
一次。ESM evaluation 及 top-level `await` 完成后，default export MUST 已经是 non-Promise structured
definition value 且 `apiVersion` 精确等于 `"1"`。Missing default、default function、default Promise、
wrong API version 或 invalid envelope MUST 在任何 check、scanner、reference、cache 或 artifact work 前形成
Project Definition error。

Module MAY 使用普通显式 imports 和 load-time 程序逻辑构造 declarations。Product MUST 不扫描目录、package
metadata 或全局 registry 发现未显式 import 的 modules。普通 bare/local imports SHALL 按 selected module 的
Bun resolution context 解析，failure 映射为 config error。Contract 只承诺一次 CLI invocation 的一次 load；
它 MUST 不承诺未来 embedding API 在同一 process 执行多个 invocations 时的 ESM cache/re-evaluation 行为。

#### Scenario: Top-level await composes declarations

- **WHEN**selected module 通过 top-level `await` 准备 authoring inputs 并 export valid structured value
- **THEN**loader 等待本次 ESM evaluation 完成后只 normalize 一次 definition
- **AND**execution 只在后续全量 resolution/planning 成功后开始

#### Scenario: Async factory export is rejected

- **WHEN**selected moduledefault-export async function、Promise 或其它非 definition value
- **THEN**CLI 报告 selected module 与 invalid-export reason 并退出 `3`
- **AND**Product 不猜测是否应调用或二次 await 该 export

#### Scenario: Bare import failure is a config error

- **WHEN**custom definition 显式 bare-import 一个项目 Bun resolution context 无法解析的 package
- **THEN**CLI 在 scan work 前报告 selected source、import stage 与 actionable reason 并退出 `3`
- **AND**Product 不回退自己的 package copy 或建立第二 resolver

### Requirement: Declarative data and every executable handle remain separate

Loader MUST 把 policy、built-in references、custom check metadata 与 schedule metadata 复制为 detached、
closed、deeply frozen invocation-owned data。Unknown field、function-valued policy/metadata、symbol、
cycle 或不支持的 runtime object MUST 在 execution 前拒绝。Decision/gate 输入 MUST 继续是
`quality-decision-policy` 接纳的 declarative data，不得使用 function evaluator。

Direct runner、task binding/planner factory、Task function、completion function、imports、closure state 与
其它 execution handle MUST 排除于 public CheckDefinition、serializable resolved data、catalog/definition
fingerprint 和 machine output。Loader 不得通过 `Function#toString` 或 closure inspection 建立 identity。

First version MUST 不为 custom runners 提供 result cache。Project Definition data fingerprint、check catalog
fingerprint、module source bytes 或 caller 提供的 string 都 MUST NOT 单独作为 custom execution result cache
validity；future cache 必须先建立完整 implementation、inputs、policy、dependency 与 environment identity
contract。Built-in check caches 继续只服从各自 Product-owned cache identity。

#### Scenario: Function-valued policy is rejected

- **WHEN**definition 把 function 放入 policy、check metadata 或 schedule metadata
- **THEN**loader 在 execution 前以字段路径拒绝该 data
- **AND**Core 不调用它或将它保存为 opaque declarative value

#### Scenario: Custom runner has no first-version cache hit

- **WHEN**两个 invocations 具有相同 definition data fingerprint 和 custom check metadata
- **THEN**Product 仍执行 custom binding 而不复用 previous runner result
- **AND**相同 fingerprint 不被解释为 runner/import/environment identity 相同

### Requirement: Custom checks use one minimal selection rule

对一个 selected Project Definition，所有 valid custom `ProjectCheckDeclaration` MUST 默认进入 initial
requested set。Built-in references MUST 继续服从 Product-owned profile/request semantics；Project
Definition 不得为 custom checks 新建 per-profile selector、include/exclude DSL 或隐式 priority 规则。

Selected `DecisionPolicy` 可以按 `quality-decision-policy` 要求 check IDs；private serializable
`requiresChecks` 由 `check-execution-orchestration` 从 initial requested set 计算 transitive closure。Unknown
check、self edge 或 cycle MUST 在 applicability/execution 前失败。Selection freeze 后仍由 foundation 分别解析
applicability；requested 不代表 applicable、passed 或 blocking。

#### Scenario: Ungated definition requests every custom check

- **WHEN**selected definition 包含三个 custom checks 且 scan 省略 gate
- **THEN**三个 custom checks 都进入 initial requested set
- **AND**built-ins 仍按 Product-owned profile/request 规则选择

#### Scenario: Dependency closure adds prerequisites

- **WHEN**requested custom check 通过 `requiresChecks` 依赖另一个 resolved check
- **THEN**orchestration 在 applicability 前把 transitive prerequisite 加入 requested set
- **AND**loader 不重实现 dependency graph 或 quality admission semantics

#### Scenario: No custom profile DSL is inferred

- **WHEN**custom declaration 没有额外 selection fields
- **THEN**Product 按 all-custom-requested 规则处理
- **AND**CLI profile 名称、check ID 前缀或 module export order 不被解释成隐藏 selector

### Requirement: Task planning occurs after foundation resolves applicable work

Task-based custom declaration MUST 提供 serializable schedule metadata 与 private TaskPlan binding/planner
factory，而不是 module-load-time TaskPlan。Module resolution 只冻结 declaration 和 private binding；它不得
调用 factory、分配 foundation domain-work handles 或注册 Task。

Foundation 完成 selection/applicability 并为 applicable check 准备 immutable planning context 与 opaque
domain-work handles 后，invocation-scoped `check-execution-orchestration` planner SHALL 调用 task binding
factory 构造本次 TaskPlan。Planner 随后按 owning spec 验证 Task IDs、`needs`、resources、handle associations
和 graph，并在任一 managed function 启动前与 direct work 一起 freeze 完整 execution plan。

Skipped/not-applicable check 不得调用 factory。Runner/Task execution 期间不得新增、删除或改写 check、
Task、policy 或 reference。Public authoring/context MUST 不增加 cancellation、`AbortSignal`、timeout 或 hard
termination surface；这些能力也不由 Project Definition 暗示。

#### Scenario: Factory receives invocation-approved planning inputs

- **WHEN**custom task check 冻结为 applicable 并获得本次 domain-work handles
- **THEN**orchestration adapter 此时才调用 private factory 生成本次 TaskPlan
- **AND**module-load-time values 不能替换 foundation-owned handles

#### Scenario: Invalid plan prevents every managed function

- **WHEN**任一 factory throw 或返回 invalid TaskPlan
- **THEN**orchestration 在 execution 前拒绝完整 plan 且不启动合法 subset
- **AND**Project loader 不把该 failure 改写为 definition metadata error 或 quality verdict

#### Scenario: Runtime registration and cancellation are absent

- **WHEN**runner 或 Task 开始执行
- **THEN**其 context 不存在新增 check/Task/policy/reference 或 public cancellation/timeout registration port
- **AND**同进程 non-cooperative code 限制由 trust contract 诚实暴露

### Requirement: Project Definition is trusted same-process code

Product SHALL 把 explicit/discovered Project Definition、imports 与 custom execution functions 描述为与
Vibe Check 同进程、同 OS 权限执行的受信任 project code。Product MUST 不声称提供 filesystem、network、
environment、child-process、global-state 或 termination sandbox。Project code MAY 使用 Bun API、libraries
或自行启动 subprocess；Core 不提供 command parsing、exit-code mapping 或通用 command protocol。

`scan --no-project-definition` MUST 禁止 explicit/discovered module load 及 imports，使用 Product-owned
neutral definition，且只允许 gate-disabled observation。该 flag 与 `--config` 或任一 gate 组合 MUST 在 module
evaluation 前 exit `3`。Help 与 pre-evaluation provenance MUST 明确 ordinary discovery 执行 trusted code。

Catchable module/runner throw/rejection SHALL 按 owner error contract 归一化；help/docs MUST 明确
`process.exit`、global mutation 或 non-settling same-process code 无法获得 structured recovery、public
cancellation、hard timeout 或 bounded drain guarantee。

#### Scenario: Untrusted repository uses the no-definition path

- **WHEN**unknown repository 包含 `.vibe-check/config.ts` 且 caller 运行 ungated
  `scan --no-project-definition`
- **THEN**Product 不 import module 或 dependencies 并使用 neutral built-in definition
- **AND**provenance 明确 project definition 被 caller 禁用

#### Scenario: Discovery is identified as code execution

- **WHEN**ordinary scan 选择 discovered `.vibe-check/config.ts`
- **THEN**help 和 evaluation 前 provenance 标识 trusted project code load
- **AND**Product 不把它描述成 safe data-file parse

### Requirement: Bun hosting does not constrain scanned project technology

Project Definition module resolution、TypeScript execution、ESM semantics 与 top-level `await` SHALL 遵循
Vibe Check 支持的 Bun runtime contract。Custom definition 的 explicit imports 必须从 project context 解析；
Product 不建立第二 package resolver、remote loader 或 implicit plugin discovery。

Neutral/import-free scan MUST 不要求被扫描项目安装 Vibe Check SDK、采用 Bun application runtime 或使用
TypeScript。选择 custom definition 只约束 definition 及 imports，不得把被扫描 source、build tool 或应用
runtime 重新分类为 Bun project。

#### Scenario: Non-Bun project uses neutral observation

- **WHEN**非 Bun 项目没有 custom definition 并运行 ungated scan
- **THEN**Product 使用 neutral/import-free built-in definition
- **AND**project 无需增加 Bun manifest 或 application dependency

### Requirement: Definition provenance and fingerprint are honest

Resolved context MUST 记录 `default | explicit | discovered | disabled` source、`apiVersion` 和 file-backed
source 的 normalized absolute path。Product MUST 从 validated policy、built-in references、custom public
metadata 和 serializable schedule metadata 计算 deterministic data fingerprint；相同 normalized data 和
canonical order MUST 产生相同 fingerprint，参与字段变化 MUST 改变 fingerprint。

Every function/execution handle、module source/import graph、closure state、ambient environment 与 runtime
side effects MUST 排除。Console/machine projection MUST 将 fingerprint 描述为 resolved declaration data
identity，而不是 code attestation、cache key、sandbox proof 或 runner replay 保证。

#### Scenario: Equivalent authoring produces one data identity

- **WHEN**explicit 与 discovered modules 产生相同 normalized declarative data
- **THEN**两次 resolution 产生相同 data fingerprint 但保留不同 source provenance
- **AND**helper 使用、object construction order 与 function identity 不进入 fingerprint

#### Scenario: Runner-only change remains outside identity promise

- **WHEN**custom execution function 改变而 serializable declaration data 保持相同
- **THEN**data fingerprint MAY 保持不变且 custom runner 仍重新执行
- **AND**machine contract 不声称该 fingerprint 证明 code 相同
