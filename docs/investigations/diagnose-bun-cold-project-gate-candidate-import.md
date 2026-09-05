---
title: "Bun 冷启动下 Project Gate candidate 导入失败调查"
formedAt: "2026-09-01T09:45:33+00:00"
question: "为什么全新 worktree 的 environment setup 在成功安装并核对本地 package candidate 后，仍无法从 Project Gate 导入 @zxyycom/vibe-check；将 package:build 纳入 env:setup 能否完整满足项目的自举要求？"
tags:
  - "bun"
  - "environment-setup"
  - "module-resolution"
  - "package-candidate"
  - "project-gate"
relations: []
---

## 形成时背景

2026-09-01，一次 Codex worktree setup 从 detached commit `a46a7d4` 建立全新 checkout，依次执行清理、`bun run env:setup` 和 `bun run verify:vibe-check-workspace`。mise 输出若干全局配置工具未进入项目 lockfile 的 warning，但随后 pnpm 成功安装 121 个 package、CodeGraph 成功索引 577 个文件；真正终止 setup 的错误是：

```text
project gate candidate import failed: ResolveMessage: Cannot find module '@zxyycom/vibe-check' from '.../scripts/project/gate/runtime/bound-run.ts'
```

当时的 Bun 为 `1.3.14`。仓库根 manifest 有意使用 private 名称 `vibe-check`；正式 candidate artifact 才声明 `@zxyycom/vibe-check`，并安装到唯一 private consumer `scripts/project/node_modules/@zxyycom/vibe-check`。因此根 manifest 没有同名 dependency 不是缺漏，mise warning 也没有阻止失败前的环境安装步骤。

