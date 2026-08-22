# Design

本Design从repository assurance inventory形成普通public Checks与必要process boundaries。Minimal Check/Record Plan已经拥有aggregation与adapter cutover；本Draft只消费迁移后的raw facts和package aggregate。

## Context

当前事实、形成时边界与长期方向如下：

- [`docs/script-tooling.md`](../../docs/script-tooling.md#project-gate) 是当前实现 owner：正式 root bindings 已直接到达 candidate-backed Project Gate；当前 catalog 仍有 20 个 process Checks、required/full profile、local disabled tags、per-process transcript、fixed capacity 和 `0/1/2` adapter exit closure。
- 已归档的 [`build-candidate-backed-project-gate`](../archive/build-candidate-backed-project-gate/) 明确把 legacy verifier 的 20 个 command leaves 当作切换期迁移输入，并把 authoring redesign 排除在首轮 Gate build 外。已归档的 [`replace-workspace-verifier-with-project-gate`](../archive/replace-workspace-verifier-with-project-gate/) 只完成正式 binding、重新验证与 legacy retirement；其 handoff 继续拥有这些切换事实。
- 当前 `PROJECT_GATE_CATALOG` 复制 Check identity/scheduling fields 与 process options，`createProjectGateDefinition()` 无差别地把全部 entries 转成 `createProcessCheck()`。这证明当前实现形态，不为继续保留每个 descriptor、Check ID、profile membership 或 CLI caller提供目标依据。
- [`execute-check-functions-in-caller-runtime`](../../docs/decisions/execute-check-functions-in-caller-runtime.md)、[`pass-project-definition-check-functions-to-run`](../../docs/decisions/pass-project-definition-check-functions-to-run.md) 与 [`expose-recursive-check-authoring-and-run-surface`](../../docs/decisions/expose-recursive-check-authoring-and-run-surface.md) 已规定：项目把普通 Check functions 交给唯一 Product Run，Product 在调用方 runtime 中执行；单个 Check 只有自身确实需要时才使用 subprocess、worker 或 thread。
- [`use-native-object-composition-for-check-customization`](../../docs/decisions/use-native-object-composition-for-check-customization.md) 与 [`expose-ordinary-check-values-with-define-check`](../../docs/decisions/expose-ordinary-check-values-with-define-check.md) 排除来源专属 Check model、runtime brand 和第二 execution entry。Gate selection metadata 可以留在项目 adapter，但不能重新定义 command-only Check family。
- CLI lifecycle 与 Gate execution path 正交。当前 root `format`、`lint`、`typecheck`、`test`、`validate`、governance 和 `quality` commands 仍可能有 focused 人类/AI consumer；这些 caller 只决定相应 CLI 是否保留，不决定 Gate 是否经由 argv、console 或 exit code 使用其能力。
- 当前 Test Evidence strict check 会运行 supported Bun test surface，并把 runner failure 与 semantic Case closure 一起判定；当前 quick/full quality entries 执行同一个 `scripts/quality/index.ts`。这些是重复审计的直接输入，不是预先决定的删除清单。
- 本Change在minimal hard cut后修改已经接线的唯一正式Gate，不恢复legacy verifier或重新执行binding migration。
- [`establish-minimal-check-record-contract`](../establish-minimal-check-record-contract/)提供新Check facts、explicit RunControls aggregation与已迁移required/full adapter；本Draft不重复拥有这些public/runtime contracts。

## Goals / Non-Goals

### Goals

- 在 Plan 前建立一份 assurance inventory：每项以 owner、输入范围、可观察失败信号、执行边界和消费者说明独立性，不以历史命令、文件或 profile label 代替语义。
- 让 canonical Gate composition 产生普通 public `Check` values；一个独立质量事实只有一个稳定 Check identity。
- 让 import-safe TypeScript capability 由 native Check 直接调用；让真正的 external executable、package/toolchain boundary 由 Check 自己拥有 subprocess。
- 把 CLI 保留/删除与 Gate 调用方式分开审计：Gate 不调用 CLI adapter；只有独立 caller 为零时才删除 wrapper。
- 把 quick/full quality 合并为一个 Check identity；仅在 required/full 存在已证明的不同行为时由同一 Check 读取规范化 profile flag 选择模式。
- 删除重复 tests/package gates、重复 candidate preparation、迁移数量锁和不必要 wrapper chain；任何保留项都必须有独立 owner 或失败信号。
- 保留并重新证明 candidate-first import identity、selection fail-close、dependency closure、取消、必要 process transcript、progress、capacity 与 adapter `0/1/2` closure。
- 更新稳定 owner、项目内添加说明、semantic Case evidence、candidate manifest，并以 current exact artifact 形成发布前 <code>gate-optimization-handoff.md</code>。

### Non-Goals

- 不恢复 legacy verifier，不建立新旧双实现，也不把归档的 20-command mapping 提升为当前规范。
- 不因 Gate 停止调用某个 CLI 就自动删除该 CLI；focused root workflow、governance/query command 与 neutral quality observation 继续由各自 consumer audit决定。
- 不公开 Gate catalog、profile/tag grammar、process helper、transcript writer 或 CLI adapter 到 npm package。
- 不建立 generic process Check 产品 API、第二 Check execution variant、command registry 或 project-wide dependency injection framework。
- 不在本 Change 重新定义最小 Record contract、typed dependency output 或 terminal messages/visibility；最小 Record 与 terminal messages/visibility 已由各自 owner 交付，typed dependency output 仍由 [`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/) 承接。
- 不重新设计或复制minimal Plan拥有的RunControls aggregation、RunResult aggregate或adapter exit closure。
- 不访问 registry、credentials 或执行 npm publish；发布由独立 Change 在再次授权后完成。

## Decisions

以下是本 Draft 已确认的目标边界。Plan readiness 必须解决末节两个 inventory 问题并用 prototype 固定精确类型；在此之前不创建 tasks 或进入 implementation。

### 1. Assurance inventory 是 catalog 的输入

Plan readiness 先把当前 Gate 想证明的结果列为“质量事实 × 执行义务”矩阵。每行至少记录：稳定 owner、输入范围、成功/失败结果、unavailable 原因、是否需要独立 cwd/toolchain/candidate identity、是否已被另一个 Check 完整证明，以及 required/full 的真实差异。

满足以下条件的现有 entries 合并为一个 Check：它们拥有同一个行为 owner、观察同一输入、产生同一可观察失败信号，且差异只来自历史 command path、profile label 或重复执行入口。只有 scope、owner、失败恢复或消费边界真正不同，才保留独立 Check。

当前审计至少必须处理：

1. `quality-quick-check` / `quality-full-check` 的单一 identity 与真实 mode 差异；
2. Test Evidence 已运行完整 Bun surface 后，`product-tests` / `toolkit-foundation-tests` 是否仍证明独立事实；
3. workspace scripts scope 已覆盖 foundation source 时，foundation typecheck/lint/format package gates 是否仍有不可替代的 package-boundary contract；
4. Gate bootstrap 已准备 candidate 后，scripts typecheck 是否还有第二次 preparation义务；
5. docs、Decision Records、Test Evidence 与 ast-grep rule checks 能否直接消费 typed operations。

最终 Check 数量和 profile membership 由该矩阵自然导出；不为形成时 `20 / 14 / 19` 增加替代数量断言。

### 2. Gate composition 只产生 ordinary Checks

Gate 的 invocation composition root 接收本次需要的 private runtime dependencies，再产生 entries：

```ts
interface ProjectGateEntry {
  readonly check: Check;
  readonly profiles: readonly ProjectGateProfile[];
  readonly tags: readonly ProjectGateTag[];
}

function createProjectGateEntries(
  runtime: ProjectGateRuntime
): readonly ProjectGateEntry[];
```

`ProjectGateRuntime` 只为项目 adapter 绑定 invocation log/session 等 private collaborators；它不进入 npm public API、Product `CheckExecutionContext` 或 Check options。函数返回的 `entry.check` 必须是普通 public `Check`，并直接拥有自己的 identity、options、dependencies、Records、children/scheduling 和 execution。entry 只额外拥有 Gate selection metadata，不复制这些 Check 字段。

这个 composition function 不是第二种 Check authoring model。直接 capability Check 可以复用普通 exported Check value；需要 invocation-bound process transcript 的 Check 可以在 composition root 中由 local factory 产生同样的 ordinary Check。

### 3. Capability、process 与 CLI 使用三个独立判断

每项 assurance 按下表选择边界：

| 场景 | Gate execution | CLI lifecycle |
| --- | --- | --- |
| 仓库拥有 import-safe typed operation，并能返回或转换为结构化结果 | native Check 直接 import/call operation | 有独立 focused/query consumer时保留薄 CLI；否则可删除 |
| 事实由外部 executable 产生 | native Check 在自己的 execution 内调用 shared async process helper，并传递 `AbortSignal` | CLI 可以消费同一 operation/spec，但 Gate 不调用 CLI |
| 必须证明 package cwd、锁定 toolchain、exact installed consumer 或 process isolation | 保留一个显式 process boundary，并记录该边界独有的失败事实 | 是否暴露 CLI 仍由独立 consumer 决定 |
| 文件只解析 argv、打印 console、设置 exit code 或再启动另一个 wrapper | 不作为 Gate capability source；先拆出 import-safe operation或删除无必要层 | 仅作为 adapter 保留，不拥有领域语义 |

现有 TS entry 的副作用不是保留 subprocess 的理由。迁移时不得直接 import 会在 module evaluation 读取 `process.argv`、设置 `process.exitCode`、执行同步 child 或修改全局状态的 CLI；应把领域 operation移到 import-safe owner，让 CLI 与 Gate 分别适配它。

### 4. Repository quality 只有一个 Check identity

Gate 使用一个稳定 `repository-quality` Check。required/full 若确有不同 scan scope、cost 或 evidence requirement，同一 Check 通过一个 Gate-private profile parser读取规范化 flag并选择已声明 mode；它不为每个 profile生成另一个 Check ID，也不让两个同义 Checks互相 `not-applicable`。

profile 只允许改变同一质量事实的执行范围，不能改变 Check identity、Record ownership 或 terminal result grammar。若 inventory 证明 required/full 对 repository quality 没有真实行为差异，则两个 profile 调用相同 execution；不能为了保留 quick/full 名称而添加空分支。

### 5. 重复 evidence 默认删除，例外必须证明独立边界

Test Evidence runner failure 已证明其 supported Bun test surface 没有失败。对同一 files、同一 runner、同一 cwd/result 的额外 test Check 默认删除；只有 package cwd、manifest script或另一运行配置确实产生不同失败时，才保留独立 acceptance Check。

同理，workspace typecheck/lint/format 已完整覆盖 foundation target时，不再仅为调用 foundation package script重复执行。若 package-local tsconfig、cwd 或 manifest command 本身是需要交付的接口，inventory 必须把该接口、消费者和独有失败信号写清；“当前 package.json 有这个 script”本身不足以建立 Gate 义务。

Gate adapter 的 candidate preparation 是唯一 bootstrap owner。后续 Check 可以消费已经建立的 installed-candidate事实，但不能经旧 standalone wrapper无条件再次 prepare；只有 operation 会改变 candidate inputs 或明确要求新的 identity guard 时才能重新进入 preparation。

### 6. Eligibility 由 Gate wrapper集中处理，mode 由少数 Check显式读取

Gate projection 从同一 selection解析 profile和 disabled tags，并在 execution 前为 excluded entry返回 `profile-excluded` / `tag-disabled` N/A。普通 Check无需解析 selection grammar。只有行为本身随 profile改变的 `repository-quality` 等少数 Check，才通过一个 Gate-private helper读取已经验证的 profile flag；它们不自行解析 argv或 ambient CI。

Dependencies 继续是静态 Check graph facts。一个 profile 中 eligible Check的 dependencies必须也在该 profile eligible；不能用 runtime mode隐藏缺失 prerequisite。Selection从同一entries与profile计算eligible/N/A集合，不从结果反推selection，也不维护另一个ID catalog；minimal Plan提供的explicit aggregate继续消费eligible IDs。

### 7. Transcript 只属于真实 process evidence

Gate 继续为每次 invocation 创建唯一 ignored log root。真实 process-backed Check保存 command、status、signal、error、stdout和stderr transcript；transcript失败仍按该 Check 的 infrastructure failure语义处理。直接 TypeScript Check不生成虚假的空 process log，它的 terminal outcome、Records、dependency outputs和presentation由Product结果owner承接。

本 Change不新增 durable invocation receipt、chronological event protocol、aggregate child-output log、`latest` alias或retention策略；这些边界继续由 [`define-project-run-log-evidence-boundaries`](../define-project-run-log-evidence-boundaries/) 保存。这里只把现有 transcript责任从“每个迁移 entry”收窄到“确实执行 process 的 Check”。

### 8. CLI caller audit 独立于 Gate migration

实施时分别记录两张 caller表：

1. Gate capability callers：证明 Project Definition直接组合 Check/operation，不执行项目 CLI adapter；
2. CLI consumers：列出 root package scripts、foundation manifest、人工/AI workflow和其它direct callers。

Gate caller归零不等于 CLI consumer归零。仍有独立 consumer的 CLI保留为薄 adapter并单独测试 argv/output/exit mapping；没有独立 consumer且不再拥有任何事实的 wrapper可以与引用一起删除。该删除判断不改变 Gate Check identity，也不反向要求 Gate通过 CLI验收。

### 9. Cutover binding持续有效，优化 evidence必须刷新

正式root bindings和legacy retirement事实继续由已归档的<code>gate-handoff.md</code>拥有。本Change默认保持这些names到达同一个adapter；catalog、profile behavior或内部执行路径变化不恢复旧verifier。

最小Record contract 与 terminal messages/visibility 已分别由[`establish-minimal-check-record-contract`](../archive/establish-minimal-check-record-contract/)和[`add-check-terminal-messages-and-visibility`](../add-check-terminal-messages-and-visibility/)完成。本Change继续等待[`add-typed-check-dependency-outputs`](../add-typed-check-dependency-outputs/)和[`ship-public-package-api-documentation`](../ship-public-package-api-documentation/)收敛其余首次公开package inputs。随后重新准备或安全复用matching candidate、校验installed entry，并从正式root entry运行focused/native/process/candidate tests、required/full acceptance和partial eligibility smoke。

最终 <code>gate-optimization-handoff.md</code> 绑定 current Gate inventory、保留/删除理由、CLI/capability caller audit、documentation-complete exact artifact、正式 bindings与验收结果。Publish同时消费它、cutover <code>gate-handoff.md</code>和package documentation handoff。

## Risks / Trade-offs

- **迁移快照继续支配设计：** 如果 inventory 只把当前 commands 改名为 Checks，就会保留重复 facts与wrapper chains；Plan readiness必须从owner和失败信号逐项证明。
- **副作用 import：** 直接 import旧CLI可能在module evaluation执行argv、console、exit或同步child；只有import-safe operation可以进入native Check。
- **取消与并发退化：** 把现有同步 CLI function直接放进caller runtime会阻塞scheduler并丢失cooperative cancellation；external work必须使用async、signal-aware边界。
- **边界删除过度：** Test files或paths重叠不自动证明package cwd、manifest或toolchain acceptance重复；删除前必须完成独立消费者与失败信号审计。
- **Profile伪差异：** 用两个IDs或无实际差异的branch表达required/full会继续制造N/A和维护成本；mode只有在行为差异可观察时才存在。
- **日志误归属：** 为native Check伪造process transcript会建立第二结果源；不保存process log也不能丢失Product-owned terminal facts或presentation。
- **Evidence失效：** Gate implementation、catalog和package inputs变化不会撤销cutover，但公开发布前必须以current exact artifact刷新optimization evidence。
- **过度抽象：** local process helper只承接多个现实process Checks共享的spawn/cancel/transcript映射；不因CLI和Gate都执行工具就建立generic workflow framework。

## Open Questions

1. 去除重复runner/package evidence后，required与full分别还拥有哪项独立、可观察的assurance obligation？Plan readiness必须给出精确membership与行为差异；若二者没有差异，本Draft需要先收敛profile/root contract，不能把同义profiles带入Plan。
2. Foundation package的typecheck/lint/format/test中，哪些命令确实证明root workspace checks与Test Evidence无法证明的package cwd、manifest或配置边界？Plan readiness必须以真实consumer和失败实验决定保留项，不能仅引用当前package scripts。
