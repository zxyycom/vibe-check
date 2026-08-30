---
title: 以 invocation 创建时间保持发布前 Gate 就绪边界
status: active
alignment: aligned
createdAt: 2026-08-30T04:18:43Z
purpose: 让首次公开 package 继续先满足完整 Gate consumer 证据，同时使 machine invocation timestamp 准确表示 Run 创建时刻。
background: 旧 timestamp 修订遗漏了更宽 release-Gate Decision 的部分当前义务。
decision: 保留完整 Gate 发布顺序与最小 timing 边界；timestamp 仅表示 Run 创建 instant。
tags:
  - product-contract
  - product-priority
relations:
  - type: 修订
    target: publish-invocation-creation-time-without-execution-telemetry.md
---

## 目的

- 让首次公开 npm package 仍由完整 Project Gate 的真实 consumer 证据证明核心用途，而不把仅能运行 quality dogfood 误作完成条件。
- 让 local candidate 尽早服务真实开发，同时保持公开发布之前的 Gate 替代、partial execution、progress 与外部发布授权顺序。
- 让 machine `invocation.timestamp` 有单一、可复现的含义：Run invocation 创建时捕获的 UTC instant；不因此扩大 Check 或 Record 的 execution telemetry contract。

## 背景

- 已归档的 `complete-project-gate-before-public-package-release.md` 确定了 first-release 的完整方向：先构建不访问 registry 的 local candidate，再以项目拥有的 Definition、bound Run 与 CLI 替代 workspace verifier 的核心门禁，并同时提供 invocation-controlled partial execution 和可用 progress feedback，最后才可能公开发布。
- 该方向还限定 Gate 只保留核心验收类别和可观察的 exit/log/result 行为；它不自动继承旧 CLI 的每个参数、分组、格式或 presentation 细节。没有实际 consumer 证明静态 scheduler 容量不足时，不建立 public `--concurrency` requirement。
- Product 对每个实际执行 Check 的 monotonic `durationMs` 是 progress 与 final `RunResult` per-Check summary 的 execution signal，不是 terminal status、aggregation input 或 Record 固有字段。原先“首轮不输出 startedAt / endedAt”的表述必须收窄为不发布 per-Check wall-clock execution time，才能与当前 machine v4 的 invocation creation timestamp 一致。
- 只有 diagnostic logging 或 machine publication 至少一项启用时，Product 才在 Run 创建阶段捕获一次 immutable wall-clock instant；两项都禁用时不读取或序列化 wall clock。启用 diagnostic logging 时它命名 log path，启用 machine publication 时它投影为 `run.json` 的 `invocation.timestamp`；两项同时启用时共享同一 instant。该 timestamp 不是 machine publication completion time、per-Check start/end、Record report time 或跨 invocation telemetry stream。Gate-private phase elapsed 仍是 afterGate context 的 monotonic observation，不改变这一 machine timestamp 的语义。
- npm registry 查询、credential 使用和 `npm publish` 会产生外部影响；Decision 不授予这些操作权限。公开发布仍需要完整 Gate 的 candidate/tarball acceptance、fresh registry checks 和明确外部写入授权。

## 决策

- 采用: 先完成可安装的 local package candidate，使开发中的 Project Gate 通过真实 package API 消费 Product；candidate 不访问 registry。
- 采用: 在公开发布前，以项目拥有的 Definition、bound Run 和 CLI 替代 workspace verifier 的核心门禁结果，并同时交付 invocation-controlled partial execution（未选 Check 以自身 `not-applicable` 表达）和可用 progress feedback。
- 采用: Project Gate 只保留核心验收类别和可观察的 exit/log/result 行为；不自动继承旧 CLI 的全部参数、分组、格式或 presentation 细节。除非实际 consumer 证明静态 scheduler 容量不足，否则不将 `--concurrency` 作为首轮公开能力。
- 采用: Product 对每个实际执行 Check 以 monotonic `durationMs` 提供 progress 与 final structured `RunResult` per-Check summary；duration 不成为 Check terminal status、aggregation input 或 Record 固有字段。
- 采用: 启用 current v4 machine publication 时，在 `run.json` 中保留 `invocation.timestamp`，并定义为 Run 创建阶段一次捕获的 UTC instant；diagnostic logging 同时启用时必须共享该 instant。两项 output 都禁用时不读取或序列化 wall clock；timestamp 不是 machine publication completion time。
- 采用: 不发布 per-Check wall-clock `startedAt` / `endedAt`、Record report time 或独立 execution telemetry，且不为仅呈现目的修改 `CheckOutcome`、minimal Record、Core identity 或 machine schema。
- 采用: 只有完整 Gate 的 candidate/tarball acceptance、fresh registry checks 和明确外部写入授权都满足后，才公开发布 package；本 Decision 不授予 registry 查询、credential 使用或 `npm publish` 授权。
- 不采用: 先公开发布仅有 quality dogfood 的 package，再把完整 Gate、partial execution 和 progress 作为首发后补全；也不为保留旧 CLI 的每个调优/输出细节延迟核心替代，或将 invocation creation timestamp 误作 publication time、Check/Record chronology、performance budget 或 public lifecycle Hook API。
