# Scan Scope

本文是 Vibe Check scan scope 的 owner 文档。它维护 Core 文件收集职责、默认排除、supported file 分类、ignore 规则处理、collection diagnostic 和 fatal collection failure 边界。

本文只回答“哪些文件进入本次 scan scope，以及文件收集失败如何进入 report 或退出码”。LOC、结构扫描、重复检测、warning、gate、配置发现和 machine output 字段形状由各自 owner 维护。

## 职责边界

CLI 负责在调用 Core 前归一化并接受 `project-root`。Core scan pipeline 负责在该 root 下构造 scan scope，再把同一份 report data 交给 Output 投影为 human 或 JSON。

Scan scope collection 只收集普通文件。目录、设备、管道和其它特殊文件不进入 `scope.file_count`。收集结果进入 Vibe Check 自己的内部模型，不暴露第三方 crate 的路径结构、错误类型或 ignore matcher。

## 默认排除

默认排除规则在 Core scope collection 中生效，并按相对 project root 的路径组件匹配。以下组件默认不进入 scan scope：

- `.git`
- `target`
- `node_modules`
- `.venv`
- `dist`
- `build`
- `vendor`
- `generated`
- `.cache`
- `cache`

这些目录下的文件不计入 `scope.file_count`，也不计入 `scope.supported_file_count`。当前默认实现使用 `ignore` 的标准过滤行为处理隐藏文件；如需让 hidden file 规则可配置，应由 Config owner 定义配置入口，并同步本文的 scan scope 行为边界。

## Ignore 规则

文件收集使用 `ignore` 作为默认依赖，遵守 project root 内支持的 VCS ignore 规则，例如 `.gitignore`。被 ignore 规则排除的文件不计入 scan scope。

Core 只消费归一化后的文件路径、supported 分类和 diagnostic。`ignore` 的原生 matcher、错误结构和内部 precedence 不进入 public output contract。

## Supported File 分类

`scope.file_count` 表示经过 ignore/default exclude 后进入 scan scope 的普通文件总数。`scope.supported_file_count` 表示其中当前 scanner baseline 支持的文件数。

当前 supported file classification 按最终扩展名识别：

- `.ts`
- `.go`
- `.rs`
- `.py`

`.d.ts` 因最终扩展名是 `.ts`，按 TypeScript supported input 处理。
`.tsx`、`.js` 和 `.jsx` 属于 unsupported ordinary files：如果它们未被 ignore 或默认排除规则过滤，计入 `scope.file_count`，但不计入 `scope.supported_file_count`。

Unsupported ordinary files 计入 `scope.file_count`，不计入 `scope.supported_file_count`，且不会仅因 unsupported 生成 diagnostic。

## Collection Diagnostics

可恢复的文件收集问题，例如遍历某个子路径失败或 ignore 文件解析问题，在仍能构造 report data 时进入 `diagnostics`。包含 collection diagnostic 的 report 使用 `summary.status = partial`，并增加 `summary.diagnostic_count`。

当 CLI 已归一化并接受 project root，但 collector 无法初始化或无法产生 report data 时，Core 将该失败映射为 scanner fatal error。scanner fatal 在 CLI 层使用退出码 `3`，并且 stdout 不写 human 或 JSON scan report。

## 验证要求

修改 scan scope 行为时，最低验证包括：

- 普通文件数量与 supported file 数量。
- Unsupported file 不产生 diagnostic。
- 默认排除目录不计入 scope。
- `generated`、`vendor` 和 cache 路径边界。
- `.gitignore` 或支持的 VCS ignore 规则。
- Recoverable collection diagnostic 生成 partial report。
- Fatal collection failure 映射为 scanner fatal，且不写 stdout report。

涉及 output shape 时必须同步 Output owner、schema、examples 和测试；本 owner 不单独扩展 JSON envelope。
