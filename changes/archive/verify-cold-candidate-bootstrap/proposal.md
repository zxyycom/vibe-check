# Proposal

在固定提交的隔离副本中复核 cold candidate bootstrap，先形成可审计结论而不修改产品行为。

## Why

前轮验证曾在 cold preparation 后遇到 root Gate 加载 installed entry 失败，随后 status/current 与重跑成功；另一次直接运行 cold integration 测试因超时未到语义断言。暖态完整 Gate 通过不能回答首次启动是否稳定。

## Outcome

通过正式入口在隔离、可重建 fixture 中区分环境/runner 超时、解析缓存和真实 candidate lifecycle 缺陷，并形成可复核结论；只有确认缺陷且方案获批后才修复。

## Scope

### Intended Change

将本 Change 收敛为只读/隔离调查 Plan：在一个 `/tmp` 隔离根内从获准的已提交快照创建 candidate build/cache/private-consumer 均独立的实验副本，运行三个彼此独立的 cold Gate probe、一个同副本的 warm reuse 对照和正式 `package:candidate:integration` 入口。记录每次 command、退出码、阶段边界、版本、路径隔离和时序；必要的观测脚本仅存在于隔离副本，绝不改动被调查源码。根开发依赖可以从当前工作区复制为本地副本，明确不把它们宣称为 cold cache。

### Resulting Impacts

调查会写入本 Change 的任务和最终证据说明，并在唯一隔离目录写入副本、candidate 构建/缓存/consumer 安装及命令日志。原计划不写主仓库 build、candidate cache 或 private consumer；实际报告形成发生一次 shell heredoc substitution 失误，意外运行三次主 typecheck Gate并至少一次 status，已在 design 与调查报告如实记录。除该例外外，不修改产品实现、manifest、lockfile、测试、全局工具或外部服务。实验不清空共享缓存或安装，不使用 source/ancestor fallback，不增加 retry，不改变生产 timeout；任何确认的缺陷仍须由用户审阅修复范围和授权。

## Success Criteria

- 三个独立 candidate-cold Gate case 各自证明开始时没有自己的 build、candidate cache 或 private consumer，并记录正式 `bun run check -- --typecheck` 的 stdout、stderr、退出码及 wall-clock 时序。
- 一个 candidate 准备已完成的 cold case 的 fresh-process warm Gate reuse 对照和 `package:status` 记录可区分 candidate 准备状态与 Gate 结果。
- 正式 `bun run package:candidate:integration` 在独立副本中执行，报告其 outer 30 秒与 inner node:test 20 秒预算，以及是否到达语义断言。
- 结论明确区分 installation/probe、bound-run load/entry identity、Product Run、runner timeout；不得将待证 Bun resolver-cache 假设当作根因。
- 主工作区和隔离副本的实际 candidate/build/cache 写入边界均被复核；报告显式记录本轮已确认的主工作区误触例外，结果、未覆盖边界和任何需用户决策的修复事项可独立复核。

## Affected Owners

- [Package lifecycle](../../docs/tooling/package-lifecycle.md)：candidate build/cache/private-consumer、status 与显式 integration 入口。
- [Project Gate](../../docs/tooling/project-gate.md)：prepare → bound-run load → entry-identity → Product Run 的正式 Gate 顺序。
- `scripts/environment/manage.ts` / [Workspace tooling](../../docs/tooling/workspace.md)：仅核对 locked root development dependency 的既有环境入口；本实验不运行会预热 candidate 的 `env:setup`。
