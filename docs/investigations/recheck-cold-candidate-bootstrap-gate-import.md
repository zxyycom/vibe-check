---
title: "冷 candidate bootstrap 的 Project Gate 导入复查"
id: "260907-recheck-cold-candidate-bootstrap-gate-import"
formedAt: "2026-09-07T09:21:40Z"
question: "在提交 bb33371c 的隔离 candidate 冷态下，正式 typecheck Gate 是否仍会在 candidate 已成功准备后失败于 bound-run 导入；现有 evidence 能否区分 candidate lifecycle、Gate adapter 与未证实的 Bun resolver 假设？"
tags:
  - "bun"
  - "module-resolution"
  - "package-candidate"
  - "project-gate"
  - "verification"
relations:
  - type: "复查"
    target: "260901-diagnose-bun-cold-project-gate-candidate-import"
---

## 形成时背景

此前记录过 Bun 1.3.14 在 candidate 于同一进程中安装后可能仍使用旧 bare-package resolution 的现场；当时的结论把跳过 `env:setup` 的直接 cold Gate 视为未承诺路径。本轮用户明确批准只做隔离复现/调查，要求不修复、不清空共享 candidate 状态、不加入 source fallback 或重试，并特别核验当前 Project Gate root 的 `prepare → bound-run load → entry identity → Product Run` 边界。

本轮固定被调查 source revision 为 `bb33371c65782c2ffe3decdac4cedfe44b8da69c`。evidence manifest 在**外层 shell**采样到 Bun `1.3.14`、Node `v26.7.0`、mise `2026.7.5` 与 pnpm `11.1.3`；正式 Gate 则由 `mise exec -- bun` 启动，snapshot 的 `mise.toml` 声明 `node = "24"`，但本轮没有单独采样 Gate child 的精确 Node patch version。因此外层 Node 值不能作为 Gate child Node 版本或跨 Node 版本外推依据。根开发依赖只作为本地副本保留为 warm precondition；candidate build evidence、candidate cache 和 `scripts/project/node_modules` 则在每个 cold case 开始时均不存在。该报告保存本轮形成时观察，不将未证实的 Bun negative resolver cache 升格为根因，也不改变现有 environment bootstrap 的稳定契约或修复授权。

## 调查目的

本轮回答：

1. 三个独立 candidate-cold 的正式 `bun run check -- --typecheck` 是否在同一边界复现失败，或只是一次环境/runner 偶发？
2. 失败时 candidate 是否已完成 build、install 与 probe，以及 fresh process 的 current/reuse Gate 是否能完成两个 typecheck Check？
3. 显式 physical integration target 的 outer 30 秒/inner 20 秒预算是否会掩盖或复现该 Gate bound-run 导入边界？
4. 已观察结果支持什么程度的 Gate adapter/module-resolution 判断，仍有哪些不能归因或外推？

调查不修改 Product、package candidate、manifest、lockfile、timeout、环境脚本或测试；不安装新的工具链或根开发依赖，不发布或提交。正式 Gate/candidate 入口仍会按其既有 lifecycle build/install private candidate 及其依赖，这正是本轮要观察的 candidate 事实。**执行边界例外：**形成此报告时，一次未引号 shell heredoc 使 Markdown backtick 被 shell substitution 解释；可由 main `.log/project-gate` 目录确认它意外运行了三次 root typecheck Gate，receipt/build/private-consumer mtime 同处该窗口，且 shell output 确认至少一次 root `package:status`。报告写入后已核对没有存活的 Bun/mise/pnpm/candidate process，停止所有新增实验与主 Gate 操作。没有该事故前的紧邻主 candidate identity snapshot，不能将先前获得的 version 与这次写入严格比较；本报告不把主工作区称为未触及。

## 调查范围与依据

依据当前 [Package lifecycle](../tooling/package-lifecycle.md) 与 [Project Gate](../tooling/project-gate.md) 规定，正式 probe 使用根 package script `bun run check -- --typecheck`。该 selection 只运行 Product 与 scripts 两个 typecheck Check；Gate root 仍先准备 exact candidate，随后才动态加载 `runtime/bound-run.ts` 并比较 entry identity。失败发生在动态 load 前时 Gate 尚未创建 invocation log root，因此没有把缺失 Gate transcript 误作 candidate 安装失败。

在一个唯一隔离 `/tmp` 根中，从固定提交的 `git archive` 建立四个无 `.git` 的 source snapshot；前三个是 formal cold Gate cases，第四个用于 explicit integration 和最小观测。由于该文件系统不支持 reflink，root `node_modules` 使用本地完整副本；逐个 canonicalize 后的 link target 均保留在各自 snapshot 内，且根未含 `@zxyycom/vibe-check`。每个 formal cold case 在运行前记录 `package:status` 为 `stale / rebuild (receipt-missing)`，随后以仅进程有效的 `MISE_TRUSTED_CONFIG_PATHS=<case>` 信任该 exact temporary config；该设置不写 mise trust database、不安装新的工具，也不改变 host 或主工作区。

