# Design

在调查形成前保留前轮 cold candidate 入口异常的未决线索，以隔离环境确认可复现性；不把当时推测登记为已确认 Bug。

## Context

调查形成前的背景是 warm/full Gate 与 package:status 已通过，尚未确认持续性故障。安装同步完成且 fresh probe 可解析的检查曾排除简单『安装尚未等待』解释；Bun negative resolution caching 当时只是待验证假设，不是根因。正式 cold 入口为 `bun run package:candidate:integration`，ordinary Gate 不覆盖该完整冷态实验。

直接 owner：[Package lifecycle](../../docs/tooling/package-lifecycle.md)、[Project Gate](../../docs/tooling/project-gate.md)、`scripts/package/candidate/integration-command.ts`、`scripts/project/gate/run.ts` 与 candidate preparation。

## Goals / Non-Goals

恢复失败条件、记录 exact runner/candidate/安装路径与时序、明确测试超时和被测行为；不清空用户当前安装或 cache，不使用 source fallback 绕过 installed consumer，不为一次信号添加无条件重试。

## Decisions

### Intended Change

先核对正式 integration command 的 timeout 与隔离 fixture，再通过公开 Gate/candidate 入口组织 cold→status→import→reuse 对照。只在外层编排最小观测，不并发重建共享 candidate。若无法复现，保存条件和未覆盖边界；若确认复杂 Bug，按项目规则另建调查报告。

### Resulting Impacts

本 Plan 承接已授权的调查，不修改产品行为。它可能影响 package candidate lifecycle、Gate bootstrap、cold integration runner/tests；确认后重新评审自动报告条件与修复授权。证据须分别说明安装、probe、加载、执行和超时发生在哪一阶段。

## Risks / Trade-offs

缓存清理和重装会污染复现状态或覆盖他人工作；使用 test-local roots并记录证据。不能把未到语义断言的超时记为 candidate 行为失败，也不能把一次暖态成功记为 cold guarantee。

## Open Questions

本 Plan 的调查问题已由 `recheck-cold-candidate-bootstrap-gate-import.md` 记录：三个隔离 cold Gate 在 candidate preparation 后稳定停在 import 边界，fresh-process reuse 可通过，integration 没有覆盖该导入。Bun resolver-cache 仍不是已确认根因，但该不确定性不改变本 Plan 的范围、授权或验收；没有待解决的 Plan 问题。

本轮未授权产品修复、删除或发布；实施阶段没有归档或提交。本次用户授权已允许在最终验收后由协调 owner 归档并提交本 Change；该后续操作不改变本报告的形成时结论。

## Implementation Observations

- 固定 `bb33371c65782c2ffe3decdac4cedfe44b8da69c` 的三个独立 cold snapshot 均在正式 `bun run check -- --typecheck` 以 `2` / candidate import failed 结束；每个随后从 fresh process 报告 current private installation。cold-1 的 fresh-process warm 对照通过两个 selected typecheck Check；显式 integration target 为 6 pass/0 fail，未覆盖 bound-run load。
- 唯一隔离 evidence root 是 `/tmp/vibe-check-cold-bootstrap-bb33371c-ltbSqj`。root development dependencies 是各 snapshot 内本地 copy（reflink unsupported）；每个 candidate build/cache/private consumer 在启动时均为 absent，且 copied dependency links 未逃离对应 snapshot。它不证明根 development dependency cache 为 cold。
- 只在 Gate 已复现后运行的 temporary observer 显示 `runProjectGate` API 仍以同一 import failure 返回 `2`，而 direct `preparePackageCandidate()` 后 dynamic load `bound-run.ts` 可解析 exact entry。因此现有材料确认正式 root adapter 条件的失败，但不足以将 Bun resolver-cache 假设表述为唯一根因。
- **边界例外（执行失误）**：形成调查报告时一次未引号 shell heredoc 执行了 Markdown backtick substitution。主工作区在 2026-09-07T09:21:47Z--09:22:02Z 被意外触及：可由 `.log/project-gate` 确认三次 typecheck Gate（均 passed）以及至少一次 `bun run package:status`；其 receipt/build/private consumer mtime 落在相同窗口，当前 status 为 `0.0.0-local.926808c01f43 / current`。没有本轮开始前的紧邻 identity snapshot，因而不能把较早得到的 `afada4b41fc8` 与该变化严格归因；也不能把主工作区称为未触及。随后核对没有存活 Bun/mise/pnpm/candidate process，并停止新增实验和主 Gate 操作。
- 独立报告审查以现存 isolation/status/Gate/observer raw evidence 复核核心结论；修正并降格 evidence manifest 的外层 Node 采样，区分它与 `mise exec` Gate child 未单独采样的 Node 版本，同时补足 mise/pnpm、raw-log 与 shared ambient-ancestor resolution 条件定位。未把意外 main typecheck Gate 当作最终验收，也未以 observer 把 Bun resolver-cache 升格为根因。
