---
title: 按测量与资源责任调度 Project Gate
status: active
alignment: aligned
createdAt: 2026-08-27T00:41:38Z
purpose: 让 Gate 并发度、测试子 Check 与 package mutex 对应已验证的实际资源边界。
background: 粗粒度测试包遮蔽 owner 失败，四路调度在四核环境慢于三路；artifact 复用 provider 后不再 build 或 install。
decision: 按行为 owner 拆分测试，root 采用三路调度，只串行仍会执行 package build 或 install 的 Checks。
tags:
  - configuration
  - testing
  - workflow-policy
relations:
  - type: 修订
    target: make-package-lifecycle-gate-tests-explicit.md
---

## 目的

- 让 Gate test execution 的 terminal facts 对应稳定行为 owner，而不是由少数大包遮蔽失败范围和调度成本。
- 让 root parallelism 来自同机重复 A/B，而不是 CPU 数量或单次 wall 直觉。
- 让 named mutex 表达仍然存在的昂贵 package mutation 边界，不把只读 acceptance 无条件串行化，也不解除已证明有害的 build/install 竞争约束。

## 背景

- Test Evidence entity closure 与实际 behavior execution 已分开；execution partition 可以继续细分，只要完整 supported test surface 恰好覆盖一次。
- Product package-provided Check tests 分属 duplicate detection、file metrics、function metrics、JSON、Markdown link 与 supporting/project behavior 等稳定 owner；单个粗 package lane 没有共同 setup 或共同 terminal 语义。
- 在当前四核开发环境中，required Gate 的三路与四路各五个交错样本显示三路 wall 中位数和均值都更低；提高子进程数量会让 CPU 密集的 candidate 和部分 Product lanes 互相放大。
- 三项 package acceptance 全并发曾显著放大 consumer/candidate 时间。Artifact acceptance 改为消费 provider 后只读取 invocation-owned staging/tar，candidate lifecycle 与 external consumer 仍会执行真实 build 或 install。

## 决策

- 采用: Gate test execution partition 必须继续从完整 supported runner profile 导出，证明 union 完整、intersection 为空且每个 lane 非空；未知 Product package owner 文件在任何测试启动前失败。
- 采用: Product package tests 按 duplicate detection、file metrics、function metrics、JSON、Markdown link 与 supporting/project behavior 拆成独立普通 Checks；Product runtime 与 scripts owner lanes 继续独立结算。
- 采用: 当前 Project Gate root scheduler 使用 `maxParallel: 3`。未来修改该数值前应在相同测试 membership 与 warmed candidate 条件下做交错重复测量，同时比较 wall 中位数、离散度和最长 Check contention。
- 采用: Candidate lifecycle 与 external consumer acceptance 共享 package lifecycle mutex，因为它们继续执行 build/install 型物理工作；只读 provider staging/tar 的 artifact acceptance 不持有该 mutex，但保留 provider dependency 和独立 terminal fact。
- 采用: `package-tests` 仍是 required 的显式 opt-in tag，full 自动包含全部 package acceptance；拆分和调度不改变 required/full 所声称的 assurance 边界。
- 不采用: Bun 文件级 parallel、仅按文件数量机械切 lane、让未知 owner 默默落入 catch-all、解除所有 package mutex，或把 timing 变成跨主机硬门禁。
