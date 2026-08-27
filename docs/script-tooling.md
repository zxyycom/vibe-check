# 脚本工具

本文拥有仓库自动化的目录 owner、根命令、private consumer 与依赖方向。产品运行时由
`src/**` 拥有，且不得 import `scripts/**`。runtime/private Project consumer 只能从 exact installed candidate 的
public entry 消费 Product；package/docs build、projection 与 audit 可以只读其 owner 明确 allowlisted 的
source/contract material，但不以它建立内部 runtime consumer 或调用 Package Run。

## Source owners and dependency direction

`scripts/**` 按实际 workflow 与生命周期组织；下表是当前 owner、入口和允许依赖方向的权威映射。
目录层级只表达父子 owner，具体文件继续由所在目录和文件名共同表达职责。

| Owner | 责任与入口 |
| --- | --- |
| `scripts/development/**` | `format.ts`、`lint.ts`、`typecheck.ts` 与 `test.ts` 选择开发期 scope；`scripts/process-execution/command.ts` 提供其进程命令边界。 |
| `scripts/environment/manage.ts` | `env:setup` 和 `env:check` 的 mise、依赖与 CodeGraph 环境管理。 |
| `scripts/process-execution/**` | repository automation 的 process facade、contract、runner、failure、plain-text environment 与根命令 adapter；跨 owner 只消费 `execution.ts`。 |
| `scripts/repository-files/**` | repository 文件遍历、文本读写和路径 containment；不拥有 JSON validation 或 generic serialization。 |
| `scripts/error-message.ts` 与 `scripts/value-guards.ts` | 明确的诊断字符串和值形状小边界；它们是 scripts root 直接拥有的 capability。 |
| `scripts/validation/**` | workspace root、repository layout 与 `documentation/**` 的 docs acceptance workflow、task contract、links、JSON/schema/machine-artifact validation。它调用 `scripts/docs/**` 的 check-only provider，不把 workflow 放回 provider。 |
| `scripts/docs/**` | machine artifact schema/example 与 package README/JSDoc/guide 的生成或投影 provider；不拥有 docs validation orchestration。 |
| `scripts/package/**` | parent owner 持有 public contract、file inventory、Bun pack/digest 与 artifact/candidate 共用 package-material audit；`artifact/**` 构建和审计 tarball，`candidate/**` 只准备、安装、receipt 与 isolated consumer。candidate fingerprint 有意覆盖整个 package lifecycle 以保守失效。 |
| `scripts/project/**` | 唯一 private candidate consumer root；`quality/**` 与 `gate/**` 同级。Gate 的 `check-execution/**` 只拥有 native/process Check mapping；具体 docs、Decision Records 与 Test Evidence Checks 位于其领域 owner。 |
| `scripts/decision-records/command.ts` | 将仓库根绑定到已安装 decision-records capability 的 repository adapter。 |
| `scripts/test-evidence/command.ts` | 当前 test entity discovery、Case 查询与闭合检查的 command/API owner；`catalog/test-support.ts` 仅为它的 node:test fixture setup。 |

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
| package candidate | `bun run package:status`；`bun run package:build`；`bun run package:verify` | `scripts/package/command.ts` |
| docs/workspace validation | `bun run validate`；`bun run validate -- docs [json|schema|examples|links|package-api-documentation]` | `scripts/validation/workspace.ts` and `scripts/validation/documentation/workflow.ts` |
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

`scripts/package/build-contract.ts` 是 local candidate 默认路径与责任的唯一 owner：`build/package/` 是唯一完整
unpacked package build evidence，`build/artifacts/` 保存 versioned `.tgz`。`.cache/vibe-check/package-candidate/`
只保存 preparation receipt 与 `candidate.tsbuildinfo` 等 cache state；不得把 staging/tarball 放回 cache、挪用根
`artifacts/`，或复制 cache staging 建立第二个 evidence source。fixture 传入 `buildDirectory` 和 `stateDirectory`
时必须让两者保持 test-local 隔离，且 contract 拒绝彼此重叠。cold rebuild 只清理这两个精确拥有的 build paths 和 cache-owned receipt/compiler state。

