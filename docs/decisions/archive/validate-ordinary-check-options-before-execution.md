---
title: 在执行前验证普通 Check options
status: archived
alignment: aligned
createdAt: 2026-08-26T03:37:48Z
purpose: 让完整随包 Check 保持有效，并让调用方构造的非法 Check 在领域执行前被普通 Definition 拒绝。
background: 运行期 invalid-options 混淆了非法 Check authoring 与合法 Check 暂时无法执行，并把 validated options 的承诺推迟到了 callback 内。
decision: 有 options 的普通 Check 自带纯 validator；Definition 不识别 Check ID，但在 execution 前拒绝 validator 不接受的 Check。
tags:
  - configuration
  - product-contract
relations:
  - type: 归并
    target: let-each-check-own-file-selection.md
  - type: 归并
    target: treat-package-provided-checks-as-ordinary.md
---

## 目的

- 保证 package 导出的 Check value 或构造函数结果本身始终是完整、合法且可直接使用的普通 Check。
- 把调用方通过 JavaScript、类型断言或对象组合构造出的非法 Check 拒绝在 execution、scanner、cache、progress 与 output work 之前，而不是伪装成一次正常运行的 `unavailable`。
- 继续让每个 Check 拥有自己的 options、文件选择、scanner 和领域模型，同时让外部 Check 与随包 Check 使用同一个自描述校验契约。

## 背景

- package-provided Check 是建立在公开普通 Check contract 上的完整 value；“无效随包 Check”不是一类产品实体。只有调用方替换完整 `options`、绕过 TypeScript 或删除必要字段后，才会形成非法 Check authoring value。
- 现有实现让 Definition 只保存 opaque canonical options，再由 execution entry 返回 `unavailable / invalid-options`。这使 `CheckExecutionContext.options` 的“validated options”承诺在 callback 入口并不成立，也把调用方应修复的配置错误混入了合法 Check 的 four-state 领域结果。
- Definition 按 package Check ID 注册 validator 会让随包 Check 获得外部 ordinary Check 不具备的 core 特权；完全不在 core 调用 Check-owned validator 又无法在领域工作前拒绝非法组合。
- 多个 Check 共用 project-file collection mechanism，不表示它们共享 selection value、scanner protocol 或业务 failure taxonomy。Markdown Link 的 source/target 授权也仍是 Link-local policy。

## 决策

- 采用：有显式 `options` 的 executable ordinary Check 必须同时提供纯 `validateOptions(options)`；没有显式 options 的 Check 不提供该 callback。`defineCheck` 在 TypeScript authoring surface 上表达这组约束，Definition 的 closed grammar 在运行时再次闭合它。
- 采用：Definition 先把 options 脱离调用方对象并 snapshot 为 canonical immutable JSON object，再调用 owning Check 的 `validateOptions`。只有明确返回 `true` 才接受；返回其它值或抛出都使整个 Definition 以该 Check 的 `options` path 返回 configuration failure，且不进入 execution、scanner 或 effects。
- 采用：Core 只认识普通 `validateOptions` callback 是否存在及其接受结果，不导入 package-provided Check、不识别 Check ID、不保存 validator registry，也不解释 files、scanner、threshold、schema、Link 或 reminder 等领域字段。validator 与 execution 同属 trusted project code，不进入 declarative fingerprint、Core snapshot 或 machine output。
- 采用：package 导出的六个 Check values 与 `maintenanceReminders` 构造函数结果都携带自己的 validator，并只产生合法的完整 options。调用方用普通对象组合替换 options 时会保留该 validator；不完整、越界或含未知字段的替换在 Definition 边界被拒绝。删除 validator 或把它与 options 错误组合也属于非法普通 Check grammar。
- 采用：execution 只接收已经通过 owning validator 的 options，不再返回 `invalid-options`。`unavailable` 仅表达一个合法 Check 在当前 invocation 中因取消、工具、文件、解析、测量或其它运行条件无法形成可信 final data。
- 采用：每项 package-provided Check 的 validator、execution、option type、finding/measurement、Record conversion、tool adapter 与 tests 继续位于该 Check owner；jscpd、scc 与 Lizard 分别属于 duplicate detection、file metrics 与 function metrics。每项随包 Check 继续拥有 package 内独立、可直接阅读的 consumer guide。
- 采用：每个需要项目文件的 Check 继续在自己的完整 options 中拥有 `files`，需要 code-area classification 的 metric Check 继续拥有 `codeAreas`。`src/project-files/**` 只提供共同 collection、normalization、classification 与 exact-input mechanism，不保存全局 policy 或识别 Check ID。
- 采用：Markdown Link source 只来自自己的 `options.files`；source-selection 外的 root 内 direct target 只可做 bounded resolver work且不递归发现 links。`rootExternalTargetMode`、directory、anchor、symlink、Record material 与零网络边界继续由 Link-local options 和 execution 拥有。
- 采用：首次稳定发布前直接硬切该 ordinary Check grammar，不保留 execution-time `invalid-options`、package-specific Definition validator、旧 `quality` 字段、hidden files context 或兼容 alias。
- 不采用：把完整随包 Check 称为无效实体、把非法 authoring 结算为 four-state outcome、由 Definition 按 Check ID 解释 options、让 custom Check 无法使用相同 validator contract，或把 Check-local policy重新集中到 shared registry。
