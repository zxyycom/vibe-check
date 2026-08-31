# 脚本工具

本文拥有仓库自动化的目录 owner、根命令、private consumer 与依赖方向。产品运行时由
`src/**` 拥有，且不得 import `scripts/**`。runtime/private Project consumer 只能从 exact installed candidate 的
public entry 消费 Product；package/docs build、projection 与 audit 可以只读其 owner 明确 allowlisted 的
source/contract material，但不以它建立内部 runtime consumer 或调用 Package Run。

## Source owners and dependency direction

`scripts/**` 按实际 workflow 与生命周期组织；下表是当前 owner、入口和允许依赖方向的权威映射。
目录层级只表达父子 owner，具体文件继续由所在目录和文件名共同表达职责。

| Owner                                                   | 责任与入口                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/development/**`                                | `format.ts`、`lint.ts`、`typecheck.ts` 与 `test.ts` 选择开发期 scope；`scripts/process-execution/command.ts` 提供其进程命令边界。                                                                                                                                                    |
| `scripts/environment/manage.ts`                         | `env:setup` 和 `env:check` 的 mise、依赖与 CodeGraph 环境管理。                                                                                                                                                                                                                      |
| `scripts/process-execution/**`                          | repository automation 的 process facade、contract、runner、failure、plain-text environment 与根命令 adapter；跨 owner 只消费 `execution.ts`。                                                                                                                                        |
| `scripts/repository-files/**`                           | repository 文件遍历、文本读写和路径 containment；不拥有 JSON validation 或 generic serialization。                                                                                                                                                                                   |
| `scripts/error-message.ts` 与 `scripts/value-guards.ts` | 明确的诊断字符串和值形状小边界；它们是 scripts root 直接拥有的 capability。                                                                                                                                                                                                          |
| `scripts/validation/**`                                 | workspace root、repository layout 与 `documentation/**` 的 docs acceptance workflow、task contract、links、JSON/schema/machine-artifact validation。它调用 `scripts/docs/**` 的 check-only provider，不把 workflow 放回 provider。                                                   |
| `scripts/docs/**`                                       | machine artifact schema/example 与 package Markdown fenced example、JSDoc example、Check guide 的投影或收集 provider；不拥有 package 文档正文或 docs validation orchestration。                                                                                                     |
| `scripts/package/**`                                    | parent owner 持有 public contract、file inventory、Bun pack/digest 与 artifact/candidate/release 共用 package-material audit；`artifact/**` 构建和审计 tarball，`candidate/**` 准备、安装并核对 fingerprint local receipt，`release/**` 验证 clean source、formal version/tag、portable receipt 与 same-artifact Gate handoff，`candidate/external-consumer/**` 拥有隔离 consumer material、typed provider 与 types/documentation/runtime acceptance。candidate fingerprint 有意覆盖整个 package lifecycle 以保守失效。 |
| `scripts/project/**`                                    | 唯一 private candidate consumer root；`gate/definition.ts` 集中拥有 Gate 配置，`gate/run.ts` 是唯一 process entry，`gate/checks/**` 与 `gate/runtime/**` 分别拥有 Check adapter 和 bound runtime mechanics。                                                                          |
| `scripts/decision-records/command.ts`                   | 将仓库根绑定到已安装 decision-records capability 的 repository adapter。                                                                                                                                                                                                             |
| `scripts/test-evidence/command.ts`                      | 当前 test entity discovery、Case 查询与闭合检查的 command/API owner；`catalog/test-support.ts` 仅为它的 node:test fixture setup。                                                                                                                                                    |

`src/index.ts` 是唯一 public 产品入口及 package artifact build/declaration entry。`scripts/project/package.json`
从 exact installed `@zxyycom/vibe-check` candidate 消费该入口；`scripts/package/**` 只负责准备该 candidate，不能
import 或启动 project consumer。artifact/package-API documentation build 与 audit 可以读取各自显式 allowlisted 的
Product source 或 contract material，但不成为 Package Run consumer。产品 runtime、Definition 和 Check 不得依赖
scripts helper、环境状态或 process adapter。

## Root commands

根 `package.json` 只公开下列工作流；内部 `scripts/**` 文件不是第二套根入口。

| Workflow                  | 调用                                                                                                                                          | Owner                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| environment               | `bun run env:setup`；`bun run env:check`                                                                                                      | `scripts/environment/manage.ts`           |
| development               | `bun run format [-- check]`；`bun run lint [-- product \| scripts]`；`bun run typecheck [-- product \| scripts]`；`bun run test`              | `scripts/development/**`                |
| package candidate         | `bun run package:status`；`bun run package:build`；`bun run package:verify`                                                                   | `scripts/package/command.ts`              |
| formal package release    | `bun run package:release:prepare -- --version <0.0.PATCH> --tag <tag>`；`bun run package:release:verify -- --receipt <path>`                   | `scripts/package/release/command.ts`      |
| docs/workspace validation | `bun run validate`；`bun run validate -- docs [json \| schema \| examples \| links \| package-api-documentation]`                           | `scripts/validation/workspace.ts` 与 `scripts/validation/documentation/workflow.ts` |
| governance                | `bun run decisions -- <command>`；`bun run change-plan -- <command>`；`bun run investigations -- check`；`bun run test-evidence -- <command>` | their named owners                        |
| Project Gate              | `bun run verify:vibe-check-workspace`；`bun run verify:vibe-check-workspace:required`；`bun run verify:vibe-check-workspace:full`             | `scripts/project/gate/run.ts`             |

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

### Local post-commit auto-push

`.githooks/post-commit` 是仓库拥有的 Git `post-commit` 入口。Git 不会在 clone 后自动启用版本化 hook；需要该行为的
checkout 必须显式运行 `git config --local core.hooksPath .githooks`，只修改当前 checkout 的本地 Git 配置。使用
`git config --local --unset core.hooksPath` 可以停用它。

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

该 hook 只同步开发分支，不发布 npm package，也不创建 GitHub Release。npm package 仍是产品发布单元；只有未来存在
GitHub-specific 附件或独立 release notes consumer 时，才应单独评估 tag-driven GitHub Release workflow。

## Package artifact 与 candidate

`scripts/package/artifact/**` 从唯一 Product 入口 `src/index.ts` 构造 local candidate。artifact fingerprint
同时绑定 Bun、锁定的 TypeScript emit/parser toolchain、Product source、package scripts 与文档输入。构建过程逐模块生成
`dist/esm/**.mjs`，同时生成 `types/**.d.ts`、对应的源码映射，并复制 package 所属的 `src/**.ts` Product
源码。package 根部的 `index.mjs` 只转发 `dist/esm/index.mjs`；`package.json` 的 `exports` 只开放根路径
`"."`，因此物理存在的 `dist`、`types` 与 `src` 目录不是 consumer subpath API。

逐模块产物保留第三方 package imports；candidate manifest 必须声明完整且可审计的直接运行时依赖要求。依赖的行为 owner
决定使用精确版本还是有界 semver range；candidate installation 必须验证实际解析版本满足声明，随后由实际 consumer
execution 验证这份安装。package tooling 不替依赖 owner 推断额外兼容语义。
local candidate 与 formal release 共用同一 closed generated manifest：user-scoped `@zxyycom/vibe-check`、唯一 root export、MIT、
Bun `>=1.3.14`、canonical `zxyycom/vibe-check` repository、explicit public npm registry/access、allowlisted files 与
完整 production dependencies。manifest 不含 `private`、`bin`、lifecycle scripts、Node host 或 subpath export。
仓库根 [`LICENSE`](../LICENSE) 是 own MIT text owner，当前 notice 为 `Copyright (c) 2026 zxyycom`；artifact 还继续
携带并精确核对实际复制进 tarball 的 Momoa third-party text。SPDX 字段不能替代两份 physical legal-material audit。
artifact audit 在 pack 前验证根入口、公开运行时导出、可解析的相对 `.mjs` 引用、源码映射与 package
源码的一致性、声明与 README 投影以及允许的文件清单；pack 后继续验证 tar inventory、manifest 与摘要。
`scripts/package/candidate/**` 只安装并核对这一个精确 tarball，再把解析到的根入口交给 private consumer；
它不从 repository source 或祖先依赖补偿不完整的 candidate。
`candidate/external-consumer/**` 是 candidate 下级模块：它建立一次隔离安装及 typed material，并分别验证 types、
documentation 与 runtime；父级 candidate lifecycle 不吸收这些验收职责。

### Local candidate lifecycle

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

### Formal release preparation and receipt

Formal release 不复用 local receipt 或把 `0.0.0-local.*` 改名。`package:release:prepare` 要求 caller 显式提供 canonical
positive `0.0.<patch>` 与保守 lowercase tag，并要求 repository root、index 和 worktree 位于同一 clean `HEAD`。这些输入只
选择本地 build identity；命令不会核验 npm 上的版本可用性、publisher authority 或授权状态，也不会把 caller input 变成
registry fact。

一次 active release 的 exact version/tag/access/mechanism 与当次 registry observations 由该 release 的 active Change
evidence 承接，不在本稳定行为 owner 中复制。当前没有 active release Plan；已发布 `0.0.1` 的形成时结果只保存在
[archived release evidence](../changes/archive/publish-public-api-only-npm-package/release-evidence.md#current-scoped-selection)，不得恢复成
后续版本的 selection、availability 或授权。未来执行者必须先建立新的 active release owner，再从其 current evidence 取得
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
结果；receipt 本身仍不证明 Gate 或 registry 状态。`package:release:verify` 只把显式 receipt 交给 full Gate，不查询 registry，
也不发布。

## Project Gate

`scripts/project/gate/run.ts` 是 Project Gate 唯一的 process entry；项目不提供第二个 Gate root command。Gate 源码按责任保持下面的固定布局：

```text
scripts/project/gate/
├── definition.ts        # 全部 Check 选择、配置、profile/tag 与 scheduler 绑定
├── run.ts               # argv、candidate、transcript 与 process exit adapter
├── checks/              # 各 Check adapter；process、test execution 等按领域分目录
└── runtime/             # bound Run、selection、aggregation、result 与 transcript mechanics
```

`definition.ts` 是阅读完整 Gate 配置的入口：普通 process Check 在此显式声明，全部 test Check 由同文件中的闭合表声明，四个 repository-quality Check 的 file selection、area、阈值、waiver 与 finding policy 也在同文件声明；唯一 project-owned `afterGate` 也在这里配置。`checks/**` 只实现这些声明所需的 adapter；`runtime/**` 不另行拥有 Check membership、quality policy 或第二个 Hook 配置面。

一次运行先解析参数并准备 exact local candidate，或在 full profile 下重验显式 release receipt；之后才动态导入 `runtime/bound-run.ts`。这个分层不是第二个运行入口：`run.ts` 必须先确定 candidate，bound Run 才能通过已解析的 package public entry 构造 Project Definition，并验证该 entry 与 prepared candidate 相同。直接从源码静态导入 package implementation 会绕过这个 candidate 边界，因此不允许。

每次 invocation 在 `.log/project-gate/<invocation-id>/` 写入 `gate.log`、一个 Product diagnostic log、标准 `run.json` / `records.ndjson`，以及已启动外部命令的 `process/<check-id>.log`。这些都是本次运行的本地 evidence；不存在 `latest`、retention、quality-only report 或跨 invocation 合并协议。machine files 必须按 [Output](output.md) 的完整二文件集合读取。

### Prepared candidate data

`checks/prepared-candidate.ts` 将 adapter 已准备的 candidate 重新验证为 typed dependency data；artifact acceptance 只消费其 exact artifact、digest、version 与 staging identity。选择 package acceptance 时，`checks/external-consumer-material.ts` 从同一 dependency 建立 invocation-owned external consumer，并让 types、documentation 与 runtime consumer Checks 只读消费已验证材料。`runtime/bound-run.ts` 在 `finally` 中清理这项 lease；测试故障注入和临时材料仍由各自 fixture 拥有。

这些 typed facts 可进入本次 invocation 的 machine evidence，但其中含 invocation-local path，所以不是发布材料或可移植 receipt。formal release 的持久边界仍由上一节的 release receipt 拥有。

### Test execution partition

`checks/test-execution/lanes.ts` 将 Test Evidence 已知的 Bun test files 投影为互斥且非空的 execution lanes；每个文件必须恰好属于一个 lane，未知 Product owner 在启动测试前失败。lane 只拥有测试文件分区，不能隐藏 Gate Check 配置；lane 到 Check ID、显示名、tags、candidate input、mutex 与 timeout 的完整映射位于 `definition.ts`。

Package supporting、candidate/artifact acceptance、三个 external-consumer acceptance、各 Product Check owner、Product runtime、Project tooling、Test Evidence、validation 与 ordinary scripts 分别结算。external-consumer provider 是独立 Check，不伪装成 test lane。

### Profiles and scheduling

参数 grammar 为 `--profile required|full`、可重复的 `--disable-tag <tag>`、受控的 `--enable-tag package-tests`，以及必须单独使用的 `-h` / `--help`。无 profile 时默认 required；同一 tag 不能同时 enable 和 disable。help 在 candidate preparation、package import 和 log directory creation 前退出。

- required 默认不选择 `package-tests`；显式 enable 后选择。full 选择所有未禁用的 package acceptance Checks。
- 两个 profile 都选择四个 `quality` Checks。禁用 tag 时对应 Check 保留 `not-applicable` fact。
- 所有 eligible Check status 进入同一个 `all` aggregate：必须全部 `passed`；`failed` 使 aggregate failed，`unavailable` propagate，`not-applicable` fail，空 selection failed。findings、messages、Records 与 final data 不直接参与 aggregate。
- scheduler 的 root `maxParallel`、每个 Check 的 timeout 和 mutex 都在 `definition.ts` 声明。会改变 package lifecycle 的 Check 共享 lifecycle mutex；会读写 checked-in documentation materials 的 validation Checks 共享 documentation mutex。

完整 tag 集合和可执行例子由 `--help` 输出；root package scripts 使用 mise-bound scanner commands 调用同一个 `run.ts`。

### Direct repository-quality Checks

`definition.ts` 直接声明 `duplicate-detection`、`file-metrics`、`function-metrics` 与 `markdown-link-validation` 的 repository-private options。它们是同一 Project Definition 中的普通 package Checks，不存在父 quality Check、嵌套 Run、第二份配置或独立 quality command。

Gate 对四项使用 non-blocking finding policy：normal findings 保留完整 final data / Records，并由 owning Check 输出有上限的安全摘要；超过摘要上限时只追加精确 omitted count。scanner、source 或 parse failure 仍结算为 `unavailable`。完整 finding facts 以 machine Records 为准。

SCC 与 Lizard executable 只接受 mise 提供的绝对路径；缺失或相对 binding 不回退 ambient `PATH`，而让 owning Check 按 scanner failure 结算。scanner adapter 边界见 [Check-owned scanner dependencies](scanner-dependencies.md)。

### Process evidence

Native docs、Decision Records 与 Test Evidence Checks 不创建单进程 transcript。外部 command Check 必须在启动 child 前写入 running transcript，并在结算后将同一路径改写为 command、stdout/stderr、exit/signal/timeout 与安全 error summary；startup 写入失败时不得启动 child。

Check message 和 failure Record 只引用 invocation-relative transcript path。terminal message 不复制 child output、绝对路径、command arguments、credential URL 或 digest。配置了 timeout 且 facade 明确报告超时时结算为 `process-timeout`；不能可靠分类的 process/log/parse 边界 fail closed 为 `unavailable`。Product diagnostic log、Gate transcript 与 child transcript 各自记录不同层次，不互相解析或复制。

### Gate result post-processing and exits

`runtime/bound-run.ts` 只在 exact candidate 准备后由 `run.ts` 动态加载；它投影 `resolvedEntryPath`、Product `run` 与 `definition.ts` 配置的唯一 `afterGate`。`run.ts` 必须先验证该 entry 等于 prepared candidate 的 exact entry，随后才运行 Product Run、从同一个 RunResult 形成初步 Gate result，并调用该 Hook。默认 Hook 显式调用 elapsed/per-phase performance observer；只有 workload identity 与 checked-in baseline 匹配时才比较，其结果是 advisory，不能修改 Check facts、aggregate 或 process exit。

`afterGate` 是 result post-processing，不是 Check `preflight`：后者是 Product Run 内每项 Check 在 execution 前的 options 准备边界，而前者只在整个 candidate-backed Run 已形成初步 Gate result 后执行。Hook 是受信任的项目 JavaScript/Bun 代码，可同步或异步执行项目授权范围内的工作；它不是 package API、plugin、sandbox 或 registry，也没有 `beforeGate` 对应物。正式配置只在 `definition.ts`，`run.ts` 的 loader、clock 与 transcript injection 仅为 adapter 测试 seam，不能用作另一配置入口。

Hook 必须返回闭合的 `{ status, messages }`，且不能改写 context 或 RunResult；抛错或返回非法 shape 时 fail closed 为 `unavailable`。最终 `passed`、`failed`、`unavailable` 分别映射 exit `0`、`1`、`2`。参数、candidate、import、entry identity、log setup 或 execution boundary 在形成初步结果前失败时也映射为 `2`。

`gate.log` 从 transcript 成功建立后开始，将 Gate stdout/stderr 同步送往终端并保存为 plain tagged lines。成功关闭时追加 invocation directory、唯一最终 result 与 exit；关闭失败时即使 Product Run 已结算，也返回 `unavailable` / exit `2`。Gate 不解析 Product log、machine files 或 child transcripts 来重建结果。

## Documentation, validation, and package material

package API 文档按下列 owner 维护：

| 内容 | 可编辑事实源 | 投影或发布结果 |
| --- | --- | --- |
| README 与深入机制正文、标题和链接 | package root `README.md`、`docs/api-mechanics.md` 的 projected example fence 之外 | 同一 checked-in Markdown 直接进入 package。 |
| Check guide | [package README 的随包 Check 索引](../README.md#随包提供的-check)所链接的对应 guide | 同一 checked-in Markdown 直接进入 package。 |
| 可执行 API 示例 | `docs/examples/package-api/*.ts` 的 allowlisted file 或 region | projection registry 指定的自然 Markdown heading 下的唯一 TypeScript fence，或 source JSDoc `@example` tail。 |
| declaration 说明 | declaration owner 中 managed `@example` tail 之前的 source JSDoc prose | emitted declarations 保留该说明和投影后的示例。 |

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
bytes；installed consumer typecheck 直接检查 Definition，documentation acceptance 还用 candidate runtime 执行它并核对
documented built-in/custom facts、RunResult messages 与 machine publication。legacy schemas、historical examples、generator sources 与 validation scripts 不进入
package。

Documentation validation library functions 返回 Promise，调用方必须等待 completion；它们只通过 `validateDocs({ report })` 的显式 reporter 发布成功消息。不提供
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

Product Check 的 scanner command、availability command 和 unavailable behavior 仍由
[Check-owned scanner dependencies](scanner-dependencies.md) 所列的各 Check owner 定义；Gate 不创建第二套 scanner workflow。

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

涉及 Gate 或多个 owner 时运行 required；涉及 package artifact、candidate 或外部 consumer 时运行 full：

```bash
bun run verify:vibe-check-workspace:required
bun run verify:vibe-check-workspace:full
```

报告实际运行的检查及未运行项。
