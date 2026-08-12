---
title: 以版本化 npm package 交付完整产品单元
status: active
alignment: unaligned
createdAt: 2026-08-12T09:12:51Z
purpose: 让消费者从一个明确版本获得彼此匹配的执行实现、公共声明与已承诺 package materials。
background: 产品执行、类型化 authoring 与必要 package materials 需要统一版本边界，而源码树入口不能证明可安装产物完整。
decision: 使用一个版本化 npm package 作为产品发布单元；同版本交付全部已承诺材料，具体公共 surface 与名称由各自决策承接。
relations:
  - type: 拆分
    target: product-contract/use-versioned-npm-package-release-unit.md
---

## 目的
- 让消费者从一个可安装、可锁定的 package version 获得彼此匹配的产品执行实现、受支持的 TypeScript 声明文件与明确承诺的 package materials。
- 让构建、兼容性说明和发布验收针对同一个完整发布单元，而不是分别证明源码、声明或资源可以局部使用。

## 背景
- 产品执行、Project Definition authoring、公共类型、runtime validators 与其它明确承诺的 package materials 可能相互依赖；分开交付会允许不匹配版本被组合。
- npm package 能承接 TypeScript/Bun 产品的安装、版本锁定、声明与资源分发；采用 npm 作为分发载体不自动决定宿主 runtime、公共名称或执行界面。
- Repository manifest、源码路径和构建 staging 都是产品开发或发布机制，不因出现在 tarball 中就自动成为公共契约。

## 决策
- 采用: 使用一个版本化 npm package 作为完整产品发布单元；同一版本共同交付正式执行实现、受支持的公共声明，以及由更具体产品契约明确承诺的其它 package materials。
- 采用: Package artifact 只从权威产品源码和资源 owner 生成并验证，不建立手工维护的第二套 runtime、声明或资源事实源。
- 采用: 只有明确建立的 exports、公共类型与已声明资源构成 package contract；tarball 内部路径、repository 路径和构建 staging 布局不构成公共 API。
- 采用: Package 必须声明并验收实际支持的宿主 runtime、平台前提与 production dependency closure；使用 npm 分发不表示 runtime 已经兼容 Node.js。
- 采用: Registry package name、export subpath、公共 symbol 与任何已承诺 material name 不由本决策选择；它们必须遵守独立的公共命名决策。正式 surface 由独立的产品入口与 public-surface 决策承接。
- 不采用: 分别发布执行实现、公共声明或必要资源，再让消费者通过 repository 源码、未版本化路径或独立下载自行拼装兼容组合。
