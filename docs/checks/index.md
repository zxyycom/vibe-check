# 随包提供的普通 Check 指南

Vibe Check 随 package 提供六个完整 Check values 和一个专用构造函数。它们都建立在与项目自定义 Check 相同的
`defineCheck` / execution contract 上；Definition、Run 与 Core 不按这些 Check 的 ID 或 options shape 提供特殊路径。
“随包提供”只表示 consumer 可以从 `vibe-check` 根入口直接导入。

- [`duplicateDetection`](duplicate-detection.md)：使用 jscpd 发现重复代码。
- [`fileMetrics`](file-metrics.md)：使用 scc 评估文件 code-line 指标。
- [`functionMetrics`](function-metrics.md)：使用 Lizard 评估函数指标。
- [`jsonValidation`](json-validation.md)：严格验证 Check 自己选中的 JSON 文档。
- [`jsonSchemaValidation`](json-schema-validation.md)：按显式 schema 与 binding 验证 JSON 实例。
- [`markdownLinkValidation`](markdown-link-validation.md)：离线验证本地 Markdown 链接与锚点。
- [`maintenanceReminders`](maintenance-reminders.md)：构造一个按 Git first-parent 历史提示维护复核的普通 Check。

每项指南说明完整初始 options、参数、工作过程、结果和安全边界。通过对象组合替换 `options` 时，必须保留该
Check 需要的完整 closed shape；Definition 只保存 opaque canonical options，owning Check 会在 execution entry 验证，
无效 shape 结算为 `unavailable` / `invalid-options`。所有公开导入都来自 `vibe-check` 根入口，文档中的源码路径不是
subpath API。
