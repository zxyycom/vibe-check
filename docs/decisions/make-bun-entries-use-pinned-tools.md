---
title: 让 Bun 入口自行绑定项目锁定工具
status: active
alignment: aligned
createdAt: 2026-08-12T15:04:30Z
purpose: 让正式 Bun 命令可复现地使用仓库锁定工具，并拒绝执行 ambient PATH 中的同名程序。
background: 项目虽用 mise 锁定 Lizard 与 scc，但普通 Bun 入口曾依赖调用 shell 注入 binding，缺失时 Product 会退回全局命令。
decision: 消费锁定外部工具的正式 Bun package entry 自行进入 mise；Product dependency boundary 要求显式 binding，缺失时在 work 前失败。
tags:
  - workflow-policy
relations: []
---

## 目的
- 让开发者直接运行项目声明的 `bun run` 入口即可获得与 CI、Project Gate 相同的
  scanner 版本和执行路径，不依赖 shell 激活状态或机器上的全局工具。
- 防止版本漂移、同名命令劫持和局部环境偶然可用掩盖缺失的项目依赖。

## 背景
- `mise.toml` 与 `mise.lock` 已固定 Lizard、scc 和其它开发工具，但只有进入 mise 环境后才会
  生成其绝对路径和 operational binding。
- 普通 `bun run quality:check` 曾在未激活 mise 的 shell 中让 Product 回退到 `python3 -m
  lizard` 与 `scc`，因此同一仓库命令会随 ambient `PATH` 和 Python site-packages 改变结果。
- Scanner identity、安装与 command binding 是内置 Check 的私有 dependency responsibility，
  不应进入 public project config 或 machine output。

## 决策
- 采用: 会启动 Product scanner 的正式 Bun package entry 自行通过 repository-pinned mise
  environment 运行；调用方不需要预先激活 mise，也不需要手工拼接 scanner 路径。
- 采用: mise 环境通过 package-private binding 名把锁定的 Lizard virtualenv Python 与 scc
  executable 作为绝对 command binding 注入 Product；公开 operational override 名不由 mise
  管理，并始终优先于 private pin，避免嵌套激活把调用方选择重置为项目默认值。
- 采用: Product dependency boundary 只接受显式 command binding；缺少 binding 时在 scanner、
  cache 与 artifact work 前返回 operational failure，绝不退回 ambient `python`、`python3`、
  `scc` 或其它 PATH 命令。
- 采用: 工具路径和 backend identity 保持内部事实，不进入 public semantic config、catalog、
  report 或 machine artifacts。
- 不采用: 仅在文档中要求调用方记住 `mise exec`，或通过 PATH 顺序、全局 Python package、
  用户级 uv/pipx shim 和系统安装维持偶然可用。
