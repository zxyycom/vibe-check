---
title: 跨 Gate 验收复用唯一 exact candidate
id: 261024-reuse-exact-candidate-across-gate-acceptance
status: active
alignment: aligned
createdAt: 2026-10-24T04:05:40Z
purpose: 保留唯一候选和独立安装验收，避免重复物理准备
background: 唯一candidate已消除重复准备，但原all仍强制运行types验收
decision: 唯一candidate与一次external安装继续复用，types随发布或明确诊断选择
tags:
  - configuration
  - testing
  - workflow-policy
relations:
  - type: 修订
    target: 260904-reuse-gate-prepared-candidate-without-detached-lifecycle
    summary: 保留唯一候选复用并修订types选择频率
---

## 目的

- 保留一次 invocation 的唯一真实 candidate lifecycle，让 artifact 与安装后 consumer 独立验收同一份材料，避免为不同选择频率重复 compile、pack 或 install。

## 背景

- 前序让 Gate root 独占 preparation，artifact 读 shared staging/tar，external provider 只安装一次，三个 consumer 只读复用 typed material；这已取代 test-local detached cold lifecycle。
- 本次将 consumer types 从日常 changed/all 移至正式发布前或显式诊断，不改变 candidate identity、物理复核及安装后 docs/runtime 的日常义务。all 不再等于全部可选择 Check，需要保留前序独立于选择频率的生命周期与证据约束。

## 决策

- 采用: Gate root preparation 是每次 invocation 唯一真实 candidate lifecycle；local source fingerprint、exact version、artifact digest、staging、private installed entry 与 rebuild/reinstall/reuse fact 保持。prepared-candidate Check 在 Product Run 内闭合解析与物理复核。正式 receipt 显式选择其已验证 tarball，不读取 ambient receipt，不从源码另建替代包。
- 采用: 日常 all 保留 artifact、external provider、installed documentation/runtime 独立 Checks；changed 按真实 package 输入选择这些验收。consumer types 仅正式 all+release receipt 或显式 consumer-types preset 执行。发布前仍必须由同一正式 tarball 完成 types/docs/runtime 全部验收，不以 routine all 替代发布证据。
- 采用: artifact 只读 shared staging/tar；external provider 真实安装一次，发布 closed、versioned、invocation-owned typed data，并继续持有 package lifecycle mutex。三个 consumer 被选择时只读复用该 material，分别结算；依赖选择通过 Product dependsOn 带入所需 provider，不让每个 consumer 重新安装。
- 采用: routine candidate 测试只证明路径、receipt、input/decision 与显式 integration invocation contract，不在 all 内另建 detached package。快速 contract 保留在 package-tooling lane，不恢复无独立 terminal 意义的 candidate routine 空壳 Check，不持有物理 mutex。
- 采用: 真实 cold build/install/reuse/reinstall 与 ancestor fallback 保留为显式 package-tooling integration target，20 秒主 case 与 30 秒 target 硬限制保持；失败须非零退出，不属于 routine test preset，不删真实 cold integration。
- 采用: root scheduler 保持 maxParallel 3，package lifecycle 与 documentation-materials mutex、默认 priority 及非零 priority 的实证门槛保持。只有 exact candidate、相同 membership/runtime 的重复 AB/BA 对照才能支持非零 priority；不以调度掩盖重复准备。调用级聚合继续使用 Product 默认严格有效集合，不另设旧 all aggregation policy。
- 采用: supported Bun runner profile 继续完整映射全部当前 test entities，Gate execution partition 每个文件恰好归属一个 lane；未被本次选择的 release-only/explicit-only 测试仍保留 Case 映射。显式 cold integration 使用非 runner-profile 身份与受文档拥有的 root command，不伪装为未执行的 Case 实体。
- 不采用: 每次 all 重复 cold build、每个 consumer 重复安装、放宽 timeout、失败重试、降低 root 并发、successful import 替代 artifact/material audit，或把移出 types 频率宣称为同 workload 性能优化。当前流程见 [Package lifecycle](../tooling/package-lifecycle.md)与 [Project Gate](../tooling/project-gate.md)。
