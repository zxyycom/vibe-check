---
title: 公开同步的单份项目文件收集工具
id: 260908-provide-synchronous-single-selection-file-collection
status: active
alignment: aligned
createdAt: 2026-09-08T01:32:42Z
purpose: 让自定义 Check 和普通脚本复用显式文件选择，而不复制枚举逻辑或取得 Check 领域策略。
background: 选择类型和默认基线已公开，实际枚举仍是仅信任内部 typed input 的实现，不能直接作为公共边界。
decision: 提供校验完整单份 selection 的同步工具，复用既有枚举并返回不可变路径，保留明确失败与 Check 职责。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 让普通 package caller 以与随包 Check 一致的来源和过滤语义收集一份项目文件列表。
- 保持工具只拥有路径收集；Check 自己决定 eligibility、code areas、阈值、结果与安全读取。

## 背景

- `ProjectFileSelection` 与 `defaultProjectFileSelection` 已可由调用方显式组合；内部单份与批量 collection 已复用同一候选枚举机制。
- 用户确认第一版只需单份选择且无需中途取消；批量 API、异步协议或额外状态不服务当前结果。
- 公共输入必须验证并脱离 caller 对象，不能把内部 trusted primitive 的类型当作 runtime validation。

## 决策

- 采用: 公共 `collectProjectFiles({ projectRoot, selection })` 同步返回冻结的 project-relative `/` 路径数组；selection 是完整的 source/include/exclude，工具不猜测 owning Check 默认值，调用方可显式组合公共默认基线。
- 采用: 显式 projectRoot 为非空且无 NUL 的受信任路径，relative 从当前工作目录解析，absolute 直接使用；它不是 filesystem containment 或 sandbox 声明。
- 采用: 公共 façade 对 options 与完整 selection 做 closed、descriptor-safe 校验和 detached snapshot。非法参数以 TypeError 明确失败；所选 filesystem/Git 来源失败继续抛出 Error，不回退另一来源或伪装空集合。
- 采用: 复用 project-files owner 的唯一枚举/过滤机制，保持显式 filesystem/git-worktree、同一 glob、exclude 优先、稳定排序去重与合法空数组。返回只是本次收集的路径结果，不承诺文件内容、存在性在返回后不变、可读性或跨次原子快照。
- 采用: 第一版不接受 AbortSignal、不承诺中途取消或非阻塞；不公开命名批量集合、Map、cache、watcher、scanner 或共享全局文件范围。
- 采用: Check 仍自己拥有 exact-input eligibility、安全读取、领域选项与四态结算；独立工具不隐式创建 Check、Run、Record、machine output 或 output status。
- 不采用: 直接导出内部 trusted 函数、复制第二枚举器、公开 codeAreas/阈值或为假想批量需求预建接口。
