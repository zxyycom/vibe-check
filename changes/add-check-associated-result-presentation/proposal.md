# Proposal

本 Draft 在最小Check/Record hard cut实施后交付Check-associated result presentation，使Check final data与显式supplemental Records能够进入Product-owned人读结果体验。它的主要目标是terminal/live presentation；上游CheckResult新增final data后，旧Record-only source假设必须在本Draft中重新闭合。Hard cut完成前不进入Plan，Draft stage也不授权预先扩展progress API。

## Why

当前 Core snapshot 已将 `checks` 与 `records` 保存为同级 collections，但 Product progress 只呈现 Check lifecycle/outcome/duration；现有 Records 主要通过 publication console/report 展示。关闭 publication logs/output 的 Project Gate 因而只能在主进度中看到 Check passed/failed/N/A/unavailable，看不到一个成功 Check 希望明确展示的非阻断辅助内容。这是首次公开 package 的已知结果体验缺口，不能留给 package 文档解释或发布阶段补偿。

未来minimal contract提供两类structured facts：passed/failed Check的single final data，以及零到多个`{ checkId, id, data }`supplemental Records。两类arbitrary custom `data`都不必包含message、level、location，也不一定适合直接显示。因此本Draft不能把“存在final data/Record”当成“存在通用人读finding”；它必须确定producing Check如何显式提供projection，以及未提供projection时Product能安全显示什么。

相邻的 typed dependency output Draft 可能引入普通、可见的 supporting Checks。它们即使 passed 也必须保留在 structured RunResult、Core 与 machine facts，lifecycle events 也照常产生。本 Change 使用显式 Check presentation 字段决定 passed 时是否直接显示；该字段只影响人读 projection。Typed dependency 是该能力的一个消费者，不是本 Change 的实施前置。

“投影已完成Check的final data/Records”和“Check运行期间发送中间输出”具有不同的事实来源、时序与失败语义。直接给callback一个任意writer、把stdout穿透到progress、或另建terminal payload都会混淆Product stream ownership、Core facts与项目日志。本Draft先确定实际需要的结果层级和最小输出责任。

## Outcome

首版完成后，consumer可以通过一个明确、受限且可验证的公共契约，让已完成Check对final data或supplemental Records声明的presentation以有界形式进入Product-owned人读体验，同时保持terminal status、structured data与presentation的责任边界。Change必须交付terminal Check-associated presentation，并允许Check显式选择passed时始终直接显示或仅在problem时显示；所有facts与lifecycle events仍产生。它只依赖已经实施的minimal Check/Record facts，不等待typed dependency。只有首版命名consumer确实需要Check完成前的内容时，才把live feedback capability及其顺序、取消和writer-failure语义纳入同一首版范围。
