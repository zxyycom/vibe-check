---
title: 按运行模式与环境应用 Gate 硬预算，不以指纹变化阻断
id: 260926-apply-gate-time-budgets-without-fingerprint-gating
status: active
alignment: aligned
createdAt: 2026-09-26T06:31:11Z
purpose: 解除配置指纹变化造成的无效阻断，同时保留人工硬预算
background: 原匹配把固定耗时上限与历史 workload 可比性混为一谈
decision: 按 profile/runtime 唯一选择本机预算；指纹仅保留为可选元数据，超时与无效测量仍阻断
tags:
  - configuration
  - performance
  - workflow-policy
relations:
  - type: 修订
    target: 260923-enforce-manual-local-project-gate-time-budget
    summary: 移除指纹一致性前置条件，保留手动硬预算、分段计时与结果只降级边界
---

## 目的

- 让本机人工设定的 Gate 总耗时上限持续有效，不因 Definition 变化而把正常开发变成必须人工刷新指纹的失败流程。
- 保留真正超时、配置缺失和无效测量的阻断，以及 exact candidate 和单一最终结果的边界。

## 背景

- 前序把硬预算与声明指纹精确匹配绑定；改动 Check options、命令或选择区域后，即使耗时未超限，也会因没有匹配基线而失败。
- `declarativeFingerprint` 描述声明身份，不覆盖源码函数体、实际 RunControls 或性能环境。指纹相等不等于测量负载可比；指纹不同也不使固定的墙钟上限失去意义。
- 用户明确要求解除此项不必要阻断并调查真实性能问题，不要求放宽 20 秒预算或自动更新本机文件。预算约束和性能实验可比性应分别负责。

## 决策

- 采用: 本机被 Git 忽略的 `.cache/vibe-check/project-gate/performance-baseline.json` 保留 schemaVersion 1，按 required / all 与 platform、architecture、Bun version 唯一选择显式正整数 `maxElapsedMs`。每个 profile/runtime 只允许一条记录；不同指纹的重复记录同样无效，不能按顺序选择预算。
- 采用: `declarativeFingerprint` 不再是预算键。旧文件可保留合法 SHA-256 字符串作为可选元数据，新文件无需该字段或临时零值。Gate 不改写旧文件，不自动创建、学习、修订或放宽阈值；指纹不一致既不失败，也不跳过耗时比较。
- 采用: required 与 `--all` 在 candidate preparation 前必须有合法、可读的普通本机文件和当前 profile/runtime 记录，否则失败。初步 passed 后仍要求完整 Run facts 和有效、连续的 phase timing；无效数据失败，等于预算通过，超过预算失败。focused preset 不适用总时间预算；初步非 passed 不被性能比较提升。
- 采用: 本机 required 继续由已有人工决定约束为 `20000` ms，不成为其它工作区默认值；`--all` 仍需独立人工配置。Definition 或实际选择负载改变仍使用同一预算；runtime 没有对应预算时不能借用其它环境的值。将来改变预算仍须人工决定。
- 采用: context 保留 Gate started、initial-result timestamp、总 `elapsed-to-initial-result` 与 candidate preparation、adapter/setup、Product Run 三段连续 phase；总值唯一决定超时，不含 contributor 自身时间。phase 与最慢 Check 只解释耗时，不将并发 Check duration 相加作为墙钟，不解析 scheduler 日志作预算输入。
- 采用: `definition.ts` 配置唯一 `resultContributor`，接收 frozen 初步结果和 invocation context，返回闭合 `{blocks,messages}`；adapter 只可将 passed 降为 failed，不能提升失败或改写 Check facts、RunResult、aggregate、candidate、context。throw/reject/非法输出仍映射 unavailable，由唯一最终状态映射退出码，不新增 Product lifecycle API 或第二贡献者。
- 采用: 保留 exact candidate 入口边界。candidate preparation 前不加载 package public runtime 或 Definition；help 不准备或导入 candidate、不创建 invocation log。preparation failure 与 prepared/imported entry mismatch 在 consumer execution/contributor 前停止，entry mismatch 也在日志创建前停止。成功 invocation 仅各执行一次 preparation、consumer load、log creation 和 bound Run，并交付同次 normalized selection 与 prepared candidate；formal mode 仅使用 receipt 的 exact installed artifact，不回退 local preparer。
- 采用: 初步 Gate 结果仍依据 Product 的 default aggregate；definition warning、progress failure 或非 passed aggregate 为 failed，non-completed/malformed result 为 unavailable。adapter 不遍历 snapshot 重建 aggregate。
- 不采用: 将预算解释为历史性能基线、指纹失配时放行且不评估、自动写新指纹、自动抬高预算或 checked-in 跨主机统一耗时阈值。前后性能对比另行记录相同 workload、candidate、runtime、缓存和竞争条件，指纹仅是其中一项观察事实。
