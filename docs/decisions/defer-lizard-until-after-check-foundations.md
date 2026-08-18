---
title: 将 Lizard 统一后置于 Check 产品基础
status: active
alignment: unaligned
createdAt: 2026-08-05T11:15:25Z
purpose: 先建立新的 Check 产品运行边界，再重基线高风险且用户收益较低的 Lizard 迁移。
background: Lizard port 主要改善内部依赖，而 Check/Record、执行编排和 Project Definition 正在替换其旧前置路线。
decision: 先落地 Check/Record、执行编排与 TypeScript Project Definition，再重审 Lizard port。
tags:
  - product-priority
relations:
  - type: 修订
    target: defer-lizard-until-after-semantic-config-workflow.md
---

## 目的
- 让路线排序继续以产品能力和稳定执行边界为前置，不因已有 Lizard 迁移计划而抢占新的 Check 基础工作。
- 保留统一 TypeScript/Bun runtime 的长期价值，同时避免基于已经退出的配置路线继续实施。

## 背景
- Lizard TypeScript port 可以减少 Python process、私有协议和内部依赖，但直接用户收益仍低于建立可扩展项目检查系统。
- Check/Record Core、共享 Check Execution Orchestration 和 TypeScript Project Definition 会改变 scanner adapter、runner 与配置 owner，旧 semantic/external config workflow 已不再是可靠前序。
- 在这些基础落地前细化 port，容易围绕即将变化的执行接缝重复设计和验证。

## 决策
- 采用: 先完成并验证 Check/Record Core、Check Execution Orchestration 与 TypeScript Project Definition，再以届时源码、依赖和产品契约重新基线 Lizard port。
- 采用: Lizard port 默认保持后置，不因已有 change、减少依赖或 runtime 统一收益而自动成为下一项工作；只有出现直接阻塞交付、目标平台、可靠性、安全或许可证的证据时才提前重评。
- 采用: 后续 port 仍只替换 built-in Check 的私有 dependency、adapter 与 runtime，不改变稳定 Check/Record 身份、Project Definition authoring 或公共政策语义。
- 不采用: 继续以已退出的 semantic config 或 external project config workflow 作为 Lizard port 的路线前置与验收依据。
