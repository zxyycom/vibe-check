---
title: 发布前确认内置 Check 值与 Check tree 类型名称
status: active
alignment: unaligned
createdAt: 2026-08-14T13:50:34Z
purpose: 防止内置 Check value 与 Check tree 类型偶然成为首个 npm 公开契约。
background: descriptor value、类型与项目文件路径的兼容成本不同；前者是 package surface，后者不是。
decision: 发布候选前确认三项 built-in values、必要 Check tree types 及其 exports，并由 current public-contract source 单一拥有。
relations:
  - type: 修订
    target: product-contract/confirm-config-run-and-package-names-before-publication.md
---

## 目的

- 让项目能以稳定、可读且可发现的名称导入内置 Check values 与必要 Check tree types，同时避免这些名称由示例或内部路径偶然决定。
- 让 package manifest、runtime entry、declarations、文档、fixture 与 exact-tarball acceptance 使用同一套经过确认的公开名称。

## 背景

- `duplicateDetection`、`fileMetrics` 与 `functionMetrics` 已进入 current definition-facing source，并将在 package Change 完成后进入 package export surface；改名、并存或退役都具有独立兼容成本。
- Check tree 的 authoring types 同样是 consumer contract；把内部 catalog、binding、scheduler 或 Task 类型错误地作为 tree type 导出会扩大长期 API。
- 项目配置文件、项目运行脚本及其路径仍由使用项目拥有，不能因为 canonical example 出现而成为 package 名称。
- current public-contract source 可以在 package build 前确认名称，但只有下游 candidate entry、declarations 与 exact-tarball acceptance 通过后，这些名称才成为可安装 package surface。`from "vibe-check"` 示例在此之前只是 target consumer contract。

## 决策

- 采用: 将 `duplicateDetection`、`fileMetrics` 与 `functionMetrics` 作为必须在 publishable candidate 前确认并由 current public-contract source 拥有的 public value names。
- 采用: 将支持 exported descriptor 与 Project Definition Check tree authoring 所必需的 public type names一并纳入同一确认范围；每个类型须表达 consumer 可组合的数据契约，而非泄漏 internal Core、binding、Task、scheduler 或 host implementation。
- 采用: current public-contract source 完整拥有这些 value/type export names 与其 package import relation。manifest、runtime entry、declarations、docs、fixtures 和 acceptance 只能从该 owner 派生或核对，不能各自维护第二组名称。
- 采用: 每个候选名称确认时核对消费者含义、导入方式、与两个 callable operations 的关系、并存或迁移成本以及 public declaration 兼容性；内部 source filename、示例变量名和 registry 可用性不替代该判断。
- 不采用: 以 wildcard/internal subpath export、project文件路径、隐式 re-export 或临时 type alias 形成公开 Check descriptor 或 Check tree contract。
