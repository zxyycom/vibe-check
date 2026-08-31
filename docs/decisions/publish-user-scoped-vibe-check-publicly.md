---
title: 在个人 npm scope 公开发布 Vibe Check package
status: active
alignment: aligned
createdAt: 2026-08-31T03:56:03Z
purpose: 让消费者从发布者可控制的个人 npm namespace 安装公开的 Vibe Check package。
background: unscoped vibe-check 因 npm 近似名称保护被拒绝，而 zxyycom 个人 scope 可承接同一公开产品身份。
decision: 使用公开的 @zxyycom/vibe-check 作为 registry identifier，并让 manifest、文档与验收共享这一身份。
tags:
  - product-contract
relations:
  - type: 替代
    target: publish-unscoped-vibe-check-publicly.md
---

## 目的

- 让外部消费者通过普通 npm registry 安装一个由当前发布者 namespace 承接、身份明确的 Vibe Check product package。
- 保持 package identity、安装说明、import specifier、release artifact 与 registry acceptance 使用同一个可追溯名称。

## 背景

- npm 对 `vibe-check@0.0.1` 的首次 publish 请求返回 `E403`，明确指出该名称与既有 `vibecheck` 过于相似；此前的 not-found 查询不能绕过 registry 的近似名称保护。
- npm 账号 `zxyycom` 自动拥有同名个人 scope；公开 scoped package 不要求建立 organization，但首次 publish 必须显式选择 public access。
- Vibe Check 的产品显示名、GitHub repository `zxyycom/vibe-check`、repository root manifest 与 registry package identifier 是不同契约，不需要因 npm scope 同步改名。
- `0.0.x` prestable compatibility、MIT、Bun host 与完整 release evidence 继续由各自决策承接；scope 不产生稳定版本、发布成功或持续 registry authority 的推断。

## 决策

- 采用: Product package 的 registry identifier 使用 user-scoped `@zxyycom/vibe-check`，access 为 public；消费者安装和 import 时使用完整 scoped specifier，不需要 organization membership 或 private-registry credential。
- 采用: Generated manifest、consumer documentation、private/external consumer、formal receipt 和 registry acceptance 使用同一 scoped identity；Bun pack 的 filesystem-safe tarball 名称只是 artifact path，不成为第二个 package identity。
- 采用: 首次 publish 显式传入 `--access=public`；真实 publish 前仍须重新核验 scoped name/version、authentication、exact artifact 与外部写入授权。
- 不采用: 继续重试被 npm 拒绝的 unscoped `vibe-check`、仅在 publish command 中假设可以覆盖 tarball 内的名称，或为使用个人 scope 建立无必要的 npm organization。
