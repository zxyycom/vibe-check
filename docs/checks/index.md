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

每项指南说明完整初始 options、参数、工作过程、结果和安全边界。所有公开导入都来自 `vibe-check` 根入口；
文档中的源码路径不是 subpath API。

## 组合与 options preflight

随包导出的 value 或构造函数结果本身始终是完整、合法的普通 Check，并携带由该 Check owner 实现的纯
`preflight`。通过对象组合替换 `options` 时，必须提供该 Check 需要的完整 closed shape；nested branch 不会自动
深度合并。Run 在任何 author Check execution 前，对 canonical authored snapshot 执行全局 preflight barrier。
随包 Check 的 replacement options 不合法时，owning block preflight 将该 Check 结算为
`unavailable / invalid-options`，不会执行它的 author callback；其 direct execution 入口也会防御同一非法输入。

这是随包 Check 对自己 options 的保障，不是 Product 按 Check ID 解释业务字段。普通自定义 Check 是否提供
preflight，以及是否在 preflight 中执行领域工作，仍由该 Check owner 决定；consumer 可从
[package README 的 options preflight](../../README.md#options-preflight)读取通用结果语法。