`package:status` 只读地报告 candidate version、`current`/`stale` freshness、unpacked path、tarball path 和经验证的
installed entry；stale 时另报告 required preparation action，并以非零退出提示 `package:build`，不静默复用或修复。
`package:build` 执行既有 prepare 的 `reuse`/`reinstall`/`rebuild` 选择和相应 audit，明确分别报告完成后的 current state 与
performed action；`package:verify` 直接运行 full Project Gate，复用 candidate lifecycle、artifact 与 external-consumer
package acceptance，而不建立平行 acceptance。

Candidate preparation 先执行不修改文件系统的状态判断，再根据结果执行动作：

- `reuse`：receipt/input、packed artifact 与 installed consumer 都仍然有效，不执行 build、pack 或 install。
- `reinstall`：packed artifact 仍然有效，但 installed consumer 无效；只重新安装。
- `rebuild`：receipt 或 artifact 无法复用；清理 candidate state 后重新 build、pack 和 install。

Reuse path 不重复扫描只服务 build evidence 的 staging 内容。Artifact acceptance 仍对同一次
provider staging 执行完整 material audit，因此 staging corruption 不会从 full/package acceptance 中消失。

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

quality wrapper 不解析调用方配置、不重新声明 Project Definition，也不注入 scanner override。每项 scanner command
与 availability command 都属于使用它的 package-provided ordinary Check options；详见
[Check-owned scanner dependencies](scanner-dependencies.md)。

## Project Gate

`scripts/project/gate/run.ts` 是 Project Gate 的 process adapter。一次 invocation 按以下顺序建立：

1. 准备 candidate，并确认 private consumer 解析到的 package entry 与准备结果相同。
2. 创建 invocation log directory，并把同一个 prepared candidate 交给 `project-run.ts` 的 bound Gate Run。
3. 从 Package Run 的 explicit aggregate 取得 Gate 结论；adapter 不遍历 Check snapshot 重新归约。

参数、candidate preparation、private consumer import 或 exact entry identity 失败时，adapter 不启动 Gate Run。
Gate 不改变 quality 的 locked scanner boundary，也不替代 development、docs、decision-records 或 test-evidence
各自的 command owner。

### Prepared candidate data

`prepared-candidate-check.ts` 将 invocation-owned candidate 重新核对并发布为 versioned typed final data。Closed
parser 验证 artifact digest、绝对路径、installed entry containment、非空且无重复的文件 inventory，以及
`preparationAction`、`preparationReason` 与 `reused` 的合法组合。该数据只保留在当前 Run snapshot；因为包含
invocation-local 绝对路径，Gate 不启用 machine publication。

Artifact acceptance 直接声明 prepared candidate 为 direct dependency：它只接收 exact artifact path/digest 与 staging
directory，重新验证 child-process input 并执行 staging material audit；直接运行该测试时才 fresh build 本地 fixture。

当 `package-tests` 被选择时，`prepared-external-package-consumer` 是 prepared candidate 的另一个 direct consumer。
它以 30 秒 timeout 运行 provider process，在一次 invocation-owned lease root 内创建 ancestry-external install，并且只有在
startup transcript 已被 settled transcript 替换后，才把零退出 stdout 解析为 closed typed material。这个 parser 与后续
physical revalidation 必须同时确认 exact artifact path/hash、`consumer` 位于该 lease root、installed package/entry containment
和当前 filesystem material；stdout 无法解析、shape/identity/provenance 不匹配或 material 已漂移时均以 unavailable 结算。
bound Gate Run 的 `finally` 总是清理 lease root。

provider 通过后，三个只读 consumer Checks 分别执行 installed package 的 TypeScript types、projected documentation examples
和 runtime acceptance。它们只从 provider 的 typed data 得到 environment，并在使用前重新进行 physical revalidation；不自行
build、install、删除或重新拥有该 consumer root。直接运行这些测试时才回退到本地 candidate preparation。

Candidate lifecycle 中会被故意破坏的 receipt、installation 与故障注入状态仍由 test-local lazy fixture 拥有，
不提升为跨 Check output。

### Test execution partition

`test-execution/lanes.ts` 从 Test Evidence 的同一完整文件面导出互斥 execution lanes。每个测试文件必须恰好
进入一个非空 lane；未知 Product package owner 文件在任何测试启动前失败。当前 lanes 按以下责任分组：

- Product package-provided Checks：duplicate detection、file metrics、function metrics、JSON、Markdown link 与
  supporting/project behavior；每个行为 owner 独立结算。
