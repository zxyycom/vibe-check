---
title: 由 Product Run 提供 Check 生命周期进度
status: active
alignment: aligned
createdAt: 2026-08-20T06:43:50Z
purpose: 让 package consumer 通过现有 progress effect 获得一致且无需公共 observer 的 Check 执行反馈。
background: Product 已拥有 Check lifecycle 与 progress effect，TTY 动态区域还需要明确序号、stream ownership 和失败隔离。
decision: 由 Product 私有 lifecycle feedback 驱动 TTY/plain progress，复用执行耗时并让输出失败不改写运行事实。
tags:
  - product-contract
relations: []
---

## 目的

- 让任何 package consumer 只需启用现有 progress effect，即可获得 Product 一致维护的 Check 总数、运行中状态、逐项完成状态、耗时和 final summary。
- 保持程序化 `run` API 与 structured `RunResult` 是核心事实入口，不让项目、Check 或文本解析承担基础进度协议。
- 让 TTY 动态呈现、plain log、duration summary 和 progress failure 使用同一组 Run-owned lifecycle facts。

## 背景

- Product 已拥有 canonical Check catalog、实际 execution/settlement、final outcome 和 progress effect；项目若另建 observer/renderer，会复制 Product 已知的 lifecycle 与 status mapping。
- TTY 需要在永久完成记录下方刷新当前 running Checks，非 TTY 只需要可追加的完成记录；两种 presentation 有共享事实，也有稳定不同的状态责任。
- 可见 `[n/total]` 用于完成进度和临时行位置，不是 Check identity；并行 execution 的关联仍必须使用 internal `checkId`。
- Check 或调用方任意写入同一个 TTY stream 会破坏 cursor state。首轮 Project Gate 已有 per-Check logs，可以避免把详细 process output 混入 progress stream。
- Console output 是可关闭的 tool effect，不是 quality fact。输出失败若中止 Check/Record closure，会让 presentation 成为第二个 execution control plane。

## 决策

- 采用: Product progress effect 通过 package-private prepared/started/settled/final feedback 驱动基础 progress；不增加 Check-owned callback、project-supplied observer、public lifecycle event 或 custom renderer API。
- 采用: TTY 在 append-only completion history 下方维护临时 running region。settled row 的 `[n/total]` 表示第 n 个完成；running row 的 `n` 只表示 `completedCount + runningPosition`，重绘时可以改变。Check identity 始终使用 internal `checkId`。
- 采用: 非 TTY、重定向或 dumb terminal 丢弃 started，只按 settled 顺序复用相同 completion counter、status mapping 和 terminal-row formatter；plain output 不含 cursor 或 color control bytes。
- 采用: Product 对每个实际执行的 Check 测量一次 monotonic `durationMs`，同时用于 settled progress 与带 final snapshot 的 `RunResult.checkDurations`；未启动 Check 使用 `null`/`not run`。duration 不进入 CheckOutcome、QualityRecord、Core、machine 或 policy。
- 采用: 首轮 progress renderer 在 Run 期间独占其目标 stream；Check/process 详细输出进入 project-owned logs。不承诺与同一 stream 的任意 interleaved writes 可靠共存，也不为此增加 public output multiplexer。
- 采用: 第一次 progress write/rewrite failure 将 progress effect 置为 failed 并停止后续 progress writes，但继续闭合 Task、Check、Record 和其他 enabled effects；console failure 不得伪造或改写 execution facts。
- 采用: 颜色、alignment 和 cursor sequence 只属于 human presentation；无色文本保留 count、title、status、duration/not-run 与可用 reason，精确格式不成为 machine contract。
