---
title: 在 machine v3 只发布 Check、Record 与运行元数据
status: active
alignment: unaligned
createdAt: 2026-08-15T08:26:56Z
purpose: 让 canonical machine output 直接表达 Check 与 Record 事实，不再发布重复的生命周期或完整性摘要。
background: v2 definitions、runs、integrity 与 completeness 重复投影 Core 状态，且 checkRunId 让 Record 依赖将退出的运行实例身份。
decision: machine v3 原子发布 Checks、Records 与解释本次运行所需的元数据，不保留 definitions、runs、integrity 或 completeness。
relations: []
---

## 目的

- 让 machine consumer 直接读取每个 Check 的声明与终态，以及该 Check 已提交的 QualityRecords，不再拼接 definition、CheckRun 和 summary。
- 让 machine 文件、structured Run Result、report 和 console 都从同一组已验证事实投影，并保持 invocation、reference 与 policy decision 可解释。

## 背景

- 当前 v2 `run.json` 同时发布 `definitions`、`runs`、`integrity` 与 `completeness`，`records.ndjson` 又以 `checkRunId` 绑定 Record；这些字段复制了 Core lifecycle 和 execution acknowledgement。
- Core 的目标实体集合已经确定为 `checks` 与 `records`。每个 Core Check 自带 definition projection 与闭合 outcome，Record 可直接以 `checkId` 表达 owner，因此 machine 层无需另一套 lifecycle。
- Check 与 Record 事实可以在运行中逐步成立，但当前 Output owner 将 `run.json` 与 `records.ndjson` 作为经过整体验证、原子发布的 canonical set。流式事实成立不等于半份 canonical 文件可以被外部 consumer 当成有效结果。

## 决策

- 采用: machine v3 保持一个 canonical two-file set。`run.json` 只包含 schema identity、invocation metadata、declarative `catalogFingerprint`、canonical `checks`，以及解释 reference、acceptance 和 policy decision 所需的运行证据；`records.ndjson` 只包含 canonical ordered QualityRecord rows。
- 采用: 每个 machine Check 直接包含稳定 definition projection 与一个 outcome：`not-applicable`、`completed(passed|failed)` 或 `unavailable(diagnostic)`。QualityRecord 直接绑定 `checkId` 与 `recordTypeId`，不发布 `checkRunId`、替代 Check instance ID 或 Task identity。
- 采用: v3 不发布独立 `definitions`、`runs`、`integrity`、`completeness` 或其它 derived lifecycle summary。Record validation、conflict、execution、dependency、protocol 与 cancellation 只通过所属 Check 的 safe terminal diagnostic 表达；已经提交的独立 Records 保持不变。
- 采用: `references`、`acceptance` 与 `decision` 是解释当次 gate 结果所需的非实体运行证据。它们只能引用 canonical `checkId`、`recordId` 或 named reference identity，不得恢复 run identity、work acknowledgement 或平行 Check status。
- 采用: report 与 console 只能从 validated v3 publication model 派生可读摘要；摘要不进入 Core snapshot 或 canonical machine fields。effect status 仍由 structured Run Result 表达，不写入 machine set，因为它描述 publication/log/cache 动作，而不是被发布的质量事实。
- 采用: runtime 可以内部增量交付已经闭合的 Check 与已经提交的 Record；本决策不新增 public live-event、partial-file 或 resume protocol。只有到达 publication 阶段并通过整体验证的 terminal model 才能原子替换 canonical two-file set；cancelled 或 execution-failed Run 不以不完整事实覆盖既有 canonical set。
- 采用: v3 使用新的 schema identity 并单版本硬切。历史 v2 schema identity 与 bytes 保持不变，但 current runtime 不保留 v2 writer、reader、fallback、dual path、current examples 或默认 docs entry。
- 不采用: 为兼容 v2 保留重命名后的 definition/run lifecycle、从 Checks/Records 复制 completeness/integrity convenience views，或把内部流式事实误定义为外部可消费的半成品文件。
