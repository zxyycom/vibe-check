# add-path-reference-validation

未来检查项目文本中的 project-local path references。

## 当前状态

这是尚未排期、未实施的方向性 OpenSpec change。它只固定产品结果、owner 与安全边界；`tasks.md` 1.1 完成前不得细化为实现或开始编码。

## 阅读顺序

1. `proposal.md`
2. `design.md`
3. `specs/path-reference-validation/spec.md`
4. `tasks.md`

## 直接依赖

- `establish-check-record-core`：`quality-checks`、`quality-records`
- `adopt-typescript-project-definition`：`project-definition`

`add-markdown-link-validation` 是相邻 occurrence owner；它不是本能力运行时启用的前置条件。
