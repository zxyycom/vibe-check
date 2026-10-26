---
title: 以阶段需求声明控制 Scheduler 上下文成本
id: 261013-declare-scheduler-context-demand
status: archived
alignment: aligned
createdAt: 2026-10-13T04:41:36Z
purpose: 让消费者声明所需事实并由 Core 统一构建，同时保留旧回调契约
background: 完整策略和终态上下文将可选观察成本施加到未消费字段的路径
decision: 增加兼容的阶段需求声明，以需求并集构建共享冻结上下文，采集与交付分别决定
tags:
  - performance
  - product-contract
  - scheduler
  - scheduler-context-demand
  - scheduler-measurement
relations: []
---

## 目的

- 让 Scheduler 的策略与终态消费者为自己所需的观察事实声明需求，由生产者统一验证和构建。
- 在兼容旧调用的前提下消除未消费投影与采集工作，不把局部优化演变成全局 callback registry。

## 背景

- 实施前 custom decision 获得完整上下文并启动 measurement；terminal effect 的存在也要求完整 collector。
  static decision 仍会形成部分仅用于观察的 DTO。执行规则与完整观察数据的生产责任没有充分分开。
- 用户批准推进 Scheduler 需求声明；当前实施选择未声明时保留完整上下文的保守兼容路线，
  不将需求声明改为必填，保留旧 function authoring 的完整 context、调用顺序与失败语义。
  callback 输入槽拓宽为 function/descriptor 联合后，直接调用已标注槽位类型的代码须先收窄；
  输入槽不是直接调用接口，不承诺所有既有 TypeScript 类型消费都零修改。
- [调度指南](../../guides/scheduling.md)已有不可变上下文、终态共享 identity、顺序交付和失败语义；
  [内部 owner](../../development/scheduler.md)已有唯一 reducer 和 collector。减少成本不能另造执行真相或弱化这些保证。
- preparation、decision 和 terminal 消费的事实与失败时点不同；跨阶段合并会令廉价消费者负担无关生命周期成本。

## 决策

- 采用: 在实际 Scheduler callback slot 增加显式可选需求声明。未声明保持当前完整上下文，显式空列表表示
  不增加该消费者的字段需求。需求在对应边界验证、复制并固定，不接受动态需求函数或运行中改变需求。
- 采用: 按 preparation、decision、terminal 分别检查合法字段，合并同阶段消费者及 Core 固定义务，计算
  构建依赖后至多物化一份共享冻结上下文。不同阶段不合并；diagnostics 的完整证据不能被用户 subset 削减。
- 采用: 声明表示字段可读保证和生产需求，不是权限隔离。消费者只依赖自己声明的字段；同阶段共享对象可以
  包含其它消费者要求的额外字段。TypeScript authoring 必须提供健全的 subset 推导，不能静态承诺未构造字段。
- 采用: 按需求在生产之前避免工作，而非先构造 full context 再隐藏字段。static 执行使用薄查询，custom
  不请求 measurement 且没有其它采集义务时不启动完整 collector；opaque state、hard guards 和 captured prefix 不变。
- 采用: terminal delivery 与 measurement collection 分别决定。空需求、graph-only 或 execution-only effect
  到达既有 drained/sealed 边界后仍获调用，不因没有 collector 而丢失；未到达边界仍 not-run。
  generic 顺序、prepared 最后、同一 context identity、继续交付及 primary failure 优先级保持。
- 采用: shell 持有执行实际发生的离散事实，collector 继续独占 clock、interval、积分与 history；两者共享
  已有执行事实，不维护相互竞争的 admission history。需求在 Scheduler 开始前收齐，不能终态时补造过去的采样。
- 采用: 需求与 callback 一样属于 runtime consumer 配置，不进入 declarative fingerprint。保持已有图、
  Check facts、machine output 与默认策略，不以这项能力自动推广 Check、progress 或其它生命周期接口。
- 不采用: 全局可选字段大 context、经验尺寸阈值、每种规模必须更快、以 mutable view 代替不可变快照，
  或靠不安全类型抹除掩盖真实需求。具体 API 和实现验收由当前 Change 与行为 owner 承接。
