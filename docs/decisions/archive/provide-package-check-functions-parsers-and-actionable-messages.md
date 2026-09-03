---
title: 为随包 Check 提供构造函数、解析器与可行动消息
status: archived
alignment: aligned
createdAt: 2026-08-28T15:05:29Z
purpose: 让每项随包 Check 都通过类型化函数构造，并为其最终数据和可处理失败提供直接消费入口。
background: 当前公共表面混合 constructor 与完整 value，最终数据只能以通用对象读取，随包失败也不总是附带可行动消息。
decision: 七项随包 Check 均由领域函数构造并补齐默认值，提供最终数据解析器与辅助类型，并为 Check 自有问题附带安全消息。
tags:
  - configuration
  - product-contract
relations:
  - type: 修订
    target: complete-first-release-check-set-with-specialized-maintenance-reminder.md
---

## 目的

- 让 package consumer 以同一种“调用领域函数得到普通 Check”的方式取得全部随包 Check，同时保留各 Check 真正不同的输入义务。
- 让随包 Check 的 final data 能通过 provider-owned parser 从通用 canonical object 恢复类型，而不是要求 consumer 使用 unchecked cast。
- 让随包 Check 能识别的失败、不可用和非阻断 finding 通过安全结构化消息给出直接定位或处理入口，同时不把 message 变成所有自定义 Check 的强制字段。
- 保留维护提醒的单 Check、entry-local advisory/enforcing、first-parent measurement 和显式 aggregation 边界。

## 背景

- `duplicateDetection`、`fileMetrics`、`functionMetrics` 与 `maintenanceReminders` 已经是函数，`jsonValidation`、`jsonSchemaValidation` 与 `markdownLinkValidation` 仍是需要普通对象组合的完整 value；这种差异不是 Check 生命周期差异，只增加调用和文档分支。
- Run snapshot 与 machine v4 为任意 Check 保留 object-shaped final data，类型化依赖也要求 producing Check 自己验证数据。只导出静态类型无法验证未受信 object，也不能让 dependency consumer 安全恢复 provider data。
- 普通 Check terminal result 和 preflight contract 允许可选 messages。随包 Check 已经拥有 closed reason、Record 和安全投影边界，因此可以为自己能够解释的问题提供稳定 code 与安全摘要；Product settlement 产生的通用 fail-closed 结果仍可能没有 Check-owned message。
- 维护提醒的 entries、测量方式和 advisory/enforcing 语义已经成立；统一公共构造形态不应把 entries 改成普通可省略 options，也不应建立 generic factory 或共同配置 grammar。

## 决策

- 采用: `duplicateDetection(options?)`、`fileMetrics(options?)`、`functionMetrics(options?)`、`jsonValidation(options?)`、`jsonSchemaValidation(options?)`、`markdownLinkValidation(options?)` 与 `maintenanceReminders(entries)` 是七项随包 Check 的公共定义函数；每次调用返回一个固定 identity 的完整普通 Check。
- 采用: JSON、JSON Schema 与 Markdown Link 函数接收各自可省略的领域 authoring options，同步拒绝 unknown 或非法输入，并补齐 package defaults 与 closed nested branches。函数返回后通过普通对象组合替换完整 resolved options 时，owning preflight 与 execution 继续防御校验，不重新应用 constructor defaults。
- 采用: 各函数保留稳定差异。三个 area quality Check 使用各自区域和 scanner policy；JSON、JSON Schema 与 Markdown Link 使用各自 document/link policy；maintenance reminders 继续要求显式 dense entries，并固定 Git execution policy。不得为了形式统一建立 generic Check factory、共享 options union 或公共 file-selection helper。
- 采用: 每项随包 Check 都携带 provider-owned `parseData`，并从 package root 导出同一职责的命名 final-data parser。parser 接受 canonical object，严格验证所属 Check 的 closed final-data shape，返回只读类型或为不支持的数据抛出 `TypeError`；它不读取 Run 分支、Record rows 或 machine artifact bytes，也不替代 complete two-file validation。
- 采用: Package root 同时导出 consumer 正确 authoring、dependency readback 和结果解释所需的 authoring/resolved options、final data、Record data 与 unavailable reason 类型。类型和 parser 由对应 Check owner 定义，不建立 Product-wide built-in result registry。
- 采用: 随包 Check 自己形成的 `failed`、`unavailable` 和带 non-blocking findings 的 `passed` 结果附带至少一条安全结构化 message，使用稳定 Check-owned code 和无需读取 raw scanner/schema/document material即可采取下一步的摘要。详细 finding 继续由 final data 与 Records 拥有，message 不复制敏感路径、命令输出、remote material、credentials 或 stack。
- 采用: Check-owned preflight option rejection同样附带安全 `invalid-options` message。Cancellation 或 Product settlement 在 Check 无法安全补充领域信息时可以只保留通用 reason；自定义 Check API 继续把 messages 定义为可选附件，不要求任意 author callback 为每个终态生成消息。
- 采用: `maintenanceReminders(entries)` 继续形成一个 `maintenance-reminders` Check；entry 按声明顺序发布 `clear | due | unavailable` final data，advisory 问题产生 warning 且不失败，enforcing 问题产生 error 并失败，whole-Check unavailable 只承接 cancellation、invalid replacement 或内部无法形成完整数组的边界。
- 采用: 首个稳定版本前对三个完整 Check value 执行单版本硬切，不保留同名 value、compatibility alias、双形态 overload 或迁移 wrapper；README、Check guides、JSDoc、examples、public inventory、isolated consumer 和 package candidate 同步切换。
