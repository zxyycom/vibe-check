# make-scan-completeness-observable

让 current measurement 明确表达 `complete`、`empty` 或 `failed`，防止缺失测量被表达为可信 zero 或成功结果。

产品语义：

- `complete`：全部需要执行的 capability 已完成，可以计算质量结果。
- `empty`：没有 eligible input，core 返回 `warning`、CLI 正常退出 `0`，但不得声称质量通过。
- `failed`：需要执行的 capability 未完成，core 返回 `failed`、CLI 退出 `2`。

本 change 只处理 current measurement completeness。Baseline comparison、machine schema 兼容性、quality gate 和 scanner backend 迁移由各自 change 承接。

本目录只包含待实现的 OpenSpec artifacts；归档前，`docs/` 与 main specs 仍描述当前产品行为。
