# 脚本工具

本文拥有仓库自动化的目录 owner、根命令、private consumer 与依赖方向。产品运行时由
`src/**` 拥有，且不得 import `scripts/**`。runtime/private Project consumer 只能从 exact installed candidate 的
public entry 消费 Product；package/docs build、projection 与 audit 可以只读其 owner 明确 allowlisted 的
source/contract material，但不以它建立内部 runtime consumer 或调用 Package Run。

## Source owners and dependency direction

`scripts/**` 的当前 owner 如下：

| Owner | 责任与入口 |
| --- | --- |
| `scripts/development/**` | `format.ts`、`lint.ts`、`typecheck.ts` 与 `test.ts` 选择开发期 scope；`command.ts` 提供它们的进程边界。 |
| `scripts/environment/manage.ts` | `env:setup` 和 `env:check` 的 mise、依赖与 CodeGraph 环境管理。 |
| `scripts/foundation/**` | repository automation 共享的 filesystem、path、process、JSON、CSV、NDJSON、Git、argument、error 与 type-guard helpers。 |
| `scripts/validation/**` | workspace validation、docs task contract、Markdown/JSON/schema/path validation 的 owner。 |
| `scripts/docs/**` | `validate.ts` 编排文档校验；`package-api/**` 生成或检查 package README/JSDoc projection；`machine-artifacts/**` 维护 machine schema/example 资料。 |
| `scripts/package/artifact/**` | package artifact 的 build、manifest、pack、fingerprint 与 audit。 |
| `scripts/package/candidate/**` | local candidate 的 prepare、receipt 与 isolated installation；它消费 artifact owner，不反向启动 consumer。 |
| `scripts/project/**` | 唯一 private candidate consumer root；`quality/**` 与 `gate/**` 是同级、绑定 Project Definition 的 repository Run。 |
| `scripts/decision-records/command.ts` | 将仓库根绑定到已安装 decision-records capability 的 repository adapter。 |
| `scripts/test-evidence/command.ts` | 当前 test entity discovery、Case 查询与闭合检查的 command/API owner。 |

`src/index.ts` 是唯一 public 产品入口及 package artifact build/declaration entry。`scripts/project/package.json`
从 exact installed `vibe-check` candidate 消费该入口；`scripts/package/**` 只负责准备该 candidate，不能
import 或启动 project consumer。artifact/package-API documentation build 与 audit 可以读取各自显式 allowlisted 的
Product source 或 contract material，但不成为 Package Run consumer。产品 runtime、Definition 和 Check 不得依赖
scripts helper、环境状态或 process adapter。

## Root commands

根 `package.json` 只公开下列工作流；内部 `scripts/**` 文件不是第二套根入口。

| Workflow | 调用 | Owner |
| --- | --- | --- |
| environment | `bun run env:setup`；`bun run env:check` | `scripts/environment/manage.ts` |
| development | `bun run format [-- check]`；`bun run lint [-- product|scripts]`；`bun run typecheck [-- product|scripts]`；`bun run test` | `scripts/development/**` |
| docs/workspace validation | `bun run validate`；`bun run validate -- docs [json|schema|examples|links|package-api-documentation]` | `scripts/validation/workspace.ts` and `scripts/docs/validate.ts` |
| governance | `bun run decisions -- <command>`；`bun run change-plan -- <command>`；`bun run investigations -- check`；`bun run test-evidence -- <command>` | their named owners |
| quality dogfood | `bun run quality` | `scripts/project/quality/run.ts` |
| Project Gate | `bun run verify:vibe-check-workspace`；`bun run verify:vibe-check-workspace:required`；`bun run verify:vibe-check-workspace:full` | `scripts/project/gate/run.ts` |

无 suffix 的 Project Gate 与 `:required` 都选择 required profile；`:full` 显式选择 full。scope、action
和子命令作为同一 workflow 的参数传入，不为内部 owner 建立同义 root alias。

## Development tooling

根目录 `.oxlintrc.json` 是可机械执行的 TypeScript lint rule set 的唯一 owner，`.oxfmtrc.json` 拥有
format 选项，`scripts/development/format-targets.ts` 拥有显式 format target。`lint.ts` 与
`typecheck.ts` 只拥有 `product` / `scripts` scope 到路径或 tsconfig 的映射；它们使用 checkout 锁定的
工具，两个 lint scope 都以 `oxlint --deny-warnings` 运行。`format` 写入这些显式 target，`format -- check`
只检查它们。

