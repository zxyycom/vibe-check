# add-markdown-link-validation

未来为项目 Markdown 提供离线本地链接与锚点检查。

## 当前状态

这是尚未排期、未实施的方向性 OpenSpec change。它只固定产品结果、owner 与安全边界；`tasks.md` 1.1 完成前不得细化为实现或开始编码。

## 阅读顺序

1. `proposal.md`
2. `design.md`
3. `specs/markdown-link-validation/spec.md`
4. `tasks.md`

## 直接依赖

- `establish-check-record-core`：`quality-checks`、`quality-records`
- `adopt-typescript-project-definition`：`project-definition`

未来 network check 是潜在下游消费者，不是本 change 的实现内容。
