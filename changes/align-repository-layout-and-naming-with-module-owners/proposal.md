# Proposal

本 proposal 计划在首次公开发布前，以受控迁移让 Product source 与 repository scripts 的目录、文件名、入口名和依赖层级共同表达模块 owner。

## Why

当前 Product runtime 独占 `src/`，却整体位于唯一的 `src/product/` 子目录；public package entry 则由 `scripts/package-candidate/entry.ts` 拥有。Product 内部的 `quality-core/` 同时容纳 Core facts、built-in Check execution、input、measurement、output 和已退役 scan-command 命名，多个同级职责被历史包装层合并。

Repository automation 也存在同类问题：quality 与 Project Gate 作为同一个 private package consumer 下的两个 Project Run，却分布在 `scripts/quality/**`、`scripts/quality/project-gate/**` 和 `scripts/project-gate/**`；package candidate 通过 `run-quality.ts` 反向启动 consumer；已经迁入主仓的 foundation 和 validators 仍留在 `scripts/tools/**` 与历史 package-shaped `src/test` 层级。路径可以找到实现，但不能稳定回答谁拥有入口、配置、运行和失败反馈。

活动未对齐决策 `align-source-layout-and-naming-with-module-owners.md` 已确认目标方向。首次公开 package 尚未发布，当前是消除 repository-internal 路径与命名债务、建立唯一 source entry 和 package artifact owner 的最低兼容成本窗口；结构迁移除明确退出临时 Product CLI diagnostic 外，不能夹带 Product contract、scanner、Gate 或 registry 行为变化。

## Outcome

`src/` 与 `scripts/` 成为两棵按模块 owner 组织并以领域职责命名的源码树：Product 从唯一预批准的 `src/index.ts` 提供 public entry，Definition、Checks、Core、Run、Output 与 Scheduler 处于匹配架构责任的层级；其它源码与脚本入口使用能够说明行为的 basename，不以 `index.ts` 代替命名。Repository quality 与 Project Gate 位于同一 private project consumer 下，package artifact 与 local candidate lifecycle 单向分层，共享 foundation、validation、docs、decision 与 test-evidence 能力各有明确 owner。除退出临时 CLI diagnostic 外，迁移前后的 public runtime/type inventory、Project Definition、Run、machine publication、candidate tarball 与 Gate facts保持一致。

## Scope

### Intended Change

- 取消只有一个 source category 的 `src/product/` 包装层，把 `src/` 建立为唯一 Product runtime source root，并将 package public entry 从 scripts staging 移到 `src/index.ts`。
- 将现有 Product 源码按 `contract`、`definition`、`checks`、`core`、`run`、`output`、`scheduler` 与 `foundation` 重组；拆开 `quality-core` 中实际同级的职责，并统一测试共置方式。
- 删除只返回迁移提示的临时 Product CLI diagnostic、`product:cli` root command、当前 CLI owner 文档和对应语义 Case；不建立 `legacy-cli` 目标模块。
- 将 scripts 按 `development`、`environment`、`foundation`、`validation`、`docs`、`package`、`project`、`decision-records` 与 `test-evidence` 组织；脚本命令使用描述具体行为的文件名，不保留无 owner 的 `tools` 容器、顶层命令单文件或机械 `index.ts`。
- 同时审查目标目录名、basename 和主要导出名；`src/index.ts` 是当前唯一预批准的 `index.ts`，其它例外必须由实际外部消费契约逐项证明并写入 owner 文档与验证。
- 已在本 Change 的 `readiness/**` artifacts 固化迁移前基线、322 项逐文件 layout/naming ledger、ledger schema 和受影响 active Change handoff；start gate 已通过，本 Plan snapshot 提交后从 Implementation 1.1 开始。
- 在 `scripts/project/` 建立唯一 private candidate consumer root，使 `quality` 与 `gate` 成为同级 Project Run；把 locked quality workflow 归给 quality，使 package candidate 不再反向调用 consumer。
- 把 package build/manifest/pack/audit 与 local candidate cache/receipt/install 分别归入 `scripts/package/artifact` 和 `scripts/package/candidate`；两者共同构建 `src/index.ts`，不建立 registry release adapter 或第二 artifact pipeline。
- 同步所有当前 import、root commands、tsconfig、lint/format/test scopes、package API docs registry、owner 文档、测试实体与语义 Case、active Change handoff 和验证入口；archive 保留形成时路径。
- 迁移改变路径、命名、entry ownership 和必要的模块内文件拆分；除删除临时 CLI diagnostic 外，不改变 public symbol/type set、Project Definition/Run、scanner、cache、publication、quality、Gate、package version、license、host support 或外部发布授权。

### Resulting Impacts

