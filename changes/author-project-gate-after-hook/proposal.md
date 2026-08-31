# Proposal

本 Plan 让仓库 Project Gate 的唯一 `afterGate` 回调成为中央 Definition 中可发现、可替换的项目配置，同时保留 exact candidate 的延迟加载边界。

## Why

当前 `afterGate` 类型和结果校验已经存在，但默认 performance observer 隐藏在 `run.ts` 的内部 steps 中；正式 Gate CLI 与中央 `definition.ts` 都没有可维护的配置入口。维护者和按文档导航工作的 AI 因而可能完全不知道这项能力，也不能在不修改运行机械或依赖测试 seam 的情况下替换它。

`definition.ts` 运行时依赖 `@zxyycom/vibe-check` 的已安装 candidate。若 `run.ts` 在 candidate 准备前静态加载该 Definition，就可能提前解析旧安装，因此配置可发现性不能破坏“先准备并验证 candidate，再动态加载 bound module”的顺序。

## Outcome

维护者可以在 `scripts/project/gate/definition.ts` 直接找到并编写一个受信任的同步或异步 `afterGate` 函数；函数可以执行项目授权范围内的任意 Bun/JavaScript 工作，并返回唯一最终 Gate result。正式运行仍先准备 exact candidate，Hook 抛错或返回非法结果仍 fail closed 为 `unavailable`，默认性能 observation 仍为显式配置的一部分。

## Scope

### Intended Change

- 在中央 Gate Definition 导出唯一 project-owned `afterGate` 回调，并显式组合当前 performance observer；回调不是 package public API，也不进入 Product Definition fingerprint。
- 让 candidate 准备后动态加载的 bound module 同时提供其已解析 package entry、Product Run 和配置好的 `afterGate`；`run.ts` 只在 entry identity 验证成功后调用这些能力。
- 保留同步或异步返回、闭合 `{ status, messages }` 校验、只读 context、唯一最终 result、transcript 与 exit mapping。
- 更新 Gate owner、文档导航和长期 Decision，使 AI 从中央配置入口即可发现 Hook 的时机、权限与失败边界。

### Resulting Impacts

- `run.ts` 的 `afterGate` test override 不再是正式配置来源；测试应通过动态模块 seam 证明配置加载、entry mismatch 和 Hook failure。
- 当前 performance observer 与 baseline 继续由 repository Gate 拥有，但其启用位置从隐藏默认 step 迁到中央 Definition。
- 中央 Definition 的运行时加载必须继续晚于 candidate preparation；不得通过 root 静态 import 重新引入源码或旧安装。

## Success Criteria

- `definition.ts` 是正式 `afterGate` 配置的唯一可编辑 owner，且默认配置仍产生现有 performance advisory。
- 自定义同步和异步函数都能接收初步 result 与完整只读 Gate context，并能通过合法返回值决定唯一最终 status/messages。
- Hook 抛错或返回非法 shape 时最终结果为 `unavailable`，transcript 和 exit code 只使用该最终结果。
- candidate 准备前不会加载 `definition.ts` 或 `@zxyycom/vibe-check`；resolved entry 不匹配时 Hook 和 Product Run 都不执行。
- 文档明确区分 Check `preflight`、Gate `afterGate` 与测试 seam，维护者无需扫描 runtime 实现即可找到配置入口。

## Affected Owners

- `scripts/project/gate/definition.ts`：唯一 Gate 配置与 project-owned Hook。
- `scripts/project/gate/run.ts`、`scripts/project/gate/runtime/bound-run.ts`：candidate 顺序、动态模块契约、结果与退出机械。
- `scripts/project/gate/runtime/performance-observation.ts`：默认 advisory 实现与基线语义。
- `docs/script-tooling.md`、`docs/navigation.md`：Gate Hook 的发现路径和正式边界。
- `docs/decisions/**`：中央 Definition 与 `afterGate` owner 的长期判断演进。
- `docs/testing/cases/repository-tooling.md` 与相邻 Gate tests：执行时机、entry identity、同步/异步和 fail-closed 证据。
