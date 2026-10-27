# 工作区工具

维护仓库自动化、根命令或共享 scripts capability 时，从本篇定位目录 owner、调用入口和允许的依赖方向；处理开发环境、governance 或 test-evidence adapter 时，也在对应小节读取边界。

本文拥有这些工作区工具边界。产品运行时由 `src/**` 拥有，且不得 import `scripts/**`。runtime/private Project consumer 只能从 exact installed candidate 的 public entry 消费 Product。package/docs build、projection 与 audit 可以只读其 owner 明确 allowlisted 的 source/contract material，但不以它建立内部 runtime consumer 或调用 Package Run。

Project Gate、package artifact lifecycle 和 documentation/package material 分别由对应 tooling owner 维护。

## Source owners and dependency direction

`scripts/**` 按实际 workflow 与生命周期组织。目录层级只表达父子 owner，具体文件继续由所在目录和文件名共同表达职责。

Product 与仓库工作流的责任划分见[系统边界](../development/architecture.md#系统边界)；
通用层级、命名与拆分规则见[编码规范](../development/coding-style.md#8-目录文件与模块命名)。

下列映射是当前 owner、入口和允许依赖方向的权威来源。

### 工作流责任方

| Owner | 责任与入口 |
| --- | --- |
| `scripts/development/**` | `format.ts`、`lint.ts`、`typecheck.ts` 与 `test.ts` 选择开发期 scope；`scripts/process-execution/command.ts` 提供其进程命令边界。 |
| `scripts/environment/manage.ts` | `env:setup` 和 `env:check` 的 mise、依赖与 CodeGraph 环境管理，以及 `env:setup` 返回前完成的 local package candidate 自举。 |
| `scripts/validation/**` | workspace root、repository layout、共同扫描政策 `repository-scan-policy.ts` 与 `repository-material/**` 的 material acceptance workflow、task contract、links、JSON/schema/machine-artifact validation。它调用 `scripts/docs/**` 的 check-only provider，不把 workflow 放回 provider。 |
| `scripts/docs/**` | machine artifact schema/example、package Markdown collector `package-markdown.ts`、fenced/JSDoc example 与 Check guide 的投影或收集 provider；不拥有 package 文档正文或 material validation orchestration。 |
| `scripts/package/**` | parent owner 持有 public contract、file inventory、Bun pack/digest 与 artifact/candidate/release 共用 package-material audit；子模块职责与 candidate fingerprint 边界见[package 子模块职责](#package-子模块职责)。 |
| `scripts/project/**` | 唯一 private candidate consumer root；其 Gate child owner 见[Project Gate and Test Evidence child owners](#project-gate-and-test-evidence-child-owners)。 |
| `scripts/maintenance/**` | 仅承接由对应 root maintenance command 显式选择的仓库维护查询；每个脚本固定自己的外部 target、transport 与 advisory result，不进入 Product 或默认 Gate。 |

#### package-tools 依赖边界

Core 与 package tools 的受检范围、依赖方向和 fail-closed 规则见[工具链与依赖边界](workspace-dependencies.md#package-tools-依赖边界)；新增工具成员或改变 Core 分类后重跑 layout validation。

### Repository validation 共享扫描政策

`scripts/validation/repository-scan-policy.ts` 的 `REPOSITORY_SCAN_IGNORED_DIRECTORIES` 由 repository layout 与
material walkers 共同消费，集中定义仓库扫描时忽略的目录集合。
`repository-layout.ts` 自动验证真实的架构依赖边界：Product/Project/package 依赖方向、process facade、
function-metrics 私有 analyzer 和 package-tools/Core 边界。路径用于识别这些责任范围，不形成整个目录树的封闭清单。
规则矩阵优先以源码文本和 AST 分析在内存中验证；文件系统入口保留仓库正向与少量接线测试。

`Manual CR:` 目录层级、模块名、入口与 barrel 的职责按
[编码规范](../development/coding-style.md#8-目录文件与模块命名)及当前 owner 审查；新增或移动模块时核对职责、调用方和依赖方向。
目录清单、basename 或构建源码的特定写法不替代语义审查；编译结果、包内 Worker 材料和真实安装运行由
[产物验收](package-artifact.md#pack-前后验收)证明。
具体 material task 及其显式输入仍由[仓库材料验证](repository-material-validation.md)拥有；此扫描政策不改变 Product 的 file selection。

### package 子模块职责

- `artifact/**` 构建和审计 tarball。
- `candidate/**` 准备、安装并核对 fingerprint local receipt。
- `release/**` 验证 clean source、formal version/tag、portable receipt 与 same-artifact Gate handoff。
- `candidate/external-consumer/**` 拥有隔离 consumer material、typed provider 与 types/documentation/runtime acceptance。
- `installation.ts` 拥有共用的严格离线安装与显式联网缓存准备；`cache-command.ts` 只接线显式准备命令，完整策略见[Package lifecycle](package-lifecycle.md#严格离线安装与显式缓存准备)。

candidate fingerprint 覆盖整个 package lifecycle，以保守失效。

#### TypeScript 工具链

编译使用 TS7，compiler API 使用 TS6 compatibility alias；精确版本、解析与补丁维护见[工具链与依赖边界](workspace-dependencies.md#typescript-工具链)。

#### 工作区依赖兼容

补丁、override 与隔离 consumer 的验证边界见[工作区依赖兼容](workspace-dependencies.md#工作区依赖兼容)。

### 共享能力与治理责任方

| Owner | 责任与入口 |
| --- | --- |
| `scripts/process-execution/**` | repository automation 的 process facade、contract、runner、failure、plain-text environment 与根命令 adapter；跨 owner 只消费 `execution.ts`。 |
| `scripts/repository-files/**` | repository 文件遍历、文本读写和路径 containment；不拥有 JSON validation 或 generic serialization。 |
| `scripts/canonical-json.ts`、`scripts/diagnostic-safety.ts`、`scripts/error-message.ts` 与 `scripts/value-guards.ts` | 跨 scripts owner 复用的根级安全 capability：canonical JSON machine facts、owner-local diagnostic ID/单行 presentation 的安全不变量，以及明确的诊断字符串和值形状小边界。它们不拥有字段语义、排序或 Product contract。 |
| `scripts/decision-records/command.ts` | 将仓库根绑定到已安装 decision-records capability 的 repository adapter。 |
| `scripts/investigation-report/command.ts` | 将仓库根和默认全量检查绑定到已安装 investigation-report CLI 的 repository adapter。 |
| `scripts/test-evidence/command.ts` | current test entity discovery、Case 查询与闭合检查的 command/API owner；其 child owner 见[Project Gate and Test Evidence child owners](#project-gate-and-test-evidence-child-owners)。 |

### 公开入口与私有使用方边界

`src/index.ts` 是唯一 public 产品入口及 package artifact build/declaration entry。
两个私有 Worker 的 compiler roots、包内 URL、材料及安装验收由[产物契约](package-artifact.md#构建输入与包接口边界)拥有；
私有 root 不增加 public entry。`scripts/project/package.json` 从 exact installed `@zxyycom/vibe-check` candidate 消费该入口。

`scripts/package/**` 只负责准备该 candidate，不能 import 或启动 project consumer。artifact/package-API documentation build 与 audit 可以读取各自显式 allowlisted 的 Product source 或 contract material，但不成为 Package Run consumer。产品 runtime、Definition 和 Check 不得依赖 scripts helper、环境状态或 process adapter。

### Project Gate and Test Evidence child owners

| 路径 | 职责 |
| --- | --- |
| `scripts/project/gate/definition.ts` | Gate 组合配置及 invocation runtime material 的类型。 |
| `scripts/project/gate/run.ts` | 唯一 Gate process entry。 |
| `scripts/project/gate/checks/entry-factories.ts` | 将 commandCheck 或 native Check 封装为带 selection metadata 的 Gate entry；commandCheck 的 ordinary fields、依赖环境与 completion projection 由各领域 owner 提供，文件不拥有 process lifecycle。 |
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
| package candidate | `bun run package:status`；`bun run package:build`；`bun run package:verify`；显式联网缓存准备 `bun run package:cache:prepare`；显式物理集成 `bun run package:candidate:integration` |
| formal package release | `bun run package:release:prepare -- --version <0.0.PATCH> --tag <tag>`；`bun run package:release:verify -- --receipt <path>` |
| package API projections | `bun run docs:api`；显式写入 `bun run docs:api:write` |
| docs/workspace validation | `bun run validate`；`bun run validate -- materials [json \| schema \| examples \| links \| package-api-documentation]` |
| governance | `bun run decisions -- <command>`；`bun run change-plan -- <command>`；`bun run investigations`；`bun run test-evidence -- <command>` |
| maintenance advisory | `bun run maintenance:lizard-upstream` |
| virtual admission workbench | `bun run admission:simulate <fixture-id-or-scenario.json> [--policy static\|learned] [--seed N] [--replicates N] [--out new-file]`；仅仓库维护者使用，不是 Product CLI 或 Gate selector |
| Project Gate | 默认 `bun run check`；追加范围 `bun run check -- --scope <name> [--scope <name>...]`；整体 `--changed` / `--all`；focused presets 与 formal receipt 见 [Gate 参数](project-gate.md#选择参数)。 |

### Virtual admission workbench

`bun run admission:simulate` 在 exact installed candidate 的公开 `AdmissionGraph` 上运行合成事件，不执行 Check 或 Gate。
命令参数、scenario/fixture、复现、evidence、双 artifact heuristic 对照与真实性边界由
[Admission workbench](admission-workbench.md)完整定义；模拟结果不保证真实 Gate 加速。

### 治理、来源映射与 Project Gate 调用

`bun run investigations` 默认执行完整检查，`bun run investigations -- list` 只读。`bun run investigations -- sync-index` 与 `bun run decisions -- sync-index` 均默认写入并发布完整派生索引；只读预演须显式添加 `--preflight`。同步条件与恢复顺序分别由 [Investigation Report](../../.codex/skills/investigation-report/SKILL.md) 和 [Decision Records](../../.codex/skills/decision-records/SKILL.md) 拥有。

项目 adapter 将默认 root 绑定到当前仓库。只有需要覆盖该默认值时才在子命令之前传入 `--root <path>`，例如 `bun run investigations -- --root <path> list`。

Decision 与 Investigation 的正式身份均为 frontmatter 中 calendar-valid 的 `YYMMDD-<name>`；文件 basename 只是可独立变化的 source locator，身份迁移必须使用所属 skill 的 `rename` 事务。

来源映射维护使用 `bun run source-mapping [-- check | sync]`，由 `scripts/package/legal-materials/source-mapping.ts` 拥有；默认只读检查，写入边界见[来源映射维护](source-mapping.md#检查与同步)。

`bun run check` 默认 fast；`--scope <name>` 在同一次调用中追加指定 routine 范围，可重复取并集，不因其它任务的 diff 打开更多慢项；fast 基线仍按整个 Git snapshot 选取快速项。focused preset 仍组合并替换默认选择，不能与 scope 混用；`--changed`、`--all` 各自独占，作为整体证据入口。调用策略见[交付验证](../navigation.md#交付验证)，精确清单、保守回退与性能阻断由 [Project Gate](project-gate.md#selection-presets-and-scheduling) 拥有。`.codex/environments/*.toml` 也直接调用正式名称。scope、action 和子命令作为同一 workflow 的参数传入，不为内部 owner 建立同义 root alias。

## Development tooling

根目录 `.oxlintrc.json` 是可机械执行的 TypeScript lint rule set 的唯一 owner，`.oxfmtrc.json` 拥有 format 选项，`scripts/development/format-targets.ts` 拥有显式 format target。

`bun run test` 只运行 Product 的 `src/**` 测试，不覆盖 scripts 测试。
本次只涉及局部行为时优先使用 `bun test <目标文件或目录>`。明确需要全部 Product 与 scripts routine 测试 lanes 时才使用 `bun run check -- --test`；它不是单个 Check 的 selector。consumer types、完整 routine 与 workbench 的入口及发布选择见 [Project Gate](project-gate.md#选择参数)。

`lint.ts` 与 `typecheck.ts` 只拥有 `product` / `scripts` scope 到路径或 tsconfig 的映射。根 `tsconfig.json` 是 Product 与 scripts 共享的 source compiler profile：`strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、`noImplicitOverride`、`noImplicitReturns` 与 `allowUnreachableCode: false`；`tsconfig.product.json` 只继承该 profile 并定义 Product roots/cache。因 artifact emit 使用 `--ignoreConfig`，它在自己的 CLI 中镜像这六项实现语义；这是[产物契约](package-artifact.md#构建输入与包接口边界)的同步义务，不是第二份 source profile。external-consumer 的 types fixture 则以自己的严格 profile 验收 installed declarations；其范围与不继承的 implementation-only 规则见[候选包安装与外部使用方验收](package-lifecycle.md#候选包安装与外部使用方验收)。

`.oxlintrc.json` 同时拥有 error/warning 规则、其 options 与 suppression policy。两个 lint scope 都以 `oxlint --deny-warnings` 运行，因此 warning 仍阻断；severity 只分类风险，不形成让步。authoring 只使用带 exact rule 和理由的 Oxlint directive：ESLint directives 不被接受，unused Oxlint directives 以 warning 报告后同样被阻断。该 profile 不加载 Unicorn plugin；规则选择及其升级边界由[阻断且分级的 Oxlint 决策](../decisions/use-blocking-tiered-oxlint-policy.md)完整定义。`format` 写入这些显式 target，`format -- check` 只检查它们。

修改 lint rule、format option 或目标范围时，修改相应配置或 development owner；不要在 package、子目录或文档复制同义规则表或 target list。development lint、format 与 typecheck 对适用 `src` 保持完整普通输入，均不为 source-aligned function-metrics port 增加 translated-only 排除。实现原则仍以[编码规范](../development/coding-style.md)为准。

### Lizard / TypeScript performance evidence

显式比较 Python/Lizard 与 TypeScript 的流程、测量层级和证据边界见[Lizard 性能测量](lizard-performance.md)。
该流程只产出开发期 evidence，不授权优化，不进入 Product 或默认 Gate。

### Local post-commit auto-push

提交前核对当前 checkout 的 `core.hooksPath`。显式启用 `.githooks` 时，普通 commit 授权包含受限 auto-push，不得仅为避免 push 绕过；仅明确要求本地提交或故障后获绕过授权例外适用。只对 `main` 向 `origin` 非强制推送，完整启用、频率、失败和恢复边界见[环境与 Git hook](workspace-environment.md#local-post-commit-auto-push)。

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

首次检出、工具 pin 变更或环境缺失时先阅读[环境自举与破坏性边界](workspace-environment.md#environment-setup-and-destructive-boundary)：setup 会联网安装并写入本地工具、依赖、索引和 candidate；`env:check` 只检查，不准备 candidate。`environment-2.toml` 的 clear 会丢弃目标 worktree 的 tracked 改动及未跟踪非 ignored 文件，只有明确授权丢弃时可用。

## Governance and Test Evidence adapters

`scripts/decision-records/command.ts` 把 repository root 绑定到已安装 capability，并转发其 CLI 或暴露同一 typed operation；`scripts/investigation-report/command.ts` 保留项目默认全量检查并转发已安装 CLI；`change-plan` root command 直接调用其 skill CLI。它们不复制 parser、metadata、index 或 lifecycle 语义。

`change-plan`、`common-denominator-design`、`decision-records`、`investigation-report`、`product-architecture-judgment` 与 `test-design` 以完整上游包维护；`performance-optimization` 与 `test-evidence-review` 保留本地方法层。上游包使用 `.ts` 入口与随包 runtime source；项目 adapter 核对所需函数导出，按随包公开声明消费，不把上游实现纳入仓库的严格 source compiler profile。运行依赖由各包 manifest/锁文件拥有，`env:setup` 显式准备其列出的五项；普通 import、help、检查或自更新不隐式安装。

`test-design` 引自 [zxyycom/skills 的固定提交](https://github.com/zxyycom/skills/tree/2764ad0b8b518315a151e7bc9457184ce41afe62/skills/test-design)，方法版本为 `3`。
指令使用无需依赖，不加入 `env:setup` 的依赖安装列表；自更新依赖按随包说明另行显式准备。
随包 updater 面向 release，使用前先比较 release 与当前方法版本，避免将源码版本降级。测试设计与证据审查的分工见[测试策略](../testing/strategy.md#测试设计与证据审查)。

写入由相应 subcommand/skill 和当前任务授权决定；Change 结项只在明确删除授权下使用 `finalize`，成功即删除整个目录，不建立完成态 archive。

`scripts/test-evidence/command.ts` 拥有 current test entity discovery、Case query 和 closure check。它把同一 caller `AbortSignal` 传给 ast-grep static scan 与 Bun registration report process，要求完整测试清单的每个 runner entity 都以 skipped testcase 报告；测试正文由 Gate process 子 Checks 或最窄目标命令执行。测试分层和 Case maintenance 继续由[测试策略](../testing/strategy.md)与[测试证据维护](../testing/case-maintenance.md)owner 定义。

## Verification

修改脚本 owner 时，先运行其最窄 test 或 command，再按本次真实影响选择必要的补充入口，例如相应 scope 的 typecheck/lint、某一材料 task 或发生实体/Case 变化时的 Test Evidence。以下默认 Gate 仅用于需要的快速反馈，不是每次交付的固定前置：

```bash
bun run check
```

扩到 changed/all 的条件统一见[交付验证](../navigation.md#交付验证)，不以其它任务的 diff 作为扩大依据。正式发布保留同一 receipt 的完整验收；报告实际运行的检查及未运行项。
