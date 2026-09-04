---
title: 以唯一 prepared candidate 完成 Project Gate package 验收
status: active
alignment: aligned
createdAt: 2026-09-04T03:03:18Z
purpose: 让 full Gate 只执行一次真实 package preparation，同时保留产物、consumer contract 与显式 cold integration 证明。
background: Gate root 已准备 exact candidate，但 candidate test 仍 detached cold build 并多次安装，重复物理工作持续触发硬门禁。
decision: Gate root 唯一拥有真实 candidate lifecycle，full 消费其 typed evidence；cold integration 由显式 package target 承接。
tags:
  - configuration
  - testing
  - workflow-policy
relations:
  - type: 归并
    target: configure-project-gate-admission-priority-by-repeated-comparative-evidence.md
  - type: 归并
    target: split-external-consumer-acceptance-with-typed-provider-data.md
---

## 目的

- 消除 Gate root preparation 与 candidate test-local cold lifecycle 对同一源码的重复 compile、pack 和 install。
- 保留 exact artifact、private installation、external types/docs/runtime consumer 与 candidate decision/failure 分支的独立、可定位验收。
- 让 root capacity、mutex、dependency 和任何 priority 继续来自实测资源与关键路径，而不是用调度掩盖重复工作。

## 背景

- Gate root 在加载 Product Run 前已经准备或复用当前源码指纹的 exact local candidate；stale candidate 的真实 build/install 失败会阻止 Gate 启动。
- Artifact acceptance 已直接消费 prepared candidate 的 artifact/staging；external provider 也只安装一次，并把 typed material 交给 types、documentation、runtime 三个独立 consumer。
- 原 candidate lane 仍在 test-local state 中强制 cold build、pack、install/reuse，并为 documentation drift 与 missing dependency 再执行真实 install/reinstall。目标调查确认至少 24 个 Bun child，重复工作而非 scheduler control 是主要耗时。
- 原调度方向保留 root `maxParallel: 3`、package/documentation mutex、完整 test partition、profile/tag 边界和基于重复对照的 admission priority；本次只改变不再存在的 detached physical lifecycle 所需 mutex 与 lane 责任。

## 决策

- 采用: Gate root preparation 是一次 invocation 的唯一真实 local candidate lifecycle。它继续形成 exact version、fingerprint、artifact digest、staging、private installed entry 与 rebuild/reinstall/reuse fact；prepared-candidate Check 在 Product Run 内闭合解析和物理复核。
- 采用: Full package acceptance 继续包含 artifact、external provider、types、documentation 和 runtime 独立 Checks。Artifact 只读 shared staging/tar；external provider 真实安装一次并发布 closed、versioned、invocation-owned typed data，三个 consumer 只读复用该 material 且分别结算。
- 采用: Routine candidate 测试只证明路径、receipt、input/decision 与显式 integration invocation contract，不在 full 内另建 detached package。真实 cold build/install/reuse/reinstall 与 ancestor fallback 保留为显式 package-tooling integration target，保持既有 20 秒主 case 和 30 秒 target 硬限制；该 target 失败必须非零退出，但不属于 routine full test profile。
- 采用: 原 candidate routine Check 不再具有独立 terminal 意义，快速 contract 并入 package-supporting lane，不保留空壳 Check。External provider 继续持有 package lifecycle mutex，快速 contract 测试不持有物理 mutex。
- 采用: Root scheduler 保持 `maxParallel: 3`；documentation-materials mutex、required/full package selection、all-status aggregate 和默认 priority 保持。非零 priority 仍只允许在 exact candidate、相同 membership/runtime 下完成重复 AB/BA 证据后采用。
- 采用: Supported routine Bun profile 继续完整映射它声明的全部 test entities；显式 cold integration 使用非 profile 文件身份和受文档拥有的 root package command，不伪装为未执行的 semantic Case 实体。
- 不采用: 在每次 full 中重复 cold build、每个 consumer 重复安装、读取 ambient receipt、放宽 timeout、失败重试、降低 root 并发、用 successful import 替代 artifact/material audit，或删除真实 cold integration。
