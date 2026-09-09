# 0.0.2 发布证据

本文汇总本次发布输入与已取得的结果，详细实施顺序由 [design](design.md)拥有。0.0.2 已发布且分发验收通过，源码标签已推送并确认指向 S，本地 main 合入与完整 Gate 通过；本轮未推送 main 或清理 Change/工作区。

## 输入与选择

| 输入 | 已有依据与本次状态 |
| --- | --- |
| package / version | `@zxyycom/vibe-check@0.0.2` 已确定。 |
| 发布分支与工作区 | `release-0-0-2` 在 `/workspace/vibe-check` 完成实现与证据维护，同一 checkout 用于 main 快进集成；独立 detached 发布工作区为 `/workspace/vibe-check-release-0-0-2-ddff63fa`。 |
| 正式源码 S | `ddff63faf087a7949239d777729878988e641226`，冻结前 worktree 与 index 干净；不是 Plan 基线或后续证据提交。 |
| main 集成轨迹 | 本地 main 从 `c0af9fff429ea22602432b542f743af29f305fa4` 快进合入 `4bb74e485d0a5047606bac28321ddb4214e52c02` 并完成验证，其后仅补齐本 Change 交接记录；远端 main 未推送。 |
| 升级差异依据 | `v0.0.1` 的 source 为 `2a454f0a6162afebb6729a4cfef969594d045c10`，调查端点为 `c0af9fff`；结论见[调查报告](../../docs/investigations/audit-0-0-2-upgrade-differences.md)。 |
| 升级说明 | 统一由[变更日志](../../docs/changelog.md)承接；内容已通过历史重审和独立语义复核，已确定随包交付并由 README 直链；版本内容、发布状态与链接已完成 2.1 独立终审；后续若再改发布材料，须重审受影响部分。 |
| npm dist-tag | 已按固定发布约定发布，registry `latest` 已指向 `0.0.2`。 |
| access / 发布产物 | public access 与发布同一受验 tarball 已由当前 Decision、manifest 和发布规则规定。 |
| 认证执行方式 | npm 官方浏览器登录成功，`whoami` 为 `zxyycom`，目标包权限为 `read-write`；用户自行完成发布 2FA。未采集认证秘密。 |
| 归档位置 | 按固定规则使用 `/workspace/vibe-check/.git/vibe-check/releases/0.0.2/a3d71ffe28926673d91dc96b22a043fce3f32d5ba28b0c12212d89c31fbe55e5/`；归档结果见下节。 |
| Git 版本标签 | `v0.0.2` 已创建并推送，远端解引用确认为 S；tag object 为 `d690ca8faba030f3b60f9e8bd03efcaf0fe8de39`。 |
| GitHub Release | 上次没有创建，本次不默认新增此渠道。 |

上次方式的历史依据是 `d8d50978:changes/archive/publish-public-api-only-npm-package/release-evidence.md` 的 “Current scoped selection”、“Publication and registry acceptance” 与 “Git release identity”。本轮只从 Git 恢复该记录；它解释已有方案，不证明本次账号、registry 状态或授权。

## 分支准备与归属

2026-09-09 按用户授权执行 `git switch -c release-0-0-2`，沿用当前实现工作区，不另建重复 checkout：

- 切换前 21 个变更文件均归入本次准备：升级调查与说明、release Plan/evidence、分支及发布流程 Decision、Package 文档拆分与相应导航、Case 和派生索引；未发现需排除的其他来源改动。
- 切换后逐文件核对 SHA-256 与文件模式，21 个文件保持一致；工作树变更清单及空暂存区不变，`HEAD`、`main` 与 `origin/main` 仍为上述基线。随后仅更新本 Change 的当前状态与 0.4 进度。
- 其他已有分支/worktree 未修改；未执行 stash、清理、暂存、提交、推送、tag 或发布。此处的分支基线不是已冻结的正式源码 S。

## 历史重审

2026-09-09 按用户要求由 Terra 分别承担历史重审写作、仓库工具历史核对与非实施语义审查：

