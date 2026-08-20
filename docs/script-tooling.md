# 脚本工具

本文档是 Vibe Check 开发脚本工具边界的 owner：记录共享 toolkit、Vibe
Check-owned consumer、产品与 dogfood 的调用方向、配置 owner 和脚本验证入口。

## 范围

Vibe Check 的开发脚本以本仓库 `scripts/**` 为日常依据。`scripts/tools/foundation` 是本仓
直接追踪的 private pnpm workspace package（下文简称“仓库自有 foundation”），提供共享 helper
source import；workspace verifier 通过自己的 adapter 从 `src/product/task-scheduler/**` 消费
repository-internal static Task engine。consumer、默认配置、profile 和 package scripts 由 Vibe
Check 拥有。

Vibe Check 拥有的开发脚本入口是：

- `scripts/development/{format,lint,typecheck,test}.ts`：分别拥有开发期格式、lint、类型与测试
  command 的 scope 选择；root manifest 只把 action 或 scope 作为普通参数传入，不保存长 shell
  片段或同义 suffix alias。
- `scripts/package-candidate/{prepare,run-quality}.ts`：生成、审计、安装和复用 local package
  candidate；`run-quality.ts` 在已锁定的 Bun 环境中完成自动准备后才调用下述 pure Project Run adapter。
- `scripts/quality/index.ts`：root `quality` 的 Bun adapter；只在其内部进入 mise 锁定的 scanner
  环境并启动 package-candidate workflow。
- `scripts/quality/scan.ts`：调用 repository Project Run 的 pure dogfood 薄入口；不解析配置或
  重新提供 Project Definition。
- `scripts/quality/annotate.ts`：把 validated quality records 渲染为 GitHub
  Actions non-blocking warning annotation；输入先经 Product two-file set validator 完整
  验证。
- `scripts/docs/validate.ts`：校验 Markdown links、JSON syntax、current machine schemas/
  examples、generation drift，以及隔离的 historical report schema/examples。
- `scripts/decision-records.ts`：显式传入 Vibe Check 仓库根，复用项目内
  `decision-records` skill 的 ESM API，并提供长期决策查询、维护和检查入口。
- `scripts/test-evidence/index.ts`：项目自有的测试实体发现、语义 Case 查询与全树闭合
  入口；它运行受支持 Bun test surface，并校验 static/runtime/entity/Case 双向覆盖。
- `scripts/project-environment/index.ts`：配置或只读检查锁定的开发工具、包依赖与 CodeGraph
  索引；不承担本仓独立 toolkit checkout 的初始化或状态检查。
- `scripts/vibe-check-workspace/verify.ts`：项目级验证编排入口，经 scripts adapter 使用
  shared Task engine 并行运行本地检查。

新增任何 Vibe Check-owned consumer 时，必须在本文补充入口、owner 和验证命令。

项目另外通过 package scripts 调用完整上游 Skill CLI：`change-plan` 管理 `changes/`，
`investigations` 管理按需建立的 `docs/investigations/`。这些入口不复制上游 parser、metadata、
索引或生命周期实现，也不属于 `scripts/**` consumer。

这些工具不属于产品 runtime contract。`quality` 调用 repository Project Run 的 neutral
observation；它是 root package-script dogfood 入口，不是 package 对外暴露的 CLI、第二套产品入口或
隐式 profile/gate selector。为验证 package boundary，它的内部 workflow 会准备并从 private
`scripts/quality` consumer 消费 local candidate，随后仍只调用同一个 Project Run。

根 `package.json` 只暴露人或 AI 需要直接发现和执行的工作流、范围检查与稳定兼容适配器。只由
verifier、CI 或另一个开发工具调用的叶子命令直接使用其 `scripts/**` owner 或 package-local
manifest，不为复用而新增 root alias。一个 workflow 只保留一个根名，普通动作和 scope 通过参数
表达，例如 `bun run decisions -- list`、`bun run lint -- product` 与 `bun run format -- check`；不为
`list`、`check`、`product` 或 `scripts` 单独增加 package-script name。

`verify:vibe-check-workspace` 是唯一保留 profile suffix 的 workflow：默认、`required` 和 `full`
是调用方需要显式选择的三种全局验收范围。`env:setup` 与 `env:check` 是 Codex 生成环境脚本目前
固定调用的 bootstrap compatibility entries；它们不是可继续套用的 root-alias 模式，只有生成方同步
改为参数形式后才能移除。`product:cli` 同样只保留为当前 API-only migration diagnostic 的临时
compatibility entry；它不是产品正常运行入口，删除条件由对应 active Change 定义。

