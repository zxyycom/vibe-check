# 0.0.2 发布证据

本文汇总本次发布输入与已取得的结果，详细实施顺序由 [design](design.md)拥有。当前已完成源码差异调查、changelog、随包映射与说明终审，并按授权提交发布规则和打包改动；正式源码尚未冻结，0.0.2 尚未发布。

## 输入与选择

| 输入 | 已有依据与本次状态 |
| --- | --- |
| package / version | `@zxyycom/vibe-check@0.0.2` 已确定。 |
| 发布分支与工作区 | `release-0-0-2` 已创建并检出；复用 `/workspace/vibe-check` 为唯一 Change 实现工作区。固定 S 的独立发布工作区尚未创建。 |
| 当前集成基线 | `main` / `c0af9fff429ea22602432b542f743af29f305fa4` 未变；发布分支从该提交分出，准备改动在该分支维护，已提交里程碑见下节记录。 |
| 升级差异依据 | `v0.0.1` 的 source 为 `2a454f0a6162afebb6729a4cfef969594d045c10`，调查端点为 `c0af9fff`；结论见[调查报告](../../docs/investigations/audit-0-0-2-upgrade-differences.md)。 |
| 升级说明 | 统一由[变更日志](../../docs/changelog.md)承接；内容已通过历史重审和独立语义复核，已确定随包交付并由 README 直链；版本内容、发布状态与链接已完成 2.1 独立终审；后续若再改发布材料，须重审受影响部分。 |
| npm dist-tag | 历史记录确认 `0.0.1` 使用 `latest`；本次是否沿用待确认。 |
| access / 发布产物 | public access 与发布同一受验 tarball 已由当前 Decision、manifest 和发布规则规定。 |
| 认证执行方式 | 上次采用用户本地直接发布、交互式 2FA；本次方式待确认，权限须当次核验。 |
| Git 版本标签 | 本次计划为 `v0.0.2` → S，在发布与分发验证后按授权创建、推送。 |
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

## 待取得的发布结果

- 正式 source S、冻结发布工作区的位置、0.0.2 tarball/receipt 路径和 digest。
- 同一正式包的完整 Gate 与 external consumer 验收。
- 临发布 registry version/dist-tag、publisher 核验与精确发布授权。
- 发布结果、registry integrity 对账和精确版本安装验收。
- artifact/log 持久保存、源码标签与 main 合入/验证结果。

后续结果在 Change 工作区记录时间、来源与结论；构建和验证输出保留在冻结工作区的受控位置，并在释放前完成所需持久保存。源码 S、后续证据提交和 main 合入提交分别记录。
