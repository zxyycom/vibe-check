---
title: 将翻译来源说明置于对应法律材料目录
id: 260907-scope-translated-source-notices-to-material-directory
status: active
alignment: aligned
createdAt: 2026-09-07T10:07:20Z
purpose: 让归属说明的名称、路径和正文准确表达实际随包翻译材料而非全部第三方依赖。
background: 根第三方说明实为 Lizard 和 Pygments 翻译说明，却混入计数和安装审计流程，范围不清。
decision: 根仅保留自有许可，翻译归属与原文同置 licenses，动态安装依赖仍独立审计。
tags:
  - dependency-policy
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: 260907-unify-package-legal-materials-and-audit-installed-dependencies
---

## 目的

- 让读者区分 Vibe Check 自有许可、实际携带翻译代码的来源说明、上游许可原文和独立安装依赖。
- 消除人工说明中的内部计数与流程自证，不削弱真实材料完整性和安装审计。

## 背景

- 根 THIRD_PARTY_NOTICES.md 是项目手写的 Lizard/Pygments translation narrative，不是上游原文或完整 npm 依赖清单。
- 源码头、三份原文和 provenance 已明确记录实际翻译来源；普通 npm dependencies 作为独立 package 安装，不 bundled 到本 tarball。
- 用户已批准移除根 notice，把简短翻译归属放到 licenses 内，并保留原文及源码头。

## 决策

- 采用: 根 LICENSE 只承接 Vibe Check own text；licenses/analyzer-translations-NOTICE.md 只承接实际 Lizard/Pygments 翻译的来源、修改状态和相邻原文/provenance 导航，不再发布根 THIRD_PARTY_NOTICES.md。
- 采用: 三份上游许可原文、provenance 和 translated source headers 继续构成物理来源闭合；licenses 不表示整个 direct/transitive npm graph，不选择性镜像普通依赖的文本。
- 采用: 项目自写说明的来源是仓库文件本身，验收证明 repository、staging、tarball、installed candidate 的实际材料一致性；不要求说明包含安装审计流程、deferred 数目或固定自证措辞。不可变上游原文与来源 identity 校验保留。
- 采用: private consumer 实际安装的完整 dependency package 集合继续核对 name/version/许可声明与当前政策，包括 scoped、nested、平台实际选择的 optional packages 和受支持 legacy licenses[]；布局逃逸、声明缺失或未复核 identity 仍 fail closed。
- 采用: 安装审计机制由维护者 owner 说明，不能伪装成静态随包法律内容。Release receipt 只绑定当次 tarball 主动携带的材料；新布局只进入新构建，不改写旧 release evidence。
- 采用: 这些校验分别证明材料和声明与政策闭合，不构成法律充分性或具体司法辖区的兼容性结论。
