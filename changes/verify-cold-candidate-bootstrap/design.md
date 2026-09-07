# Design

保留前轮 cold candidate 入口异常的未决线索，在隔离环境确认可复现性；不把推测登记为已确认 Bug。

## Context

当前 warm/full Gate 与 package:status 已通过，未确认持续性故障。安装同步完成且 fresh probe 可解析的检查曾排除简单『安装尚未等待』解释；Bun negative resolution caching 只是待验证假设，不是根因。正式 cold 入口为 `bun run package:candidate:integration`，ordinary Gate 不覆盖该完整冷态实验。

直接 owner：[Package lifecycle](../../docs/tooling/package-lifecycle.md)、[Project Gate](../../docs/tooling/project-gate.md)、`scripts/package/candidate/integration-command.ts`、`scripts/project/gate/run.ts` 与 candidate preparation。

## Goals / Non-Goals

恢复失败条件、记录 exact runner/candidate/安装路径与时序、明确测试超时和被测行为；不清空用户当前安装或 cache，不使用 source fallback 绕过 installed consumer，不为一次信号添加无条件重试。

## Decisions

### Intended Change

先核对正式 integration command 的 timeout 与隔离 fixture，再通过公开 Gate/candidate 入口组织 cold→status→import→reuse 对照。只在外层编排最小观测，不并发重建共享 candidate。若无法复现，保存条件和未覆盖边界；若确认复杂 Bug，按项目规则另建调查报告。

### Resulting Impacts

本 Draft 先承接调查准备，不修改产品行为。可能影响 package candidate lifecycle、Gate bootstrap、cold integration runner/tests；确认后重新评审自动报告条件与修复授权。证据须分别说明安装、probe、加载、执行和超时发生在哪一阶段。

## Risks / Trade-offs

缓存清理和重装会污染复现状态或覆盖他人工作；使用 test-local roots并记录证据。不能把未到语义断言的超时记为 candidate 行为失败，也不能把一次暖态成功记为 cold guarantee。

## Open Questions

失败是否可在正式隔离入口重现？影响的是 resolver、入口加载、安装还是超时预算？需要哪些最小环境事实，是否有本次形成时日志可用？

本轮授权为记录与考虑方案；未批准产品实施、删除、发布或归档。设计确认后再形成 Plan 与 tasks。
