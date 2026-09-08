---
title: 统一随包法律材料并审计实际安装依赖
id: 260907-unify-package-legal-materials-and-audit-installed-dependencies
status: archived
alignment: aligned
createdAt: 2026-09-07T02:22:54Z
purpose: 让单一 package 材料目录与安装时依赖许可审计分别承接稳定随包内容和动态依赖图。
background: 现有两个第三方目录来自功能分批引入，三个手工镜像文本既不是完整依赖清单，也没有形成稳定选择规则。
decision: 除自有 LICENSE 和顶层 notices 外统一使用 licenses 目录，并对每次 exact candidate 的完整安装包集合执行 fail-closed 许可声明审计。
tags:
  - dependency-policy
  - product-contract
  - workflow-policy
relations: []
---

## 目的

- 让 package consumer 和维护者从路径直接区分 Vibe Check 自有许可、主动携带的第三方材料与 package manager 独立安装的依赖图。
- 消除选择性复制少数 dependency license text 所造成的“这是完整依赖清单”错觉，并让实际安装的所有 dependency packages 都进入可复核验收。
- 保持 translated/embedded source 的物理 legal-material closure，同时避免把平台相关、可随 semver 解析变化的传递图冻结成 package 的静态内容契约。

## 背景

- Package artifact 形成时同时包含 `licenses/` 与 `third-party-licenses/`；前者保存 Lizard/Pygments translated-source license/provenance，后者只保存几次新增 dependency 时手工加入的 Immutable、Momoa 与 Secretlint 文本。两个目录都属于 package legal-material owner，没有构建或运行边界要求分开。
- 当前发布 manifest 声明十七个 direct production dependencies，隔离 candidate 的实际安装还包含传递依赖及本平台实际选中的 optional packages；其中 `jscpd` 使用兼容范围。普通 npm dependency 作为独立 package 在安装时解析，`node_modules` 不进入未声明 bundled dependencies 的 Vibe Check tarball，因此该完整图不是一份稳定的随包文件集合。
- 现有 translated-analyzer 决策已经要求其 source header、notice、provenance 与完整物理许可文本闭合；本决策不降低该要求，而是为所有 package legal material 与普通 dependencies 补充统一 owner。

## 决策

- 采用: Package 顶层 `LICENSE` 只承接 Vibe Check own text，顶层 `THIRD_PARTY_NOTICES.md` 承接人读 attribution/index；因 translated/embedded source 由 Vibe Check 主动随 artifact 携带的其它第三方 license text 与 provenance 一律进入单一 `licenses/**` inventory，不再发布平级 `third-party-licenses/`，也不选择性镜像普通 npm dependency 的文本。
- 采用: `licenses/**` 表示由本 package 主动携带并进行 byte/source closure 的材料，不宣称等于全部 direct/transitive dependencies。普通 dependency 的代码、manifest 与自带 legal materials 继续属于 package manager 安装的独立 package，不因 Vibe Check 引用而复制整棵动态依赖树。
- 采用: Exact candidate 安装验收遍历 private consumer 中本次实际安装的全部 dependency package directories，核对合法 name/version 和明确 license declaration，并只接受项目已复核的 license identity；top-level、scoped、nested、本平台实际出现的 optional package，以及所有条目具有同一个非空且无首尾空白 `type` 的 legacy `licenses[]` 均进入同一 fail-closed boundary。审计是安装证据，不发布固定包名/数量，不改变 consumer resolution。
- 采用: 新的 license identity、缺失或无法解释的 declaration、candidate package path 逃逸和不受支持的安装布局必须阻断 candidate 验收，直到维护者审阅 dependency change 并显式更新 owner；不能通过再手工复制一个随机 license 文件来绕过图审计。
- 采用: Release receipt 继续只绑定 Vibe Check tarball 主动携带的 legal-material bytes；动态 dependency graph 由 candidate/release verification 重新执行安装审计，不伪装成 tarball 自身内容或长期 public contract。该审计证明声明与政策闭合，不替代具体司法辖区的法律意见或每项义务审查。
