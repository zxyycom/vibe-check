---
title: 分离日常、发布与显式 Gate 义务
id: 261024-separate-routine-release-and-explicit-gate-selection
status: archived
alignment: aligned
createdAt: 2026-10-24T04:05:40Z
purpose: 让日常完整验收与发布、手动诊断各自具有明确范围
background: 完整manifest把consumer types与workbench自动带入日常all及保守回退
decision: 保留fast与受影响验收，将types设为发布前或显式、workbench仅显式
tags:
  - change-selection
  - configuration
  - gate-selection
  - performance
  - project-gate
  - workflow-policy
relations:
  - type: 修订
    target: 261022-tier-gate-validation
    summary: 保留分层反馈并明确发布和显式义务
---

## 目的

- 让日常快速反馈、受影响交付、日常完整验收、发布前类型验收与显式工具测试各有可恢复的范围，不把一种成功误认为另一种完成。

## 背景

- 前序将默认 fast、changed 与 all 分开，保留了选择规则漏判的全量兜底；但 all 完整 manifest 与 changed 保守回退也自动带入 consumer types 和 admission workbench。
- consumer types 证明安装后声明兼容性，值得在正式发布前保留；workbench 是仓库私有合成比较工具，不是日常 Product 功能验收。将二者移出自动义务会延迟发现对应缺陷，这是本次明确接受的频率取舍，不是同工作量的运行优化。

## 决策

- 采用: 默认 fast 继续只运行有稳定工程职责和输入边界资格、且受影响的基础检查及必要快速测试，加上固定 prepared candidate 与 Git whitespace；资格不随一次计时自动变化。fast 通过只表示快速反馈。
- 采用: changed 作为交付前全部受影响 routine 验收，按真实输入与共享依赖选择行为、质量、材料、artifact、installed documentation/runtime。未知路径或不可用 Git 证据保守扩大 routine 集合，不按零变更放行，不因此选择 release-only 或 explicit-only 项。
- 采用: all 不依赖变更命中选择完整 routine manifest，服务大范围变更及选择规则兜底；仍执行自身 Git whitespace 等实际检查，不承诺完全不访问 Git。它不是发布类型验收或 workbench 全集的别名。
- 采用: consumer types 为 release-only，仅正式 `--all --release-receipt <path>` 或明确 `--consumer-types` focused 诊断选择；正式 receipt 继续只能搭配 all，不新增发布 profile 或预算。admission workbench 为 explicit-only，仅 `--admission-workbench` focused preset 选择，不被 fast/changed/all、`--test` 或 fallback 自动带入。
- 采用: focused presets 保持可组合的定向检查，不替代正式验收；`--test` 选择 routine tests，不含 installed acceptance 或 workbench。参数、摘要、导航、owner 与测试按相同边界闭合。局部改动按文档导航选择最低验证，正式 Gate 交付用 changed，大范围变更用 all，公开发布走同 receipt 的完整发布路径。
- 采用: 单一 Gate 进程入口、exact candidate、Product dependsOn 传播及严格有效集合聚合保持。Gate 私有 entry policy 表达 routine/release-only/explicit-only；不把新策略加到 Product API，也不为性能分布拆分或合并 Check。
- 采用: 四项指定仓库扫描与真实 artifact、installed docs/runtime 验收保留。不同选择范围减少工作量与同一工作量优化分别报告；既有版本化性能预算、统计和失败证据规则不变，receipt+all 使用原 all 预算。当前精确接线见 [Project Gate](../../tooling/project-gate.md)。
