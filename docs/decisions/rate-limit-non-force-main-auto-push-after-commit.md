---
title: 对 main 提交后的非强制自动推送限频
status: active
alignment: aligned
createdAt: 2026-08-31T06:18:20Z
purpose: 让个人项目的 main 提交可以低干扰地同步到远端，同时保留 Git 的非快进保护和本地提交结果。
background: post-commit 自动推送属于持续外部写入；网络、鉴权或远端领先都可能失败，未经约束的重试或同步修复会扩大副作用。
decision: 使用显式启用的仓库 post-commit hook，只对 main 向 origin 执行不带 tag 的普通 push，每小时最多尝试一次，任何失败都不改变 commit 或触发同步修复。
tags:
  - repository-automation
relations: []
---

## 目的

- 让个人项目在 `main` 上形成提交后，可以在不要求每次手工输入 push 命令的情况下尝试同步 `origin/main`。
- 保留普通 Git push 的 non-fast-forward 保护，不让便利性演变为 force、远端覆盖或隐式历史整理。
- 对网络、鉴权和远端状态的持续失败限频，并保证 hook 失败不会把已经成功形成的本地 commit 表述为失败。

## 背景

- Git `post-commit` hook 在本地 commit 已经形成后运行，适合发起非阻断同步，但它是持续的外部写入边界。
- 远端可能领先，本机也可能暂时没有网络或可用凭据；每次 commit 都立即重试会产生重复诊断和不必要的外部请求。
- Git 不会在 clone 后自动信任并启用仓库中的 hook，因此版本化实现与 checkout-local 启用状态必须分开表达。
- npm package 是产品发布单元；同步开发分支不等于发布 package、tag 或 GitHub Release。

## 决策

- 采用: 由仓库版本化的 `.githooks/post-commit` 承接该行为，并由需要它的 checkout 通过 local `core.hooksPath` 显式启用；不使用全局 Git 配置替其他仓库作决定。
- 采用: 只有当前分支精确为 `main` 时才处理，目标固定为 `origin` 的 `refs/heads/main:refs/heads/main`；执行普通 non-force push，并显式禁止 follow-tags。
- 采用: 两次真实 push attempt 的开始时间至少相隔 3,600 秒；attempt time 在调用 push 前写入 Git-local state，因此成功、鉴权失败、网络失败和 non-fast-forward 拒绝都消耗同一 cooldown。
- 采用: branch、remote、time 或 state 前置条件不满足时跳过；push 失败时输出可行动诊断并以成功结束 hook，保留已经形成的 commit。
- 不采用: 自动 force、fetch、pull、merge、rebase、重写分支、创建或推送 tag，也不把这个 hook 扩展为 npm publish 或 GitHub Release workflow。
