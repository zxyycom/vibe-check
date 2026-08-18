---
title: 将 Lizard 运行时统一留到语义配置与产品工作之后
status: archived
alignment: null
createdAt: 2026-08-03T09:05:03Z
purpose: 先交付稳定的公共配置和用户可感知工作流，再处理高风险且主要改善开发边界的运行时统一。
background: Lizard TypeScript port 收益与风险都高但用户感知有限；公共配置改为 scanner-tool 中立后，也不再需要为未来 port 预留一次配置迁移。
decision: 先完成语义配置与外部项目工作流，再把 Lizard port 作为最终内部提升项，且 port 不得改变公共配置契约。
tags:
  - product-priority
relations:
  - type: 修订
    target: defer-lizard-runtime-unification.md
---

## 目的
- 让后续路线建议先按用户价值和产品体验排序，不把技术依赖图或运行时统一误当成默认下一步。
- 让外部项目从第一份可发现配置开始就使用稳定产品语义，不因未来 scanner backend 替换再次迁移。
- 保留统一 TypeScript/Bun 运行时的长期方向，同时把高风险翻译和 parity 工作留到产品向结果之后。

## 背景
- Lizard TypeScript port 可以删除 Python/Lizard process、private CSV protocol 和相关内部依赖，
  对运行时统一、依赖闭包与开发维护有明显收益，但保持现有 function-metrics 产品行为，用户
  直接感知有限。
- 该 port 需要固定上游来源与许可证、验证实际 source closure、逐层翻译 parser、建立
  differential parity，并一次性切换 runtime；收益和实施风险都高，不能视为简单小任务。
- Public project config 已确认应只表达稳定质量语义，scanner identity、command、args 与
  operational resolution 由 Product 内部边界拥有。因此 external workflow 不应先发布当前
  tool-shaped config，再为 Lizard port 安排一次用户无收益的迁移。
- 活动 change 的技术排序曾被反复误读为当前最值得做的产品工作，需要用长期优先级明确区分
  架构前置、产品交付顺序和最终内部优化。

## 决策
- 采用: 先完成 scanner-tool-neutral semantic config change，再让
  `add-external-project-config-workflow` 直接生成、发现和 dogfood 最终 semantic config；不得
  为了提前推进 workflow 而暂时公开底层 scanner field。
- 采用: 将 `port-lizard-function-metrics-to-typescript` 定位为上述产品向工作之后的最终
  运行时统一提升项；不得仅因它是活动 change、已有计划或仍能减少依赖，就把它推荐为默认
  下一项工作。
- 采用: Lizard port 恢复时只改变 internal dependency、adapter、process/CSV 与 translated
  runtime；public project config 的 version、semantic fields、starter、schema、examples 和
  accepted-warning identity 不随 backend replacement 迁移。
- 采用: 只有用户显式重新排序，或出现会直接阻塞产品交付、目标平台可用性、可靠性、安全或
  许可证合规的具体证据时，才提前重新评估并启动该 port；提前启动也不得重新暴露
  project-level backend settings。
- 不采用: 先按当前 Python/Lizard tool shape 发布配置，再把未来 public config migration
  当作运行时统一的必要成本。
- 不采用: 只因为统一运行时、减少依赖或降低开发维护面具有长期收益，就把该开发向优化置于
  尚未完成的产品向结果之前。
