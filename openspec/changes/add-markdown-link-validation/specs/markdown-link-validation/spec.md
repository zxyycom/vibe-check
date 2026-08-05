> **核心句：**本 delta spec 只定义未来 Markdown link check 的离线产品结果与安全边界；精确解析和数据协议必须在实施前重新细化。

## Purpose

在不访问网络的情况下发现项目 Markdown 中失效或越界的本地文件链接和锚点，并为非本地链接保留安全、独立的后续处理边界。

## ADDED Requirements

### Requirement: Validate project-local Markdown links offline

Markdown link check SHALL 只处理 resolved invocation 批准的 Markdown 输入，并 SHALL 离线验证其项目本地文件目标、同文档锚点和跨文档锚点。发现无法解析、不存在或不匹配的本地目标时，runner SHALL 通过 `quality-records` 发布可理解、可定位的最终 record；具体 Markdown 和 anchor 语义由实施前审计确定。

#### Scenario: A local target or anchor is missing

- **WHEN** 获准 Markdown 引用不存在的项目文件或目标文档中不存在的锚点
- **THEN** runner 不访问网络，并发布指向引用位置及安全项目相对目标的最终 record

### Requirement: Keep target access inside the approved project scope

Runner SHALL 在读取本地目标前确认目标位于允许的项目范围内，且 SHALL NOT 打开或扫描范围外目标。对于绝对路径、项目逃逸或其它越界引用，任何公开结果 SHALL 使用安全分类或项目相对信息，不泄露宿主绝对路径。

#### Scenario: A link attempts to leave the project

- **WHEN** Markdown 链接解析到允许项目范围之外
- **THEN** runner 不读取该目标，并以不包含宿主绝对路径的结果报告边界问题

### Requirement: Separate external classification from network checking

Runner MAY 将 HTTP、HTTPS 或其它非本地链接分类并提供给未来独立 network check，但本能力 SHALL NOT 发起网络请求或产生网络可达性结论。任何未来 handoff SHALL NOT 把 raw/full URL、userinfo、query values 或其它敏感请求材料写入 records、日志、cache 或持久 artifacts；精确 transient 协议必须在双方实施前审计。

#### Scenario: An external URL remains offline and private

- **WHEN** Markdown 包含带凭据样式文本或 query values 的外部 URL
- **THEN** 本 check 不请求该 URL，不发布网络成败，也不把敏感 raw URL 持久化

### Requirement: Use shared Check and Record contracts

该能力 SHALL 通过 `quality-checks` 表达 check 定义、运行与结果，通过 `quality-records` 提交最终领域数据，并从 `project-definition` 接收项目 authoring 的 resolved 输入。Shared Core SHALL NOT 解析 Markdown、重判领域 records，或为本能力固定 channel、gate 或 comparison。

#### Scenario: Offline results flow through the common core

- **WHEN** Markdown link runner 提交合法 records 并返回 check result
- **THEN** shared managers 按共同契约形成最终快照，不需要链接专用 Core 分支
