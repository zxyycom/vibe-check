---
title: 在公开 package 发布前完成项目门禁
status: active
alignment: unaligned
createdAt: 2026-08-19T06:34:27Z
purpose: 让首次公开 package 已由完整项目门禁的真实消费者证明，而非只完成 quality dogfood。
background: 产品的核心结果是替代项目门禁；candidate 已可先在本地建立，但公开发布和完整 gate 替代是独立顺序选择。
decision: 先建立本地 candidate 并完成项目 gate 替代、部分运行和进度反馈，再将该完整 consumer 的证据交给公开发布。
tags:
  - product-contract
  - product-priority
relations: []
---

## 目的

- 让 Vibe Check 的首次公开 npm 产品已经证明其核心用途：一个项目拥有的命令可运行完整基础门禁。
- 让 package candidate 及早服务真实开发，但不把“可安装且能运行 quality”误当作完整产品里程碑。
- 将公开发布前需要完成的项目 gate 能力与可选旧 CLI 兼容细节明确区分。

## 背景

本记录只决定首次公开 package 的交付顺序与最低消费者证据：local candidate、完整 Gate、正式 cutover，随后才可能公开发布。它不定义 <code>invocation</code> grammar、observer event shape、项目 CLI、renderer 格式、scheduler capacity 或 package public inventory；这些由各自的长期 owner 和 active Change 负责。

当前 release path 的 timing 采用两种同源视图：Product 对每个实际执行的 Check 测量一次 <code>durationMs</code>，在 settled lifecycle feedback 与带 final snapshot 的 structured <code>RunResult</code> per-Check summary 中返回。它是进度和完成摘要的 execution signal，不是 quality verdict、DecisionPolicy input 或 Record 的固有字段。首轮不承诺 <code>startedAt</code> / <code>endedAt</code> 或 record-report time；也不能仅为呈现而改写既有 <code>CheckOutcome</code> 或 <code>QualityRecord</code> grammar。该约束不替代未来对独立 performance policy / canonical execution telemetry 的判断；若出现实际消费者，必须先演进长期 Decision，再建立独立 Change。

本记录不授予 npm registry 查询、凭据访问或 <code>npm publish</code> 的操作授权。动态 Change stage、任务与 handoff 由各自 active Change 和 change-plan CLI 恢复，不属于本长期决策。

- 当前 `scripts/vibe-check-workspace/verify.ts` 已拥有项目级 command checks、profile、日志、进度与 exit mapping；Product 已拥有 Project Definition、direct Check execution 和 static Task scheduling。
- 部分运行可以由项目 CLI 传入 invocation input，并由每个 Check 返回 `not-applicable` 表达；它不需要动态选择 Task graph。
- 进度需要运行期 Check lifecycle 与耗时反馈；当前 release path 不会仅为呈现而把 timing 加入既有 QualityRecord identity 或 machine grammar。
- 公开 npm 发布会产生可见且不可逆的外部版本状态；在此之前完成完整 gate consumer 可减少首发后立即重构核心路径的成本。

## 决策

- 采用: 先完成可安装的本地 package candidate，使开发中的 project gate 能通过真实 package API 消费 Product；candidate 不访问 registry。
- 采用: 在公开发布前，以项目拥有的 Definition、bound Run 和 CLI 替代现有 workspace verifier 的核心门禁结果，并同时交付 invocation-controlled partial execution 与可用进度反馈。
- 采用: Project gate 只保留核心验收类别和可观察的 exit/log/result 行为；不自动继承所有旧参数、分组、格式或 presentation 细节。现有 `--concurrency` 不属于首轮必需能力，除非实际消费者证明静态 scheduler 容量不足。
- 采用: 在当前 release path 中，Product 对每个实际执行的 Check 测量一次 duration，并在 settled lifecycle feedback 与 final structured <code>RunResult</code> 的 per-Check summary 中暴露 <code>durationMs</code>。它用于进度与完成摘要，不自动成为 quality failure 或 policy input；首轮不输出 wall-clock start/end，也不为 Record 添加独立 timing。
- 采用: 不向既有 `CheckOutcome` 或 `QualityRecord` grammar 添加仅用于呈现、会改变 Core、machine artifact 或 record identity 的时间字段。
- 采用: 只有完整 gate 的 candidate/tarball acceptance、fresh registry checks 和明确外部写入授权都满足后，才公开发布 package。
- 不采用: 先公开发布仅有 quality dogfood 的 package，再把完整项目门禁、部分运行和进度作为首发后的核心补全；也不为保留旧 CLI 的每一个调优或输出细节延迟核心替代。
