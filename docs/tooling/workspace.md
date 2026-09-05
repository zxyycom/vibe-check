# 工作区工具

本文拥有仓库自动化的目录 owner、根命令、private consumer 与依赖方向。产品运行时由 `src/**` 拥有，且不得 import `scripts/**`。runtime/private Project consumer 只能从 exact installed candidate 的 public entry 消费 Product；package/docs build、projection 与 audit 可以只读其 owner 明确 allowlisted 的 source/contract material，但不以它建立内部 runtime consumer 或调用 Package Run。

本文还拥有开发环境与共享 repository capability 的边界，以及 governance / test-evidence adapters。Project Gate、package artifact lifecycle 和 documentation/package material 分别由对应 tooling owner 维护。

## Source owners and dependency direction

`scripts/**` 按实际 workflow 与生命周期组织；下表是当前 owner、入口和允许依赖方向的权威映射。
目录层级只表达父子 owner，具体文件继续由所在目录和文件名共同表达职责。

| Owner                                                                                                                | 责任与入口                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/development/**`                                                                                             | `format.ts`、`lint.ts`、`typecheck.ts` 与 `test.ts` 选择开发期 scope；`scripts/process-execution/command.ts` 提供其进程命令边界。                                                                                                                                                                                                                                                                                                                                                                                       |
| `scripts/environment/manage.ts`                                                                                      | `env:setup` 和 `env:check` 的 mise、依赖与 CodeGraph 环境管理，以及 `env:setup` 返回前完成的 local package candidate 自举。                                                                                                                                                                                                                                                                                                                                                                                             |
| `scripts/process-execution/**`                                                                                       | repository automation 的 process facade、contract、runner、failure、plain-text environment 与根命令 adapter；跨 owner 只消费 `execution.ts`。                                                                                                                                                                                                                                                                                                                                                                           |
| `scripts/repository-files/**`                                                                                        | repository 文件遍历、文本读写和路径 containment；不拥有 JSON validation 或 generic serialization。                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `scripts/canonical-json.ts`、`scripts/diagnostic-safety.ts`、`scripts/error-message.ts` 与 `scripts/value-guards.ts` | 跨 scripts owner 复用的根级安全 capability：canonical JSON machine facts、owner-local diagnostic ID/单行 presentation 的安全不变量，以及明确的诊断字符串和值形状小边界。它们不拥有字段语义、排序或 Product contract。                                                                                                                                                                                                                                                                                                   |
| `scripts/validation/**`                                                                                              | workspace root、repository layout 与 `documentation/**` 的 docs acceptance workflow、task contract、links、JSON/schema/machine-artifact validation。它调用 `scripts/docs/**` 的 check-only provider，不把 workflow 放回 provider。                                                                                                                                                                                                                                                                                      |
| `scripts/docs/**`                                                                                                    | machine artifact schema/example 与 package Markdown fenced example、JSDoc example、Check guide 的投影或收集 provider；不拥有 package 文档正文或 docs validation orchestration。                                                                                                                                                                                                                                                                                                                                         |
| `scripts/package/**`                                                                                                 | parent owner 持有 public contract、file inventory、Bun pack/digest 与 artifact/candidate/release 共用 package-material audit；`artifact/**` 构建和审计 tarball，`candidate/**` 准备、安装并核对 fingerprint local receipt，`release/**` 验证 clean source、formal version/tag、portable receipt 与 same-artifact Gate handoff，`candidate/external-consumer/**` 拥有隔离 consumer material、typed provider 与 types/documentation/runtime acceptance。candidate fingerprint 有意覆盖整个 package lifecycle 以保守失效。 |
| `scripts/project/**`                                                                                                 | 唯一 private candidate consumer root；其 Gate child owner 见[Project Gate and Test Evidence child owners](#project-gate-and-test-evidence-child-owners)。                                                                                                                                                                                                                                                                                                                                                               |
| `scripts/decision-records/command.ts`                                                                                | 将仓库根绑定到已安装 decision-records capability 的 repository adapter。                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `scripts/test-evidence/command.ts`                                                                                   | current test entity discovery、Case 查询与闭合检查的 command/API owner；其 child owner 见[Project Gate and Test Evidence child owners](#project-gate-and-test-evidence-child-owners)。                                                                                                                                                                                                                                                                                                                                  |
| `scripts/maintenance/**`                                                                                             | 仅承接由对应 root maintenance command 显式选择的仓库维护查询；每个脚本固定自己的外部 target、transport 与 advisory result，不进入 Product 或默认 Gate。                                                                                                                                                                                                                                                                                                                                                                 |

`src/index.ts` 是唯一 public 产品入口及 package artifact build/declaration entry。`scripts/project/package.json`
从 exact installed `@zxyycom/vibe-check` candidate 消费该入口；`scripts/package/**` 只负责准备该 candidate，不能
import 或启动 project consumer。artifact/package-API documentation build 与 audit 可以读取各自显式 allowlisted 的
Product source 或 contract material，但不成为 Package Run consumer。产品 runtime、Definition 和 Check 不得依赖
scripts helper、环境状态或 process adapter。

### Project Gate and Test Evidence child owners

| 路径                                             | 职责                                                                                                                                                                                                                                         |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/project/gate/definition.ts`             | Gate 组合配置及 invocation runtime material 的类型。                                                                                                                                                                                         |
| `scripts/project/gate/run.ts`                    | 唯一 Gate process entry。                                                                                                                                                                                                                    |
| `scripts/project/gate/checks/entry-factories.ts` | 将已解析的 process invocation 或 native Check 封装为带 selection metadata 的 Gate entry。process entry 只能是 plain、typed data dependency 或 structured failure projection 之一；TypeScript union 与 runtime guard 都拒绝混用两个 adapter。 |
| 其它 `scripts/project/gate/checks/**`            | 各领域 Check 配置与 adapter。                                                                                                                                                                                                                |
| `scripts/project/gate/runtime/**`                | bound runtime mechanics。                                                                                                                                                                                                                    |
| `scripts/test-evidence/profile.ts`               | runner profile schema/value validation。                                                                                                                                                                                                     |
| `scripts/test-evidence/discovery/**`             | 单向消费 profile，并拥有 files/process registration。                                                                                                                                                                                        |
| `scripts/test-evidence/catalog/test-support.ts`  | catalog 的 node:test fixture setup，不构成独立行为 owner。                                                                                                                                                                                   |

## Root commands

根 `package.json` 只公开下列工作流；内部 `scripts/**` 文件不是第二套根入口。

| Workflow                  | 调用                                                                                                                                                    | Owner                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| environment               | `bun run env:setup`；`bun run env:check`                                                                                                                | `scripts/environment/manage.ts`                                                     |
| development               | `bun run format [-- check]`；`bun run lint [-- product \| scripts]`；`bun run typecheck [-- product \| scripts]`；`bun run test`                        | `scripts/development/**`                                                            |
| package candidate         | `bun run package:status`；`bun run package:build`；`bun run package:verify`；显式物理集成 `bun run package:candidate:integration`                       | `scripts/package/command.ts` 与 `scripts/package/candidate/integration-command.ts`  |
| formal package release    | `bun run package:release:prepare -- --version <0.0.PATCH> --tag <tag>`；`bun run package:release:verify -- --receipt <path>`                            | `scripts/package/release/command.ts`                                                |
| package API projections   | `bun run docs:api`；显式写入 `bun run docs:api:write`                                                                                                   | `scripts/docs/package-api/command.ts`                                               |
| docs/workspace validation | `bun run validate`；`bun run validate -- docs [json \| schema \| examples \| links \| package-api-documentation]`                                       | `scripts/validation/workspace.ts` 与 `scripts/validation/documentation/workflow.ts` |
| governance                | `bun run decisions -- <command>`；`bun run change-plan -- <command>`；`bun run investigations`；`bun run test-evidence -- <command>`                    | their named owners                                                                  |
| maintenance advisory      | `bun run maintenance:lizard-upstream`                                                                                                                   | `scripts/maintenance/lizard-upstream-advisory.ts`                                   |
| Project Gate              | `bun run check [-- --typecheck \| --lint \| --test \| --docs \| --quality \| --all]`；formal receipt：`bun run check -- --all --release-receipt <path>` | `scripts/project/gate/run.ts`                                                       |

`bun run investigations` 默认执行完整检查。列出或同步 Investigation 索引时使用 `bun run investigations -- list` 或 `bun run investigations -- sync-index`；命令从当前仓库根目录推定 root。只有需要覆盖该默认值时才把 `--root <path>` 放在子命令之后，例如 `bun run investigations -- list --root <path>`。

来源映射维护使用 `bun run source-mapping [-- check | sync]`，由 `scripts/package/legal-materials/source-mapping.ts`
拥有；默认只读检查，写入边界见[来源映射维护](package-lifecycle.md#translated-source-mapping-maintenance)。

`bun run check` 选择日常 required 集；focused preset 可组合并替换默认选择，`--all` 独占其它 preset。
`.codex/environments/*.toml` 也直接调用该正式名称；旧 `verify:vibe-check-workspace`、`:required` 与
`:full` 均不再存在。scope、action 和子命令作为同一 workflow 的参数传入，不为内部 owner 建立同义 root alias。

## Development tooling

根目录 `.oxlintrc.json` 是可机械执行的 TypeScript lint rule set 的唯一 owner，`.oxfmtrc.json` 拥有
format 选项，`scripts/development/format-targets.ts` 拥有显式 format target。`lint.ts` 与
`typecheck.ts` 只拥有 `product` / `scripts` scope 到路径或 tsconfig 的映射；它们使用 checkout 锁定的
工具，两个 lint scope 都以 `oxlint --deny-warnings` 运行。`format` 写入这些显式 target，`format -- check`
只检查它们。

修改 lint rule、format option 或目标范围时，修改相应配置或 development owner；不要在 package、子目录或
文档复制同义规则表或 target list。development lint、format 与 typecheck 对适用 `src` 保持完整普通输入，均不为
source-aligned function-metrics port 增加 translated-only 排除。实现原则仍以[编码规范](../development/coding-style.md)为准。

### Lizard / TypeScript performance evidence

`scripts/development/lizard-performance/command.ts` 是唯一显式选择的开发期比较入口。它**只形成 evidence，不授权或实施优化**；尤其不得据此修改 source-aligned analyzer core/readers/shared/protocol。结果必须按 layer、workload 与 temperature 读取，不能压缩成一个“Python 或 TypeScript 更快”的结论：

| Layer                               | 回答的问题                                            | 不可替代的边界                                                                                         |
| ----------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A — historical Product end-to-end   | 迁移前后完整 Product invocation                       | 包含 1.23→1.24、I/O、subprocess/Worker 与 Product 边界变化                                             |
| B — fixed Lizard 1.24 analyzer-only | 同一已解码 source 上的 Python API / current port cost | 不含 Product read/decode、Worker、CLI/CSV 或 settlement；tiny startup 与 representative batch 分开解释 |
| C — current Product decomposition   | current path 的诊断定位                               | stage 时间可重叠；不提供 historical 或 analyzer-only 替代值                                            |

```bash
bun scripts/development/lizard-performance/command.ts --mode smoke --layer B \
  --lizard124-source /absolute/lizard-1.24-upstream-checkout \
  --output /tmp/vibe-check-lizard-smoke
bun scripts/development/lizard-performance/command.ts --mode full --layer A --temperature warmed-operation \
  --historical-worktree /absolute/historical-worktree --lizard123 /absolute/lizard-1.23 \
  --output artifacts/development-benchmarks/<run-id>
```

该入口只写调用者指定的 evidence directory，生成 machine-readable `evidence.json`（raw samples、环境、scope 与统计）和定位用的 `summary.md`。它不在 `package.json` 建立默认命令，不进入普通 `bun test`、package payload 或 Project Gate。正式结论、跨 scope 禁止外推和优化授权边界由对应 Investigation Report 拥有；不得以 `summary.md` 替代。

B 要求显式 fixed upstream `308b1c3…` checkout，在 task-owned ephemeral venv 中 provision 固定 Python/Pygments；provision 时间不计入样本，运行时在 B layer 后精确清理，evidence 仅保留最小 formation provenance。B 先 canonicalize Product 消费的 file/name/location/NLOC/CCN/parameter fields，再对每一个计数样本复核 preflight digest。它同时报告 160-byte TS/JS tiny cold-start 和 27 reader-family representative fixtures 的 normal+edge（不含 malformed）各复制 64 次的 representative batch；full 模式按 deterministic ABBA 顺序保留 15 blocks / side 30 samples、IQR 标记与 paired bootstrap CI。A、B、C 互不替代。

**Temperature 与资源语义。** cold statistics 选择 supervisor whole-fresh-target wall。`warmed-operation` 的两侧各先做一次未计入的同进程分析，statistics 只选择 target 内部第二次 operation wall；它不是 long-lived warm session。Linux collector 的 CPU 是 `wait4` target 加其已 reaped descendants；RSS 只是在这些进程中的 single-process maximum（KiB→bytes），不是 process-tree aggregate。非 Linux fail-closed。因而 CPU/RSS 只作为 whole-target session diagnostics，资源优劣为 `not-comparable`，不能冒充 operation resource。C 的 total/read/decode/direct port-façade harness diagnostics 有重叠；Worker roundtrip 只用同一次 Worker 的内部 adapter+port duration 作机械差分，adapter mapping 单独不可隔离时明确为 `null`。

Python/Lizard、subprocess、CSV、fixture worktree 和 benchmark-only test-support harness 均只存在于该 opt-in developer workflow，不能成为 Product runtime、fallback 或 public façade。

### Local post-commit auto-push

`.githooks/post-commit` 是仓库拥有的 Git `post-commit` 入口。Git 不会在 clone 后自动启用版本化 hook；需要该行为的
checkout 必须显式运行 `git config --local core.hooksPath .githooks`，只修改当前 checkout 的本地 Git 配置。使用
`git config --local --unset core.hooksPath` 可以停用它。

在本仓库中，`core.hooksPath=.githooks` 表示当前 checkout 已显式选择该 hook 及其下述受限 push 行为。该配置存在时，
任务对普通 `git commit` 的授权同时覆盖 hook 按本节契约发起的 push，无需另行确认；执行者不得仅为避免 auto-push
而临时覆盖 `core.hooksPath` 或以其他方式绕过 hook。只有任务明确要求仅创建本地提交，或 hook 故障后另行取得绕过授权时，
才能在该次提交中绕过 hook。

启用后，hook 只在当前分支精确为 `main` 时处理提交，并且：

- 每 3,600 秒最多执行一次真实 push 尝试；attempt time 保存在 Git-local state 中，失败的尝试同样占用该窗口，避免在
  网络、鉴权或远端状态持续失败时由每次 commit 重复触发。
- 只向 `origin` 推送显式 refspec `refs/heads/main:refs/heads/main`，同时关闭 force 与 follow-tags；远端包含本地没有的
  提交时，普通 non-fast-forward 保护会拒绝 push。
- 远端、时间或 state 不可用以及 push 被拒绝时只输出诊断并返回成功，不改变 commit 结果，也不自动 fetch、pull、rebase、
  merge、创建或推送 tag。

每次调用都会先输出 `commit`、`branch` 和 `target`，随后明确输出 `action`。跳过时还会输出 `reason`；真实 push 完成后会输出
`result`，失败时另输出不会执行的恢复动作和 retry 边界。因此从 commit transcript 可以区分“分支不适用”“cooldown 内未发起
请求”“正在执行安全 push”“成功”和“提交仍留在本地”。这些内容写到 hook 的 stdout/stderr；图形化 Git client 是否展示
hook transcript 仍由该 client 决定。

该 hook 只同步开发分支，不发布 npm package，也不创建 GitHub Release。npm package 仍是产品发布单元。

## Environment and shared script boundaries

### Process, repository-file, and narrow boundary capabilities

`scripts/process-execution/execution.ts` 是跨 owner 的 process facade；其它 scripts owner 只能从该 facade 消费 process capability，不得 deep import `process-execution/{contract,failure,plain-text-environment,result,runner}.ts`。

`scripts/process-execution/**`、`scripts/repository-files/**`、`scripts/canonical-json.ts`、`scripts/diagnostic-safety.ts`、`scripts/error-message.ts` 与 `scripts/value-guards.ts` 是普通 tracked repository source，不是 package、workspace、独立 manifest、独立
TypeScript config、独立 Project Gate Check 或 selection preset。它们由 `bun run typecheck -- scripts`、`bun run lint -- scripts`、
`bun run format -- check` 和 Test Evidence current scripts surface 覆盖。它们与 `src/data-boundary/**` 与 `src/package-checks/host-environment/**` 是不同
owner：前者服务 repository automation，后者服务 Product runtime；Product 不得 import 前者。这些 script boundaries
不定义 Product source-access boundary；适用的 Project consumer 与 package/docs 例外见
[Source owners and dependency direction](#source-owners-and-dependency-direction)。

进程 facade、repository file/path capability 与四个根级小 capability 让开发脚本边界可复现、可诊断且可安全交接：文件遍历返回稳定 slash-normalized relative paths，文本与 process failure 保留目标或失败事实，不静默跳过；已启动 child 的 cancellation 保留 error、signal 和 `status: null`，不能视为成功。`scripts/canonical-json.ts` 将 untrusted scripts data materialize 为 detached、immutable、有限 JSON machine fact，拒绝 getter、hook、cycle 与非有限 number；`scripts/diagnostic-safety.ts` 只验证 owner-local Record ID 和单行 presentation，拒绝控制字符。二者由 scripts root 共同拥有，是因为多个 scripts owner 都需同一安全不变量；它们不定义 Product data boundary、public schema、诊断字段、排序或 presentation 语义。JSON document validation、serialization 与 Product scan-scope/scanner contract 仍由各自 owner 承担。

### Environment setup and destructive boundary

首次检出、工具 pin 变更或环境缺失时运行 `bun run env:setup`。成功返回表示 checkout 已按以下顺序完成标准自举：

1. trust 当前 `mise.toml`，按锁定结果安装工具和 Node dependencies；
2. 初始化并同步当前 checkout 的 CodeGraph；
3. 通过现有根命令 `bun run package:build` 准备 exact local package candidate。

标准开发与验证命令以 `env:setup` 成功返回为前置条件；项目不承诺未自举的 cold checkout 可以直接运行
Project Gate。后续独立启动的 Gate 从已自举的 private consumer 解析 candidate，并由自己的 preparation
assessment 重验 exact installation 后复用；`package:build` 不建立第二套 package acceptance。

首次自举会写入 user-level mise trust/tool state、checkout `node_modules`、`.codegraph`、candidate build/cache
evidence 和 `scripts/project/node_modules`；后续执行按各 owner 的 reuse 规则更新或复用这些状态。该 bootstrap
入口只依赖 Node/Bun 内置能力与根级错误映射，不能在依赖安装前加载 `process-execution` 的第三方 runner；
`package:build` 只在 frozen dependency install 和 CodeGraph setup 成功后运行，失败会使 `env:setup` 失败。

执行前审阅 `mise.toml`。`bun run env:check` 只检查已安装 tools、jscpd 和 CodeGraph 状态，不检查或准备 candidate，
也不执行 trust、安装或索引同步；检查失败后再运行 setup。两个命令以
`MISE_GLOBAL_CONFIG_FILE` 隔离用户全局 mise 配置。

`.codex/environments/environment.toml` 在 setup 后运行默认 Project Gate，不清理 worktree。
`.codex/environments/environment-2.toml` 的 `clear` 环境会在同一 setup 前对 `CODEX_WORKTREE_PATH` 执行
`git restore --staged --worktree -- .` 与 `git clean -fd -- .`；这会不可恢复地删除 tracked 改动和未跟踪、
非 ignored 文件。只有明确授权丢弃目标 worktree 内容时才能选择它。

Product Check 的 scanner command、availability command 和 unavailable behavior 仍由
[Check-owned scanner dependencies](../development/scanner-dependencies.md) 所列的各 Check owner 定义；Gate 不创建第二套 scanner workflow。

## Governance and Test Evidence adapters

`scripts/decision-records/command.ts` 把 repository root 绑定到已安装 capability，并转发其 CLI 或暴露同一
typed operation；`change-plan` 与 `investigations` root commands 直接调用各自 skill 的 CLI。它们不复制 parser、
metadata、index 或 lifecycle 语义。写入与归档仍由相应 subcommand/skill 和当前任务授权决定。

`scripts/test-evidence/command.ts` 拥有 current test entity discovery、Case query 和 closure check。它把同一 caller
`AbortSignal` 传给 ast-grep static scan 与 Bun registration report process，要求完整测试清单的每个 runner entity
都以 skipped testcase 报告；测试正文由 Gate process 子 Checks 或最窄目标命令执行。测试分层和 Case maintenance 继续由
[测试策略](../testing/strategy.md)与[测试证据维护](../testing/case-maintenance.md) owner 定义。

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