修改 lint rule、format option 或目标范围时，修改相应配置或 development owner；不要在 package、子目录或
文档复制同义规则表或 target list。实现原则仍以[编码规范](coding-style.md)为准。

## Package artifact 与 candidate

`scripts/package/artifact/**` 从唯一 Product 入口 `src/index.ts` 构造 local candidate。artifact fingerprint
同时绑定 Bun、锁定的 TypeScript emit/parser toolchain、Product source、package scripts 与文档输入。构建过程逐模块生成
`dist/esm/**.mjs`，同时生成 `types/**.d.ts`、对应的源码映射，并复制 package 所属的 `src/**.ts` Product
源码。package 根部的 `index.mjs` 只转发 `dist/esm/index.mjs`；`package.json` 的 `exports` 只开放根路径
`"."`，因此物理存在的 `dist`、`types` 与 `src` 目录不是 consumer subpath API。

逐模块产物保留第三方 package imports；candidate manifest 必须声明完整且版本精确的直接运行时依赖。
artifact audit 在 pack 前验证根入口、公开运行时导出、可解析的相对 `.mjs` 引用、源码映射与 package
源码的一致性、声明与 README 投影以及允许的文件清单；pack 后继续验证 tar inventory、manifest 与摘要。
`scripts/package/candidate/**` 只安装并核对这一个精确 tarball，再把解析到的根入口交给 private consumer；
它不从 repository source 或祖先依赖补偿不完整的 candidate。

## Quality dogfood

`quality` 是人或 AI 调用 repository Project Run 的唯一 dogfood root entry，不是产品第二入口。其调用方向为：

1. `scripts/project/quality/run.ts` 在 mise 锁定的 scanner toolchain 中启动 `locked-run.ts`，并保留 child
   stdout、stderr 与 exit status。
2. `locked-run.ts` 先通过 `scripts/package/candidate/prepare.ts` 准备 exact local candidate，再加载 `scan.ts`。
3. `scan.ts` 调用 `project-run.ts` 的 bound Run，并将 completed、configuration 与其它 result branches 分别映射
   为既有 process status `0`、`3`、`2`。
4. `definition.ts` 是 repository quality policy 的唯一 owner；它从 private consumer 已安装的 `vibe-check`
   导入公开 Check values 和 `defineConfig`。`project-run.ts` 将该 Definition 与 repository root 绑定，调用
   package `run`。

quality wrapper 不解析调用方配置、不重新声明 Project Definition，也不注入 scanner override。scanner command
与 availability command 属于 built-in Check options；详见 [Scanner dependencies](scanner-dependencies.md)。

## Project Gate

`scripts/project/gate/run.ts` 是 Project Gate 的 process adapter。它先准备 candidate，并确认 private consumer
解析到的 package entry 与准备结果相同；然后创建 invocation log directory，调用 `project-run.ts` 的 bound
Gate Run。`definition.ts`、`entries.ts`、`eligibility.ts` 与 `controls.ts` 拥有 Gate membership、profile/tag
selection 和 aggregation configuration；`checks/native.ts` 与 `checks/process.ts` 分别拥有 native 与 process
Checks。

Gate 从 Run 的 explicit aggregate 读取选择后的结论；它不遍历 Check snapshot 重新归约。Gate 不改变 quality 的
locked scanner boundary，也不替代 development、docs、decision-records 或 test-evidence 各自的 command owner。

`--profile required|full` 和可重复的 `--disable-tag <tag>` 是 Gate adapter 的完整参数 grammar；无 profile
默认 required，disabled tag 仅用于直接本地 partial invocation，正式 root commands 不传它。adapter 在 candidate
准备、private consumer import 和 exact entry identity 全部成功后才创建 `.log/project-gate/<unique>/` 并运行 bound
Run。native docs/Decision/Test Evidence Checks 不创建 process transcript；外部 command Check 将 command、stdout、
stderr、exit、signal 和安全 error summary 写入自己的 transcript。其 terminal message 只能包含 exit code、signal
和 transcript basename，不能复制 child output、完整路径、command、arguments、credential URL、digest 或 transcript
内容。completed Run 的 warning、progress failure 或非-`passed` aggregate 都映射 `1`；参数、candidate、import、
identity、log、execution 或 malformed-result failure 映射 `2`。

## Documentation, validation, and package material

`scripts/docs/package-api/command.ts` 的 `--write`/`--check` 适配 package API projection。可编辑输入是
README template、allowlisted TypeScript examples、projection registry 和 source JSDoc prose；root `README.md`
与 registry target 中生成的连续 `@example` tail 是 generated outputs。`scripts/docs/validate.ts` 在
`package-api-documentation` task 中调用 check mode。