隔离的对象是 snapshot 内 candidate build/cache/private consumer 的写入与 root development dependency links，不是对 host ancestor module resolution 的 hermetic sandbox。三个 cold stderr 都解析到同一已存在 ambient entry：`/workspace/skills/node_modules/.pnpm/@zxyycom+vibe-check@0.0.1/node_modules/@zxyycom/vibe-check/index.mjs`。因此三次复现共享“该 ancestor 安装存在”的条件；结论只适用于此 ambient-resolution 条件，不外推到不存在该 ancestor package 的环境。

实际执行并保留 stdout、stderr、exit、shell `time -p`、状态和 receipt/install path 的序列如下。形成时 raw evidence 位于 `/tmp/vibe-check-cold-bootstrap-bb33371c-ltbSqj`，不是 checked-in report resource：三个 cold case 分别使用 `cold-{1,2,3}/gate-cold.{meta,stdout,stderr}` 与 `status-*.{meta,stdout,stderr}`，warm 对照使用 `cold-1/gate-warm.*`，integration 与两个 observer 各有同名 `*.{meta,stdout,stderr}`。本报告只据这些形成时材料概括，不把该临时目录当作长期发布物。

1. 三个独立 cold snapshot 各运行一次正式 `bun run check -- --typecheck`，再由新 Bun process 运行 `bun run package:status`。
2. 第一个 cold snapshot 在 candidate 已留下后，以新进程再次运行相同正式 Gate，作为 warm/current reuse 对照。
3. 独立 snapshot 运行 `TMPDIR=<case>/tmp bun run package:candidate:integration`；入口本身的 outer process timeout 为 30 秒，`candidate.integration.ts` suite 和 cold build/install/reuse test 均为 20 秒。
4. 在 primary Gate 已指向 prepare 后 load 边界后，运行两个 temporary-only observer：一个从 `runProjectGate(["--typecheck"])` 调用正式 adapter API，另一个仅执行 `preparePackageCandidate()` 后在同一进程 dynamic import `bound-run.ts`，都不调用 Product Run 或改动被调查 source。

## 调查结果与边界

### 已确认事实

1. **三个独立 formal cold Gate 都稳定失败。** cold-1、cold-2、cold-3 分别在约 20.50、7.77、7.73 秒后以 exit `2` 退出；三者 stderr 均为 `project gate candidate import failed`，并从同一 ambient ancestor entry `/workspace/skills/node_modules/.pnpm/@zxyycom+vibe-check@0.0.1/node_modules/@zxyycom/vibe-check/index.mjs` 取得了不含 `createLearnedCriticalPathStrategy` 的 export。失败发生在 Product Run 与 Gate log 创建之前；该共同 ancestor 条件限制本结论的环境外推范围。
2. **失败不等于 candidate build/install/probe 失败。** 每个失败 case 随后在新 Bun process 的 `package:status` 都是 `current`，并报告同 case private consumer 下存在的 exact `0.0.0-local.afada4b41fc8` installed entry、tarball 与 unpacked build evidence。
3. **fresh-process warm 对照通过。** cold-1 的同一副本在上述失败后以新进程重跑正式 typecheck Gate，exit `0`；36 个 Gate entries 中仅两个 selected typecheck Check passed，34 个为 not applicable，且 Gate log 被创建。该对照不证明完整 `--all` Gate、release receipt 或其他 host/platform。
4. **explicit integration target 正常且没有触及 Gate bound-run import。** `package:candidate:integration` 在独立副本中 6 pass/0 fail，约 9.32 秒，低于其 outer/inner timeout；其完成后该副本默认 candidate build/cache/private consumer 仍不存在。它证明 test-local cold build/install/reuse 所覆盖的 lifecycle 边界，不证明 Gate adapter import。
5. **最小 observer 缩小而未闭合根因。** cold `runProjectGate` API observer 同样返回 status `2` 与同一 import error，排除 package script wrapper 本身作为唯一解释；但单独 `preparePackageCandidate()` 后在同一进程 dynamic import `bound-run.ts` 能解析到 exact installed entry。因此“candidate 准备后任何 bound-run dynamic import 都必然失败”不成立，故本轮不能仅依据这些结果断言 Bun negative resolver cache 是唯一或已确认根因。

### 判断与后续边界

这是一项跨 package lifecycle、Gate root adapter、Bun process resolution 与环境 bootstrap 的复杂复现；它也在直接 cold formal Gate 条件下阻断 Project Gate 形成可信结果，因此满足项目的自动调查沉淀条件。它**不自动授权修复**：既有前序报告将跳过 `env:setup` 的 direct cold Gate 定义为范围外，而本轮只确认当前 revision 的该条件仍可稳定失败。是否把 raw cold direct Gate 提升为支持承诺、改变 environment bootstrap，或设计新的 cross-process/other remedy，仍需用户依据当前产品目标单独审阅。

尚未覆盖 Windows/macOS、其他 Bun 版本、完整 `--all` Gate、formal release receipt、已有 `env:setup` 后的 clean invocation，或包含真实 `.git` metadata 的 isolated checkout。重新调查应在 Bun 升级、candidate consumer/import topology、environment bootstrap 承诺、Gate timing/entry identity policy 或用户对 cold direct root command 的支持范围改变时进行。任何修复方案必须继续避免 source/ancestor fallback、无条件 retry、伪造 timeout 成功与共享 candidate state 清理。
