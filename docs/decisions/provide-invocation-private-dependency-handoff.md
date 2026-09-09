---
title: 提供调用内私有依赖交接
id: 260909-provide-invocation-private-dependency-handoff
status: active
alignment: unaligned
createdAt: 2026-09-09T08:50:57Z
purpose: 让直接依赖同时传递可发布事实与保持身份的调用内原始对象
background: canonical data 无法承载 Map、文件字节及其它需原样复用的内存对象
decision: 为直接依赖增加与 canonical facts 分离的 typed ephemeral handoff
tags:
  - configuration
  - dependency-policy
  - product-contract
relations: []
---

## 目的

- 让 producing Check 将已经验证的 `Map`、文件字节、handle 或其它不可方便 canonicalize 的原始对象交给同一 Run 的 direct dependent，不通过 Base64、临时文件或 caller-local 旁路破坏对象 identity。
- 同时保留 Check final data 作为可序列化、detached、deep-frozen 且可进入 Core/machine publication 的纯事实。
- 让 dependency graph 继续统一拥有 direct authorization、排序、失败传播和原始对象可见性，而不建立与 Check 关系无关的全局 registry。

## 背景

- 当前 `dependencies.get(checkId)` 只读取已结算的 canonical final data；它为 machine facts、跨进程消费和 parser 恢复提供稳定值语义，因而必须拒绝 `Map`、typed bytes、function、handle 和对象 identity。
- 真实的 package-release 场景需要让验证与打包使用同一份捕获 snapshot；将它重新编码成 JSON/Base64 或写入临时文件会新增复制、完整性、机器输出和生命周期成本。
- caller closure 能保留原始对象，但单独使用 closure 会把生产者、可读消费者与失败传播隐藏在 Product 的 direct dependency mechanism 之外。

## 决策

- 采用: direct dependency 支持两种并列语义：`data` 继续是 canonical、detached、deep-frozen 的可发布事实；可选 `handoff` 是 Product 不 clone、freeze、serialize、fingerprint 或 publish 的原始运行时引用。
- 采用: API 可以通过一次 typed provider read 同时返回两个命名字段，但 Product 必须在 Core facts store 与 invocation-private handoff store 中分别保持它们。现有 string `get(checkId)` 的 canonical-only 行为保持兼容。
- 采用: handoff 只在 provider `passed`、canonical data 已成功结算且 consumer 声明 direct `dependsOn` 时可见；provider failed、unavailable、not-applicable、取消或非法结算都不发布 handoff。
- 采用: handoff 不设立与 `parseData` 对称的必填 parser。`parseData` 用于从 detached/cross-version canonical facts 恢复业务类型；handoff 没有序列化往返，应由 provider 声明的 TypeScript marker 保留类型，并由 producing owner 在发布前完成领域验证。
- 采用: Product 只验证 handoff 的 lifecycle 与授权，不声称验证其不透明内容。需要运行时 domain guard 的 consumer 可调用 provider-owned assertion，但该 assertion 不是 Product 恢复或复制 handoff 的 parser。
- 采用: 多个 direct dependents 取得同一对象 identity；producer/caller 必须保证其 immutable 观察语义，必要的 mutation 排他通过现有 dependency、mutex 或 resource policy 表达。Product 不把 TypeScript `readonly` 宣称为 `Map` 或 bytes 的 runtime freeze。
- 不采用: 放宽 canonical final data、将 handoff 进入 RunResult/machine/cache/diagnostics、按 invocation ID 建立 caller-global registry、要求 Base64/临时文件转运，或用必填 parser 伪装 Product 已验证 opaque object。
