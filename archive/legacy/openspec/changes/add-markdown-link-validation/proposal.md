> **核心句：**本 change 仅保留“离线检查 Markdown 本地链接和锚点”的未来产品方向；网络检查、精确协议与实现细节留待各自实施前收敛。

## Why

Vibe coding 容易在文档移动、重命名和生成过程中留下失效的本地文件链接或锚点。Vibe Check 应能在不依赖网络的情况下发现这些常见项目问题，同时避免把外部 URL 和敏感内容带入持久制品。

当前能力尚未排期，也从未实施。现阶段只需要固定离线产品结果、根目录边界和网络/隐私边界，而不应冻结 slug 算法、candidate DTO、record fields 或配置结构。

## What Changes

- 新增一个未来的内置 Markdown link check，离线识别并验证项目内文件目标、同文档锚点和跨文档锚点。
- 外部或其它非本地链接只分类，并可在未来交给独立 network check；本能力自身不进行 DNS、HTTP 或其它网络访问。
- CheckRunner 通过 `quality-records` 发布最终本地链接问题；`quality-checks` 管理运行与结果，Core 不解析 Markdown 或重新判断 record 语义。
- Project Definition 负责 check 的项目 authoring；具体规则、record contract、Markdown/anchor 语义和外链 handoff 必须在实施前重新基线。

## Capabilities

### New Capabilities

- `markdown-link-validation`: 离线验证获准 Markdown 输入中的项目本地链接与锚点，并安全分类非本地链接。

### Modified Capabilities

无。本 change 不推测性修改共享主 spec，也不提前修改未来 network capability。

## Impact

- 直接依赖 `establish-check-record-core` 的 `quality-checks` 与 `quality-records` 契约，以及 `adopt-typescript-project-definition` 的 `project-definition` authoring/resolution 边界。
- 未来实现应位于 `src/product/**`，作为内置 CheckRunner 接入，并与未来 network check 建立最小、经过隐私审计的交接。
- 本 change 当前只是方向性 artifact，不能据此开始实现。
