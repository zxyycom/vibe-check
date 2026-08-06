---
title: 使用版本化 npm package 作为产品发布单元
status: active
alignment: unaligned
createdAt: 2026-08-06T02:57:00Z
purpose: 让 CLI、公共 TypeScript 声明文件与必要产品资源作为同一 package version 可靠发布。
background: Project Definition、自定义 Check、公共类型与资源要求消费者获得彼此匹配的执行与 authoring 材料，单一 CLI 入口已不足以承接完整发布边界。
decision: Vibe Check 以 npm package 作为版本化发布单元，同一版本交付 CLI、公共声明文件和产品资源；CLI 是主要执行界面而非完整产品边界。
relations: []
---

## 目的
- 让调用者从一个可安装、可锁定的 npm package version 获得彼此匹配的 Vibe Check 执行实现、公共 TypeScript 声明文件（`.d.ts`）与必要产品资源。
- 让发布、兼容性和验收围绕完整产品材料建立，而不是只验证一个本地 CLI 命令能够运行。

## 背景
- Vibe Check 最初只需要承接命令路由、扫描、输出和进程状态，正式 CLI 足以描述当时的产品交互边界。
- Project Definition、自定义 Check、公共 Check/Record/Policy 契约、schema、模板与 built-in resources 使消费者同时依赖运行行为、authoring declarations 和资源版本；分别交付会导致声明文件、runtime validator、模板与执行实现漂移。
- npm package 可以承接 TypeScript/Bun 产品的可安装版本、可执行入口、声明文件和资源集合；使用 npm 作为发布载体不表示把产品 runtime 改为 Node.js。

## 决策
- 采用: Vibe Check 的版本化产品发布单元是 npm package。同一 package version 共同发布正式 CLI、受支持的公共 TypeScript 声明文件（`.d.ts`）、CLI 运行必需资源，以及明确承诺给消费者的 schema、模板或其它公共材料。
- 采用: CLI 继续拥有命令路由、进程生命周期、stdout/stderr、exit、gate 与 artifact publication，并保持主要执行界面；产品、文档和验收不得再把 CLI surface 当作完整发布边界的同义词。
- 采用: 公共声明文件、runtime validators、模板、built-in identities 和其它相互依赖材料必须由同一 package version 协调并进行发布验收。运行所需内容必须随包提供、作为受控 package dependency 解析，或成为明确且可诊断的平台 prerequisite。
- 采用: Product source 与行为 owner 保持单一；npm artifact 是从权威产品源码形成并验证的发布投影，不建立第二套手工维护的产品实现。只有明确公开的 exports、commands 和 materials 构成稳定 package contract，tarball 内部偶然路径不构成公共 API。
- 采用: 具体 package name、module subpaths、export map、声明组织、资源访问方式与 build/pack 结构由后续 public interface 和 release design 确定，但不得破坏同版本交付与单一 owner 约束。
- 不采用: 只发布独立 CLI、再让声明文件或产品资源通过仓库源码、单独下载或未版本化路径补齐。
- 不采用: 因采用 npm package 就自动把内部 Core、扫描函数或任意 package path 提升为稳定的通用 embedding API。