- 审阅 `2a454f0a..c0af9fff` 的 213 个可达提交目录与提交信息，按主题回看相关实际 diff、部分形成时 Plan/Decision 和当前行为 owner；不是逐行审计全部历史代码。代表性 `commit:path` 及读取方式见下节[形成时材料](#形成时材料)。
- 当轮先形成详细变更与升级摘要两份草稿。补足 Check、调度/flags、输出、缓存、已采用的私有优化、Gate/package 工具和治理变化，区分旧有能力与未采用实验；修正 Node engine、jscpd 依赖身份/版本范围、Function Metrics Records 和 performance workflow 的边界。
- 独立审查提出的实质问题由原作者修复，定向复核已通过。前轮[调查报告](../../docs/investigations/audit-0-0-2-upgrade-differences.md)保持形成时记录，不覆盖成此次新认识。
- 已运行 `bun run validate -- docs`、Change Plan check、`git diff --check`，均通过；普通 `bun run check` 为 31 passed、5 not-applicable、0 failed/unavailable。Gate 日志位于 `.log/project-gate/2026-09-09T02-27-59.645Z-3127918-2eb54b1f-d313-4c16-a7f1-f9fc9025ba00`；该 Gate 在本段及 1.1.1 进度回填前执行，回填后另跑文档与 Plan 检查。
- 本轮只更新 Change 内两份说明及 proposal/design/tasks/evidence；未修改 Product 或测试正文，未暂存、提交、推送或发布。普通 Gate 未选择 5 项 package acceptance；未运行正式 `--all`、正式 tarball、registry 或下游迁移验证，不能据此宣称完成发布验收。

## 形成时材料

以下材料已在历史重审中读取，并核对其路径可恢复。用 `git show <commit>:<path>` 查看；材料解释形成时范围，
最终变化以两端源码和当前行为 owner 交叉核对。

```text
54336c4e:changes/archive/allow-explicit-run-output-directories/design.md
72722d6f:changes/archive/provide-caller-keyed-json-cache/design.md
29438d69:changes/archive/prioritize-ready-check-admission/design.md
73a1d239:changes/archive/adopt-node-execution-backend/design.md
e2bad655:changes/archive/compare-lizard-python-typescript-performance/design.md
dd9635d0:changes/archive/optimize-lizard-reader-resolution/design.md
cea4d1db:changes/optimize-admission-core-selection-index/design.md
```

它们分别支撑输出目录、缓存、priority、Node 宿主、性能测量和两项私有优化的范围判断。
另参考了依赖终态、flags/effective selection 的历史 Decision，以及秘密检测、命名资源、Gate 集中化和包法律材料的设计。

本轮整理采用以下区分：

- `v0.0.1` 已有通用 `reconcileFindingWaivers`、exact candidate binding、receipt/reuse/reinstall/rebuild、
  调用日志和 Gate 退出码；正文只将对应内置 Check 接入和验收增强列作变化。
- priority 早期设计包含的 reservation 细节仅是形成时方案；最终调度边界以当前指南为准。
- `fd8923c8` / `c0af9fff` 的末轮启发式候选未采用；这与先前已落地的 reader fast path、selection index
  和调度扩展分别记录。历史测量未建立跨环境性能 SLO。
- `jscpd` 在发布 manifest 中是正常 runtime dependency（`^5.1.1`），仓库开发版本锁定为 `5.1.1`；
  package Node engine 是 `>=24.18`，与根仓库开发 engine 分开核对。

## 说明结构复核

2026-09-09 按 ai-ready-docs 重整两份说明：changelog 聚焦产品与仓库净变化，升级汇总合并重复迁移步骤，
形成时材料归入本页。两文字符数（含 Markdown）分别由 `12983`、`2665` 收敛为 `6718`、`1291`。
独立 Terra 审查通过，并确认可从两文及链接恢复环境要求、依赖选择、flag 传递、Record 变化与证据边界。

`bun run validate`、Plan check 与 `git diff --check` 通过；普通 Gate 为 31 passed、5 not-applicable。
日志：`.log/project-gate/2026-09-09T02-34-35.587Z-3132239-a64263b9-1324-4595-90dc-b54b4972f84f`。
本段为验证后的回填，回填后另跑文档与 Plan 检查；本轮仅修改两份说明及本页，正式发布验收仍待执行。

按用户后续选择，发布说明已收敛为单份 changelog：保留分主题升级影响与最小安装/回归提示，
删除独立升级汇总并同步 Plan 引用。前述两份草稿的审阅记录保留为形成时证据。

## 随包变更日志与发布映射

2026-09-09 按用户选择将 changelog 移至 [docs/changelog.md](../../docs/changelog.md)，由 README 直链并随包提供。
[package-documents.json](../../docs/package-documents.json) 统一声明 Markdown、Check 指南和 machine 材料的源文件与包内路径；
构建、fingerprint、包内链接及包材料验收读取本次 repository root 的同一映射。本次保留现有目标路径，
配置自身未列入发布文件。长期方向分别见[随包 changelog](../../docs/decisions/ship-changelog-with-package.md)
与[JSON 映射](../../docs/decisions/configure-package-document-mappings-in-docs.md) Decision。

- Terra 实施 JSON 映射与目标测试，非实施 Terra 从实际 diff 复核代码、用户/内部文档、Case 与两个 Decision，最终通过。
  复核中修正了非法配置测试的 fixture 污染，并补齐 machine Markdown 在 schema 重定位后的包内链接校验。
- 最终 `bun run check -- --all` 为 36 passed、0 failed/unavailable/not-applicable；
  日志：`.log/project-gate/2026-09-09T03-25-07.825Z-3221751-5aebb563-b4fb-46f7-8874-ed916d70197b`。
  `bun run validate`、Case check（595 entities / 135 Cases）、Change Plan check 和 `git diff --check` 通过。
- local candidate 为 `0.0.0-local.9875059e37d6`，`package:status` 确认 current。
  对配置中的 28 个文件逐项直接比较 source、staging、tarball 与 installed bytes，全部一致。
  tarball：`build/artifacts/zxyycom-vibe-check-0.0.0-local.9875059e37d6.tgz`；本次包不含配置 JSON 自身。
- 上述完整 Gate 验证的是开发期 local candidate，不是正式 `0.0.2` receipt 或 registry 分发。
  Gate 后建立两个 aligned Decision 并回填本段及任务进度；随后另跑文档、Decision、Case、Plan 与 diff 检查。
  未执行 Git 暂存/提交、冻结工作区、tag/push 或 npm publish。

## 提交前终审与准备提交

2026-09-09 用户授权将已核对的本轮改动提交 Git。changelog 补齐随包日志、JSON 映射及发布流程调整，
版本标题仅标 `0.0.2`，保留“正式发布后”的安装提示，不宣称 registry 已有该版本。独立 Terra 终审通过，
2.1 已完成；正式包、临发布核验与分发验收继续由 2.2–2.5 承接。

- `5251ad40`：发布冻结规则、无前缀分支与 Package 文档职责拆分。
- `45b37d81`：JSON 发布映射、随包 changelog、目标测试及对应文档/Decision。
- 当前 Plan 与调查证据另行提交；AGENTS 路由调整仅保留独立 Draft，AGENTS.md 本身与原基线一致。
- 重新运行 `bun run check -- --all`，36/36 passed；local candidate 为 `0.0.0-local.08ea9f1a6a05`。
  日志：`.log/project-gate/2026-09-09T03-42-31.652Z-3234737-3e763eb4-c2d7-406b-900f-f0bd595dd4b3`。
  Gate 在本段及任务回填前执行，回填后另跑文档、Decision、Case 与 Change 检查。
- 提交沿用 `release-0-0-2` 分支。post-commit hook 按既有规则跳过非 main 分支，未尝试 push。
  本轮提交不是选定正式 source S，也不构成冻结工作区、联网认证、发布、标签或合入授权。

## 固定发布流程

2026-09-09 用户确认 latest、本地交互式 2FA，并要求后续沿用持久流程。
[Package release](../../docs/tooling/package-release.md#固定发布约定)现拥有固定选项与归档规则，Change 只记录解析后的输入、当次事实和执行结果。
本轮不创建冻结 worktree、不运行正式 prepare、不读取认证、不发布、不写归档；具体结果仍在后续步骤核对。

- 非实施 Terra 基于实际 diff 复核固定选项、归档可恢复性、授权边界与既有冻结规则，审查通过。
  [固定流程 Decision](../../docs/decisions/standardize-package-release-procedure.md)已建立为 active / aligned。
- `bun run check` 为 31 passed、5 not-applicable、0 failed/unavailable，验证对象仍是开发期 local candidate。
  日志：`.log/project-gate/2026-09-09T03-52-23.159Z-3240873-ecfcf42f-6153-4875-be3c-15fd298a533e`。
  Gate 后澄清摘要核对句、建立 Decision 并回填任务与证据，另跑文档、Decision、Plan 与 diff 检查。

## 正式源码冻结、同包验收与归档

2026-09-09 用户授权开始冻结、正式 prepare/verify 和证据保存，未授权本轮发布、标签推送或合入。
当前发布准备提交为 `ddff63fa`（固定发布流程与证据归档约定）；冻结前工作树和索引干净。
从 Plan 基线到 S 的五个准备提交已逐项审阅，内容为本次发布准备及独立 AGENTS 路由 Draft；当前 Plan 继续成立，未机械刷新基线。

- 以完整提交 `ddff63faf087a7949239d777729878988e641226` 建立独立 detached worktree
  `/workspace/vibe-check-release-0-0-2-ddff63fa`，已有工作区与 `main` 未动。
- 在冻结工作区执行 `bun run env:setup`，完成锁定工具、依赖、CodeGraph 和开发期自举；pnpm 复用 133 个依赖，下载 0 个。
  自举的 local candidate 不作为正式包证据。正式 Gate 通过 mise 使用 Node `v24.18.0`、Bun `1.3.14`，环境为 Linux x86_64。
- 执行 `bun run package:release:prepare -- --version 0.0.2 --tag latest`，随后执行
  `bun run package:release:verify -- --receipt build/releases/zxyycom-vibe-check-0.0.2.release.json`。
  完整 Gate 显式报告 `candidate=0.0.2`、`source=release-receipt`、`selection=all`；
  36 passed、0 failed/not-applicable/unavailable，Product Run 耗时 31.6 秒。
  package artifact 以及 external consumer 的 types、documentation、runtime 验收全部通过。

### 正式产物身份

下列产物和日志路径相对冻结工作区；归档内保留相同相对路径。

| 项目 | 实际值 |
| --- | --- |
| tarball | `build/artifacts/zxyycom-vibe-check-0.0.2.tgz`；1,168,284 bytes，inventory 1,271 个文件。 |
| receipt | `build/releases/zxyycom-vibe-check-0.0.2.release.json`；schemaVersion 3。 |
| source fingerprint | `08ea9f1a6a0569059c9b3512b690623baa43a2fb3f5122edff6d14bbad7e04ad` |
| tarball SHA-256 | `6e92f55938388f7671d44e5d739a2ac8bcabfdcf848572ec6b1af7dca2af0751` |
| tarball SRI | `sha512-g5em+Q6vMhhq0BL7tdSJKihSk3LAQRI7MJU0s/FWHIJXcqvDQo7V02bCcaz482GzPYuoJswJE/5mK32rRKq1NA==` |
| receipt SHA-256 | `a3d71ffe28926673d91dc96b22a043fce3f32d5ba28b0c12212d89c31fbe55e5` |
| Gate 日志 | `.log/project-gate/2026-09-09T04-26-48.485Z-3256081-e933947f-10ce-4378-86f1-634a29eb266e/` |

另行直接核对 tarball 的 SHA-256、SRI、manifest version、完整 inventory 与 receipt；
JSON 映射中 28 个材料的 source、staging、tarball 和 installed bytes 全部一致。
正式构建及 Gate 后，冻结 worktree 和 index 仍干净，HEAD 仍为 S。

### 已保存范围与剩余边界

按“输入与选择”中的固定槽位保存原始 tarball、receipt 和 31 个 Gate 日志文件，共 33 个文件，复制后逐文件核对摘要一致。
归档前审阅文件范围并对 receipt、tar 内容和日志执行常见凭据特征筛查，未发现匹配；未读取认证配置或执行登录，未纳入 `.npmrc`、OTP 或登录会话记录。
本次证据在完成文档与 Plan 检查后，以 `evidence/<sha256>.md` 保存不可覆盖的非敏感快照。
该目录是本地归档，不是另一个正式 verify 工作区，也不代表跨机器备份。

本轮只在 Change 实现工作区更新 design、tasks 与本文；未修改冻结源码、重新打包、Git 提交、tag/push、合入或 npm publish。
当前 Gate 证明本地正式包，不证明 registry 版本可用、publisher 权限或发布后安装结果。

Change 回填后，文档、Decision、Plan（13/19）和 diff 检查通过；实现工作区另跑 `bun run check`，
31 passed、5 not-applicable、0 failed/unavailable，日志为
`.log/project-gate/2026-09-09T04-30-27.945Z-3261893-639271af-ad1d-48c9-834c-75dfd4f2fd24/`。
这轮是回填材料的开发期 Gate，不替代上面的正式包验收；补记本段后再次核对文档、Plan 与 diff。

## npm 发布与分发验收

2026-09-09 用户在取得包身份、权限核验结果后，明确授权发布同一份 `@zxyycom/vibe-check@0.0.2` tarball，使用 public access 与 latest。
先前 `npm whoami` 曾返回 401，重新完成官方浏览器登录后确认为 `zxyycom`；
`npm access list packages zxyycom @zxyycom/vibe-check --json` 返回目标包 `read-write`。
用户要求只提供认证 URL、不自动打开；正式 publish 使用 `--browser=false`，由用户在 npm 官方页面完成 2FA。
本文不保存一次性认证 URL、token、OTP、认证配置或登录会话 transcript。

### 临发布复核与发布结果

- 再次通过同一 receipt 的 `package:release:verify`：36 passed、0 failed/not-applicable/unavailable，耗时 19.4 秒。
  日志：`.log/project-gate/2026-09-09T04-40-41.274Z-3270724-b7311458-c1b9-46c6-85ce-48cba9ab87e4/`，位于冻结工作区。
- 临发布 `whoami` 与目标包读写权限再次核验成功；registry 当时 `latest=0.0.1`，版本集合没有 `0.0.2`。
  冻结 S、receipt 和 tarball 未变，未重新打包。
- 在冻结工作区通过 npm 发布受验 `.tgz`，显式指定 `--tag latest --access public --registry=https://registry.npmjs.org/`；
  禁用 lifecycle scripts 与自动打开浏览器，并以 `--logs-max=0` 禁止 npm 写 debug 日志。用户完成 2FA 后命令退出 0，报告 `+ @zxyycom/vibe-check@0.0.2`。
- registry 记录的发布时间为 `2026-09-09T04:45:22.801Z`；发布后读取 canonical package metadata，确认 `latest=0.0.2`，
  `versions["0.0.2"].dist.integrity` 与上节 receipt 的 SHA-512 SRI 完全一致。
  正式分发地址为 [npm 0.0.2 tarball](https://registry.npmjs.org/@zxyycom/vibe-check/-/vibe-check-0.0.2.tgz)。

### Registry 精确版本安装验收

- 从上述 registry 地址下载 `.tgz`，与受验原包逐字节相等，SHA-256 仍为 `6e92f55938388f7671d44e5d739a2ac8bcabfdcf848572ec6b1af7dca2af0751`。
- 在仓库祖先之外新建 `/tmp/vibe-check-registry-0-0-2-pn98BI`，通过 pnpm 从 canonical registry 安装精确 `@zxyycom/vibe-check@0.0.2`，
  不使用本地 tarball 替代 registry 安装，不允许 lifecycle scripts。若干依赖请求曾出现 socket 错误，pnpm 自动重试后成功；
  最终复用 113、下载 1、添加 114 个包。pnpm loose mode 为刚发布的精确版本在该临时 consumer 内自动记录 minimumReleaseAgeExclude，仓库配置未改。
- 基于冻结工作区已有 external-consumer fixture 与 assertion，在 registry 安装目录上重新运行公开类型、已安装文档与可执行示例、
  runtime 与 dependency containment 验收，全部通过；使用 mise Node `v24.18.0`、Bun `1.3.14`，环境为 Linux x86_64。
  root entry 实际解析到该 consumer 的 `node_modules/.pnpm/@zxyycom+vibe-check@0.0.2/node_modules/@zxyycom/vibe-check/index.mjs`。
- 将 registry tarball 的全部 1,271 个文件与实际 installed package 比较，bytes 全部一致；README、changelog、公开类型与代表性 Check 验收均由上述材料覆盖。
  临时验收脚本复用现有断言，不新增仓库测试节点，也不把临时 consumer 当作长期证据 owner。

发布后已将临发布完整 Gate 的 31 个日志文件复制到原归档槽位，逐文件核对摘要；在完成文档与 Plan 检查后追加新的 `evidence/<sha256>.md` 快照，保留发布前快照。
认证 URL、OTP、token、认证配置和登录会话 transcript 不进入归档。源码 S、receipt 与正式 tarball 不变。
本轮没有创建或推送 `v0.0.2`，未提交这些 Change 更新，未合入 main，也未清理工作区或 Change。

发布结果回填后，文档、Decision、Plan（16/19）与 diff 检查通过；实现工作区的开发期 Gate 为 31 passed、5 not-applicable、0 failed/unavailable。
日志：`.log/project-gate/2026-09-09T04-49-01.365Z-3275445-f2ddd048-6608-468b-b61d-eb7a27381af4/`。
补记本段和当前输入状态后再次运行文档、Plan 与 diff 检查，随后保存本次 evidence 快照。

## Git 标签与 main 交接

2026-09-09 用户授权提交发布证据、创建并推送指向 S 的 `v0.0.2`、合回本地 main；本轮不额外推送 main，也不清理 Change、分支或工作区。

- 发布证据提交：`053ec6f147242a3f705ad93a0ee0cbe7ec42be42`，仅包含本 Change 的 design、tasks 与 evidence。
- 创建 annotated tag `v0.0.2`，tag object 为 `d690ca8faba030f3b60f9e8bd03efcaf0fe8de39`，
  指向 `ddff63faf087a7949239d777729878988e641226`；不是发布后的证据提交。
- 配置的 SSH 连接在认证前被关闭；同一 GitHub 仓库的 HTTPS 可读。使用本机已登录 GitHub CLI 的标准凭据助手完成单次 HTTPS tag push，
  不读取 token，不修改 origin、全局 Git 配置或 SSH 主机信任。没有 force、删除或覆盖已有 tag。
- 推送后通过同一仓库的 `ls-remote` 核对 tag object 与 peeled commit，均与本地一致。
  远端 main 当时仍为 `c0af9fff429ea22602432b542f743af29f305fa4`，与本地 main 相同；本轮 tag push 未移动 main。

### 本地 main 集成与最终核对

- 标签交接记录提交为 `4bb74e485d0a5047606bac28321ddb4214e52c02`。本地 main 从 `c0af9fff` 通过 `git merge --ff-only release-0-0-2` 合入该节点，
  没有冲突或额外 merge commit；版本标签始终指向 S，不指向这个发布后提交。
- 合入后运行 `bun run check -- --all`：36 passed、0 failed/not-applicable/unavailable，耗时 21 秒。
  日志：`.log/project-gate/2026-09-09T04-57-43.085Z-3280154-c58d4138-0560-4273-84dd-edb96a07df42/`。
  这是 main 的开发期 local candidate 完整 Gate，不替代前述已发布正式包证据。
- 完成记录仍在 release 分支提交，再由 main 快进接收；这次补记只改变本 Change 的 Markdown，另跑文档、Plan、Decision 与 diff 检查。
  发布分支提交的 post-commit hook 按既有规则跳过 main 自动推送，main 快进不创建提交；本轮未额外推送 main。
- 本 Change 的 19 项任务均已有事实依据。changelog 已随 registry 包提供；原始包、receipt、两轮正式 Gate 及 evidence 快照已保存并核对摘要。
  main 集成日志与最终 evidence 快照追加到同一归档槽位，保留前序快照。冻结工作区仍干净并保持 S。

## 后续授权边界

本轮保留 Change 目录、发布分支、冻结工作区与隔离安装 consumer；没有运行 Change complete 或清理。
远端 main 推送、Change 完成删除、工作区和分支释放均作为后续独立授权动作，不从本次发布或合入成功推导授权。
