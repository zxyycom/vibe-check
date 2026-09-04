# 脚本工具

本文拥有仓库自动化的目录 owner、根命令、private consumer 与依赖方向。产品运行时由
`src/**` 拥有，且不得 import `scripts/**`。runtime/private Project consumer 只能从 exact installed candidate 的
public entry 消费 Product；package/docs build、projection 与 audit 可以只读其 owner 明确 allowlisted 的
source/contract material，但不以它建立内部 runtime consumer 或调用 Package Run。

## Source owners and dependency direction

`scripts/**` 按实际 workflow 与生命周期组织；下表是当前 owner、入口和允许依赖方向的权威映射。
目录层级只表达父子 owner，具体文件继续由所在目录和文件名共同表达职责。

| Owner                                                   | 责任与入口                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/development/**`                                | `format.ts`、`lint.ts`、`typecheck.ts` 与 `test.ts` 选择开发期 scope；`scripts/process-execution/command.ts` 提供其进程命令边界。                                                                                                                                                                                                                                                                                                                                                                                       |
| `scripts/environment/manage.ts`                         | `env:setup` 和 `env:check` 的 mise、依赖与 CodeGraph 环境管理，以及 `env:setup` 返回前完成的 local package candidate 自举。                                                                                                                                                                                                                                                                                                                                                                                             |
| `scripts/process-execution/**`                          | repository automation 的 process facade、contract、runner、failure、plain-text environment 与根命令 adapter；跨 owner 只消费 `execution.ts`。                                                                                                                                                                                                                                                                                                                                                                           |
| `scripts/repository-files/**`                           | repository 文件遍历、文本读写和路径 containment；不拥有 JSON validation 或 generic serialization。                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `scripts/canonical-json.ts`、`scripts/diagnostic-safety.ts`、`scripts/error-message.ts` 与 `scripts/value-guards.ts` | 跨 scripts owner 复用的根级安全 capability：canonical JSON machine facts、owner-local diagnostic ID/单行 presentation 的安全不变量，以及明确的诊断字符串和值形状小边界。它们不拥有字段语义、排序或 Product contract。                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `scripts/validation/**`                                 | workspace root、repository layout 与 `documentation/**` 的 docs acceptance workflow、task contract、links、JSON/schema/machine-artifact validation。它调用 `scripts/docs/**` 的 check-only provider，不把 workflow 放回 provider。                                                                                                                                                                                                                                                                                      |
| `scripts/docs/**`                                       | machine artifact schema/example 与 package Markdown fenced example、JSDoc example、Check guide 的投影或收集 provider；不拥有 package 文档正文或 docs validation orchestration。                                                                                                                                                                                                                                                                                                                                         |
| `scripts/package/**`                                    | parent owner 持有 public contract、file inventory、Bun pack/digest 与 artifact/candidate/release 共用 package-material audit；`artifact/**` 构建和审计 tarball，`candidate/**` 准备、安装并核对 fingerprint local receipt，`release/**` 验证 clean source、formal version/tag、portable receipt 与 same-artifact Gate handoff，`candidate/external-consumer/**` 拥有隔离 consumer material、typed provider 与 types/documentation/runtime acceptance。candidate fingerprint 有意覆盖整个 package lifecycle 以保守失效。 |
| `scripts/project/**`                                    | 唯一 private candidate consumer root；`gate/definition.ts` 是 Gate 组合配置入口，`gate/run.ts` 是唯一 process entry，`gate/checks/**` 拥有各领域 Check 配置与 adapter，`gate/runtime/**` 拥有 bound runtime mechanics。                                                                                                                                                                                                                                                                                                 |
| `scripts/decision-records/command.ts`                   | 将仓库根绑定到已安装 decision-records capability 的 repository adapter。                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `scripts/test-evidence/command.ts`                      | 当前 test entity discovery、Case 查询与闭合检查的 command/API owner；`catalog/test-support.ts` 仅为它的 node:test fixture setup。                                                                                                                                                                                                                                                                                                                                                                                       |
| `scripts/maintenance/**`                                | 仅承接由对应 root maintenance command 显式选择的仓库维护查询；每个脚本固定自己的外部 target、transport 与 advisory result，不进入 Product 或默认 Gate。                                                                                                                                                                                                                                                                                                                                                                 |

`src/index.ts` 是唯一 public 产品入口及 package artifact build/declaration entry。`scripts/project/package.json`
从 exact installed `@zxyycom/vibe-check` candidate 消费该入口；`scripts/package/**` 只负责准备该 candidate，不能
import 或启动 project consumer。artifact/package-API documentation build 与 audit 可以读取各自显式 allowlisted 的
Product source 或 contract material，但不成为 Package Run consumer。产品 runtime、Definition 和 Check 不得依赖
scripts helper、环境状态或 process adapter。

## Root commands

根 `package.json` 只公开下列工作流；内部 `scripts/**` 文件不是第二套根入口。

| Workflow                  | 调用                                                                                                                                                    | Owner                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| environment               | `bun run env:setup`；`bun run env:check`                                                                                                                | `scripts/environment/manage.ts`                                                     |
| development               | `bun run format [-- check]`；`bun run lint [-- product \| scripts]`；`bun run typecheck [-- product \| scripts]`；`bun run test`                        | `scripts/development/**`                                                            |
| package candidate         | `bun run package:status`；`bun run package:build`；`bun run package:verify`；显式物理集成 `bun run package:candidate:integration`                       | `scripts/package/command.ts` 与 `scripts/package/candidate/integration-command.ts`  |
| formal package release    | `bun run package:release:prepare -- --version <0.0.PATCH> --tag <tag>`；`bun run package:release:verify -- --receipt <path>`                            | `scripts/package/release/command.ts`                                                |
| docs/workspace validation | `bun run validate`；`bun run validate -- docs [json \| schema \| examples \| links \| package-api-documentation]`                                       | `scripts/validation/workspace.ts` 与 `scripts/validation/documentation/workflow.ts` |
| governance                | `bun run decisions -- <command>`；`bun run change-plan -- <command>`；`bun run investigations`；`bun run test-evidence -- <command>`                    | their named owners                                                                  |
| maintenance advisory      | `bun run maintenance:lizard-upstream`                                                                                                                   | `scripts/maintenance/lizard-upstream-advisory.ts`                                   |
| Project Gate              | `bun run check [-- --typecheck \| --lint \| --test \| --docs \| --quality \| --all]`；formal receipt：`bun run check -- --all --release-receipt <path>` | `scripts/project/gate/run.ts`                                                       |

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
source-aligned function-metrics port 增加 translated-only 排除。实现原则仍以[编码规范](coding-style.md)为准。

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

## Package artifact 与 candidate

`scripts/package/artifact/**` 从 public Product 入口 `src/index.ts` 与显式 internal Worker root
`src/package-checks/function-metrics/analyzer-worker.ts` 构造 local candidate。artifact fingerprint 同时绑定这两个
compiler root、Bun、锁定的 TypeScript emit/parser toolchain、Product source、package scripts 与文档输入。Worker、
Product adapter 与 Lizard port façade都不是 package export 或 consumer subpath；它们仅作为内部 runtime material 保持所需的
Worker execution shape。构建过程逐模块生成
`dist/esm/**.mjs`，同时生成 `types/**.d.ts`、对应的源码映射，并复制 package 所属的非 test/fixture `src/**.ts`
Product 源码。package 根部的 `index.mjs` 只转发 `dist/esm/index.mjs`；`package.json` 的 `exports` 只开放根路径
`"."`，因此物理存在的 `dist`、`types` 与 `src` 目录不是 consumer subpath API。worker 不是额外 export：normalization
只在 emitted `function-metrics/measurement.js` 中恰好一次将 `new URL("./analyzer-worker.ts", import.meta.url)` 改为
`analyzer-worker.mjs`，任何数量或 compiler-shape drift 都拒绝产物，绝不 broad-rewrite ordinary URL strings。

逐模块产物保留第三方 package imports；candidate manifest 必须声明完整且可审计的直接运行时依赖要求。依赖的行为 owner
决定使用精确版本还是有界 semver range；candidate installation 必须验证实际解析版本满足声明，随后由实际 consumer
execution 验证这份安装。package tooling 不替依赖 owner 推断额外兼容语义。
local candidate 与 formal release 共用同一 closed generated manifest：user-scoped `@zxyycom/vibe-check`、唯一 root export、
`MIT AND Apache-2.0 AND BSD-2-Clause`、Bun `>=1.3.14`、canonical `zxyycom/vibe-check` repository、explicit public npm registry/access、allowlisted files 与
完整 production dependencies。manifest 不含 `private`、`bin`、lifecycle scripts、Node host 或 subpath export。
仓库根 [`LICENSE`](../LICENSE) 是 own MIT text owner，当前 notice 为 `Copyright (c) 2026 zxyycom`；artifact 还携带
[`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md)、`licenses/**` 中 Lizard 1.24 MIT、`lizard.py` Apache-2.0、Pygments
2.18 BSD-2-Clause text 与 fixed-range provenance，以及 Momoa third-party text。staging、tarball 与 installed candidate 都逐字节
核对这些 material、shipped source header→ledger→license closure、deferred bodies absent 与无 Python/Lizard/Pygments runtime
dependency；Pygments/Lizard legal provenance text 本身不构成 runtime dependency。SPDX 字段不能替代 physical legal-material audit。
artifact audit 在 pack 前验证根入口、公开运行时导出、可解析的相对 `.mjs` 引用、源码映射与 package
源码的一致性、声明与 README 投影以及允许的文件清单；pack 后继续验证 tar inventory、manifest 与摘要。
`scripts/package/candidate/**` 只安装并核对这一个精确 tarball，再把解析到的根入口交给 private consumer；
它不从 repository source 或祖先依赖补偿不完整的 candidate。安装后的责任按以下边界闭合：

1. 一个 child 一次解析 candidate 根入口与两项声明依赖；
2. parent 核对路径 containment、manifest version 和 jscpd bin；
3. 实际 jscpd execution 由随后消费同一安装的 Product / external runtime 验收，preparation 不为同一事实重复启动多个 probe。

`candidate/external-consumer/**` 是 candidate 下级模块：它建立一次隔离安装及 typed material，并分别验证 types、
documentation 与 runtime；runtime evidence 从 installed root import 实际调用 `functionMetrics`，要求 CCN `2` 的 non-blocking
finding，证明 emitted Worker URL 指向安装包内 worker 且 Worker 执行成功，而不扩大 public exports。Types acceptance
用一次真实 `tsgo` consumer typecheck 覆盖 public imports、examples 与 Definition，并直接核对 installed declaration owner
的相邻 JSDoc；它不为同一 declaration graph 构造第二个 LanguageService program。父级 candidate lifecycle 不吸收这些验收职责。

### Local candidate lifecycle

`scripts/package/build-contract.ts` 是 local candidate 默认路径与责任的唯一 owner：`build/package/` 是唯一完整
unpacked package build evidence，`build/artifacts/` 保存 versioned `.tgz`。`.cache/vibe-check/package-candidate/`
只保存 preparation receipt 与 `candidate.tsbuildinfo` 等 cache state；不得把 staging/tarball 放回 cache、挪用根
`artifacts/`，或复制 cache staging 建立第二个 evidence source。fixture 传入 `buildDirectory` 和 `stateDirectory`
时必须让两者保持 test-local 隔离，且 contract 拒绝彼此重叠。cold rebuild 只清理这两个精确拥有的 build paths 和 cache-owned receipt/compiler state。

`package:status` 只读地报告 candidate version、`current`/`stale` freshness、unpacked path、tarball path 和经验证的
installed entry；stale 时另报告 required preparation action，并以非零退出提示 `package:build`，不静默复用或修复。
`package:build` 执行既有 prepare 的 `reuse`/`reinstall`/`rebuild` 选择和相应 audit，明确分别报告完成后的 current state 与
performed action；`package:verify` 直接运行 complete Project Gate。Gate root 在 Product Run 前完成或复用这一份 exact preparation，
`--all` 内的 artifact 与 external-consumer acceptance 只消费其 typed evidence，不再另建 detached cold candidate。
`package:candidate:integration` 是 routine `--test` preset 之外的显式物理 target：它在 30 秒进程硬限制内以 test-local state 证明一次
cold build/install/reuse，并覆盖以下边界：build staging 仍由 artifact acceptance 审计、installed documentation drift 会失败、
missing dependency 触发 reinstall、malformed receipt 触发 rebuild。Routine Gate 不运行该显式 target。

Candidate preparation 先执行不修改文件系统的状态判断，再根据结果执行动作：

- `reuse`：receipt/input、packed artifact 与 installed consumer 都仍然有效，不执行 build、pack 或 install。
- `reinstall`：packed artifact 仍然有效，但 installed consumer 无效；只重新安装。
- `rebuild`：receipt 或 artifact 无法复用；清理 candidate state 后重新 build、pack 和 install。

Reuse path 不重复扫描只服务 build evidence 的 staging 内容。Artifact acceptance 仍对同一次
provider staging 执行完整 material audit，因此 staging corruption 不会从 `--all` package acceptance 中消失。

### Formal release preparation and receipt

Formal release 不复用 local receipt 或把 `0.0.0-local.*` 改名。`package:release:prepare` 要求 caller 显式提供 canonical
positive `0.0.<patch>` 与保守 lowercase tag，并要求 repository root、index 和 worktree 位于同一 clean `HEAD`。这些输入只
选择本地 build identity；命令不会核验 npm 上的版本可用性、publisher authority 或授权状态，也不会把 caller input 变成
registry fact。

一次 active release 的 exact version/tag/access/mechanism 与当次 registry observations 由该 release 的 active Change
evidence 承接，不在本稳定行为 owner 中复制。归档 release 中的形成时结果不得恢复成后续版本的
selection、availability 或授权。执行者必须先建立新的 active release owner，再从其 current evidence 取得
`<selected-version>` 与 `<selected-tag>`，然后调用
`bun run package:release:prepare -- --version <selected-version> --tag <selected-tag>`。Evidence 中的值不是后续版本的默认值、
registry availability 证明或 publish 授权；public access 仍由 generated manifest 的 closed `publishConfig` 承接，外部
publish mechanism 也不由此脚本执行。

Prepare 清理的范围仅是 `build/release-package/`、该 version 的 `build/artifacts/zxyycom-vibe-check-<version>.tgz`、
`build/releases/zxyycom-vibe-check-<version>.release.json` 与 `.cache/vibe-check/package-release/`；其中 release staging/cache
与默认 `build/package/`、`.cache/vibe-check/package-candidate/` 隔离，versioned tarball root 由 artifact builder 共用。
Receipt writer 在写入前要求 artifact、staging 与 receipt path 都匹配这些 owned paths，并重新核对 artifact SHA-256；失败
不会把任意 caller path 写成 release evidence。

Release receipt 只保存 repository-relative canonical paths，并闭合 source commit、package input fingerprint、version/tag、
ordered tar inventory、SHA-256、SHA-512 SRI、manifest/legal/README identity；它不保存 token、OTP、`.npmrc`、publisher secret、
临时 consumer 或 absolute checkout path。prepare 在 build 前后复核 clean commit/fingerprint，写入 receipt 后再按该 receipt
重验；任一 source 或 byte drift 都失败。只有 receipt 通过 current verifier 后，这些本地材料才构成完整 formal preparation
结果；receipt 本身仍不证明 Gate 或 registry 状态。`package:release:verify` 只把显式 receipt 交给 `--all` Gate，不查询 registry，
也不发布。

## Project Gate

`scripts/project/gate/run.ts` 是 Project Gate 唯一的 process entry；项目不提供第二个 Gate root command。Gate 源码按责任保持下面的固定布局：

```text
scripts/project/gate/
├── definition.ts        # 完整组合 manifest、selection、aggregate、outputs、scheduler 与 afterGate
├── run.ts               # argv、candidate、transcript 与 process exit adapter
├── checks/              # 各领域 Check 对象/对象组、options 与 adapter
└── runtime/             # bound Run、selection、aggregation、result 与 transcript mechanics
```

`definition.ts` 是阅读完整 Gate 组合的入口：从稳定顺序的 entry manifest 可以恢复全部 Check identity、
required/preset membership、Gate 自有的 `observes` 闭合，以及 run-level aggregate、outputs、scheduler 和唯一
project-owned `afterGate`。组合入口可以引用 `checks/**` owner 已定义的普通 Check 对象或闭合对象组；领域
options、scanner protocol、test file partition 和 execution mechanics 留在对应 owner，不为追求物理单文件而
复制。`runtime/**` 不另行拥有 Check membership、领域 policy、`dependsOn` 传播或第二个 Hook 配置面。

一次运行先解析参数并准备 exact local candidate，或在 `--all --release-receipt <path>` 下重验显式 release receipt；之后才动态导入
`runtime/bound-run.ts`。这个分层不是第二个运行入口：`run.ts` 必须先确定 candidate，bound Run 才能通过已解析的
package public entry 构造 Project Definition，并验证该 entry 与 prepared candidate 相同。直接从源码静态导入
package implementation 会绕过这个 candidate 边界，因此不允许。

每次 invocation 先在 `.log/project-gate/<invocation-id>/` 创建 exact evidence root；candidate preparation 仍发生在此之前。bound Run 只把这一次已创建 root 映射为 Product controls，不在 Product 内再建立一层目录：`diagnosticLogging.directory` 为 root、`machinePublication.directory` 为 `machine/`、`progressLogFile` 为 `progress.log`，并只授予 executable Check `checks/` artifact base。因此布局固定为：

```text
<invocation>/
├── gate.log
├── progress.log
├── core-<utc-compact>-<product-uuid>.log
├── scheduler-<utc-compact>-<product-uuid>.log
├── learned-admission-<utc-compact>-<product-uuid>.log  # 仅 learned policy
├── machine/
│   ├── run.json
│   └── records.ndjson
└── checks/
    └── <encoded-check-id>/
        └── process.log
```

这三个 Product filename 共享创建时刻和 Product UUID；其每条 diagnostic observation 还带 Product invocation ID、全局 sequence 与 monotonic elapsed。Gate evidence root 只提供这一次 Gate invocation 的共同目录，不把 Gate、progress 和 Product writer 伪装为同一 writer 或同一 event sequence。所有文件都是本次运行的本地 evidence；不存在 `latest`、retention、quality-only report、根级 `run.json` / `records.ndjson`、旧 `process/<check-id>.log` 或跨 invocation 合并协议。machine files 必须按 [Output](output.md) 的完整二文件集合读取。

### Prepared candidate data

`checks/prepared-candidate.ts` 将 adapter 已准备的 candidate 重新验证为 typed dependency data；artifact acceptance 只消费其 exact artifact、digest、version 与 staging identity。选择 package acceptance 时，`checks/external-consumer-material.ts` 从同一 dependency 建立 invocation-owned external consumer，并让 types、documentation 与 runtime consumer Checks 只读消费已验证材料。`runtime/bound-run.ts` 在 `finally` 中清理这项 lease；测试故障注入和临时材料仍由各自 fixture 拥有。

这些 typed facts 可进入本次 invocation 的 machine evidence，但其中含 invocation-local path，所以不是发布材料或可移植 receipt。formal release 的持久边界仍由上一节的 release receipt 拥有。

### Test execution partition

`checks/test-execution/lanes.ts` 将 Test Evidence 已知的 Bun test files 投影为互斥且非空的 execution lanes；每个文件必须恰好属于一个 lane，未知 Product owner 在启动测试前失败。`checks/test-execution/checks.ts` 拥有 lane 到 Check ID、显示名、candidate input、mutex、timeout 与 Gate selection metadata 的闭合对象组；`definition.ts` 显式引用该组并把它放入完整 Gate manifest，避免复制 identity 或执行配置。

Package supporting、artifact acceptance、三个 external-consumer acceptance、各 Product Check owner、Product runtime、Project tooling、Test Evidence、validation 与 ordinary scripts 分别结算。快速 candidate contract 属于 package supporting；显式 `candidate.integration.ts` 不符合 routine `*.test.ts` 身份，因此不由 `--test` 发现，其正式入口是 `package:candidate:integration`。External-consumer provider 是独立 Check，不伪装成 test lane。

### Selection presets and scheduling

selection 参数只包含 `--typecheck`、`--lint`、`--test`、`--docs`、`--quality`、`--all`，以及必须单独使用的
`-h` / `--help`。无 selection 参数时使用 required；多个 focused preset 取并集并替换 required，重复项被规范化；
`--all` 不能与 focused preset 组合。`--release-receipt <path>` 是 selection 之外的 formal candidate input，只能与
`--all` 组合。help 在 candidate preparation、package import 和 log directory creation 前退出。

- required 是日常完整检查，但不选择高成本 package artifact 与 external-consumer acceptance；`--all` 选择完整 Gate。
- focused preset 只选择相应闭合集：`typecheck`、`lint`、routine `test`、`docs` 或 repository `quality`。`--test` 不隐式加入 package acceptance。
- entry manifest 为每项 Check 投影 Product 原生 `enabledByFlags`，并以 literal `propagateDependsOn: true` 允许命中的下游 Check 启动其 `dependsOn` prerequisite。未选中的 Check 仍保留 `not-applicable / flag-condition-not-matched` fact；被启动的 prerequisite 走普通 Product lifecycle。该 field 的 grammar、默认兼容与“flags 不是权限”边界由 [Configuration](configuration.md#flag-enabled-checks) 唯一拥有。
- Gate 对 `dependsOn` 与 `observes` 都验证 exact collection、self 和 missing target；只有 `observes` 继续验证 required 与每个 preset 的选择闭合，以保证观察输入可用。Product 不从 `observes` 传播选择。任一 owner 自带 `enabledByFlags` 时仍拒绝组合，避免 Gate 覆盖其原有条件。
- 所有 effective Check status 进入同一个显式 `effective` aggregate（不是 `--all` selection）：它复用同次 Product flag-and-dependency selection，必须全部 `passed`；`failed` 使 aggregate failed，`unavailable` propagate，`not-applicable` fail，空 selection failed。findings、messages、Records 与 final data 不直接参与 aggregate。
- scheduler 的 root `maxParallel` 与跨 owner mutex 名称在 `definition.ts` 声明；Check 固有 timeout/mutex 可由其 owner 对象声明，Gate manifest 保证本地 relation 输入与 `observes` 可读性，Product 则拥有已选 `dependsOn` closure。external-consumer provider 独占 package lifecycle mutex；会读写 checked-in documentation materials 的 validation Checks 共享 documentation mutex。root 并发上限不因本次调整改变。
- 静态 `admissionPriority` 也只由 `definition.ts` 配置。它只在同一 ready 层级内排序，不能越过 dependency、mutex、capacity、lifecycle 或 cancellation hard guard。当前 Gate 不声明非零 priority：成对测量没有同时改善 required 与 complete workload 的 median，因此所有 Check 的 effective priority 都是 `0`。

完整 preset 集合和可执行例子由 `--help` 输出；root `check` script 经 `mise exec` 调用同一个 `run.ts`，
Gate 只为 file metrics 读取 mise-bound SCC command。

### Direct repository-quality Checks

`checks/repository-quality.ts` 拥有 `duplicate-detection`、`file-metrics`、`function-metrics` 与
`markdown-link-validation` 的 repository-private options，并向 `definition.ts` 返回一个具名对象组。它们仍是同一
Project Definition 中可逐项审阅和选择的普通 package Checks，不存在父 quality Check、嵌套 Run、第二份运行配置
或独立 quality command。

Gate 对四项使用 non-blocking finding policy：normal findings 保留完整 final data / Records，并由 owning Check 输出有上限的安全摘要；超过摘要上限时只追加精确 omitted count。external-command、source、parse、内置分析或资源上限 failure 仍结算为 `unavailable`。完整 finding facts 以 machine Records 为准。

repository-private scope 只让 TypeScript、current Schemas 和 examples 进入 `duplicate-detection`；Markdown 由 file metrics
与 Markdown link validation 观察，不进入重复检测。`docs/schemas/historical/**` 不进入 duplicate/file maintainability
metrics，但仍由显式 documentation contract 严格验证。repository defaults 还排除 `**/archive/**`；这是本项目配置，不是
package 的公共默认值。

同一 non-blocking Finding policy 适用于 required、`--all` 和正式 release receipt 验证：发布前不要求 Finding 清零或逐项
waiver。external-command/source/parse/analysis unavailable、其它 failed Check、candidate 不一致或发布授权缺失不属于普通质量 Finding，仍按各自
owner 阻断。

Gate 只接受 mise 提供的绝对 SCC path；缺失或相对 `VIBE_CHECK_SCC_CMD` 不回退 ambient `PATH`，而让 file-metrics owner 按 scanner failure 结算。`functionMetrics` 直接使用内置 analyzer，不读取 scanner command 或环境 binding。三个 metrics Check 的
`product-source` area 都排除 `src/package-checks/function-metrics/analyzer/**`：该目录由 source-aligned port owner 整体维护，不生成
repository duplicate、file 或 function-metric Finding。除此共同边界外，Function metrics 还排除 Product `*.test.ts` 与
`*.test-support.ts`。该差异只移除测试函数的复杂度与密度 Finding；duplicate detection 与 file metrics 仍选择这些测试文件，
以保留重复代码和超长文件对使用体验的证据。配置测试必须同时证明这项差异、共同 analyzer exclusion，以及目录外 Product
implementation 仍被三项选择。该范围不从 provenance ledger 动态生成，也不改变 package Check 的公共默认 selection。

整目录 metrics 排除不影响 analyzer 的 lint、format、typecheck、source identity、oracle/parity、deviation、provenance/license、
import-boundary 或行为测试。边界见 [Check-owned scanner dependencies](scanner-dependencies.md)。

### Process evidence

Native docs、Decision Records 与 semantic Test Evidence Checks 不创建单进程 transcript。它们只能把 producing owner 已批准、已排序的 typed safe diagnostics 交给 private native adapter。每项诊断成为一个完整的 Check-local Record；adapter 不从 Record data 推断 ID、字段、顺序或 presentation。默认 terminal 只是同一集合的预览：按输入顺序最多十项，每项最多 240 个 Unicode code points；超长项标记 `truncated`，余项以准确 omitted count 指向完整 Records。预览不改变 Check data、status、aggregate 或 machine Record set。

native adapter 接收到空、重复或不安全 diagnostics，或 native operation 抛错时，必须 fail closed 为 `unavailable`，不发布 synthetic failed Record，也不创建 transcript。Decision Records 只发布经 capability 验证的 decision ID、repo-relative source/index path 与 owner-authored classification/presentation；不会转交可能含 YAML、schema 或 filesystem detail 的 `errors: string[]`。Test Evidence 只接受封闭 origin/code allowlist，并依 code-specific policy 投影已验证的 repo-relative path/location、Case ID 和 `runner: "bun"`；child output、parser/error message、JUnit target/selector/entity key 与其它自由文本不进入 Record 或 preview。

每个 external-command Check 只从自己的 `CheckExecutionContext.artifactDirectory` 读取路径能力；未授予时以 `transcript-unavailable` fail closed。已授予时，它在启动 child 前写入 `checks/<encoded-check-id>/process.log` 的 running transcript，并在结算后将同一路径改写为 command、stdout/stderr、exit/signal/timeout 与安全 error summary；startup 写入失败时不得启动 child。process 与 ast-grep rule-test Check 不从 Gate Definition closure 或 invocation root 获取路径，也不能写 sibling Check artifact。

process Check 的 failure Record 和 terminal message 只引用 `checks/<encoded-check-id>/process.log`。terminal message 不复制 child output、绝对路径、command arguments、credential URL 或 digest。配置了 timeout 且 facade 明确报告超时时结算为 `process-timeout`；不能可靠分类的 process/log/parse 边界 fail closed 为 `unavailable`。ast-grep version mismatch 仍属于该 transcript-owning Check：它只发布 expected version、固定 mismatch classification、version exit code 与 invocation-relative log reference，不解析或复制 version stdout/stderr。Product diagnostic channel、Gate transcript、progress transcript 与 child transcript 各自记录不同层次，不互相解析或复制。

### Gate result post-processing and exits

`runtime/bound-run.ts` 只在 exact candidate 准备后由 `run.ts` 动态加载；它投影 `resolvedEntryPath`、Product `run` 与 `definition.ts` 配置的唯一 `afterGate`。`run.ts` 必须先验证该 entry 等于 prepared candidate 的 exact entry，随后才运行 Product Run、从同一个 RunResult 形成初步 Gate result，并调用该 Hook。默认 Hook 显式调用 elapsed/per-phase performance observer；只有 workload identity 与 checked-in baseline 匹配时才比较，其结果是 advisory，不能修改 Check facts、aggregate 或 process exit。observer 不读取、解析或归约 Product diagnostic log 的 `scheduler.summary`，也不把它变成新的 warning、budget、autotune 或比较输入。

`afterGate` 是 result post-processing，不是 Check `preflight`：后者是 Product Run 内每项 Check 在 execution 前的 options 准备边界，而前者只在整个 candidate-backed Run 已形成初步 Gate result 后执行。Hook 是受信任的项目 JavaScript/Bun 代码，可同步或异步执行项目授权范围内的工作；它不是 package API、plugin、sandbox 或 registry，也没有 `beforeGate` 对应物。正式配置只在 `definition.ts`，`run.ts` 的 loader、clock 与 transcript injection 仅为 adapter 测试 seam，不能用作另一配置入口。

Hook 必须返回闭合的 `{ status, messages }`，且不能改写 context 或 RunResult；抛错或返回非法 shape 时 fail closed 为 `unavailable`。最终 `passed`、`failed`、`unavailable` 分别映射 exit `0`、`1`、`2`。参数、candidate、import、entry identity、log setup 或 execution boundary 在形成初步结果前失败时也映射为 `2`。

`gate.log` 从 transcript 成功建立后只写 Gate adapter 的 candidate/selection/aggregation/execution messages、`afterGate` final messages 及唯一 final directory/result/exit；它不 patch `console`、`process.stdout` 或 `process.stderr`，也不复制 Product progress、Check presentation 或 child output。Product progress 继续直接输出 terminal，并仅由 Product progress owner tee 到 `progress.log`。成功关闭时追加 invocation directory、唯一最终 result 与 exit；关闭失败时即使 Product Run 已结算，也返回 `unavailable` / exit `2`。Gate 不解析 Product log、machine files、progress log 或 child transcripts 来重建结果。

## Documentation, validation, and package material

package API 文档按下列 owner 维护：

| 内容                              | 可编辑事实源                                                                        | 投影或发布结果                                                                                               |
| --------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| README 与深入机制正文、标题和链接 | package root `README.md`、`docs/api-mechanics.md` 的 projected example fence 之外   | 同一 checked-in Markdown 直接进入 package。                                                                  |
| Check guide                       | [package README 的随包 Check 索引](../README.md#随包提供的-check)所链接的对应 guide | 同一 checked-in Markdown 直接进入 package。                                                                  |
| 可执行 API 示例                   | `docs/examples/package-api/*.ts` 的 allowlisted file 或 region                      | projection registry 指定的自然 Markdown heading 下的唯一 TypeScript fence，或 source JSDoc `@example` tail。 |
| declaration 说明                  | declaration owner 中 managed `@example` tail 之前的 source JSDoc prose              | emitted declarations 保留该说明和投影后的示例。                                                              |

每个 Markdown target 由 `scripts/docs/package-api/example-projections.ts` 中的自然 ATX heading path 定位。path 按
H2-H6 ancestor-to-target 的 heading text 排列；跳过数字层级不会产生空 path component。目标 section 必须
恰好拥有一个 `ts` 或 `typescript` fenced example。renderer 逐字更新整个 code fence，保留 heading、其它正文
以及按最终发布路径书写的普通 Markdown 链接。最终 Markdown 不保存 projection comment 或 target ID；heading
缺失或重复、section 中没有或存在多个 TypeScript fence、fence 未闭合以及出现以
`<!-- package-api-example:` 开头的 projection marker 都使投影失败。

按以下顺序修改和验证：

1. 正文或链接直接编辑最终 Markdown；Check guide 直接编辑对应 guide。
2. projected example 编辑 allowlisted TypeScript source；新增、移动或重命名目标 section 时同步 registry heading path 或 source JSDoc target。
3. 运行 `bun scripts/docs/package-api/command.ts --write` 更新 Markdown example fences 与 JSDoc example tails。
4. 运行 `bun scripts/docs/package-api/command.ts --check`；check mode 不写文件，并在任一 checked-in projection stale 时失败。

`scripts/validation/documentation/workflow.ts` 在 `package-api-documentation` task 中调用 check mode。artifact audit
再次计算投影并要求 checked-in Markdown/JSDoc 与结果一致，再把同一 Markdown 交给 package material collector。

package README 是 consumer 文档的唯一总入口：[随包 Check 索引](../README.md#随包提供的-check)逐项直链七份指南，并直链唯一深入 API
mechanics 文档和 machine output 指南，不发布 `docs/index.md` 或 `docs/checks/index.md`。Check guide registry 必须与
public package-provided Check functions 完整闭合；collector 要求 published-path API Markdown 与 hand-written Check guides 使用 LF
且恰有一个 trailing LF，并拒绝缺失直链、额外 Check 页面和 package 内无法解析的相对 Markdown 链接。

current machine schemas 位于 `docs/schemas/`，唯一 artifact example 位于
`docs/examples/artifacts/mixed-outcomes/`；其中 `definition.ts` 是直接随包发布的可执行 Project Definition，
`scripts/docs/machine-artifacts/examples/**` 通过完整 public Run 执行其中的内置 Check 与自定义依赖 workflow，并生成同目录的
`run.json` 与 `records.ndjson`；
`scripts/validation/documentation/machine-artifacts/**` 独立验收已发布的 machine artifact。实现与材料维护边界见
[机器输出实现与材料维护](output-maintenance.md)。
`scripts/docs/machine-artifacts/package-materials.ts` 是随 package 发布的 machine material 精确 registry：它只包含
`docs/output.md`、current v4 run / Record schemas 与这一组 Definition/output materials，并按原始 bytes 读取。package build、
packed tar audit、candidate reuse、installed package audit 与 ancestry-external consumer acceptance 都比较同一 registry 的精确
bytes；installed consumer typecheck 直接检查 Definition，documentation acceptance 用一个 consumer-owned Bun child 按确定顺序
执行全部 runtime examples 和 machine Definition。Example 或 Definition import 失败时，错误保留对应 source identity；执行成功后再核对
documented built-in/custom facts、RunResult messages 与 machine publication。legacy schemas、historical examples、generator sources 与 validation scripts 不进入
package。

Documentation validation library functions 返回 Promise，调用方必须等待 completion。四个 native Gate docs task（`json`、`schema`、`examples`、`links`）把可预期的内容 validation failure 返回为 task-owned、已排序的 safe diagnostics，而不从 Error text 恢复 machine 或 terminal facts；unexpected I/O、programming 或安全边界 failure 继续 throw。每项 diagnostic 都有 stable task-local ID、non-array Record data 和单行 presentation；`links` 对每个 missing local-link occurrence 保留 canonical repository-relative source / target、line、column 与 occurrence。`validateDocs({ report })` 只通过显式 reporter 发布 success；typed failed result 不调用 reporter。workflow 的 direct CLI 和 workspace caller 读取 failed result 后，逐条将 safe presentation 写到 stderr 并以非零退出。Project Gate 的 in-process docs Checks 不提供 reporter，而是把同一 diagnostics 交给 native Check Record adapter，从而不在 Product 拥有 TTY running region 时向 stdout 插入未登记内容。

`bun run validate` 先运行全部文档 task，再执行 repository layout characterization，最后运行
`git diff --check`；`bun run validate -- docs` 只运行文档 task，不执行 layout 或 diff 检查。

docs task 的唯一名称是 `json`、`schema`、`examples`、`links` 和 `package-api-documentation`。schema/examples
task 既检查 current published material 的 generation drift，也用 checked-in schema 和 raw example bytes 独立验证
完整 v4 two-file set；它不 import Product validator 作为 acceptance implementation。historical schema/example
materials 只走显式 historical validation path，不进入 current traversal 或 runtime input。

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
[Check-owned scanner dependencies](scanner-dependencies.md) 所列的各 Check owner 定义；Gate 不创建第二套 scanner workflow。

## Governance and Test Evidence adapters

`scripts/decision-records/command.ts` 把 repository root 绑定到已安装 capability，并转发其 CLI 或暴露同一
typed operation；`change-plan` 与 `investigations` root commands 直接调用各自 skill 的 CLI。它们不复制 parser、
metadata、index 或 lifecycle 语义。写入与归档仍由相应 subcommand/skill 和当前任务授权决定。

`scripts/test-evidence/command.ts` 拥有 current test entity discovery、Case query 和 closure check。它把同一 caller
`AbortSignal` 传给 ast-grep static scan 与 Bun registration report process，要求完整测试清单的每个 runner entity
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

涉及 Gate 或多个 owner 时运行默认 required；涉及 package artifact、candidate 或外部 consumer 时运行 complete Gate：

```bash
bun run check
bun run check -- --all
```

报告实际运行的检查及未运行项。
