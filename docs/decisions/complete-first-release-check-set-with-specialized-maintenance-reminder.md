---
title: 以专用构造函数完成首版维护提醒
status: active
alignment: unaligned
createdAt: 2026-08-24T13:52:31Z
purpose: 让首版在不增加通用派生模型的前提下，以低样板方式提供可见且可选阻断的维护提醒。
background: 用户确认 `maintenanceReminders(entries)`、单一 Check、默认提醒和可选阻断；这些方向修订了现有发布、最小 surface 与默认 Check 组合判断。
decision: 首版以 `maintenanceReminders(entries)` 构造单一 Check，采用 entry-local advisory/enforcing 结论。
tags:
  - configuration
  - product-contract
  - product-priority
relations:
  - type: 归并
    target: complete-first-release-check-set-before-publication.md
  - type: 归并
    target: expose-minimal-check-and-run-public-surface.md
  - type: 归并
    target: use-native-object-composition-for-check-customization.md
---

## 目的

- 在首次公开 `vibe-check` 前，为项目提供低样板、可复现且默认非阻断的维护复核提醒。
- 保持唯一 ordinary Check/Run model、Check-owned baseline semantics、显式 aggregation 和 native object composition；不借此恢复 generic factory、patch grammar 或新的 Check entity。
- 让 package、公开说明、isolated consumer 与 Project Gate 对同一专用构造函数和四态结果语义形成可验证证据。

## 背景

- 用户明确选择 `maintenanceReminders([配置 1, 配置 2])`：constructor 应补齐可推断默认值；多条 reminder 不应成为多条 Check。
- 用户要求默认只提醒、不实质阻断交付，同时支持调用方显式选择 blocking；base 由维护者在真实复核后以 immutable full commit ID 手动推进。
- 当前 Product 已支持 complete ordinary Check、Check-owned execution/options、terminal messages、`attention` visibility、four-state terminal result、generic final data 和 explicit aggregation；它不需要 common baseline service、Record catalog 或另一 scheduler。
- 先前首版方向把 maintenance reminders 改成 ordinary default value，并把任何 Git/history 问题折叠为 whole-Check `unavailable`；这与已确认的 constructor 和 per-entry 可审计结论不一致。现有最小 public surface 与原生组合判断也须作同一窄幅修订。

## 决策

- 采用：首次公开发布前完成并验证三项 Product-provided ordinary format Check values（`jsonValidation`、`jsonSchemaValidation`、`markdownLinkValidation`）以及唯一专用 public constructor `maintenanceReminders(entries)`；后者生成第四项独立 ordinary Check，不把它伪装为另一个无参 default value。
- 采用：`maintenanceReminders(entries)` 只接受 dense reminder entries，返回一个 complete ordinary executable Check，固定 `checkId: "maintenance-reminders"`、`displayName: "Maintenance reminders"` 与 `visibility: "attention"`。同一 Project Definition 中多次调用仍遵守 ordinary duplicate Check-ID validation。
- 采用：每个 entry 的 public policy 为唯一 lower-kebab-case `id`、immutable full 40- 或 64-hex `baseCommit`、至少一个正安全整数 `limits.commits` / `limits.changedLines`、非空 `message` 与可省略的 `mode: "advisory" | "enforcing"`；省略 mode 为 `advisory`。constructor 补齐 package-owned Git execution/options 和其它非项目语义默认值。
- 采用：entries 是 owning Check 的 local data，不创建 child Check、Record、dependency、aggregation target、progress row 或 machine Check row。final data 按 author order 公开每项 `clear | due | unavailable` assessment 及 base/head、计数、超限项与可行动原因。
- 采用：测量只读取 committed history。base 必须位于当前 `HEAD` 的 first-parent chain；从 `base..HEAD` 逐提交统计 first-parent commit count 和相对 first parent 的 `numstat` additions + deletions。base 不计入；merge 只按 first-parent diff 计一次；revert 计实际活动；binary 行数按零。任一 limit 被严格超过时 entry 为 `due`；Product 不读取 worktree/index delta，也不自动推进 base。
- 采用：只要 callback 能形成完整 assessment array，advisory `due` / `unavailable` 返回 `passed + final data + warning`，enforcing `due` / `unavailable` 返回 `failed + final data + error`。因此 enforcing 在不能验证时 fail closed，而 advisory 保持可见但不阻断。whole-Check `unavailable` 仅用于 cancellation、internal/protocol failure 或无法形成可信完整 payload 的边界。
- 采用：terminal messages 只通过 progress 与 `RunResult.checkMessages` 面向人；assessment final data 继续走普通 v4 Check outcome。是否把该 Check 纳入某个 repository Gate，以及对 failed/unavailable 的 process mapping，仍由 project-owned Run controls / adapter 显式决定。
- 采用：constructor 的 public input 仅为 reminder policy entries；不增加 generic `deriveCheck`、partial override、Git-command override parameter、shared baseline/reference API、entry acknowledgement、wall-clock scheduler 或自动通知。返回的 Check 仍是普通对象，原生 object composition 不获得额外 materialization 或 deep-merge 语义。
- 采用：本仓 `quality` Definition 不因本 Decision 隐式配置具体 reminder entries；真实 base、limits、message、progress visibility 和 Gate policy 是 repository consumer 的独立、显式选择。
- 采用：完成后重新生成 exact package candidate，更新 public declarations、README/API guide、runtime dependencies、license 和 semantic Cases，并通过 required/full Project Gate 后再进入公开发布准备。
- 不采用：generic factory、第二 Check family、reminder-level Check/Record identity、Product-wide baseline resolver、把 Git 无法测量伪装为 clear、因本次目标降低 network/secret 安全边界，或把其它 active Change 的 Readiness 当作实现证据。
