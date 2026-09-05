---
title: 以单一入口和任务专题组织随包文档
status: active
alignment: aligned
createdAt: 2026-09-05T17:14:56Z
purpose: 让用户从最小使用路径进入深入扩展方案，并允许文档随真实使用任务增长。
background: 单一深入文档限制使调度和回调用法挤入 README，难以承接持续增加的公开能力。
decision: 保持 README 唯一总入口，按独立使用任务扩展显式随包专题，不限制深入页面数量。
tags:
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: structure-package-documentation-around-one-readme.md
---

## 目的
- 用户既能完成首次集成，也能按需学习公开回调、依赖组合、调度与输出等深入方案。
- 让专题数量由真实使用任务决定，不以压缩字数或固定页数代替信息完整性。

## 背景
- README 已承担最小路径与大量高级调度示例，首次阅读路径被打断。
- 用户明确要求深入 hook 的使用方案有专门承载位置，用户文档不能只介绍简单用法。
- 现有自然 heading 示例投影、Check guide inventory 与隔离 consumer 验收仍有独立价值。

## 决策
- 采用: README 仍为唯一总入口，说明定位、最小完整用法、结果含义，并直接路由到 Check 指南和任务专题。
- 采用: 每项随包 Check 的指南继续完整拥有该 Check 的 options、效果、结果、不可用与安全边界、最小用法和非目标。
- 采用: 通用 API 机制页承接公共心智模型；独立使用任务可以形成多个深入专题，说明适用场景、可用输入、返回作用、失败/取消边界和可验证用法，不再限制最多一篇深入文档。
- 采用: 局部参数和函数参考由 declarations JSDoc 承接，教程不退化为完整 API dump；不为导航本身增设重复索引页，不把仓库打包维护流程放入用户指南。
- 采用: 随包页面保持显式材料集合、包内链接闭合和单源可执行示例投影；新增专题必须同步 artifact 与 installed-consumer 验收。
