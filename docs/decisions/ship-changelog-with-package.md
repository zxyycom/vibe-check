---
title: 随包交付版本变更日志
id: 260909-ship-changelog-with-package
status: active
alignment: aligned
createdAt: 2026-09-09T03:26:07Z
purpose: 让消费者随安装版本取得可追溯的变更与升级说明
background: Change 草稿不随包提供且会在交接后清理，升级用户需要独立可读的长期入口
decision: 以 docs/changelog.md 承接版本变更日志并纳入随包材料，按实际阅读负担再评估版本目录
tags:
  - documentation
  - product-contract
relations: []
---

## 目的

让消费者从安装包和 README 取得与版本相匹配的变更、升级影响和提交追溯入口。

## 背景

发布 Change 中的草稿服务临时实施与审阅，完成后会清理；用户选择将 changelog 放入 docs 并随包交付。
当前一份文档足以承接版本变化，提前建立按版本拆分的目录只会增加入口与清单维护。

## 决策

- 采用: 以 `docs/changelog.md` 作为当前变更日志入口，随 package 发布，由 README 直链。
- 采用: 正文按版本说明净变化与必要升级调整，相关提交提供追溯；当前行为规范继续由对应用户指南拥有。
- 采用: changelog 使用显式文档材料清单，参与源码指纹、精确 bytes、包内链接及 installed consumer 验收。
- 采用: 当前保留单文件；版本数量或阅读负担确有需要时，再评估 `docs/changelog/<version>.md`，同时维护入口和显式清单。
