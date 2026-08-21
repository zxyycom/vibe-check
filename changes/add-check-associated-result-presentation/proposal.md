# Proposal

本 Draft 是 repository hard cutover 之后的首次公开 package 优化：交付 Check-associated result presentation，使已完成 Check 的结构化辅助内容能够进入 Product-owned 主结果体验。它先闭合 terminal Record projection，再判断首版是否还需要真正的 live/intermediate feedback；cutover 完成前不进入 implementation，Draft stage 也不授权预先扩展 `CheckResult` / progress API。

## Why

当前 Core snapshot 已将 `checks` 与 `records` 保存为同级 collections，但 Product progress 只呈现 Check lifecycle/outcome/duration；现有 Records 主要通过 publication console/report 展示。关闭 publication logs/output 的 Project Gate 因而只能在主进度中看到 Check passed/failed/N/A/unavailable，看不到一个成功 Check 希望明确展示的非阻断辅助内容。这是首次公开 package 的已知结果体验缺口，不能留给 package 文档解释或发布阶段补偿。

未来最小 Record contract 只保证 `{ checkId, id, data }`，而 arbitrary custom `data` 不必包含 message、level、location，也不一定适合直接显示。因此本 Draft 不能把“存在 Record”当成“存在通用人读 finding”；它必须单独确定 producing Check 如何显式提供 presentation，以及未提供 projection 时 Product 能安全显示什么。

相邻的 typed dependency output Draft 还会引入普通、可见的 supporting Checks。它们即使 passed 也必须保留在 structured RunResult、Core 与 machine facts，lifecycle events 也照常产生。本 Change 使用显式 Check presentation 字段决定 passed 时是否直接显示；该字段只影响人读 projection。

“显示已完成 Check 的结构化 Records”和“Check 运行期间发送中间输出”具有不同的事实来源、时序与失败语义。直接给 callback 一个任意 writer、把 stdout 穿透到 progress、或把辅助文本塞进 terminal verdict 都会混淆 Product stream ownership、Core facts 与项目日志。本 Draft 先确定实际需要的结果层级和最小输出责任。

## Outcome

首版完成后，consumer 可以通过一个明确、受限且可验证的公共契约，让已完成 Check 显式声明的 presentation 以有界形式出现在 Product-owned 主结果体验中，同时保持 Check outcome、custom Record data 与 presentation 的责任边界。Change 必须交付 terminal Check-associated presentation，并允许 Check 显式选择 passed 时始终直接显示或仅在 problem 时显示；所有事实与 lifecycle events 仍产生。只有首版命名消费者确实需要 Check 完成前的内容时，才把 live feedback capability 及其顺序、取消和 writer-failure 语义纳入同一首版范围。
