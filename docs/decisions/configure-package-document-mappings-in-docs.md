---
title: 在 docs 中声明随包文档映射
id: 260909-configure-package-document-mappings-in-docs
status: active
alignment: aligned
createdAt: 2026-09-09T03:26:10Z
purpose: 让文档维护者在同一目录维护内容与精确发布范围
background: 文档路径分散在代码清单中，维护文档需要同时定位打包实现
decision: 以 docs 下的 JSON 统一声明源文件与包内路径，构建和验收读取同一配置
tags:
  - documentation
  - workflow-policy
relations: []
---

## 目的

让文档维护者在 docs 中同时维护正文与发布映射，构建和验收使用同一份可审阅输入。

## 背景

随包 Markdown、Check 指南与 machine 材料的路径原本分散在 TypeScript 清单中。
用户选择把源文件与包内路径的映射放在 docs 下的 JSON；这些材料共享发布映射，但各自仍有示例、Check 覆盖和机器契约义务。

## 决策

- 采用: 由 `docs/package-documents.json` 显式声明随包文档的 `sourcePath` 与 `packagePath`，统一承接 Markdown、Check 指南和 machine 材料的发布范围；配置本身作为仓库构建输入维护。
- 采用: 代码从本次指定的 repository root 读取并校验配置，构建、fingerprint、包材料和安装后验收复用该映射；拒绝冲突与越界路径，不另保留硬编码的发布清单。
- 采用: 示例投影目标、Check 导出覆盖与 machine 内容规则由对应实现拥有；导航和 README 继续提供阅读入口，不成为另一份发布映射。
- 采用: 配置只控制文件选择与目标路径，正文和链接仍由作者维护。当前路径保持不变，变更映射时同步检查包内链接和精确 bytes。
