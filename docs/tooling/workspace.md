# 工作区工具

维护仓库自动化、根命令或共享 scripts capability 时，从本篇定位目录 owner、调用入口和允许的依赖方向；处理开发环境、governance 或 test-evidence adapter 时，也在对应小节读取边界。

本文拥有这些工作区工具边界。产品运行时由 `src/**` 拥有，且不得 import `scripts/**`。runtime/private Project consumer 只能从 exact installed candidate 的 public entry 消费 Product。package/docs build、projection 与 audit 可以只读其 owner 明确 allowlisted 的 source/contract material，但不以它建立内部 runtime consumer 或调用 Package Run。

Project Gate、package artifact lifecycle 和 documentation/package material 分别由对应 tooling owner 维护。

## Source owners and dependency direction

`scripts/**` 按实际 workflow 与生命周期组织。目录层级只表达父子 owner，具体文件继续由所在目录和文件名共同表达职责。

下列映射是当前 owner、入口和允许依赖方向的权威来源。

### 工作流责任方

| Owner | 责任与入口 |
| --- | --- |
| `scripts/development/**` | `format.ts`、`lint.ts`、`typecheck.ts` 与 `test.ts` 选择开发期 scope；`scripts/process-execution/command.ts` 提供其进程命令边界。 |
| `scripts/environment/manage.ts` | `env:setup` 和 `env:check` 的 mise、依赖与 CodeGraph 环境管理，以及 `env:setup` 返回前完成的 local package candidate 自举。 |
| `scripts/validation/**` | workspace root、repository layout 与 `documentation/**` 的 docs acceptance workflow、task contract、links、JSON/schema/machine-artifact validation。它调用 `scripts/docs/**` 的 check-only provider，不把 workflow 放回 provider。 |
| `scripts/docs/**` | machine artifact schema/example 与 package Markdown fenced example、JSDoc example、Check guide 的投影或收集 provider；不拥有 package 文档正文或 docs validation orchestration。 |
| `scripts/package/**` | parent owner 持有 public contract、file inventory、Bun pack/digest 与 artifact/candidate/release 共用 package-material audit；子模块职责与 candidate fingerprint 边界见[package 子模块职责](#package-子模块职责)。 |
| `scripts/project/**` | 唯一 private candidate consumer root；其 Gate child owner 见[Project Gate and Test Evidence child owners](#project-gate-and-test-evidence-child-owners)。 |
| `scripts/maintenance/**` | 仅承接由对应 root maintenance command 显式选择的仓库维护查询；每个脚本固定自己的外部 target、transport 与 advisory result，不进入 Product 或默认 Gate。 |

### package 子模块职责

- `artifact/**` 构建和审计 tarball。
- `candidate/**` 准备、安装并核对 fingerprint local receipt。
- `release/**` 验证 clean source、formal version/tag、portable receipt 与 same-artifact Gate handoff。
- `candidate/external-consumer/**` 拥有隔离 consumer material、typed provider 与 types/documentation/runtime acceptance。

candidate fingerprint 覆盖整个 package lifecycle，以保守失效。

### 共享能力与治理责任方

| Owner | 责任与入口 |
| --- | --- |
| `scripts/process-execution/**` | repository automation 的 process facade、contract、runner、failure、plain-text environment 与根命令 adapter；跨 owner 只消费 `execution.ts`。 |
| `scripts/repository-files/**` | repository 文件遍历、文本读写和路径 containment；不拥有 JSON validation 或 generic serialization。 |
| `scripts/canonical-json.ts`、`scripts/diagnostic-safety.ts`、`scripts/error-message.ts` 与 `scripts/value-guards.ts` | 跨 scripts owner 复用的根级安全 capability：canonical JSON machine facts、owner-local diagnostic ID/单行 presentation 的安全不变量，以及明确的诊断字符串和值形状小边界。它们不拥有字段语义、排序或 Product contract。 |
| `scripts/decision-records/command.ts` | 将仓库根绑定到已安装 decision-records capability 的 repository adapter。 |
| `scripts/test-evidence/command.ts` | current test entity discovery、Case 查询与闭合检查的 command/API owner；其 child owner 见[Project Gate and Test Evidence child owners](#project-gate-and-test-evidence-child-owners)。 |

### 公开入口与私有使用方边界

`src/index.ts` 是唯一 public 产品入口及 package artifact build/declaration entry。`scripts/project/package.json` 从 exact installed `@zxyycom/vibe-check` candidate 消费该入口。

`scripts/package/**` 只负责准备该 candidate，不能 import 或启动 project consumer。artifact/package-API documentation build 与 audit 可以读取各自显式 allowlisted 的 Product source 或 contract material，但不成为 Package Run consumer。产品 runtime、Definition 和 Check 不得依赖 scripts helper、环境状态或 process adapter。

### Project Gate and Test Evidence child owners

| 路径 | 职责 |
| --- | --- |
| `scripts/project/gate/definition.ts` | Gate 组合配置及 invocation runtime material 的类型。 |
| `scripts/project/gate/run.ts` | 唯一 Gate process entry。 |
| `scripts/project/gate/checks/entry-factories.ts` | 将已解析的 process invocation 或 native Check 封装为带 selection metadata 的 Gate entry。process entry 只能是 plain、typed data dependency 或 structured failure projection 之一；TypeScript union 与 runtime guard 都拒绝混用两个 adapter。 |
| 其它 `scripts/project/gate/checks/**` | 各领域 Check 配置与 adapter。 |
| `scripts/project/gate/runtime/**` | bound runtime mechanics。 |
| `scripts/test-evidence/profile.ts` | runner profile schema/value validation。 |
| `scripts/test-evidence/discovery/**` | 单向消费 profile，并拥有 files/process registration。 |
| `scripts/test-evidence/catalog/test-support.ts` | catalog 的 node:test fixture setup，不构成独立行为 owner。 |

## Root commands

根 [`package.json`](../../package.json) 拥有下列命令的精确接线；各工作流责任见上节，内部脚本不是第二套根入口。

| Workflow | 调用 |
| --- | --- |
| environment | `bun run env:setup`；`bun run env:check` |
| development | `bun run format [-- check]`；`bun run lint [-- product \| scripts]`；`bun run typecheck [-- product \| scripts]`；`bun run test` |
| package candidate | `bun run package:status`；`bun run package:build`；`bun run package:verify`；显式物理集成 `bun run package:candidate:integration` |
| formal package release | `bun run package:release:prepare -- --version <0.0.PATCH> --tag <tag>`；`bun run package:release:verify -- --receipt <path>` |
| package API projections | `bun run docs:api`；显式写入 `bun run docs:api:write` |
| docs/workspace validation | `bun run validate`；`bun run validate -- docs [json \| schema \| examples \| links \| package-api-documentation]` |
| governance | `bun run decisions -- <command>`；`bun run change-plan -- <command>`；`bun run investigations`；`bun run test-evidence -- <command>` |
| maintenance advisory | `bun run maintenance:lizard-upstream` |
| virtual admission workbench | `bun run admission:simulate <fixture-id-or-scenario.json> [--policy static\|learned] [--seed N] [--replicates N] [--out new-file]`；仅仓库维护者使用，不是 Product CLI 或 Gate selector |
| Project Gate | `bun run check [-- --typecheck \| --lint \| --test \| --docs \| --quality \| --all]`；formal receipt：`bun run check -- --all --release-receipt <path>` |

### Virtual admission workbench

本节是 `admission:simulate` 的唯一维护规则 owner：命令语法、输入拒绝、evidence、合成时间和
真实 Gate 的非等价边界都在此定义。实现按职责分为命令边界、版本化 scenario/fixture、public
`AdmissionGraph` 虚拟事件与 evidence；这种文件组织不新增第二个命令、Product API 或 Gate 规则来源。

`admission:simulate` 是仓库私有的 exact-candidate consumer，用公开 `AdmissionGraph` 接受每次
`select` / `settle`，并在独立的合成时间模型中比较准入 policy。它不执行 Check、不创建 Gate
transcript、不调用 `scripts/project/gate/run.ts`，也不是 Product CLI、Gate selector 或第二套
Scheduler reducer。

#### 输入与复现

从仓库根运行：

```sh
bun run admission:simulate chain --policy static --seed 7 --replicates 2
bun run admission:simulate profile-variation --policy learned --seed 7 --replicates 2 \
  --out .cache/vibe-check/admission-workbench/profile-variation-seed-7.json
```

第一个位置参数可以是内置 fixture ID，也可以是 scenario JSON 路径。scenario `version: 1` 的输入由
`scenarioVersion`、`scenarioId`、公开 `AdmissionGraphInput`、profiles、task→profile 固定映射、
允许的 policy IDs、contention preset、assumption IDs 与可选二元 outcome / mapping identity 组成。
非有限或非正 work、空倍率、未知或重复 ID、task/profile claims 不一致、非法图及未注册 policy 都会
拒绝，不会修复或降级。

当前固定 fixture IDs 是：

- 最小边界与手算 oracle：`empty`、`single`、`chain`、`two-shared-claims`；
- 图和事件边界：`wide-tie`、`backfill`、`scoped-capacity`、
  `weighted-mutex-multi-resource`、`unsatisfied-observes`；
- 假设压力：`profile-variation`、`long-tail-critical`；
- 静态资源形状：`gate-shape-v1`。

同一 `(scenarioVersion, scenarioId, taskId, replicate, seed)` 使用
`fnv1a32-nul-tuple+mulberry32-v1` 抽样。policy 不会取得 profile、sampled/remaining work、PRNG、
未来事件、其它 policy 结果或完整 trace；因此相同 seed 与 replicate 的不同 policy 使用同一外生
work commitment。`static` 是版本化的简单合法 baseline，不声称复制 Product 内置 static policy；
`learned` 使用公开 prepared helper，在每个 replicate 将同一固定 history snapshot 复制到独占的
absolute state directory，且不调用 `complete`。history/setup fallback 或不符合预期的 prediction
source 使该次比较失败，虚拟 settlement 不会写回 snapshot。

#### Evidence 与输出边界

默认只把完整 JSON evidence 写 stdout。`--out` 要求父目录已经存在且不是符号链接，并以 exclusive
create 新建普通文件；已有文件或符号链接一律拒绝且不覆盖。若需保留本地比较证据，使用 ignored 的
`.cache/vibe-check/admission-workbench/`，不要把临时 evidence 当作稳定 owner 或提交到仓库。

当前私有 evidence IDs 为：scenario/schema `1`、policy `1`、
`public-admission-policy-context-v1`、`admission-workbench-trace-v1`。每个成功 result 记录 exact
installed package version 与 entry SHA-256、scenario/profile/policy/history/model/fallback identity、
seed/replicate、完整合成假设、sampled-work commitment、makespan、slot·time、逐 named resource 的
unit·time、正式 action-observation prefix 与 ordered trace。资源指标按 resource ID 分开，不能跨资源
相加。失败以非零退出并保留仍可可靠确定的 identity、boundary index、virtual time 与已发生 trace；
未通过 scenario schema 的 identity 明确为 `null`，不伪造值。

证据来源必须分别解释：

1. `source: "virtual"` 只说明公开 legality 下的合成事件与虚拟毫秒；
2. `shared-closure.test.ts` 的真实 Check lifecycle 只证明 public Run 的 cancel/drain 接线，并与虚拟
   `unsatisfied` settlement 分开；
3. 正式 `bun run check -- --all` 的 Gate 时间只用于观察平台未覆盖的偏差和接线边界，不能反向拟合
   contention 系数或证明策略收益。

`profile-variation` 的四个 profile 固定自时长调查的 proxy median 与 `sample / median` 向量；它们不是
完整 Gate Check baseline，core execution duration 也不能叠加成无竞争基线。zero / weak / strong 的
`α=0 / 0.25 / 1` 及 `5.5×` long-tail 都是明标的合成敏感性假设，不是实测竞争参数或发生概率。
`gate-shape-v1` 只冻结 `project-gate-named-resources@b30477b6` 的 root `3`、17 个 test-lane 对
`project-gate-bun-test-runners` capacity `2` 的 claim，以及 4 个 quality task 对
`project-gate-repository-scans` capacity `2` 的 claim；它不是完整 Gate 的 36-Check 依赖、mutex 或
时长模型，禁止把其 makespan 与正式 Gate wall time 计算预测误差比例。任何模拟结果都不保证真实
Gate 加速。

### Learned admission heuristic 对照记录

`learned-heuristic-evaluation.ts` 是一次已结束的维护者对照，不是第二个 root command、Product API、Gate
selector 或持续性能承诺。它只接受两个已构建 package directory 的公开 `index.mjs`，分别动态导入
`createLearnedCriticalPathStrategy`；复现命令为：

```sh
bun scripts/project/admission-workbench/learned-heuristic-evaluation.ts \
  --baseline-artifact <baseline-package-directory> \
  --candidate-artifact <candidate-package-directory> \
  --out <new-evidence.json>
```

v1 先冻结 12 个 fixture、基线和两个小候选：c1 只将 scored choice 按 public `canAdmit` 过滤，未产生
可采用的虚拟收益；c2 再以 public resource-claim backlog 解决同 score/priority 的并列，在 `gate-shape-v1`
从 `1000` 到 `900`，但这不是采用依据。v2 保留旧输入、加入
`learned-heuristic-weighted-shared-dependency-regression.json`（固定 9 个 task、`maxParallel=2`、`shared=2`、
`queue=2`），并修正成本边界。

成本 corpus 只能由基线公开 policy 捕获；捕获 handle 随即释放，两个 artifact 为每张图新建同配置
prepared policy，计时区间只调用原始 public `decide`。记录 corpus hash/count、raw samples、nearest-rank
p95 与 1.25× guard；fallback 以 O(1) sticky failure 在计时外检查。virtual 结果与宿主成本仍是不同证据，
均不表示真实 Gate 加速。

c2 在 v2 的固定 5 个 replicate 中均把该反例的 makespan 从基线 `204` 增至 `300`，所以无论之后的
成本 guard 对它有利与否，结论都是 **保留基线（no adoption）**，且未改变 Product 行为。
`learned-heuristic-*.evidence.json` 中 `historical-non-gating` 的 v1 或 wrapper-cost 记录只保存探索来历，
不得用于采用判断；当前 `current-replay` 双 artifact evidence 才是结论的可复核输入。它保留逐场景指标、
反例的完整代表 trace、artifact/protocol/context hashes 和有效成本 samples；忽略的原始全量输出并非复现前提。

追溯材料中的 c1/c2 规则足以辨识曾评估的对象，但仓库不会从已还原的 Product source 自动重建历史候选。
若要重放历史结果，调用方必须自行提供与 evidence identity 相符的两个公开 package artifact；清理 ignored
raw output 不改变这一边界。

形成时的方案对照、反例解释及 baseline→c2 源码差异见
[启发式未采用调查报告](../investigations/explain-learned-heuristic-rejection.md)。报告保存本轮认识，
不替代本节的当前工具契约，也不授权采用历史候选。
后续 [简单算法比较调查报告](../investigations/compare-simple-admission-algorithms.md) 扩展了 SPT、LPT、
关键路径贪婪与有界搜索的实验范围；其资源仅供该轮调查复核，未替换 Product 策略或本节的工具入口。

### 治理、来源映射与 Project Gate 调用

`bun run investigations` 默认执行完整检查。列出或同步 Investigation 索引时使用 `bun run investigations -- list` 或 `bun run investigations -- sync-index`；命令从当前仓库根目录推定 root。只有需要覆盖该默认值时才把 `--root <path>` 放在子命令之后，例如 `bun run investigations -- list --root <path>`。

Decision 与 Investigation 的正式身份均为 frontmatter 中 calendar-valid 的 `YYMMDD-<name>`；文件 basename 只是可独立变化的 source locator，身份迁移必须使用所属 skill 的 `rename` 事务。

来源映射维护使用 `bun run source-mapping [-- check | sync]`，由 `scripts/package/legal-materials/source-mapping.ts` 拥有；默认只读检查，写入边界见[来源映射维护](package-lifecycle.md#translated-source-mapping-maintenance)。

`bun run check` 选择日常 required 集；focused preset 可组合并替换默认选择，`--all` 独占其它 preset。`.codex/environments/*.toml` 也直接调用该正式名称。scope、action 和子命令作为同一 workflow 的参数传入，不为内部 owner 建立同义 root alias。

## Development tooling

根目录 `.oxlintrc.json` 是可机械执行的 TypeScript lint rule set 的唯一 owner，`.oxfmtrc.json` 拥有 format 选项，`scripts/development/format-targets.ts` 拥有显式 format target。

`lint.ts` 与 `typecheck.ts` 只拥有 `product` / `scripts` scope 到路径或 tsconfig 的映射。它们使用 checkout 锁定的工具，两个 lint scope 都以 `oxlint --deny-warnings` 运行。`format` 写入这些显式 target，`format -- check` 只检查它们。

修改 lint rule、format option 或目标范围时，修改相应配置或 development owner；不要在 package、子目录或文档复制同义规则表或 target list。development lint、format 与 typecheck 对适用 `src` 保持完整普通输入，均不为 source-aligned function-metrics port 增加 translated-only 排除。实现原则仍以[编码规范](../development/coding-style.md)为准。

### Lizard / TypeScript performance evidence

显式比较 Python/Lizard 与 TypeScript 的流程、测量层级和证据边界见[Lizard 性能测量](lizard-performance.md)。
该流程只产出开发期 evidence，不授权优化，不进入 Product 或默认 Gate。

### Local post-commit auto-push

#### 启用与授权

`.githooks/post-commit` 是仓库拥有的 Git `post-commit` 入口。Git 不会在 clone 后自动启用版本化 hook；需要该行为的 checkout 必须显式运行 `git config --local core.hooksPath .githooks`，只修改当前 checkout 的本地 Git 配置。使用 `git config --local --unset core.hooksPath` 可以停用它。

在本仓库中，`core.hooksPath=.githooks` 表示当前 checkout 已显式选择该 hook 及其下述受限 push 行为。该配置存在时，任务对普通 `git commit` 的授权同时覆盖 hook 按本节契约发起的 push，无需另行确认；执行者不得仅为避免 auto-push 而临时覆盖 `core.hooksPath` 或以其他方式绕过 hook。只有任务明确要求仅创建本地提交，或 hook 故障后另行取得绕过授权时，才能在该次提交中绕过 hook。

#### 推送范围与失败行为

启用后，hook 只在当前分支精确为 `main` 时处理提交，并且：

- 每 3,600 秒最多执行一次真实 push 尝试；attempt time 保存在 Git-local state 中，失败的尝试同样占用该窗口，避免在网络、鉴权或远端状态持续失败时由每次 commit 重复触发。
- 只向 `origin` 推送显式 refspec `refs/heads/main:refs/heads/main`，同时关闭 force 与 follow-tags；远端包含本地没有的提交时，普通 non-fast-forward 保护会拒绝 push。
- 远端、时间或 state 不可用以及 push 被拒绝时只输出诊断并返回成功，不改变 commit 结果，也不自动 fetch、pull、rebase、merge、创建或推送 tag。

每次调用都会先输出 `commit`、`branch` 和 `target`，随后明确输出 `action`。跳过时还会输出 `reason`；真实 push 完成后会输出 `result`，失败时另输出不会执行的恢复动作和 retry 边界。因此从 commit transcript 可以区分“分支不适用”“cooldown 内未发起请求”“正在执行安全 push”“成功”和“提交仍留在本地”。这些内容写到 hook 的 stdout/stderr；图形化 Git client 是否展示 hook transcript 仍由该 client 决定。

该 hook 只同步开发分支，不发布 npm package，也不创建 GitHub Release。npm package 仍是产品发布单元。

## Environment and shared script boundaries

### Process, repository-file, and narrow boundary capabilities

`scripts/process-execution/execution.ts` 是跨 owner 的 process facade；其它 scripts owner 只能从该 facade 消费 process capability，不得 deep import `process-execution/{contract,failure,plain-text-environment,result,runner}.ts`。

#### 范围与验证

`scripts/process-execution/**`、`scripts/repository-files/**`、`scripts/canonical-json.ts`、`scripts/diagnostic-safety.ts`、`scripts/error-message.ts` 与 `scripts/value-guards.ts` 是普通 tracked repository source，不是 package、workspace、独立 manifest、独立 TypeScript config、独立 Project Gate Check 或 selection preset。

它们由 `bun run typecheck -- scripts`、`bun run lint -- scripts`、`bun run format -- check` 和 Test Evidence current scripts surface 覆盖。它们与 `src/data-boundary/**` 与 `src/package-checks/host-environment/**` 是不同 owner：前者服务 repository automation，后者服务 Product runtime；Product 不得 import 前者。这些 script boundaries 不定义 Product source-access boundary；适用的 Project consumer 与 package/docs 例外见[Source owners and dependency direction](#source-owners-and-dependency-direction)。

#### 共享能力的安全职责

进程 facade、repository file/path capability 与四个根级小 capability 让开发脚本边界可复现、可诊断且可安全交接：

- 文件遍历返回稳定 slash-normalized relative paths，文本与 process failure 保留目标或失败事实，不静默跳过；已启动 child 的 cancellation 保留 error、signal 和 `status: null`，不能视为成功。
- `scripts/canonical-json.ts` 将 untrusted scripts data materialize 为 detached、immutable、有限 JSON machine fact，拒绝 getter、hook、cycle 与非有限 number。
- `scripts/diagnostic-safety.ts` 只验证 owner-local Record ID 和单行 presentation，拒绝控制字符。

后两个 capability 由 scripts root 共同拥有，是因为多个 scripts owner 都需同一安全不变量；它们不定义 Product data boundary、public schema、诊断字段、排序或 presentation 语义。JSON document validation、serialization 与 Product scan-scope/scanner contract 仍由各自 owner 承担。

### Environment setup and destructive boundary

#### 自举前提与效果

首次检出、工具 pin 变更或环境缺失时运行 `bun run env:setup`。成功返回表示 checkout 已按以下顺序完成标准自举：

1. trust 当前 `mise.toml`，按锁定结果安装工具和 Node dependencies；
2. 初始化并同步当前 checkout 的 CodeGraph；
3. 通过现有根命令 `bun run package:build` 准备 exact local package candidate。

标准开发与验证命令以 `env:setup` 成功返回为前置条件；项目不承诺未自举的 cold checkout 可以直接运行 Project Gate。后续独立启动的 Gate 从已自举的 private consumer 解析 candidate，并由自己的 preparation assessment 重验 exact installation 后复用；`package:build` 不建立第二套 package acceptance。

首次自举会写入 user-level mise trust/tool state、checkout `node_modules`、`.codegraph`、candidate build/cache evidence 和 `scripts/project/node_modules`。后续执行按各 owner 的 reuse 规则更新或复用这些状态。

该 bootstrap 入口只依赖 Node/Bun 内置能力与根级错误映射，不能在依赖安装前加载 `process-execution` 的第三方 runner；`package:build` 只在 frozen dependency install 和 CodeGraph setup 成功后运行，失败会使 `env:setup` 失败。

#### 检查与破坏性环境

执行前审阅 `mise.toml`。`bun run env:check` 只检查已安装 tools、jscpd 和 CodeGraph 状态，不检查或准备 candidate，也不执行 trust、安装或索引同步；检查失败后再运行 setup。两个命令以 `MISE_GLOBAL_CONFIG_FILE` 隔离用户全局 mise 配置。

`.codex/environments/environment.toml` 在 setup 后运行默认 Project Gate，不清理 worktree。

`.codex/environments/environment-2.toml` 的 `clear` 环境会在同一 setup 前对 `CODEX_WORKTREE_PATH` 执行 `git restore --staged --worktree -- .` 与 `git clean -fd -- .`；这会不可恢复地删除 tracked 改动和未跟踪、非 ignored 文件。只有明确授权丢弃目标 worktree 内容时才能选择它。

Product Check 的 scanner command、availability command 和 unavailable behavior 仍由[Check-owned scanner dependencies](../development/scanner-dependencies.md)所列的各 Check owner 定义；Gate 不创建第二套 scanner workflow。

## Governance and Test Evidence adapters

`scripts/decision-records/command.ts` 把 repository root 绑定到已安装 capability，并转发其 CLI 或暴露同一 typed operation；`change-plan` 与 `investigations` root commands 直接调用各自 skill 的 CLI。它们不复制 parser、metadata、index 或 lifecycle 语义。

写入由相应 subcommand/skill 和当前任务授权决定；Change 完成后只在明确删除授权下使用 `complete`，成功即删除整个目录，不建立完成态 archive。

`scripts/test-evidence/command.ts` 拥有 current test entity discovery、Case query 和 closure check。它把同一 caller `AbortSignal` 传给 ast-grep static scan 与 Bun registration report process，要求完整测试清单的每个 runner entity 都以 skipped testcase 报告；测试正文由 Gate process 子 Checks 或最窄目标命令执行。测试分层和 Case maintenance 继续由[测试策略](../testing/strategy.md)与[测试证据维护](../testing/case-maintenance.md)owner 定义。

## Verification

修改脚本 owner 时，先运行其最窄 test 或 command，再按影响范围运行：

```bash
bun run typecheck -- scripts
bun run lint -- scripts
bun run validate -- docs
bun run test-evidence -- check --root .
```

涉及 Gate 或多个 owner 时运行默认 required；涉及 package artifact、candidate 或外部 consumer 时运行 complete Gate：

```bash
bun run check
bun run check -- --all
```

报告实际运行的检查及未运行项。
