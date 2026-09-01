---
title: 按实测资源所有权调度 Gate 与文档材料
status: archived
alignment: aligned
createdAt: 2026-08-30T04:53:50Z
purpose: 让 Gate 的 test partition、并发度和 named mutex 都对应可验证的物理资源边界，并只串行会竞争的文档材料。
background: 前序 docs-material mutex 修订只保留新增文档竞争边界，遗漏了其归档调度 Decision 的 partition、容量和 package lifecycle 义务。
decision: 保留实测 partition/容量/package mutex，并为 schema/example 读写竞争增加最小 docs-materials mutex。
tags:
  - configuration
  - testing
  - workflow-policy
relations:
  - type: 修订
    target: serialize-project-gate-documentation-materials-by-ownership.md
---

## 目的

- 让 Gate test execution 的 terminal facts 对应稳定行为 owner，而不由少数粗粒度 package 包遮蔽失败范围或调度成本。
- 让 root parallelism 与每个 named mutex 都来自同一 worktree 的可复现实测资源竞争，而不是 CPU 数量、tag、Check 名称或单次 wall-time 直觉。
- 在避免 published schema/example material 的临时读写竞争时，保留无关 validation 与只读 consumer 的既有并行度。

## 背景

- 已归档的 `schedule-project-gate-by-measured-resource-ownership.md` 建立了完整 supported runner profile 的互斥 test partition、`maxParallel: 3` 的重复 A/B 测量条件、package lifecycle 的 build/install mutex 和 `package-tests` 的 profile 语义。
- `tests-scripts-validation` 的 machine-artifact drift evidence 会在自身测试范围内短暂原地改写 checked-in schema、machine example `run.json` 和 example Definition。一次 full Gate 与 docs example validator 重叠时，validator 读取了该中间状态；顺序执行通过。
- docs schema validator 读取同一 schema/example material；docs JSON validator 对测试的附加换行仍接受有效 JSON grammar，docs links validator 只读取 Markdown paths，因此后两者不会因这次 temporary mutation 改变 terminal result。

## 决策

- 采用: Gate test execution partition 继续从完整 supported runner profile 导出，证明 union 完整、intersection 为空且每个 lane 非空；未知 Product package owner 文件在任何测试启动前失败。Product package tests 继续按 duplicate detection、file metrics、function metrics、JSON、Markdown link 与 supporting/project behavior 拆成独立 ordinary Checks，runtime 与 scripts owner lanes 也独立结算。
- 采用: Project Gate root scheduler 保持 `maxParallel: 3`。未来修改容量前，必须在相同 test membership 与 warmed candidate 条件下交错重复测量，并比较 wall median、离散度和最长 Check contention。
- 采用: candidate lifecycle 与 external consumer provider 继续共享 `project-gate-package-lifecycle` mutex，因为它们执行 build/install 型物理工作；artifact acceptance 及 types/documentation/runtime consumers 只读 provider material，不持有该 mutex，但保留 provider dependency 和独立 terminal fact。
- 采用: `package-tests` 继续是 required profile 的显式 opt-in tag，full 自动包含全部 package acceptance；partition、mutex 与调度不改变 required/full 的 assurance 边界。
- 采用: `tests-scripts-validation`、`docs-schema-validator` 与 `docs-example-validator` 共享 `project-gate-documentation-materials` mutex。它只覆盖 validation test temporary mutation 与会因 published schema/example material 漂移而失败的 readers。
- 采用: `docs-json-validator`、`docs-links-validator` 和其它 Check 不持有 docs-materials mutex；不得因同属 docs tag、读取工作树或可能产生诊断而无依据牺牲并行度。
- 不采用: 扩大 timeout、失败重试、将全部 docs validation 串行、为 docs materials 建立 wrapper/nested Run、让 temporary mutation 脱离测试生命周期、按文件数量机械切 lane、或把 timing 变为跨主机硬门禁。
