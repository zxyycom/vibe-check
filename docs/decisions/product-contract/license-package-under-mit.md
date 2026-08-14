---
title: 使用 MIT 许可发布 Vibe Check package
status: active
alignment: unaligned
createdAt: 2026-08-14T05:52:51Z
purpose: 让公开 package 的使用、分发和法律材料使用一个明确的开放源码许可边界。
background: Public npm package 的 manifest、legal text 和 provenance 必须使用一致许可，不能从 repository visibility 推断。
decision: "`vibe-check` package 使用 SPDX `MIT`；candidate 和发布材料必须包含匹配的许可文本及权利人信息。"
relations: []
---

## 目的
- 让 `vibe-check` 的公开安装、使用、复制和分发具有明确且一致的许可表达，并让 package materials 可以被自动化与消费者核验。

## 背景
- 产品 owner 已选择 MIT 作为公开 package license。
- Root repository 当前缺少 package legal file；`package.json` 字符串、repository visibility 或公开源码本身都不能替代匹配的许可材料。
- License choice、registry authority 和 publish authorization 是不同边界，不能由其中一项推断另外两项。

## 决策
- 采用: `vibe-check` candidate manifest 和 published package 使用 SPDX expression `MIT`。
- 采用: Packed package、README/release metadata 和 provenance 对许可表达保持一致，并包含匹配的 MIT legal text 与经核实的 copyright holder/year 信息。
- 采用: Exact-tarball inventory 和 release verification 检查许可字段与 legal material 一致；缺失或不匹配时不得把 candidate 表述成可发布 package。
- 不采用: 使用 `UNLICENSED`、restricted/private license 语义，或把 public repository visibility 当成隐含许可。
