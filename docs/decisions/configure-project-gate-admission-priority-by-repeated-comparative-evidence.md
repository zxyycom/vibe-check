---
title: 用重复对照证据配置 Project Gate 的准入优先级
status: active
alignment: aligned
createdAt: 2026-09-01T04:56:53Z
purpose: 让 Gate 的 test partition、容量、mutex 与任何非零 admission priority 都对应可复核的同工作负载资源和关键路径证据。
background: 资源互斥与 root capacity 已有实测依据，但静态 priority 可能改善或伤害不同 Gate profile 的关键路径。
decision: 保留 Gate 的实测资源调度；仅以重复对照证据配置非零 admission priority。
tags:
  - configuration
  - testing
  - workflow-policy
relations:
  - type: 修订
    target: schedule-project-gate-by-measured-resource-ownership-and-documentation-materials.md
---

## 目的

- 让 Gate test execution 的 terminal facts 对应稳定行为 owner，而不被粗粒度 package 包遮蔽失败范围或调度成本。
- 让 root capacity、named mutex 与任何非零 admission priority 都来自同一 worktree 的可复现资源竞争和关键路径证据，而不是 Check 名称、CPU 数量或单次 wall-time 直觉。
- 在保护 published schema/example material 与 package lifecycle 的真实资源边界时，保留无关 validation 和只读 consumer 的并行度。

## 背景

- 完整 supported runner profile 已能导出稳定 test partition；`maxParallel: 3`、package lifecycle mutex 与 docs-materials mutex 有对应的资源竞争依据。
- ready Task 的启动顺序会影响 tail，但“运行越久优先级越高”不能从单次观察推出：它可能延迟 mutex provider、dependency critical path 或另一个 profile 的关键 Task。
- Gate Definition 的 priority 会进入 declarative fingerprint；旧 fingerprint 的 advisory baseline 不能说明新配置的性能。

## 决策

- 采用: Gate test execution partition 继续从完整 supported runner profile 导出，证明 union 完整、intersection 为空且每个 lane 非空；未知 Product package owner 文件在任何测试启动前失败。Product package tests 继续按 duplicate detection、file metrics、function metrics、JSON、Markdown link 与 supporting/project behavior 拆成独立 ordinary Checks，runtime 与 scripts owner lanes 也独立结算。
- 采用: Project Gate root scheduler 默认保持 `maxParallel: 3`。任何容量修改仍须在相同 test membership、root capacity、runtime/toolchain 与 warmed candidate 条件下交错重复测量，并比较 wall median、离散度和最长 Check contention。
- 采用: candidate lifecycle 与 external consumer provider 继续共享 `project-gate-package-lifecycle` mutex，因为它们执行 build/install 型物理工作；artifact acceptance 及 types/documentation/runtime consumers 只读 provider material，不持有该 mutex，但保留 provider dependency 和独立 terminal fact。
- 采用: `package-tests` 继续是 required profile 的显式 opt-in tag，full 自动包含全部 package acceptance；partition、mutex 与调度不改变 required/full 的 assurance 边界。
- 采用: `tests-scripts-validation`、`docs-schema-validator` 与 `docs-example-validator` 继续共享 `project-gate-documentation-materials` mutex；`docs-json-validator`、`docs-links-validator` 和其它无证据 Check 不持有该 mutex。
- 采用: Gate 的静态 `admissionPriority` 只有在同一 exact candidate、Check membership、root capacity、runtime/toolchain 与 candidate reuse policy 下完成 warm-up 后，按 AB/BA 交错采集五组 default/tuned 配对样本才可保留。记录每个 profile 的原始 wall time、median、p90、candidate long Task ready-to-start delay 与 duration、dependency/mutex wait 和 admission trace。
- 采用: 只有 target ready-to-start delay 至少四组配对样本降低、required 与 full 的 tuned wall-time median 均不高于 default、至少一个 profile 的 tuned median 更低、且两种 variant 的 Task membership 与 terminal outcomes 相同时，才在中央 Gate Definition 配置非零 priority。否则 Product 能力仍可发布，Gate 保持 effective `0` 并记录未采用原因。
- 采用: 保留非零 Gate priority 时，为新 declarative fingerprint 建立新的 checked-in advisory performance baseline；匹配 workload 的 afterGate observation 保持只警告，不把跨主机 timing 升为硬门禁。
- 不采用: 根据一次 duration 自动分配 priority、用 priority 代替 dependency/mutex/capacity、扩大 timeout、失败重试、将全部 docs validation 串行、为 docs materials 建立 wrapper/nested Run、让 temporary mutation 脱离测试生命周期、按文件数量机械切 lane，或把 timing 变为跨主机硬门禁。
