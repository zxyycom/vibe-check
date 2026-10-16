---
title: 以静态声明交付精确 callback context
id: 261016-declare-exact-callback-contexts
status: active
alignment: aligned
createdAt: 2026-10-16T07:28:12Z
purpose: 让业务输入与框架能力分离，并按固定需求生产和精确交付
background: 兼容 full 默认和阶段 union 交付使隐藏依赖与无消费者的生产持续存在
decision: 统一 Check、Scheduler 与 command 的默认空声明，保持领域事实与生命周期
tags:
  - performance
  - product-contract
relations:
  - type: 修订
    target: 261013-declare-scheduler-context-demand
    summary: 将 Scheduler 兼容 union 扩展为全局默认空精确交付
---

## 目的

- 让调用方能从声明准确恢复 callback 依赖；业务输入直接传入，框架能力按静态需求生产并精确交付。
- 把可选观察成本与执行义务分开，而不另造执行事实或扩大能力授权。

## 背景

- 前序为兼容已有 Scheduler function，采用默认 full 与同阶段需求并集的共享外层 context。该路线曾使声明渐进接入，但允许未声明字段偶然可读，也将聚合 measurement 的成本绑定。
- Check options 是业务输入，和 Scheduler 观察事实不同；command 又是普通 Check 内部的下游消费者。统一完整大 context 会混淆阶段权限与领域责任。
- 用户确认一次 breaking 迁移、默认 none 和精确交付；此次推广共同声明机制，而非把 Scheduler 执行模型推广到其它领域。

## 决策

- 采用: Check prepare/execute、Scheduler prepare/decide/terminal 与 command environment/complete 接受 function 或 closed `{ contextNeeds?, callback }`。function、缺省或自有 undefined needs、空数组都表示零需求；无需求仍传冻结空 context。业务输入采用 `callback(input, context)`，无业务输入的 Scheduler 采用 `callback(context)`。
- 采用: 阶段拥有合法字段、验证边界、调用时机与失败映射；共同 Core 数据机制只验证和固定 descriptor、复制去重冻结 dense needs。拒绝未知字段、跨阶段 key、accessor、symbol、空洞与动态需求函数；Definition 在 author work 前固定，command constructor 固定下游，prepared result 在 Scheduler 开始前固定。
- 采用: 可移除的 `defineContextCallback` 工具依据 phase 与 literal needs 自动推导只读字段，贯通业务输入、prepared options、typed data/handoff 与结果；宽化和 union 只承诺所有可能声明都保证的字段。原始 descriptor 保留 context 为 never 的安全存储边界；具体 helper descriptor 的 callback 可直接调用，但不自动取得 Run 能力。
- 采用: 汇总需求、真实生产依赖与内部固定执行/诊断义务，只用于生产配置；每个消费者的冻结外层只含自己声明的 own data fields，不交付并集，也不承诺不同消费者外层 identity 相同。底层冻结 graph/project、同 boundary state 可复用，旧 snapshot 和 captured prefix 不追随后续 mutation。
- 采用: 在生产之前避免无消费者工作，不先构造 full 再隐藏。Check 仅按需要建立 project 视图、dependencies facade、Record reporter 与 artifact path；Git/flags、取消、console、settlement、relation guards 与既有输出义务不因零需求消失。command 合并自身义务与下游需求取得上游字段，再分别投影下游精确视图。
- 采用: Scheduler 在启动前收齐全部阶段需求并固定唯一生产配置；无运行中增删订阅或终态补采。shell 拥有真实执行离散事实，唯一 collector 拥有 clock、interval、积分与历史；按独立累计、action history、Run 和逐 Task timing 需求启用，不造竞争事实源。诊断保持自身真实依赖与完整证据，不无条件启用无人使用的 history。
- 采用: 声明选择既有能力，不是沙箱或新权限；dependencies 限 direct relations，handoff/artifact 授权、signal identity 与受控 reporter 的关闭边界不变。terminal 存在决定 drained/sealed 后交付，采集需求另行决定；空需求 effect 仍交付，顺序、prepared 最后、继续交付、not-run 与 primary failure 优先级保持。
- 采用: callback 与 needs 属 runtime 配置，不进入 declarative fingerprint；保持图、Check facts、machine output、默认策略及纯业务 parser/aggregation/formatter 的直接输入。仅提供新 helper/字段/签名，不保留旧 full 默认、union 外层或兼容别名。
- 不采用: 全局字段 registry、大而全可选 context、经验尺寸阈值、每种规模更快的承诺、mutable 快照、运行中回补或不安全类型抹除。领域 owner 完整定义当前接口。