### Root 命令选择

人或 AI 从根目录启动时，只选择下表的 workflow；`scripts/**` direct entry 是对应 owner 或 verifier
的内部调用面，不是第二套 root 命令。`--` 后的参数属于同一 workflow，而不是新的 package-script。

| workflow | 典型调用 | 默认与边界 |
| --- | --- | --- |
| format | `bun run format`；`bun run format -- check` | 无参数会写入 workspace format targets；`check` 只检查。 |
| lint / typecheck | `bun run lint -- product`；`bun run typecheck -- scripts` | 无参数分别覆盖 product 和 scripts；scope 只选择已声明的目标。 |
| test | `bun run test` | 默认且推荐的 root scope 是 Product；foundation 仍通过自己的 package command 验证 cwd boundary。 |
| validate | `bun run validate`；`bun run validate -- docs json` | 默认运行全部 docs validation 再做 `git diff --check`；`docs` 只把其后的 task 名交给 docs validator。 |
| quality | `bun run quality` | 无参数；写入忽略的 quality artifacts，但 Quality records 本身不阻断此 observation command。 |
| governance | `bun run decisions -- list`、`bun run change-plan -- check <path>`、`bun run investigations -- check`、`bun run test-evidence -- check --root .` | base command 只转发其 owner CLI；是否写入由具体 subcommand 决定。 |
| workspace verification | `bun run verify:vibe-check-workspace:required` | 只有此 workflow 保留默认、`required`、`full` 三个显式 profile entries。 |
| bootstrap / migration compatibility | `bun run env:setup`、`bun run env:check`、`bun run product:cli` | 前两个受 Codex 生成环境调用约束；最后一个只输出 migration diagnostic。 |

## 当前实现状态

- `scripts/quality/project-definition.ts` default-exports repository-owned Project Definition，并从 private
  `scripts/quality` package context 中已安装的 `vibe-check` 导入 ordinary built-in Check values、project-wide
  quality、scheduler、effects 和 Check-owned scanner options；`scripts/quality/project-run.ts` import 并绑定该值，
  导出只接收项目允许 controls 的 Run。
- `scripts/quality/index.ts` 在唯一需要外部 scanner pin 的边界通过 mise 启动
  `scripts/package-candidate/run-quality.ts`。该入口先准备或复用 local candidate，再调用 `scan.ts`；后者
  只调用 bound Project Run，并把 structured result 映射为该脚本的 process exit；它不调用 Product CLI、发现
  配置或转发 argv。
- `quality` 通过同一 wrapper 到达 Product `run` operation；
  repository policy、built-in selection 和 effects 只有 Project Definition 一个 owner。
- `src/product/**` 拥有 TypeScript 运行内核；开发脚本不保留第二套参数、配置或扫描 core。
- Required workspace verification 严格检查 decision records，并调用 test-evidence
  check 执行完整 Bun 测试面及语义 Case 闭合；同一 profile 调用 repository Project Run dogfood。