[`docs/script-tooling.md#project-gate`](../tooling/project-gate.md#project-gate) 要求 [`scripts/project/gate/run.ts`](../../scripts/project/gate/run.ts) 先准备 exact candidate，再动态导入 [`runtime/bound-run.ts`](../../scripts/project/gate/runtime/bound-run.ts)，核对实际 resolved entry 后才构造 Definition 和 Product Run。当前 [`candidate/install.ts`](../../scripts/package/candidate/install.ts) 会替换 private consumer 的整个 `node_modules` 后运行独立 `bun install`，并在安装子进程中验证 candidate entry、manifest、材料和直接依赖；这次故障发生在这些准备动作返回成功之后的父 Bun 进程。

项目要求的冷启动边界只有标准自举：`env:setup` 必须把 checkout 准备成正常项目，后续 Gate 和其他操作只需在这份已自举状态上工作；项目没有承诺跳过自举后直接运行 verification 也能自行恢复。本报告保存该轮故障的形成时认识，并判断 `env:setup` 预先构建 candidate 是否完整满足这项要求。它不是 Bun upstream 修复承诺、长期 Decision 或脚本修改授权；当前代码、脚本工具 owner 和活动 Decisions 仍拥有现行事实与约束。

## 调查目的

本轮回答以下问题：

1. candidate 是否根本没有构建或安装，还是已经安装但 Gate 父进程无法解析？
2. mise、pnpm、包命名、worktree 路径或 Bun module resolver 中哪一层解释了“首次失败、随后成功”？
3. 在 `bun run env:setup` 中通过既有 `package:build` 入口预先准备 candidate，能否让随后独立启动的 Gate 可靠运行？
4. 该方案是否完整闭合项目唯一要求的 environment bootstrap；哪些未自举调用属于明确的范围外场景？

调查只覆盖本地 Bun 1.3.14、当前 Linux worktree setup、local candidate 和 required Gate。验收目标是“自举完成后等同于正常项目”，不是让任意未自举 checkout 的所有 root commands 自行安装前置状态。没有修改或测试 Bun runtime，没有证明其他 Bun 版本、Node host、Windows/macOS 或 formal release receipt 路径具有完全相同行为。

## 调查范围与依据

**故障形成时实际读取的仓库事实。** 调查读取了环境 setup 配置、[`scripts/environment/manage.ts`](../../scripts/environment/manage.ts)、package scripts、[`scripts/package/candidate/prepare.ts`](../../scripts/package/candidate/prepare.ts)、candidate install/receipt、Gate root/bound runtime、相邻 Gate tests、[`docs/script-tooling.md`](../tooling/workspace.md)、测试策略，以及与 exact candidate 和连续 timing 直接相关的活动 Decisions。形成时的关键控制流是：

1. 当时的 `env:setup` 绑定 mise tools，执行 frozen pnpm install，然后初始化并同步 CodeGraph；它形成工具环境，但尚未准备 package candidate。
2. Gate root 在同一父 Bun 进程中加载 candidate preparation 代码，准备或复用 tarball，并由安装子进程写入 `scripts/project/node_modules`。
3. 父进程随后动态导入 `runtime/bound-run.ts`；该模块以 bare specifier 导入 `@zxyycom/vibe-check`，并用 `import.meta.resolve` 暴露实际 entry 供 root 比对。

**运行证据。** 在失败 worktree 尚存在时完成了以下检查：

- 首次 Gate 返回 candidate import unavailable 后，`scripts/project/node_modules/@zxyycom/vibe-check/package.json` 与 `index.mjs` 已存在，说明 preparation/install 已完成而不是根本没安装。
- 从 `scripts/project/gate/runtime` 启动一个新的 Bun 进程执行 `import.meta.resolve("@zxyycom/vibe-check")`，立即解析到 private consumer 的 `index.mjs`。
- 不修改源码直接重跑 `bun run verify:vibe-check-workspace`，36 项 Check 中 30 passed、6 not applicable、0 failed、0 unavailable，最终 exit `0`。这次 candidate preparation 为 current/reuse。
- 一次性冷副本在第一次 Gate 尝试后同样留下已安装 candidate，第二个进程不再停在 candidate import；冷副本缺少完整 Git/mise 外部条件造成的后续 Check 结果不用于判断本问题。
- 进一步的一次性 sandbox 将 candidate package 只在 root adapter 已加载后写入 private consumer；同一 Bun 进程仍解析到既有祖先 package，而不是新写入的 private candidate。这证明问题不只是一条 import 字面量的提前扫描，而是 source directory 的进程内解析状态。

**Bun 一手依据。** Bun 的[模块解析文档](https://bun.sh/docs/runtime/module-resolution)说明 bare package import 会沿文件系统向上搜索 `node_modules`。Bun upstream issue [#40105](https://github.com/oven-sh/bun/issues/40105) 给出了与本轮一致的最小复现：一个目录被 module resolver 使用后，同一进程随后创建的文件即使已由文件系统确认存在，也可能对 `import()` 不可见；报告者明确在 Bun 1.3.14 复现。形成时该 issue 仍开放，公开材料未提供可由本仓库调用的 resolver cache invalidation API。

**未覆盖证据。** 没有在干净 Windows/macOS worktree 重复实验，没有验证未来 Bun release 是否修复，也没有建立保持 Gate timing 语义的跨进程 candidate handoff。原失败 worktree 后来被外部生命周期移除，不能再从该路径取得更多形成时材料。

## 调查结果与边界

### 已确认事实

1. **直接故障是父 Bun 进程的 stale module resolution，不是 candidate build/install 失败。** candidate 已写入正确 private consumer，新进程可解析，原命令新进程重跑完整通过。
2. **mise warnings 与本故障无因果关系。** warning 后的 pnpm install、CodeGraph 和 candidate preparation 均继续成功；Gate 在更晚的 bound runtime import 边界退出 `2 / unavailable`。
3. **根 private manifest 名称不是错误。** repository root 与发布 artifact 分别承担开发 workspace 和公开 package 身份；强行在根依赖中加入 `@zxyycom/vibe-check` 反而会允许祖先 fallback，破坏 private consumer 的 exact candidate 边界。
4. **单纯把动态 import 的字面量改写为变量不足以可靠修复。** disposable sandbox 仍观察到同一进程使用旧的祖先解析结果；可靠规避条件是 package 在消费它的 Bun 进程启动前已经存在，或改用新进程消费。

### 对 `env:setup` 构建 candidate 的判断

**建议采用；这是满足当前项目完整要求的 owner 内修复，不是临时绕过。** `env:setup` 完成 pnpm 安装后，通过既有根入口 `bun run package:build` 准备 candidate；外层 environment 配置随后再启动 `bun run verify:vibe-check-workspace`。两者是不同 Bun 进程，因此 Gate 启动时 private candidate 已存在，resolver 可按正常祖先搜索选中它。Gate 自己仍会执行 candidate preparation assessment，得到 `reuse / installation-current` 并重新核对 exact artifact、receipt、installation 和 resolved entry，不依赖未验证的环境假设。自举到这里已经把 checkout 变成后续命令可正常使用的项目，符合当前唯一验收结果。

实现时应遵守以下边界：

- 从 [`scripts/environment/manage.ts`](../../scripts/environment/manage.ts) 在 frozen pnpm install **之后**调用现有 `package:build` command；不要在模块顶层静态导入 candidate builder，因为 environment bootstrap 明确需要在第三方依赖尚未安装时仍可启动。
- 优先通过当前 root command 执行，例如在 mise 环境中运行 `bun run package:build`，而不是复制 prepare/install 逻辑或建立新的 candidate setup alias。
- `env:check` 不必因此接管 candidate freshness；只读 freshness 仍由 `package:status` 拥有，完整验收仍由 Gate 拥有。
- `.codex/environments/environment.toml` 与 `environment-2.toml` 均可编辑且已统一调用 `bun run env:setup`；修复 environment owner 即可覆盖两个 setup 格式，不在环境配置中复制 package build 步骤。

**代价与可接受性。** 冷 setup 原本就会在 Gate 内执行同一 candidate build/install，因此前移到 `env:setup` 不增加必要的冷构建工作；Gate 只多做一次轻量 current/reuse assessment。重复运行 `env:setup` 时，`package:build` 走现有 reuse/reinstall/rebuild 决策，保持幂等和 fail-closed，而不是无条件重建。若 package build 失败，environment setup 会更早以 package-owned diagnostic 终止，这比稍后出现误导性的 module-not-found 更可行动。

### 范围外场景与不采用方案

用户若绕过 `env:setup`，直接在从未准备过 candidate 的 clean checkout 首次执行 `bun run verify:vibe-check-workspace`，Bun 1.3.14 的同进程问题仍可能出现。项目没有要求这条未自举路径可用，因此它不是 `env:setup` 修复后的剩余产品缺口，也不需要为此增加兼容逻辑、fallback 或第二套 root workflow。

不采用让 Gate 在 candidate preparation 后自动启动 fresh Bun process。该机制只服务未承诺场景，还会引入 private handoff、失败映射和额外进程生命周期；活动 Decision [`refine-project-gate-context-timing-phases.md`](../decisions/refine-project-gate-context-timing-phases.md) 又要求 candidate preparation、adapter setup 与 Product Run 属于同一 monotonic interval，跨进程实现会改变已确认的 timing 事实。在当前需求下，这些成本没有用户或开发者结果支撑。

### 形成时建议的实施验证

1. 在临时干净 worktree 中确认 `scripts/project/node_modules`、candidate cache 和 build evidence 起始不存在。
2. 执行一次 `bun run env:setup`，证明它报告 package candidate build/reinstall/reuse 成功并留下 exact private installation。
3. 从新的 Bun 进程执行 `bun run verify:vibe-check-workspace`，要求不出现 candidate import failure，并通过 required Gate。
4. 再次执行 `bun run env:setup`，证明 candidate lifecycle 为 current/reuse 且无无条件重建。
5. 运行 environment/package command 目标 tests、scripts typecheck/lint，以及 `bun run verify:vibe-check-workspace:required`。若同步修改测试，按 Test Evidence owner 维护 Case 并闭合完整账本。

重新调查条件包括：项目新增“未自举 checkout 也必须直接运行 verification”的要求；Bun 升级并由官方 release 或本仓实验证明 #40105 已修复；candidate consumer 路径/安装策略改变；`env:setup` 不再是标准 worktree bootstrap；或 Gate timing/进程边界 Decision 被正式演进。本报告没有修改环境脚本、Decision、Change 或产品代码，也不授权远端写入、提交或发布。
