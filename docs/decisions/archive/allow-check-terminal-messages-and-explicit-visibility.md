---
title: 允许 Check 返回终态消息并显式声明 visibility
status: archived
alignment: aligned
createdAt: 2026-08-22T08:48:11Z
purpose: 让需要补充提示的 Check 在终态返回结构化消息，并以显式 visibility 控制人读行。
background: 项目已有 public runtime 防护；消息必须 settlement-only、可程序化读取且由 Check 按需附带。
decision: 采用可选结构化终态附件、RunResult readback、既有边界一致校验、attention visibility 和 fingerprint identity。
tags:
  - configuration
  - product-contract
relations: []
---

## 目的

- 将终态 messages 与显式 visibility 作为两项同等主要的 Check 能力：前者让确有补充提示的 Check 在结束时原子附带带等级、稳定识别 code 和实际文本的消息，既由 Product progress 呈现，也由 package caller 从 `RunResult` 读取。
- 让没有补充消息的 Check 保持原有终态返回；是否附带消息由 producing Check 决定，不建立统一消息投影或 consumer 迁移顺序。
- 让显式 Check visibility 减少成功 supporting Check 的永久输出噪音，同时保留运行中反馈、非成功状态、消息归属和完整 accounting。

## 背景

- Check 不允许执行期间写 shared progress stream；消息只在 owning Check settlement 时输出，且 progress 启用时不能被独立关闭。
- Product 已在 Check result、Record、Definition 和部分 Run Controls 等 public runtime 边界防御 JavaScript、`any`/cast、错误 shape、accessor、Proxy 和不可 canonicalize 的值。Messages 属于同一 author terminal return，不能采用更弱或另立一套 trust model。
- 同级 author result、Record、Definition array 和 human display string 当前没有通用数量或长度配额。Messages 需要 closed shape 与安全 materialization，但首版不以没有项目先例的任意 hard cap 把 otherwise valid author result 改成 unavailable。
- 只把消息写到 console 会让 progress-disabled caller 和其它程序化 consumer 无法知道 Check 产生了什么提示；但把人读文本进一步放入 machine artifact 会扩大兼容与敏感材料边界。
- Supporting Check 在 TTY 运行期间仍需可观察，完成为 passed 且无消息后可以不保留永久行；visibility 不应删除它的执行与统计事实。

## 决策

- 采用: Check 在四态 author terminal return 中按需原子附带零到多条结构化 messages；缺失或空 messages 不改变现有 Check 行为，不增加 Check-scoped collector、live/intermediate writer 或 settlement 后追加能力。
- 采用: 每条 message 包含用于人读强调和 TTY 颜色的 closed level、由 producing Check 拥有并在 owning Check 内解释的非空 code，以及非空的最终实际 message 文本。精确类型名、字段名、level 字面量、颜色值和 code grammar 是工程选择；首版不增加项目其它同级边界没有采用的 message 数量或文本长度 hard cap。
- 采用: Messages 复用或泛化现有 closed snapshot、descriptor 检查与 canonical containment 原语。任一 attachment shape、level、code 或 message 类型非法时，整个 author terminal result 按现有 invalid-result boundary fail closed，不显示或返回部分 messages；合法消息的 progress writer failure 仍只使 progress rendering output 失败，不改写 execution facts。
- 采用: Renderer 在输出前统一转义 newline、carriage return、tab、escape 和其它控制字符；`RunResult` 保留 validated actual message，不把 terminal escaping 写回程序化值。
- 采用: 合法结构化 messages 无论 progress 是否启用都进入 `RunResult`，以 owning `checkId` 与 level/code/message 供 package caller 读取；progress 启用时同时呈现。Messages 不进入 CheckOutcome、Core、Records、dependency、aggregation、cache 或 machine publication。
- 采用: Check visibility 默认保留 running 与 settled row；非默认 attention 模式仍显示 TTY running row，但在 terminal settlement 只隐藏 `passed` 且无 messages 的永久行。所有其它状态和任何带 messages 的 Check 显示 owning settled block。
- 采用: Hidden Check 继续计入 prepared total、settlement ordinal、duration、final counts、lifecycle、RunResult、Core、Records、dependency 和 machine facts。Visibility 是 declarative Check metadata，参与 Definition fingerprint，但不决定执行或 verdict。
