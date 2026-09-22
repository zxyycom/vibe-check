# Proposal

本 Draft 将已交付的 `markdownLint` 接入本仓 Project Gate，以真实文档 corpus 反馈规则、范围、Finding policy 和执行成本。

## Why

`markdownLint` 已作为 package API、文档和 installed consumer 能力交付，但当前 Project Gate 明确不选择它；本仓只验证 Markdown link target/anchor 完整性。因而规则对标题、围栏、列表、表格和图片替代文本的实际影响尚未在自己的文档与 Change materials 上得到反馈。

## Outcome

Project Gate 以显式、可追溯的文件范围和 preset membership 运行 `markdownLint`，保存初始 corpus、Finding 分类、执行成本与迁移结论。根据证据决定保持 advisory、采用 blocking，或以有界 exclusions/not-adopt 结束；不改变 package constructor 默认 policy，也不把 Markdown lint 与 link validation 混成一个 Check。
