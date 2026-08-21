---
title: 将 machine v3 发布为指纹绑定的双文件集合
status: archived
alignment: aligned
createdAt: 2026-08-15T10:25:13Z
purpose: 让 canonical machine output 只表达 Check、Record 与必要运行证据，并用内容指纹验证两个固定路径文件属于同一事实集合。
background: 两个固定路径无法在不增加 reader protocol 时做到文件系统级原子切换，逐文件 rename 还可能让跨运行混合内容通过普通关系校验。
decision: machine v3 以 Records 内容指纹绑定 run.json 与 records.ndjson，整体验证后才受信；固定路径替换不承诺跨文件系统级原子性。
tags:
  - product-contract
relations:
  - type: 修订
    target: publish-check-record-machine-v3.md
---

## 目的

- 让 machine consumer 直接读取每个 Check 的声明与终态，以及该 Check 已提交的 QualityRecords，不再拼接 definition、CheckRun 和 lifecycle summary。
- 让 `run.json` 与 `records.ndjson` 在保留固定 canonical 路径的同时拥有可独立验证的 set binding；任何 partial 或 mixed set 都不能成为 trusted result。
- 让 machine files、structured Run Result、report 和 console 都从同一组已验证事实投影，并保持 invocation、reference 与 policy decision 可解释。

## 背景

- v2 `definitions`、`runs`、`integrity`、`completeness` 与 `checkRunId` 重复投影了 Core lifecycle。Core 的目标实体集合只有 `checks` 与 `records`，machine 层不需要恢复另一套运行实例模型。
- Check 与 Record 事实可以在 runtime 内逐步成立，但当前外部 contract 没有 live-event、partial-file、resume、generation pointer 或 reader lock protocol。外部 consumer 只能把完整的 canonical two-file set 当作 terminal artifact。
- POSIX/Node 的 rename 只能保证单个 pathname 的替换原子性；对两个固定路径连续 rename 时，reader 或进程终止仍可能观察到跨运行混合的文件。只校验 catalog、Record ownership 与 decision relations 也不足以排除同 catalog 或空 Record 集合之间的混合。
- 引入 generation directory、指针文件或 reader 协调协议只为隐藏这个窗口，会扩大当前 public contract 和运维状态。一个由 `run.json` 声明、双方 validator 都重算的 canonical Records 内容指纹，可以在不增加第三个 artifact protocol 的前提下让混合集合 fail closed。

## 决策

- 采用: machine v3 保持一个 canonical two-file set。`run.json` 只包含 schema identity、invocation metadata、declarative `catalogFingerprint`、canonical `checks`、canonical Records 集合的 `recordsFingerprint`，以及解释 reference、acceptance 和 policy decision 所需的运行证据；`records.ndjson` 只包含 canonical ordered QualityRecord rows。
- 采用: `recordsFingerprint` 从完整、canonical ordered machine Record rows 计算，空集合也有确定值。runtime validator 与独立 docs validator 都必须重算并比较该值，任何 partial、stale 或 mixed Record file 都不得返回 trusted set。
- 采用: 每个 machine Check 直接包含稳定 definition projection 与一个 outcome：`not-applicable`、`completed(passed|failed)` 或 `unavailable(diagnostic)`。QualityRecord 直接绑定 `checkId` 与 `recordTypeId`，不发布 `checkRunId`、替代 Check instance ID 或 Task identity。
- 采用: v3 不发布独立 `definitions`、`runs`、`integrity`、`completeness` 或其它 derived lifecycle summary。Record validation、conflict、execution、dependency、protocol 与 cancellation 只通过所属 Check 的 safe terminal diagnostic 表达；已经提交的独立 Records 保持不变。
- 采用: `references`、`acceptance` 与 `decision` 是解释当次 gate 结果所需的非实体运行证据。它们只能引用 canonical `checkId`、`recordId` 或 named reference identity，不得恢复 run identity、work acknowledgement 或平行 Check status。
- 采用: report 与 console 只能从 validated v3 publication model 派生可读摘要；摘要不进入 Core snapshot 或 canonical machine fields。effect status 仍由 structured Run Result 表达，不写入 machine set。
- 采用: writer 在接触 canonical paths 前完成 model validation、serialization、set validation 和全部同目录 temp writes。只有两个 machine files 与 report 都替换成功时 publication effect 才成功；handled failure 清理 owned temps，并在 replacement 已开始后清理可能不完整的 canonical set。validator 的完整 set acceptance 是 trust boundary，不把连续 pathname replacement 描述为文件系统级原子快照。
- 采用: cancelled 或 trusted execution-failed Run 不启动 publication effect，也不覆盖既有 canonical set。本决策不新增 public live-event、partial-file、resume、generation pointer 或 reader-lock protocol；consumer 必须读取并验证完整 two-file set，不能单独信任其中一个文件。
- 采用: v3 使用新的 schema identity 并单版本硬切。历史 v2 schema identity 与 bytes 保持不变，但 current runtime 不保留 v2 writer、reader、fallback、dual path、current examples 或默认 docs entry。
- 不采用: 为兼容 v2 保留重命名后的 definition/run lifecycle、从 Checks/Records 复制 completeness/integrity convenience views、把内部流式事实误定义为外部可消费的半成品文件，或用未被 reader 协议支持的“原子”措辞掩盖两个 pathname 的替换边界。
