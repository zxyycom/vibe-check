---
title: 为 Markdown Link Check 定义离线本地目标边界
status: active
alignment: unaligned
createdAt: 2026-08-25T01:56:25Z
purpose: 让 Markdown Link Check 在零网络前提下验证本机目标，并以显式选项处理 project root 外路径和目录语义。
background: 用户确认 Link 应内置、离线，并需要可选验证 project root 外的任意本机目录，同时以 GitHub 锚点行为优先。
decision: Link 自己拥有 source scope 外与 project root 外本机目标的受控授权；默认不读取 root 外路径，网络与 raw path 仍不进入公共边界。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 让 Markdown Link Check 能验证常见的 sibling workspace、共享文档目录和明确引用的任意本机路径，而不把 source 文件收集扩大成任意文件系统扫描。
- 让 project author 明确选择 project root 外目标是忽略、汇报还是实际验证，并能独立选择目录是否必须非空。
- 保持离线 Link Check 不发起 Product-owned network request，也不把原始本机路径、URL query 或 target bytes 写入 Core、Record、output、cache 或 log。

## 背景

- `ProjectDefinition.quality` 的 global scope 是 source 文档的唯一资格 owner；它不应因为一个 Link Check 的 target resolver 变成第二个递归 file collector。
- project-local 文档常以相对路径指向 scope 外或 project root 外的 sibling workspace、monorepo 目录和本机资料。只允许 root 内目标会使 Link Check 偏离读者对链接完整性的直觉。
- project root 外的路径也可能碰到调用者无意暴露的文件、symlink escape、不可移植 absolute path 或网络挂载；因此它不能由 Check registration、CLI profile 或隐式 fallback 获得读取权限。
- HTTP(S)、`mailto:`、protocol-relative URL 与 remote `file:` authority 仍属于非本机/网络边界，必须继续遵守 [网络 Check 使用 Check-owned 显式授权](require-check-owned-network-authorization.md)。

## 决策

- 采用：`markdownLinkValidation` 是 Product-provided ordinary Check。它的 source occurrence 仍严格来自 global-scope eligible Markdown inputs；direct target resolution 是 Link Check 自己的领域工作，不创建 source discovery、递归 target scan、共享 filesystem capability 或跨 Check data handoff。
- 采用：离线 Link Check 不创建 DNS、HTTP、TLS、redirect 或其它 Product-owned network operation。它只把无 remote authority 的本机路径（包括受支持的 local `file:` form）作为 local candidate；UNC、protocol-relative 与带 remote authority 的 `file:` form 不得因本 Decision 被访问。OS 已挂载的文件系统可能由 host 自己实现远程 I/O，不属于 Product 能够或承诺隔离的网络 transport。
- 采用：Link 的 closed options 以一个明确的 project-root 外 target mode 表达三种互斥语义：`ignore` 不读取也不汇报；`report` 以安全的 boundary finding 汇报但不读取；`validate` 才允许对 source 明确指向的 root 外本机 target 做 bounded metadata/content work。默认不得进入 `validate`；公开字段名和完整 defaults 由 Link Change 的 options evidence 固定。
- 采用：root 内但 source scope 外的 direct target 可以作为 resolver target 被 bounded 检查；它不成为新的 source input。跨文档 fragment 只有 target 是可读取的 Markdown regular file 时才读取其 heading facts；目录不承载 anchor lookup。
- 采用：目录 target 的存在性与“必须非空”是两个独立语义。`requireNonEmptyDirectories` 为显式、默认关闭的 Link-local policy；启用时只检查直接 target directory 是否至少有一个 entry，不递归枚举内容。无法读取目录按 Link 的 `unavailable` 语义结算。
- 采用：GitHub 的 heading anchor 行为是 Link 的兼容优先级。实现以 fixture 固定可支持的 GFM-like slug/fragment result；它不声称自动兼容所有 renderer 或依赖某个 parser 的偶然边缘行为。
- 采用：root 外 target、absolute target、symlink realpath 和 directory finding 的 Record/final data 只含 source-relative navigation、occurrence kind、safe policy/reason 与 count；不得包含原始或 digest 后的外部 absolute path、target contents 或可关联的 destination material。
- 不采用：默认读取任意本机路径、以 Link Check 发起网络校验、把 local target roots 提升为 Run/Product-wide permission，或以 future Path/Network Check 的假想复用建立 shared resolver。