- Workspace verifier 的 `required` / `full` 组成、默认 profile 与 package-boundary gates 由
  [配置所有权](#配置所有权)完整定义。
- Current schema/examples checks 显式注册 run/record v3，验证五组 canonical machine sets；historical
  v2 schema bytes 只在显式 archival path/registry 中验证，不进入 current traversal 或 consumer path。
- 仓库自有 foundation 是普通 tracked source；它没有独立 checkout、upstream pin 或 submodule
  初始化要求。它的职责和 package boundary 由[工具来源](#工具来源)定义。

## 工具来源

可复用脚本工具以本仓直接追踪的 source 形式放在 `scripts/tools/` 下：

- `foundation`：process、Git、path、filesystem、JSON、CSV、NDJSON、
  argument、error 和 type guard helpers。

`src/product/task-scheduler/**` 是 Vibe Check-owned repository-internal static Task engine：它拥有 graph
validation、dependency、mutex、root admission、generic scope cap、abort observation 和 Task settlement。它只接受
graph/scope/executor data，不理解 Product Check/Core 或 scripts command/env/report fields。Product Check adapter
投影 Check layout；`scripts/vibe-check-workspace/task-engine-adapter.ts` 投影 scripts-owned command fields，二者
都只单向 import 这个 engine，不保留另一份 scheduler。

仓库自有 foundation 是 private pnpm workspace package。开发脚本从
`scripts/tools/foundation/src` 源码 import 消费它；`src/index.ts` 只是实际导出的 barrel，
不构成 npm 或 public `exports` contract。它不拥有 Vibe Check 的 package scripts、profile 或
artifact 路径。

foundation 的通用 helper 提供确定性归一与显式边界失败：`parsePositiveInteger` 和 JSON
parser 拒绝无效输入，path helper 产生确定性归一结果；`walkFiles` 返回相对传入根目录、
slash-normalized 且稳定排序的路径；无法读取目录，或 `readJsonFile` 无法读取/解析目标文件时，
错误包含目标路径；`writeJsonFile` 和 `toNdjson` 无法序列化时分别标识目标文件或 record；process
failure 对 consumer 保持可观察。异步 `runProcess` 将 caller 的 `cancelSignal` 传给 child；已启动的 child
被取消后，结果仍保留 `error`、`signal`（测试覆盖 `SIGTERM`）与 `status: null`，不能被当作成功。这些是开发
脚本 helper 契约，不替代 Product 的 scan-scope 契约。

foundation 的 `typecheck`、`format`、`lint` 和 `test` 在 package own cwd 中启动，并把它的 scope
传给仓库 `scripts/development/**` owner；它们都以 Bun 启动，不在 package manifest 保存 `cd`、mise
或长目标列表。根目录的 `typecheck -- scripts`、`lint -- scripts` 和 `format -- check` 也覆盖其
TypeScript source。后者不能替代 foundation 自己的 manifest、tsconfig、
cwd 和 package commands；full profile 因此保留其 package gates，准确组成见[配置所有权](#配置所有权)。

### Oxlint 与 Oxfmt

根目录 `.oxlintrc.json` 是 TypeScript lint rule set 的唯一机器配置 owner，`.oxfmtrc.json`
拥有 format 选项，`scripts/development/format-targets.ts` 拥有显式 format 目标路径集合。
`scripts/development/lint.ts` 与 `typecheck.ts` 拥有各自的 scope 到路径/config 映射；它们通过
`bun x --no-install` 使用当前 checkout 锁定的 Oxfmt、Oxlint 与 TypeScript Go binary。`lint -- product`
和 `lint -- scripts` 以 `oxlint --deny-warnings` 执行；`format`（写入）和 `format -- check` 只对这些
显式目标运行 Oxfmt。foundation package 的 format commands 使用同一 root 配置和 binary，并选择它的
manifest、tsconfig、source 与 test 目标；lint commands 只选择 source 与 test 目标。

规则、format 选项或目标范围变更时，修改上述配置或对应 development owner，而不是在文档或 package
内另建一份同义规则表。编码层面的优先级见[编码规范](coding-style.md#文档边界与使用方式)。

质量产品的 schema/types、scanner adapters、Check/Record/DecisionPolicy、publication/readable output、
reference/cache primitives 和必要 `foundation` helper 闭包归属 `src/product/**`，
不是开发脚本 toolkit。开发脚本可以单向调用产品入口，但产品运行时不得 import
`scripts/**`，包括仓库自有 `scripts/tools/foundation/**`。

已退出的 quality-core 和 parallel-task-runner 来源 revision，以及产品内 foundation helper
闭包记录在 `src/product/README.md`。其中的 foundation closure 只指
`src/product/foundation/**`，不使仓库自有 `scripts/tools/foundation` 成为产品 runtime 依赖。

## 项目环境自举与检查

根目录 `mise.toml` 声明 Node.js、Bun、pnpm、uv、Go、Lizard、scc 与 CodeGraph，
`mise.lock` 固定 mise 可锁定的解析结果。项目环境入口由
`scripts/project-environment/index.ts` 拥有；调用方必须已经提供 Bun 与 mise，并在首次
信任仓库配置前审阅 `mise.toml`。

### 配置环境

首次检出仓库、`mise.toml` 的工具 pin 变化或本地环境缺失时运行：

```bash
bun run env:setup
```

`env:setup` 按顺序完成以下操作；任一步失败都会停止，不继续执行后续步骤：

1. 信任当前仓库的 `mise.toml`。
2. 按 `mise.lock` 安装工具，按 `pnpm-lock.yaml` 安装 Node 依赖。
3. 初始化或同步当前 checkout 的 CodeGraph 索引。

该命令允许写入或更新用户级 mise 信任状态与工具安装目录，以及 checkout 内的
`node_modules` 和 `.codegraph`；它不构建或修改 `src/product/**`。入口本身只使用
Bun/Node 内置进程 API，不依赖另一个 toolkit checkout。

Codex 提供两个 checkout 环境：

- `vibe-check` 由 `.codex/environments/environment.toml` 依次运行 `env:setup` 和未传
  `--profile` 的 `verify:vibe-check-workspace`；后者当前默认 `full`，不执行 Git restore/clean。
- `clear` 由 `.codex/environments/environment-2.toml` 先丢弃目标 worktree 中已暂存和未暂存
  的 tracked 变更，并删除未跟踪且未被 ignore 的文件与目录，再运行同一组自举和验证入口。
  该环境不可恢复地清除上述工作，只有明确需要丢弃 worktree 内容时才能选择；ignored cache
  与依赖目录不属于它的清理范围。

两个环境都只以 Codex 提供的 `CODEX_WORKTREE_PATH` 为目标，要求该路径是 Git worktree
根目录；任一步失败都会停止，不继续验证未配置完成的环境。

### 检查环境

环境已经配置后，只检查当前状态时运行：

```bash
bun run env:check
```

`env:check` 确认以下条件：

- `mise.toml` 中声明的 tool pin 已安装并处于当前环境。
- Lizard、scc、当前仓库安装的 jscpd 与 CodeGraph 可执行。
- 当前 checkout 的 CodeGraph 索引存在且状态可用。

该检查不执行 mise trust、工具或 Node 包安装或 CodeGraph init/sync。若
检查失败，先运行 `bun run env:setup`，再重新检查。`env:setup` 与 `env:check` 都通过
`MISE_GLOBAL_CONFIG_FILE` 隔离用户全局 mise 配置。

### 命令环境边界

顶层 `mise.toml` 为仓库开发环境锁定 Lizard、scc 及其运行时。`env:check` 还检查当前 checkout
的 jscpd 开发依赖是否可用；这不是 `quality` 的 jscpd runtime resolution source。`quality` 的 duplication
default 在 private `scripts/quality` consumer 中从已安装 candidate `vibe-check` 声明的 production dependency
解析 jscpd manifest 和 bin，并由 active Bun executable 调用。Repository Project Definition 通过其普通
default Check values 直接拥有 scanner executable、args 与 availability args；`quality` 不解析或注入 scanner
override。详见 [Scanner dependencies](scanner-dependencies.md#check-owned-command-options)。

`mise.toml` 的工具安装、repository state、ambient `PATH` 与环境变量不是 Product scanner command 的隐式
resolution source。缺少或不可用的 Check-owned command 由对应 Check 安全地报告为 unavailable。

所有 root package-script value 都以 Bun 启动。`quality` 是唯一需要锁定非 JavaScript scanner toolchain
的日常 workflow：`scripts/quality/index.ts` 直接运行
`mise exec -- bun <absolute package-candidate run-quality.ts path>`，使 Lizard、scc、Python 与 Bun 同时来自
`mise.toml`/`mise.lock`。该 child 自动准备或复用 candidate，成功后执行 pure `scan.ts`。没有可由调用方
设置的跳过标记；mise 子进程一旦启动，其 stdout、stderr 和退出状态原样保留。因此调用者不必记住
mise，也不会从 ambient `PATH` 静默取得同名 scanner。scripts typecheck、Project Run test 和 workspace
verifier 的 candidate-preparation task 同样通过该锁定 Bun 执行准备；format 与 lint 不需要 mise wrapper。

## Runtime 边界

`src/product/**` 是 TypeScript/Bun 产品 runtime 的唯一源码 owner。Product `run` operation 接收
`(Project Definition, Run Controls)`；项目运行脚本普通 import 配置值并调用该 operation。开发
脚本可以调用 lizard、scc、jscpd 和 machine schema validator；项目治理入口可以调用安装在
`.codex/skills/` 的 decision、change-plan 与 investigation CLI。scanner 调用必须由
`src/product/**` 内的产品边界拥有，不能由 wrapper 重新实现。

workspace verifier 的 Task adapter 只把其 own `id`、dependency 和 mutex 投影给 engine，并在 adapter 外
保留 command、args、environment、report/status 与 process execution。它不是 Product Check adapter，不创建
Core facts，也不获得 Check scope、RecordSink 或 terminal capability。

## Repository Project Run

Repository canonical files 是：

- `scripts/quality/project-definition.ts`：拥有 repository policy、ordinary default/custom Check tree、
  scheduler、effects 和 Check-owned scanner options。
- `scripts/quality/project-run.ts`：绑定 Project Definition 与 repository root，导出项目允许的
  controls subset。
- `scripts/quality/scan.ts`：调用项目 Run 的 pure process adapter；不接受另一份配置。
- `scripts/package-candidate/run-quality.ts`：在 locked Bun child 中准备或复用 candidate，成功后调用
  `scan.ts`；准备失败时不运行 scan。
- `scripts/quality/index.ts`：只以 `mise exec` 启动上述 candidate workflow，并保留 child exit status；不增加
  参数、配置或 policy。

仓库 dogfood 入口是：

```bash
bun run quality
```

该命令单向调用 repository Project Run，不发现、复制或生成 config。它是 neutral dogfood
observation；需要 gate 的项目应在 Project Definition 中声明 named policy，并由自己的 Run/adapter
暴露必要 comparison controls，而不是由 package script 隐式改写 policy。

| 命令 | 当前行为 |
| --- | --- |
| `quality` | 运行完整 repository definition；quality records 非阻断 |

默认 output 写入 `artifacts/vibe-check-quality/`，并作为 generated local state 忽略。

## 候选 Project Gate

`scripts/project-gate/index.ts` 是候选 Project Gate 的 adapter。它当前没有正式 root
binding；正式门禁仍是 legacy workspace verifier。稳定的 Gate 行为由本节拥有，cutover 状态、
证据与授权边界分别见 [readiness handoff](../changes/build-candidate-backed-project-gate/gate-readiness-handoff.md)
和 [cutover Change](../changes/replace-workspace-verifier-with-project-gate/)。

adapter 先调用唯一的 `preparePackageCandidate()`。准备成功后，才动态加载
`scripts/quality/project-gate/project-run.ts`；private consumer 解析的 `vibe-check` entry 必须与
准备结果的 installed entry 完全一致。准备、导入或 identity 校验失败时，adapter 不创建 invocation
log、不运行 Gate，并以 exit `2` 结束。

`scripts/project-gate/catalog.ts` 独立拥有 20 个 process Check 及其 command、dependency、environment、
profile 和 tag；它不复用 legacy verifier 的 authoring data。`required` 执行 14 个 Check，`full`
执行 19 个 Check；不传 profile 时为 `full`：

```bash
bun scripts/project-gate/index.ts [--profile required|full] [--disable-tag <tag>]...
```

`--disable-tag` 只用于本地 partial invocation。adapter 将 profile 和去重、排序后的 disabled tags
写为本 adapter 的 opaque Run flags；每个 Check 在启动前据此返回执行结果或 profile/tag
`not-applicable` 结果。正式 repository/CI 的无-disabled-tag `required` / `full` 是 cutover 的调用
契约，不是 adapter 的运行时限制：adapter 不读取 ambient CI，local partial invocation 仍可在任何 host
运行。

identity 校验后，adapter 为每次 invocation 创建 `.log/project-gate/<unique>/`。eligible Check 在自己的
transcript 写入 command、stdout、stderr、exit、signal 与安全的 error summary；Product-owned progress 是唯一
共享进度流。零退出且 transcript 写入成功为 passed；非零退出产生不含 child output 的 Check-owned failure Record
并为 failed。已运行 command 收到取消时，adapter 先保存其 transcript，再映射为 `execution-cancelled`
unavailable；未启动、无法取得 exit facts 或无法写入 transcript 也为 unavailable。Definition 使用
`repository-gate` named policy 和固定 scheduler capacity `4`。

adapter 仅在 completed result 无 definition warning、progress effect 成功、named policy passed，且全部
Check outcome 与当前 eligibility 一致时返回 `0`；final result 未闭合时返回 `1`；参数、候选准备/导入/identity
或 execution failure 时返回 `2`。

最窄验证：

```bash
bun test scripts/project-gate/index.test.ts scripts/quality/project-gate/project-definition.test.ts scripts/quality/project-gate/process-check.test.ts
bun run test-evidence -- check --root .
```

开发期 workspace 验证入口是：

```bash
bun scripts/vibe-check-workspace/verify.ts --profile required
```

验证日志写入 `.log/verify/workspace/`。日志和 artifact 只用于本地定位，不属于
release artifact。

## Quality annotation consumer

Repository annotation entry 保持：

```text
bun scripts/quality/annotate.ts [artifact-directory] [limit]
```

- Default artifact directory 是 `artifacts/vibe-check-quality/`；default limit 是 `5`。
- Limit 必须匹配 `^[1-9][0-9]*$` 且不超过 `Number.MAX_SAFE_INTEGER`；extra argument、
  invalid limit 或 read failure 都是 handled infrastructure failure。
- Consumer 从该 directory 读取 `run.json` 与 `records.ndjson`，并只通过
  `src/product/run/machine-output.ts` shallow boundary 验证完整 two-file machine set。完整 validation
  成功后才过滤 `info`、应用 limit 并渲染 GitHub commands；script 不保留 render-only parser 或
  deep-import quality-core internals。
- Conforming set 产生 filtered/limited annotations；empty records set 产生 zero commands；两者退出 `0`。
- Argument/read/decoding/framing/syntax/schema/set-invariant failure 在 stdout 产生 zero annotation
  commands，stderr 输出 actionable diagnostic，并退出 `2`。Validation 不返回可消费的部分结果，
  因而不会产生 partial annotations。
- Record level 永不使 annotation 自身 non-zero。Annotations 始终是 non-blocking
  GitHub warnings；需要 best-effort orchestration 时由 workflow 使 step non-blocking，不能
  放宽 parser acceptance。

Machine identities、field semantics 与 byte grammar 由 [Output](output.md) 拥有；本节只拥有 direct script consumer 的参数、
render timing 和 exit behavior。

## Independent docs validation and workspace acceptance

Docs validation 故意把 current product、independent acceptance 与 historical materials
分开：

1. `scripts/docs/machine-schemas.ts` 从 Product runtime schema source deterministic 生成
   run/record v3 published schemas；`--check` 按 bytes 检测 drift。
2. `scripts/docs/machine-examples.ts` 从 fixed core fixture values 经 production mapper/
   serializers 生成五组 current examples；`--check` 检测 exact inventory 与 byte drift。
3. `scripts/tools/validators/schema/machine-artifacts.ts` 使用 checked-in current schemas、
   raw bytes 与独立 parser/set predicates 验证 examples；它不 import Product validator 作为
   acceptance implementation。
4. `scripts/tools/validators/schema/registry.ts` 的 current registry 显式注册 run/record v3。historical
   v2 run/record schemas 使用 separate archival registry，`docs/examples/json/**` 不进入 current example
   traversal。
5. `bun run validate -- docs` 独立调度 JSON、schema、examples、links tasks，并同时覆盖 strict
   compile、independent acceptance 与 generation drift。

## 项目级 Skill 维护

`.codex/skills/` 只保存项目长期选择的七项 Skill。各 Skill 的入口描述拥有通用触发条件；
[`AGENTS.md`](../AGENTS.md) 只补充项目专属路由和命令。本节只拥有当前安装清单、分发边界和
项目接线，不复制各 Skill 的执行方法。

| 类型 | Skill | 当前维护与项目接线 |
| --- | --- | --- |
| 完整上游治理包 | `.codex/skills/change-plan/` | `changes/`、`change-plan*` package scripts 与[决策和 Change 治理](decision-and-change-governance.md) |
| 完整上游治理包 | `.codex/skills/decision-records/` | `docs/decisions/`、`scripts/decision-records.ts` 与 `decisions*` package scripts |
| 完整上游治理包 | `.codex/skills/investigation-report/` | 按需建立的 `docs/investigations/` 与 `investigations*` package scripts |
| 完整上游判断包 | `.codex/skills/common-denominator-design/` | 无项目 runtime；项目 owner 和验证入口始终从包外读取 |
| 完整上游判断包 | `.codex/skills/product-architecture-judgment/` | 无项目 runtime；项目 owner 和验证入口始终从包外读取 |
| 独立方法包 | `.codex/skills/performance-optimization/` | 无 CLI、schema 或 runtime；目录内入口与 references 共同构成当前文件集 |
| 项目方法层 | `.codex/skills/test-evidence-review/` | 只维护能力感知的评审方法；项目测试 owner 继续拥有 Runner、Case、CLI 和闭合 runtime |

五个带 updater 的完整上游包使用各自 updater 或同一 release asset 整包替换。更新时只选择目标
包，先核对 release，再运行包的机械检查、项目文档检查、脚本检查及受影响 workspace 验证；
项目触发规则和 owner 语义不写回包内。`performance-optimization` 作为无 runtime 的完整目录维护，
修改时同步核对入口与 references。`test-evidence-review` 是唯一登记的项目特有方法层 Skill；
后续只有项目 owner 与验证入口能证明新增能力无法由现有七项或编码规范承接时，才通过新的决策
演进扩大安装集合。

## 长期决策适配器

项目内安装的
[`decision-records`](https://github.com/zxyycom/skills/tree/main/skills/decision-records)
工具契约拥有以稳定 Decision ID、tags、根目录/`archive/` 位置表达的固定格式、通用 lifecycle
与关系事务、索引生成以及 CLI / ESM API 精确语义；项目的决策 Markdown 拥有每条记录的实际
tags、内容和状态，不维护 domain catalog。项目 owner 按
[决策与 Change 治理](decision-and-change-governance.md)路由当前事实、长期方向和单次计划。
Vibe Check-owned
`scripts/decision-records.ts` 显式传入仓库根、转发 CLI 参数，并为模块调用暴露
`runDecisionRecordsCli`、`scanDecisionRecords` 和 `validateDecisionRecords`。适配器不复制
解析、校验、索引维护或关系语义，`src/product/**` 也不导入该开发工具。

| 入口 | 用途 | 状态影响 |
| --- | --- | --- |
| `bun run decisions -- list` | 列出活动决策的检索投影 | 只读 |
| `bun run decisions -- check` | 严格检查目录、Markdown、索引和关系 | 只读 |
| `bun run decisions -- <command>` | 调用 skill 的完整 CLI | 由具体命令决定；写命令按 skill 契约执行 |

## Change Plan CLI

项目内完整上游 [`change-plan`](../.codex/skills/change-plan/SKILL.md) 拥有 Change 目录、固定
artifacts、严格 metadata、stage、Git 距离与六个 CLI 命令。项目只固定 `changes/` 根和
package scripts：

| 入口 | 用途 | 状态影响 |
| --- | --- | --- |
| `bun run change-plan -- list changes` | 列出 `changes/` 下 active Change | 只读；发现 invalid member 不等于验收通过 |
| `bun run change-plan -- show changes/<change>` | 展开一个 Change 的 status、stage、任务进度、Plan Git 距离与 artifacts | 只读 |
| `bun run change-plan -- check changes/<change>` | 按当前 stage 机械检查目标 Change | 只读 |
| `bun run change-plan -- check-all [changes]` | 门禁所选 Change 根中的 active Change；`--archived` 或 `--all` 显式扩大集合 | 只读 |
| `bun run change-plan -- plan changes/<change>` | 在语义复核后写入规范 Plan metadata 与当前 Git baseline | 写 metadata；不表示实施已获授权 |
| `bun run change-plan -- archive changes/<change>` | 归档已满足机械门禁的 active Plan | 移动 Change 目录；仍需当前任务明确授权 |

CLI 使用稳定的命令与 JSON 输出边界；项目不依赖其未承诺稳定的直接 import API。

## Investigation Report CLI

项目内完整上游 [`investigation-report`](../.codex/skills/investigation-report/SKILL.md) 拥有主题、
可选随附资源、派生索引、同步、查询与 `stage-index`。集合只在用户明确要求沉淀调查时建立；
不存在的 `docs/investigations/` 不用空目录或空索引伪装为合法集合。

| 入口 | 用途 | 状态影响 |
| --- | --- | --- |
| `bun run investigations -- list` | 从已核对新鲜度的索引查询主题 | 只读 |
| `bun run investigations -- check` | 全量检查主题、资源与派生索引 | 只读 |
| `bun run investigations -- sync-index` | 从主题和资源重建工作树索引 | 写派生索引，不写主题或资源 |
| `bun run investigations -- stage-index <topic-id...>` | 只把选中主题对应的索引变化写入 pending | 写版本管理 pending，不暂存主题或资源 |

## 测试证据闭合工具

Vibe Check-owned [`scripts/test-evidence/`](../scripts/test-evidence/) 拥有 runner
profile、ast-grep static scan、Bun JUnit runtime report、实体 identity、Case parser、
topic catalog、查询和闭合诊断。项目内
[`test-evidence-review` skill](../.codex/skills/test-evidence-review/SKILL.md) 只提供
能力感知的语义评审方法，不携带项目路径、runner adapter、schema、CLI runtime 或第二套
持久化格式。

| 入口 | 用途 | 状态影响 |
| --- | --- | --- |
| `bun run test-evidence -- list --root .` | 列出当前语义 Case；需要有界筛选时使用完整 CLI | 只读 |
| `bun run test-evidence -- topics\|list\|show --root .` | 按 topic、entity、owner、文本或 Case ID 查询 | 只读 |
| `bun run test-evidence -- check --root .` | 运行完整 Bun 测试面并严格检查 static/runtime/entity/Case 闭合 | 只读 |
| `bun scripts/test-evidence/test-rules.ts` | 验证 ast-grep Bun test 发现规则 | 只读 |
| `bun test scripts/test-evidence` | 运行 test-evidence 工具 focused tests | 只读 |

测试层级和项目级维护规则由 [测试策略](testing.md) 与
[测试证据维护](testing/case-maintenance.md) 拥有。Case 按共同 owner 契约与可观察结果
划分，并与完整当前实体集合 many-to-many 闭合；产品语义继续由对应行为 owner 定义。

## 配置所有权

Project Definition authoring、validation、normalization 和 closed Run Controls 由
[Configuration](configuration.md) 与 `src/product/**` 拥有。Scanner command/availability 由
[Scanner 依赖选择](scanner-dependencies.md) 拥有；policy evaluation 与 structured result 由
Quality Metrics 和 Output owner 承接。

Repository-owned complete policy 位于 `scripts/quality/project-definition.ts`，并由
`scripts/quality/project-run.ts` 绑定。Wrapper/package scripts 不保存第二套 default、field tree、
selection 或 discovery logic；TypeScript 文件路径是 repository convention，不是 Product contract。

当前产品语义由 `docs/architecture.md`、`docs/scanner-dependencies.md`、
`docs/quality-metrics.md` 和 `docs/output.md` 拥有。隔离的 historical report schema/examples
只参与下述开发期验证 registry，不构成当前 Output contract。

`scripts/tools/validators/config.ts` 拥有开发期文档验证路径和任务名；它登记 current
run/record v3 schemas、historical v2 schema material 与对应 example roots，不重新定义 Output contract。

`scripts/vibe-check-workspace/checks/definitions.ts` 与相邻 normalization/model files 拥有 workspace verifier
的 scripts-only task authoring、profile 分层、warning output 识别和成功输出过滤；`task-engine-adapter.ts` 是其到
shared engine 的唯一投影。CLI 接受 `required` 和 `full`；未传 `--profile` 时默认 `full`，日常
快速验证必须显式使用 `:required` profile entry。Required profile 先以 locked Bun 运行唯一的
candidate-preparation task；scripts typecheck、test evidence 和 quick quality 都依赖该 task，避免并行
build/pack/install。Required profile 随后包含 decision records 与 test evidence 的严格检查和 quick quality
dogfood。Full profile 选择全部 required non-quality checks（排除
`quality-quick-check`），并添加 `quality-full-check`、`test -- product` 与 foundation 的
typecheck、lint、`format -- check`、test package commands。这些独立 package commands 是有意保留的
package-boundary verification：根 scripts check 的 source 覆盖不能证明 foundation own manifest、
tsconfig、cwd 和 package scripts 可用。它们不定义产品行为、Check scope 或 Core facts，只编排
已有命令。

## 验证入口

修改脚本工具接入时，如果 `node_modules/` 缺失，先完成上面的新 checkout 初始化。
`scripts/tools/foundation` 是当前 checkout 中应有的 tracked source；缺失时先修复 checkout，`env:setup` 不会获取它。

按改动面选择最窄验证：

| 改动面 | 命令 |
| --- | --- |
| 脚本格式、类型或 lint | `bun run format -- check`、`bun run typecheck -- scripts`、`bun run lint -- scripts` |
| 项目环境、工具 pin 或 Codex checkout 自举 | `bun run env:check`、`bun run typecheck -- scripts`、`bun run lint -- scripts`、`bun run verify:vibe-check-workspace:full` |
| 长期决策适配器或记录集合 | `bun run decisions -- check`；适配器改动另跑 `bun run typecheck -- scripts`、`bun run lint -- scripts` |
| 测试证据闭合工具或 Case 集合 | `bun run test-evidence -- check --root .`；工具改动另跑 `bun run typecheck -- scripts`、`bun run lint -- scripts` |
| Project Definition、Project Run 或 dogfood wrapper 接线 | `bun test scripts/quality/project-run.test.ts`、`bun run quality`，并按影响面补 Product `run` 测试 |
| 文档校验 | `bun run validate -- docs` |
| workspace verifier（routine） | `bun run verify:vibe-check-workspace:required` |
| workspace verifier（完整 Product / foundation package 验收） | `bun run verify:vibe-check-workspace:full` |
| current schema/example generation drift | `bun scripts/docs/machine-schemas.ts --check`、`bun scripts/docs/machine-examples.ts --check`；日常由 `validate -- docs` 调度 |
| quality annotation | `bun scripts/quality/annotate.ts [artifact-directory] [limit]` |
| foundation package | `bun run --cwd scripts/tools/foundation typecheck`、`bun run --cwd scripts/tools/foundation format -- check`、`bun run --cwd scripts/tools/foundation lint`、`bun run --cwd scripts/tools/foundation test` |
| Product-owned runner import | `bun test src/product/task-scheduler/test` |

产品行为改动按 TypeScript/Bun 产品验证入口执行。
