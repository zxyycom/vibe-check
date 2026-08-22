# Proposal

本 Draft 是 repository hard cutover 之后的首次公开 package 优化：交付完整、随版本安装的公共 API 文档。源码 JSDoc 直接服务 LSP/declaration consumer，package README/API guide 服务安装与端到端 authoring；cutover 完成前不进入 implementation，本 Change 也不授权 registry publish。

## Why

当前仓库文档已经说明 Project Definition、Check、Record、Run Controls 与 RunResult，但 package candidate 只包含 runtime entry 和 declarations，公共 exports/类型上的 JSDoc 也不完整。外部 consumer 安装 tarball 后不能仅靠 package 内容恢复 Bun host、入口、最小调用、custom Check、Records、policy、effects、结果分支和失败边界；维护者也容易把项目内部路径或 release-time README 临时文字误当作公共契约。

公共 API 文档必须在 publish 之前由可重复 candidate build、exact-tarball inventory 和 isolated consumer 验证。registry release Change 应只核对并发布已经审阅的材料，不应在不可逆外部写入阶段临时撰写 API guide。

首次公开 package 的最小 Record/Core/machine contract 已由 [`establish-minimal-check-record-contract`](../archive/establish-minimal-check-record-contract/) 交付，Check-attached terminal messages 与显式 visibility 也已由 [`add-check-terminal-messages-and-visibility`](../add-check-terminal-messages-and-visibility/) 完成实现、public candidate 与验收。`add-typed-check-dependency-outputs` 不是 `add-check-terminal-messages-and-visibility` 的前置；它是本 documentation Change 仍需的唯一上游 API Change，用于交付 typed dependency getter。在它实施前，本 Change 不冻结该部分文档。

## Outcome

完成后，公共 functions、values 与 types 在编辑器 hover 和 emitted declarations 中带有准确、可行动的 JSDoc；candidate tarball 随附一份版本匹配的 README/API guide，覆盖 Bun 安装、最小 Project Definition/Run、自定义 Check/Records、typed dependency output、结果处理与支持边界。仓库 owner、项目内简短导航、package material 与 isolated consumer 使用同一 public inventory；post-cutover Gate optimization 绑定这个 documentation-complete artifact，release Change 只消费通过验证的 documentation handoff。
