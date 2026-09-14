---
title: 将 Check 观察保留为逻辑生命周期位置
id: 260914-keep-check-observation-as-logical-lifecycle-positions
status: active
alignment: unaligned
createdAt: 2026-09-14T05:55:54Z
purpose: 让完整模型保留逐 Check 观察位置，同时由未来真实场景决定是否建立公开实际契约
background: 既有方向提前采用 public Check lifecycle observation，但整体模型尚未区分逻辑位置与具有私有上下文和顺序的实际执行契约
decision: 采用完整逻辑位置、保持当前内部契约并推迟公开接口，由未来 Change 基于实际消费者重新设计
tags:
  - product-contract
  - workflow-policy
relations:
  - type: 修订
    target: 260910-expose-check-centric-lifecycle-hooks
    summary: 以完整逻辑位置替代提前采用公开 Check 观察接口
---

## 目的

- 让维护者从完整生命周期模型恢复“Check 执行即将开始”和“Check 结算完成”两个观察位置，而不把模型完整性误当成公开接口需求。
- 让当前内部进度投影继续消费职责相符的已确认事实，并把调用级选择屏障与逐 Check 状态转换分开。
- 让未来公开观察契约由当时的真实消费者、上下文和执行保证决定。

## 背景

- 当前私有 `CheckExecutionLifecycle` 同时包含 invocation-wide `flagControlCompleted` 与逐 Check `started` / `settled`，但它们的范围和消费者不同。
- `260910-expose-check-centric-lifecycle-hooks` 已采用公开 Check 观察方向，同时把路径、事件、上下文、调用方式、故障和输出留给后续 Change；该方向把逻辑位置的长期价值与立即建立公共实际契约绑定在一起。
- 生命周期整理已经区分两层：逻辑位置表达相对领域事实的职责，实际执行契约才拥有路径、上下文、依赖、优先级、调用顺序和故障语义。一个逻辑位置可以没有公开契约，也可以包含不能共享实际插槽的多个内部或公开契约。
- 当前内部进度展示是逐 Check 事实的实际消费者；尚没有必须在 Product 返回最终 `RunResult` 前获得事件的公共消费者。为了完整性预建字段会固定未经使用验证的时点、payload、背压和输出义务。

## 决策

- 采用: 稳定生命周期模型保留“执行即将开始”和“单项结算完成”两个 Check 逻辑位置，并说明其职责、当前内部映射与未来采用条件。
- 采用: 当前 `started` / `settled` 内部事实继续由 Product 接受的状态转换产生；生命周期整理可以校正其内部 owner、名称和顺序，但不会让公开调用方取得执行、结算或调度控制权。
- 采用: invocation-wide selection barrier 与逐 Check transition 使用不同内部接口。进度展示直接消费职责相符的内部投影；逻辑时点相近不允许共享包含额外私有能力的上下文。
- 采用: 当前生命周期 Change 不增加 public Check observation 字段、类型、运行时分发、输出状态或兼容契约。未来出现必须即时消费的真实场景时，以独立 Change 重新决定公开路径、事件集合、payload、同步/异步、背压、取消、故障隔离、输出和 fingerprint，并用后继 Decision 记录采用方向。
- 不采用: 仅因完整模型存在而提前发布公开 Hook、把私有 `CheckExecutionLifecycle` 直接作为公共接口、把逐 Check 事件并入 Scheduler terminal effects，或建立通用 invocation event bus、事件 replay 和持久队列。
