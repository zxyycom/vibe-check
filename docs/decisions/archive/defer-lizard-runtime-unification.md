---
title: 将 Lizard 运行时统一留到产品向工作之后
status: archived
alignment: null
createdAt: 2026-08-03T07:42:48Z
purpose: 先交付用户可感知的产品能力，再处理高风险且主要改善开发边界的运行时统一。
background: Lizard TypeScript port 收益与风险都高，但用户感知有限，且活动 change 的技术排序曾被反复误当成产品优先级。
decision: 将 Lizard TypeScript port 定位为最终提升项，不作为默认近期任务，也不阻塞产品向工作。
tags:
  - product-priority
relations: []
---

## 目的
- 让后续路线建议先按用户价值和产品体验排序，不把技术依赖图直接当作产品优先级。
- 保留统一 TypeScript/Bun 运行时的长期方向，同时避免它提前占用高风险、高成本的实现周期。

## 背景
- Lizard TypeScript port 可以删除 Python/Lizard process、private CSV protocol 和相关配置面，
  对运行时统一、依赖闭包与开发维护有明显收益。
- 该 port 需要固定上游来源与许可证、验证实际 source closure、逐层翻译 parser、建立
  differential parity，并一次性切换 runtime；收益和实施风险都高，不能视为简单小任务。
- Port 保持现有 function-metrics 产品契约，完成后用户直接感知的能力与体验变化有限。
- 活动 OpenSpec 曾因 config shape 迁移把 port 排在 external config workflow 之前，后续建议
  因而反复把实现顺序误读为当前最值得做的产品工作。

## 决策
- 采用: 将 `port-lizard-function-metrics-to-typescript` 定位为当前产品向能力和体验工作之后的
  最终运行时统一提升项；不得仅因它是活动 change、已具备实施计划或位于技术依赖链上，就把
  它推荐为默认下一项工作。
- 采用: 用户可感知的产品能力、可用性和体验工作可以先按当前 runtime/config contract
  推进；不得让未来 port 的理想 config shape 阻塞这些工作，必要时明确接受 port 恢复后的
  一次受控 config migration。
- 采用: 只有用户显式重新排序，或出现会直接阻塞产品交付、目标平台可用性、可靠性、安全或
  许可证合规的具体证据时，才提前重新评估并启动该 port。
- 不采用: 只因为统一运行时、减少依赖或降低开发维护面具有长期收益，就把该开发向优化置于
  尚未完成的产品向结果之前。
