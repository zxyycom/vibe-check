# Proposal

本 Change 将 Scheduler 的有界 measurement 提前到每次 custom admission policy 的决策边界，并把 summary 纳入统一终态 Hook 投递。

## Why

当前 custom policy 在 Scheduler 采样之前接收 context，无法安全读取已 flush 的累计 occupancy 或上一 accepted policy action 之后的 observation；summary 仍由 Scheduler 特调，破坏 Hook delivery 的唯一顺序边界。

## Outcome

每次实际 custom policy 调用前都获得共享 frozen graph、已 flush cumulative 与 captured-prefix action-observation reader 组成的 decision snapshot；只有 static policy 且没有诊断或 terminal consumer 时不额外采样；terminal summary 与 caller Hooks 通过同一 runner 投递。

## Scope

### Intended Change

在 custom policy 决策前提供共享 graph 与有界 scalar cumulative/captured-prefix action-observation reader，并让 default summary 进入统一 terminal Hook runner。

### Resulting Impacts

同步 public types、Definition normalization、Scheduler collector、docs、Decision 与 Case；不修改 learned-duration Change。

## Success Criteria

custom 连续 select 与 wait settlement 都能观察上一 accepted policy action 的 post-state 到下一实际 custom callback 前的 observation；同一 Run 的 graph 只冻结一次，旧 context 不会读到 future observation。只有没有诊断或 terminal consumer 的 static 路径不读 clock；terminal summary/caller Hooks 共享顺序和 context，且没有 Scheduler summary 特例。

## Affected Owners

`docs/configuration.md`、`docs/architecture.md`、`docs/api-mechanics.md`、`docs/testing.md`、`docs/testing/cases/**`、`src/project-definition/**` 与 `src/project-run/**`。
