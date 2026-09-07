# Design

评审已拥有独立 invocation 目录时采用稳定 diagnostic 文件名的方案，同时保留共享目录的隔离安全。

## Context

[Project Gate](../../docs/tooling/project-gate.md) 先建立 `.log/project-gate/<invocation>/`；Product 随后在该目录写 `core-<suffix>.log`、`scheduler-<suffix>.log`。Product 的 public diagnostic target 可以跨 Run 复用，现有 readback 保存每个 channel 的实际 file。前轮移除 learned channel 不等于已经统一日志命名。

直接 owner：[Run 人读输出实现](../../docs/development/human-output.md)、[Project Run](../../docs/development/project-run.md)、`src/project-run/invocation/paths.ts`、diagnostic logger 与 Gate bound controls。

## Goals / Non-Goals

改善 invocation-owned 目录中的可发现性，保留 channel ownership/correlation与并发隔离；不全局删后缀、不建立新的日志 parser，也不通过写完后 rename 破坏 writer/readback。

## Decisions

### Intended Change

比较现状、显式独占 invocation-directory 模式、Product 自建子目录等方案；目录所有权和冲突策略必须显式，而不能从路径长相推断。稳定 basename 仅在不会与另一 writer 冲突的契约下成立。方案与 public output controls 的关系仍待用户确认。

### Resulting Impacts

可能涉及 invocation path creation、diagnostic logger、output readback、Gate controls、用户/内部文档与 Case。用 sequential/concurrent shared directory、isolated directory、setup/write/close failure、cancellation 验证；保持 machine timestamp 与 invocation correlation 同源。实施若改 public contract，应完成完整 installed consumer Gate。

## Risks / Trade-offs

只把文件改为 core.log/scheduler.log 会让共享 target 的 Run 互相覆盖；复用独占目录、异常中断、跨卷 path readback也必须定义。无必要时保持现状优于制造新配置模式。

## Open Questions

是否由 Product 建立每次 Run 子目录，还是由 caller 显式声明独占目录？目录已存在时拒绝、复用还是另建？默认行为是否改变？

本轮授权为记录与考虑方案；未批准产品实施、删除、发布或归档。设计确认后再形成 Plan 与 tasks。