- Product runtime、Project tooling、Test Evidence tooling、validation 与 ordinary scripts tooling。
- Package supporting：receipt classification、acceptance-input parser、module specifier、source map 与 public inventory。
- Package acceptance：candidate lifecycle、artifact，以及 types、documentation、runtime 三条 external-consumer execution
  lanes。每个 supported Bun test file 恰好进入一个非空 lane；external-consumer provider process 是独立 Check，不属于
  test lane，其实现单元证据进入 Project tooling lane，不兼作 consumer acceptance。

`definition.ts`、`entries.ts`、`eligibility.ts` 与 `controls.ts` 拥有 membership、profile/tag selection 和 aggregation
configuration；`check-execution/native-operation.ts` 与 `check-execution/process.ts` 共同把 native/process operation
映射为 Check facts、取消和安全 transcript。具体 adapter 分别位于 `docs-validation-check.ts`、
`decision-records-check.ts` 与 `test-evidence/**`，不进入泛化 Check 容器。

### Profiles and scheduling

Gate adapter 的完整参数 grammar 是 `--profile required|full`、可重复的 `--disable-tag <tag>`、受控的
`--enable-tag package-tests`，以及必须单独使用的 `-h` / `--help`。无 profile 时默认 required；同一 tag 不能同时
enable 和 disable。`--help` 在 candidate preparation、package import 和 log-directory creation 前退出。正式 root
commands 不传 tag override。

`--enable-tag` 当前只接受 opt-in tag `package-tests`。`--disable-tag` 接受且实际使用完整过滤集合：`catalog`、`docs`、
`format`、`git`、`package-tests`、`product`、`quality`、`scripts`、`tests`。help 必须同时列出这两个集合、profile
对 package acceptance 的影响和可直接运行的示例，不能让调用方从 catalog 源码猜测 tag。

- Required 默认执行 package supporting 和 prepared candidate typed provider，但不选择带 `package-tests` 的 physical
  acceptance Checks；它们以 `tag-package-tests-not-enabled` 保持可见且不进入 aggregate。每个 excluded Check 都说明
  未运行的动作，并提示 `--enable-tag package-tests` 或 `--profile full`。显式 enable 可把它们加入 required。
- Full 自动选择全部未禁用 Checks，包括 candidate lifecycle、artifact、external-consumer provider 与三个 consumer
  acceptance Checks。
- 启动 Run 前的 selection summary 将 package acceptance 明确标为未选择、由 profile/tag 选择或被
  `package-tests` 禁用；其它 disabled tags 仍按规范化后的完整名称列出。
- Root scheduler 当前使用 `maxParallel: 3`。Candidate lifecycle 和 `prepared-external-package-consumer` 都会创建或改变
  physical lifecycle state，因而共享 `project-gate-package-lifecycle` mutex。Artifact acceptance 直接消费 prepared candidate；
  types、documentation、runtime consumers 都只读 provider material，均不持有该 mutex，因此可在 provider 成功后调度。
- Candidate lifecycle、artifact、external-consumer provider 和三个 consumer acceptance process 各有 30 秒外层 timeout。
  该 timeout 用于终止内部同步 child 阻塞后无法及时响应 Bun test timeout 的整条 test process，不是全局性能预算，也不把
  尚未产出 exit fact 的 command 伪装成测试失败。

### Process evidence

Native docs、Decision Records 与 Test Evidence Checks 不创建普通单进程 transcript。每个外部 command Check 在 child
启动前先创建自己的 transcript，写入 Check/step、command、`status: running` 和配置 timeout；child 结算后，同一路径
重写为 command、stdout、stderr、exit、signal、timeout fact 和安全 error summary。重写不承诺原子替换；若 settled
transcript 写入失败，Check 结算为 transcript unavailable。这样 Gate 或 child 在结算前被外部终止时，已有 transcript
仍能指出最后启动的 command；startup transcript 写入失败时不得启动 child。

带 typed success stdout 的 process Check 也遵守该顺序：先完成 settled transcript，再对零退出 stdout 作 closed parse，
并按需要复核其 provider provenance 与 physical material；因此 parse、identity 或 revalidation failure 是
`process-output-invalid` unavailable，而不是已通过的 child result。`prepared-external-package-consumer` 是这一边界的
具体使用者，不能把 stdout 或 transcript 原文提升为 Run public data。

