---
title: 在 Check availability 前结算执行 capability
status: archived
alignment: aligned
createdAt: 2026-08-13T07:05:49Z
purpose: 让 requiresChecks 只依赖不可被保留执行 capability 追溯改写的 Check availability。
background: availability 判定后仍可写入的 ack 或 record 会让已放行 dependent 的前提变得可追溯，破坏任务图的可信依赖边界。
decision: settlement 在返回 availability 前原子地关闭 Check 的执行 ports、冻结事实并据此计算 availability；late 调用被拒绝且不改变最终执行或完整性事实。
tags:
  - product-contract
relations: []
---

## 目的
- 让 `requiresChecks` 依据 prerequisite 已经可信完成的 availability 放行，而不是依据未来仍可能被保留 capability 改写的暂时状态。
- 保持 Check 的执行 lifecycle、CheckRun 和 snapshot integrity 在结算后可稳定消费，同时不把 Task 或 capability 身份引入输出契约。

## 背景
- Check 的普通执行通过受控 ports 确认 work 和提交 record；调用方可能在 Check 的 availability 已被判断后仍持有这些 capability。
- 若这些 retained capability 能在 dependent 获准后继续确认 work、提交 record 或制造完整性变化，prerequisite 的可用性就不是单调事实，静态任务依赖无法安全解释。
- settlement 前的 invalid、unknown 或 missing acknowledgement，以及 record conflict，仍是既有的普通 protocol failure 和 integrity 语义；已经有效提交的 record 不因之后的普通失败被撤销。

## 决策
- 采用: foundation 为每个 Check 执行一次唯一 settlement。在它返回 availability 前的同一原子边界内，关闭该 Check 的 execution capabilities，并冻结与该 Check 相关的执行、record 和 integrity 事实；foundation 据此计算、冻结并返回 availability。`requiresChecks` 只使用已经完成这一冻结的 availability。
- 采用: settlement 返回后，任何 retained capability 的 late acknowledgement 或 record 调用都返回 rejected，且不得改变已冻结 availability、最终 CheckRun 或 snapshot integrity；settlement 前已经有效提交的 record 保持有效。
- 采用: 缺失 settlement 或重复进入 settlement 是 foundation 内部 protocol failure；它们不得重新打开已结算 Check，也不得成为修改已冻结 availability 的通道。
- 不采用: 让 late capability 调用升级或降级 availability、补写 final record，或以事后 integrity 变化追溯改变已经放行的 dependent 前提。
