---
title: 将 Project Definition 与自定义 Runner 视为受信任代码
status: archived
alignment: unaligned
createdAt: 2026-08-05T10:31:36Z
purpose: 诚实界定动态 Check 的权限、故障恢复和不可信项目调用边界。
background: 导入 TypeScript module 并调用同进程函数会执行项目代码，函数入口本身不提供 sandbox、隔离或强制终止。
decision: Project Definition 与 custom runner 以调用者权限同进程执行；产品不声称隔离，并为不可信项目提供完全跳过项目代码的显式路径。
relations: []
---

## 目的
- 让用户在启用动态 Check 前清楚知道会执行什么权限级别的代码。
- 避免把“Core 只调用函数”误解为函数受到 filesystem、network、environment 或进程级隔离。

## 背景
- Bun module evaluation、runner closure 以及 runner 调用的库或子进程都能使用 Vibe Check 进程拥有的权限。
- 同进程 Core 可以归一化普通 throw 或 rejection，但无法可靠恢复 `process.exit`、同步无限循环、全局状态破坏或拒绝协作取消的代码。
- 扫描不可信仓库与执行该仓库拥有的 definition 是不同的授权结果。

## 决策
- 采用: Project Definition 的 module evaluation 和 custom runner 都是调用者明确接受的受信任项目代码，以 Vibe Check 进程权限同进程执行；Product 不承诺 sandbox、权限收窄、秘密隔离或强制终止。
- 采用: 正常 trusted-project workflow 可以使用显式或固定发现的 Project Definition；面向不可信项目的调用必须有显式路径完全跳过 module import、runner registration 和其它 project-owned executable code。
- 采用: 跳过 Project Definition 只允许 Product-owned neutral observation；需要项目政策的 gate 不得在绕过模式下继续执行或静默采用猜测政策。
- 采用: 可捕获的 module/runner failure 按所属 pre-work 或 CheckRun 边界报告；真正的进程、worker 或 sandbox 隔离必须由未来独立决策和实现承接。
- 不采用: 使用 `safe`、timeout 或 validation 等措辞暗示同进程任意函数已经被隔离。