非零退出的 terminal message 只能包含 exit code、signal 和 transcript basename；timeout message 只包含配置时限和
transcript basename。两者都不能复制 child output、完整路径、command、arguments、credential URL、digest 或 transcript
内容。Descriptor 已配置 timeout、process facade 明确报告 timed out 且没有可靠 exit fact 时，command 结算为
`process-timeout` unavailable，而不是泛化成 `process-unavailable`；未配置时收到同类异常 fact 则 fail closed 为
`process-unavailable`。Test Evidence ast-grep Check 的两步组合 transcript 仍在两步返回后一次写入；若未来需要定位其
内部 step 卡住位置，应由该两步 runner 暴露 step-start，而不能把组合开始误写成当前具体 step。

### Gate result post-processing and exits

Bound Run 返回后，adapter 从同次 RunResult 的 warning、progress output 和 aggregate 形成一个不可变的初步
`ProjectGateResult`；non-completed 或 malformed Run result 形成 `unavailable` 初步结果。项目私有且唯一的 `afterGate`
阶段随后接收该结果与完整只读 `ProjectGateContext`，并返回同类型的最终结果。

Context 按 Gate owner 收拢本次 invocation 到初步结果形成时已有的全部 owned facts：normalized selection、repository
root、prepared candidate、invocation log directory 和原始 RunResult；timing 精确提供 `startedAtMs`、
`initialResultAtMs` 和 `elapsedToInitialResultMs`。Timing 是完整 context 中的一类 observation，不定义 context 边界，
也不包含 Hook 自身耗时。loader、clock、console writer 和 candidate preparer 属于执行依赖，不进入 context。

Hook 返回 exact `{ status, messages }`：`status` 只接受 `passed | failed | unavailable`，每条 message 只含非空的
`code`、`message` 和 `error | warning | info` level；code 与 message 不得包含 C0/C1 controls、U+2028 或 U+2029。
Hook 可以返回新的状态与项目级消息，但不能修改 context、Check outcome、RunResult 或 Product aggregate。终端结果和
process exit 只消费处理后的一个结果，不暴露要求调用方合并的 base/acceptances/final 集合。Hook 抛错、返回额外字段或
返回其它无效结果时 fail closed 为 `unavailable`；当前只建立该转换机制，不配置未经测量的全局或逐 Check 性能预算。

初步结果中，Completed Run 的 warning、progress failure 或非-`passed` aggregate 为 `failed`。处理后的 `passed`、
`failed`、`unavailable` 分别映射为 exit `0`、`1`、`2`。参数、candidate、import、identity、log 或 execution failure
仍在形成初步结果前直接映射为 exit `2`，不会调用 Hook。

## Documentation, validation, and package material

`scripts/docs/package-api/command.ts` 的 `--write`/`--check` 适配 package API projection。可编辑输入是
README template、allowlisted TypeScript examples、projection registry 和 source JSDoc prose；root `README.md`
与 registry target 中生成的连续 `@example` tail 是 generated outputs。`scripts/validation/documentation/workflow.ts` 在
`package-api-documentation` task 中调用 check mode。

current machine schemas 位于 `docs/schemas/`，artifact examples 位于 `docs/examples/artifacts/**`；
`scripts/docs/machine-artifacts/examples/**` 维护 machine example 的生成与投影；`scripts/validation/documentation/machine-artifacts/**` 独立验收已发布的 machine artifact。

Documentation validation library functions 只通过 `validateDocs({ report })` 的显式 reporter 发布成功消息；不提供
reporter 时保持静默。CLI 入口提供 console reporter，Project Gate 的 in-process docs Checks 不提供，从而不在 Product
拥有 TTY running region 时向同一 stdout 插入未登记内容。

`bun run validate` 先运行全部文档 task，再执行 repository layout characterization，最后运行
`git diff --check`；`bun run validate -- docs` 只运行文档 task，不执行 layout 或 diff 检查。

docs task 的唯一名称是 `json`、`schema`、`examples`、`links` 和 `package-api-documentation`。schema/examples
task 既检查 current published material 的 generation drift，也用 checked-in schema 和 raw example bytes 独立验证
完整 v4 two-file set；它不 import Product validator 作为 acceptance implementation。historical schema/example
materials 只走显式 historical validation path，不进入 current traversal 或 runtime input。

## Environment and shared script boundaries

### Process, repository-file, and narrow boundary capabilities

`scripts/process-execution/execution.ts` 是跨 owner 的 process facade；其它 scripts owner 只能从该 facade 消费 process capability，不得 deep import `process-execution/{contract,failure,plain-text-environment,result,runner}.ts`。

