# Proposal

本 Draft 探索把项目文件收集能力形成经确认的公共 Product contract；它不授权当前 runtime 或 package API 变化。

## Why

`src/index.ts` 已公开 `defaultProjectFileSelection`、`ProjectFileSelection`、`ProjectFileSelectionOptions` 与 `ProjectFileSource`，但实际收集仍是 `src/package-checks/project-files/collection.ts` 的内部 `collectProjectFiles(root, selection)` 与批量 `collectProjectFileSets(root, selections)`。各 Check 可共同使用收集机制，却仍各自拥有 `codeAreas`、领域阈值、重叠和 duplicate comparison 的语义边界。

现有内部类型信任与公共入口面对 `unknown` 的验证边界不同；因此不能假定仅添加 export 就是安全或完整的公共化。

## Outcome

在确认真实 consumer outcome 后，给出一个最小、可验证的公共 file-collection contract，或明确维持内部实现。若进入实施，contract 会清楚规定公开名称、单批入口、unknown validation、I/O 与取消语义、返回值 immutability，以及其与 Check-owned selection/领域 policy 的边界。

当前事实 owner 是 [`docs/development/project-files.md`](../../docs/development/project-files.md)、对应 public types 与 collection tests；若公开方案获批，README、tool guide、declaration projection 和 installed-consumer evidence 将成为受影响 owner。此 Draft 不把前轮已完成的代码或 Gate 证据误作本 Change 已实施的证据。
