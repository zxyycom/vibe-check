# Tasks

按映射、迁移、索引重建与验证的顺序执行，保留既有用户工作区内容并只勾选已获得证据的任务。

## Readiness

- [x] 0.1 盘点当前上游契约、项目入口和索引不兼容项，并确认 114 条记录的 basename 唯一、75 条关系均可解析。
- [x] 0.2 确认用户指定旧 domain 一对一成为 tags，列出受目录移动影响的项目链接与适配器边界。

## Implementation

- [x] 1.1 将决策 Markdown 移到新 active/archive 布局，写入原 domain 对应的 tag，并把关系目标转换为稳定 Decision ID。
- [x] 1.2 重建 decision index，删除 domain catalog，并修复受布局和 tags 契约影响的链接、脚本适配器及项目治理说明。
- [x] 1.3 建立并对齐记录“决策分类使用 tags”的长期 Decision Record，不改写既有决策的实质方向。
- [x] 1.4 使用当前 investigation CLI 从既有主题重建 definition version 5 派生索引，不改写报告正文。

## Verification

- [x] 2.1 运行 decision 与 investigation 的严格检查和查询，核对新索引版本、记录数量、状态和 tag 查询结果。
- [x] 2.2 运行受影响的文档链接、脚本类型与 lint 检查，并审阅局部 diff 与 whitespace。
- [x] 2.3 运行 `bun run verify:vibe-check-workspace:required`，记录由当前工作区其他改动引起的任何独立结果。
- [x] 2.4 运行 Change Plan 检查，确认任务状态、设计、验证证据和未归档边界一致。