current machine schemas 位于 `docs/schemas/`，artifact examples 位于 `docs/examples/artifacts/**`；
`scripts/docs/machine-artifacts/**` 维护它们与 runtime material 的对应关系。

`bun run validate` 先运行全部文档 task，再执行 repository layout characterization，最后运行
`git diff --check`；`bun run validate -- docs` 只运行文档 task，不执行 layout 或 diff 检查。

docs task 的唯一名称是 `json`、`schema`、`examples`、`links` 和 `package-api-documentation`。schema/examples
task 既检查 current published material 的 generation drift，也用 checked-in schema 和 raw example bytes 独立验证
完整 v4 two-file set；它不 import Product validator 作为 acceptance implementation。historical schema/example
materials 只走显式 historical validation path，不进入 current traversal 或 runtime input。

## Environment and shared foundation

### Shared foundation

`scripts/foundation/**` 是普通 tracked repository source，不是 package、workspace、独立 manifest、独立
TypeScript config 或独立 Gate profile。它由 `bun run typecheck -- scripts`、`bun run lint -- scripts`、
`bun run format -- check` 和 Test Evidence current scripts surface 覆盖。它与 `src/foundation/**` 是不同
owner：前者服务 repository automation，后者服务 Product runtime；Product 不得 import 前者。Foundation helper
不定义 Product source-access boundary；适用的 Project consumer 与 package/docs 例外见
[Source owners and dependency direction](#source-owners-and-dependency-direction)。

Foundation helper 必须让开发脚本边界可复现和可诊断：文件遍历返回稳定 slash-normalized relative paths，
JSON/NDJSON/filesystem/process failure 保留目标或失败事实，不静默跳过；已启动 child 的 cancellation 保留 error、
signal 和 `status: null`，不能视为成功。它不替代 Product scan-scope 或 scanner contract。

### Environment setup and destructive boundary

首次检出、工具 pin 变更或环境缺失时运行 `bun run env:setup`。它会 trust 当前 `mise.toml`、按锁定结果安装
工具和 Node dependencies，并初始化/同步当前 checkout 的 CodeGraph；因此会写入 user-level mise trust/tool state、
checkout `node_modules` 和 `.codegraph`。执行前审阅 `mise.toml`。`bun run env:check` 只检查已安装 tools、jscpd
和 CodeGraph 状态，不执行 trust、安装或索引同步；失败后再运行 setup。两个命令以
`MISE_GLOBAL_CONFIG_FILE` 隔离用户全局 mise 配置。

`.codex/environments/environment.toml` 在 setup 后运行默认 Project Gate，不清理 worktree。
`.codex/environments/environment-2.toml` 的 `clear` 环境会在同一 setup 前对 `CODEX_WORKTREE_PATH` 执行
`git restore --staged --worktree -- .` 与 `git clean -fd -- .`；这会不可恢复地删除 tracked 改动和未跟踪、
非 ignored 文件。只有明确授权丢弃目标 worktree 内容时才能选择它。

`quality` 是唯一需要 mise 锁定 scanner toolchain 的日常 workflow；它不会从 ambient `PATH` 取得同名 scanner，
也不接受 scanner override。Product Check 的 scanner command、availability command 和 unavailable behavior 仍由
[Scanner dependencies](scanner-dependencies.md) owner 定义。

## Governance and Test Evidence adapters

`scripts/decision-records/command.ts` 把 repository root 绑定到已安装 capability，并转发其 CLI 或暴露同一
typed operation；`change-plan` 与 `investigations` root commands 直接调用各自 skill 的 CLI。它们不复制 parser、
metadata、index 或 lifecycle 语义。写入与归档仍由相应 subcommand/skill 和当前任务授权决定。

`scripts/test-evidence/command.ts` 拥有 current test entity discovery、Case query 和 closure check。它把同一 caller
`AbortSignal` 传给 ast-grep static scan 与 Bun runtime report process；测试分层和 Case maintenance 继续由
[测试策略](testing.md)与[测试证据维护](testing/case-maintenance.md) owner 定义。

## Verification

修改脚本 owner 时，先运行其最窄 test 或 command，再按影响范围运行：

```bash
bun run typecheck -- scripts
bun run lint -- scripts
bun run validate -- docs
bun run test-evidence -- check --root .
```

涉及 package、quality、Gate 或多个 owner 时运行：

```bash
bun run verify:vibe-check-workspace:required
```

报告实际运行的检查及未运行项。