`scripts/process-execution/**`、`scripts/repository-files/**`、`scripts/error-message.ts` 与 `scripts/value-guards.ts` 是普通 tracked repository source，不是 package、workspace、独立 manifest、独立
TypeScript config 或独立 Gate profile。它们由 `bun run typecheck -- scripts`、`bun run lint -- scripts`、
`bun run format -- check` 和 Test Evidence current scripts surface 覆盖。它们与 `src/data-boundary/**` 与 `src/package-checks/host-environment/**` 是不同
owner：前者服务 repository automation，后者服务 Product runtime；Product 不得 import 前者。这些 script boundaries
不定义 Product source-access boundary；适用的 Project consumer 与 package/docs 例外见
[Source owners and dependency direction](#source-owners-and-dependency-direction)。

进程 facade、repository file/path capability 与两个根级小 capability 必须让开发脚本边界可复现和可诊断：
文件遍历返回稳定 slash-normalized relative paths，文本与 process failure 保留目标或失败事实，不静默跳过；已启动 child 的 cancellation 保留 error、
signal 和 `status: null`，不能视为成功。JSON validation、serialization 与 Product scan-scope/scanner contract 仍由各自 owner 承担。

### Environment setup and destructive boundary

首次检出、工具 pin 变更或环境缺失时运行 `bun run env:setup`。它会 trust 当前 `mise.toml`、按锁定结果安装
工具和 Node dependencies，并初始化/同步当前 checkout 的 CodeGraph；因此会写入 user-level mise trust/tool state、
checkout `node_modules` 和 `.codegraph`。该 bootstrap 入口只依赖 Node/Bun 内置能力与根级错误映射，不能在依赖安装前加载
`process-execution` 的第三方 runner。执行前审阅 `mise.toml`。`bun run env:check` 只检查已安装 tools、jscpd
和 CodeGraph 状态，不执行 trust、安装或索引同步；失败后再运行 setup。两个命令以
`MISE_GLOBAL_CONFIG_FILE` 隔离用户全局 mise 配置。

`.codex/environments/environment.toml` 在 setup 后运行默认 Project Gate，不清理 worktree。
`.codex/environments/environment-2.toml` 的 `clear` 环境会在同一 setup 前对 `CODEX_WORKTREE_PATH` 执行
`git restore --staged --worktree -- .` 与 `git clean -fd -- .`；这会不可恢复地删除 tracked 改动和未跟踪、
非 ignored 文件。只有明确授权丢弃目标 worktree 内容时才能选择它。

`quality` 是唯一需要 mise 锁定 scanner toolchain 的日常 workflow；它不会从 ambient `PATH` 取得同名 scanner，
也不接受 scanner override。Product Check 的 scanner command、availability command 和 unavailable behavior 仍由
[Check-owned scanner dependencies](scanner-dependencies.md) 所列的各 Check owner 定义。

## Governance and Test Evidence adapters

`scripts/decision-records/command.ts` 把 repository root 绑定到已安装 capability，并转发其 CLI 或暴露同一
typed operation；`change-plan` 与 `investigations` root commands 直接调用各自 skill 的 CLI。它们不复制 parser、
metadata、index 或 lifecycle 语义。写入与归档仍由相应 subcommand/skill 和当前任务授权决定。

`scripts/test-evidence/command.ts` 拥有 current test entity discovery、Case query 和 closure check。它把同一 caller
`AbortSignal` 传给 ast-grep static scan 与 Bun registration report process，要求完整 profile 的每个 runner entity
都以 skipped testcase 报告；测试正文由 Gate process 子 Checks 或最窄目标命令执行。测试分层和 Case maintenance 继续由
[测试策略](testing.md)与[测试证据维护](testing/case-maintenance.md) owner 定义。

## Verification

修改脚本 owner 时，先运行其最窄 test 或 command，再按影响范围运行：

```bash
bun run typecheck -- scripts
bun run lint -- scripts
bun run validate -- docs
bun run test-evidence -- check --root .
```

涉及 quality、Gate 或多个 owner 时运行 required；涉及 package artifact、candidate 或外部 consumer 时运行 full：

```bash
bun run verify:vibe-check-workspace:required
bun run verify:vibe-check-workspace:full
```

报告实际运行的检查及未运行项。
