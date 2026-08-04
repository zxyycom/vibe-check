本 change 提议让质量比较只使用调用者显式选择的基线，并让函数 delta identity 不再依赖源码行号。

## Why

本 change 实施前，auto-detected previous-code baseline 无法可靠表达分支或发布比较目标，而函数 baseline key 包含 `startLine`，会把仅因前置代码增删而移动的函数误判为全新回归。两者叠加后，默认 gate 可能漏掉整条分支的变化，显式 gate 又可能被行号噪声阻断。

## What Changes

- **BREAKING**：移除 `--with-baseline` 与全部 baseline auto-detection；省略 `--baseline` 的 quick/full scan 只生成当前快照。
- **BREAKING**：`changed` / `regressions` gate 必须显式提供 `--baseline <revision>`，缺失时在 scanner、cache 和 artifact work 前失败。
- 显式 revision 在一次 invocation 开始时解析为不可变 commit SHA，后续 materialization、comparison、metadata 和 diagnostic 只使用该 SHA。
- 函数 baseline identity 不再包含 start/end line；只有 current/baseline 两侧都能无歧义确定的同文件同名函数才计算 delta，歧义项保持 `not-comparable`。
- `quality:full-check` 改为无 baseline 的非阻断 full snapshot；`quality:gate` 继续透明转发参数，但调用者必须附加显式 baseline。
- 保持 `warnings.all`、machine schema shape、scanner `FunctionMetric` fields、quality thresholds 与 accepted-warning identity 不变。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `cli-contract`：修改 baseline flags、comparison gate 前置条件与 pre-work failure 行为。
- `quality-metrics`：修改 baseline selection、comparison evidence 和函数 delta matching 语义。
- `product-runtime`：修改 repository full observation 与 regression gate wrapper 的显式 baseline 调用契约。
- `test-fixtures`：修改 comparison acceptance matrix，使 omission、invalid revision、canonical SHA 与 runtime-unavailable evidence 各自在正确边界得到证明。

## Impact

- Product CLI parser、scan planning、baseline owner、warning baseline context 和 gate inputs。
- `quality:*` dogfood scripts、CLI/help/report 文本、machine values 与 annotation 输入；不改变 machine JSON schema shape。
- 参数、warning generation、baseline/cache、formal CLI、wrapper、docs、fixtures 与 semantic Case 验证。
- 不新增运行时依赖，不改变 scanner backend 或 public project config。