- 全部 Product 与 scripts 相对 import、动态 entry URL、source discovery、declaration root、package candidate fingerprint、private install root、ignored local state 和 root package-script target 必须同步迁移。
- 逐文件 ledger 必须把旧路径、目标 owner、目标 basename、主要导出、命名理由和允许的泛化名称例外作为同一条迁移事实；目录正确但文件或导出名称仍不能表达责任不算完成。
- Readiness artifacts 随 Change 保存可交接摘要与结构化映射；大型日志留在对应工具 owner 的 ignored output，只记录可复核路径、digest 与结果，不能把聊天记录当迁移依据。
- public declaration entry 从 scripts staging 路径收敛到 Product source entry；tarball 内部 declaration 路径可以变化，但 approved runtime/type inventory 和 isolated consumer behavior 必须保持不变。
- repository quality 与 Project Gate 共用的 physical candidate installation 将迁到 `scripts/project/` private consumer root；旧 receipt 和 local installation 必须 fail closed 或由新 fingerprint 安全重建，不能复用路径不匹配的 candidate。
- 测试文件路径或 basename 变化会改变 Test Evidence entity identity；删除 CLI test 还会退出对应 Case。当前 Case Owner/Proves、runner profile 和 focused verification commands 必须原子同步，不能留下悬空、重复或已退役实体。
- `AGENTS.md`、Navigation、Architecture、Coding Style、Script Tooling、Testing 与相关领域 owner 必须描述目标结构和依赖方向；active Change 中仍作为未来实施输入的旧路径假设必须复核，archive 与 established Decision 的形成时背景不做机械重写。
- 发布 Draft 只能消费本 Change 完成后的 exact candidate 与新路径 handoff；本 Change 不查询 registry、读取 credential、选择正式版本或执行 publish。

## Success Criteria

- tracked current source 中不再存在 `src/product/**`、临时 Product CLI diagnostic、`scripts/tools/**`、`scripts/package-candidate/**`、`scripts/quality/project-gate/**`、`scripts/project-gate/**` 或顶层 `scripts/*.ts` command entry；形成时 archive 不参与该断言。
- `src/index.ts` 是唯一预批准的 `index.ts`；其它 current `index.ts` 必须具有逐项记录的外部契约例外，否则全部改为描述具体职责的 basename。不存在未经 ledger 审核的 `current/model/types/common/shared/utils/helpers/tools/workflows` 等泛化名称。
- `src/index.ts` 是 package artifact 的唯一 runtime/declaration build entry；Product source 不导入 `scripts/**`，普通 repository Project Run 只从 exact installed `vibe-check` package 消费 public API。
- Product 与 scripts 的 runtime value-import graph 都没有循环 SCC；同级 module owner 位于同一父目录，package 不反向调用 project consumer，`tools/shared/workflows` 等无界容器没有被重新建立。
- 迁移前后的 public runtime exports、public declarations inventory、Project Definition/Run results、machine v4 bytes、candidate allowlist/digest inputs、quality facts 与 Project Gate aggregation/exit mapping 通过同输入对照。
- 当前 owner 文档、source registries、root commands、active Change handoff、tests 与 semantic Cases 只引用目标 current paths；archive 保留历史路径且不进入 current validation。
- Product、scripts、docs、package candidate、quality、Project Gate、Decision、Change Plan 与 Test Evidence 的目标验证通过；目录、文件、导出命名检查和完整 workspace Gate 通过。
- `readiness/baseline-evidence.md`、layout/naming ledger及 schema、`readiness/active-change-impact.md` 完整且相互一致；任一 current file、命名例外或实施批次都能恢复唯一 handoff和验证。

## Affected Owners

- `docs/decisions/align-source-layout-and-naming-with-module-owners.md`：跨 Change 的模块目录、命名、入口和依赖方向。
- `AGENTS.md`、`docs/navigation.md`、`docs/architecture.md` 与 `docs/coding-style.md`：任务路由、Product component owner、source boundary 与目录规则。
- `docs/script-tooling.md`：scripts 模块、root workflow、private consumer、package candidate、foundation、validation 与验证入口。
- `docs/configuration.md`、`docs/cli.md`、`docs/output.md`、`docs/scanner-dependencies.md` 与 `docs/quality-metrics.md`：移动后的 Definition、Check、Core、Output 与 scanner owner 引用，以及临时 CLI owner 的退出。
- `docs/testing.md`、`docs/testing/case-maintenance.md`、`docs/testing/cases/**` 与 Test Evidence profile：测试路径身份、Owner/Proves 与完整闭合。
- `src/product/**` 与相邻 tests：当前 Product runtime 实现输入；完成后由 `src/**` 的目标模块承接。
- `scripts/**` 与相邻 tests：repository automation、package、Project Runs、docs、validation、governance adapters 与共享 foundation。
- `package.json`、`tsconfig*.json`、`.oxlintrc.json`、`.oxfmtrc.json`、`.gitignore`、`.rgignore` 与 workspace config：入口、source roots、scope 和 ignored local state。
- `changes/publish-public-api-only-npm-package/**` 及其它受影响 active Change：新 candidate/source handoff 与仍有效实施路径。
- 本 Change 的 `readiness/**`：迁移基线、逐文件映射、命名例外与 active Change影响的实施 handoff；它不替代长期 Decision或当前行为 owner。
