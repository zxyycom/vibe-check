---
title: 使用显式文件政策覆盖
status: archived
alignment: unaligned
createdAt: 2026-08-04T15:02:12Z
purpose: 让不同文件和目录在同一项目范围内使用可解释且可验证的质量政策。
background: 单一项目政策不能合理覆盖 README、长篇设计文档、生成示例和普通源码，任意深合并又难以解释结果。
decision: 在完整基础政策上应用有序、类型化的文件覆盖，且覆盖不能扩大范围或创建基础政策中缺失的能力。
tags:
  - configuration
relations: []
---

## 目的
- 允许项目针对明确文件或目录调整适用检查和阈值，而不复制整份配置或改变全局 scan scope。
- 让最终文件政策的来源、匹配顺序和合并结果可以由人和工具一致解释。

## 背景
- README、长篇规范、生成示例和普通实现文件可能需要不同的文档长度、链接、格式或秘密检查政策。
- 任意 key、隐式数组拼接、`null` 删除和从默认值补齐缺失 section 会让同一文件的实际政策难以审阅，并可能意外启用能力。
- 全局 include、exclude、generated 和 vendor 边界拥有输入资格；文件级政策只能在这个 inventory 内缩小或调整 capability 行为。

## 决策
- 采用: Project config 维护完整基础政策和按 normalized project-relative glob 匹配的有序 overrides；多个 override 命中时按文档顺序应用，后者只覆盖自己声明的 leaf。
- 采用: Override 使用由同一产品 check schema 派生的 closed typed partial patch；object 只递归到声明的 leaves，array 整体替换，不接受未知 key、`null` 删除或 backend/tool 字段。
- 采用: Optional feature section 在基础政策中缺失时表示未配置并保持 skipped；override 不得创建该 section或从 neutral default 隐式补值。
- 采用: Override 可以缩小 capability exact inputs或调整能力自身政策，但不得重新纳入全局 scope 外文件，也不得修改 acceptance、report、artifact/cache path 或 scanner dependency 设置。
- 不采用: 为每项功能建立独立 merge engine，或让调用方依靠未记录的默认值恢复最终文件政策。
