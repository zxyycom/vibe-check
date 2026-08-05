---
title: 使用声明式质量决策策略
status: active
alignment: unaligned
createdAt: 2026-08-05T06:43:25Z
purpose: 让多个质量能力的标准记录与运行状态能够通过可审阅配置组合成查询、接受和门禁结果。
background: 固定 channels、overall completeness 和 gate prerequisite 无法表达不同能力、coverage 与 comparison 的逻辑组合。
decision: Public config 投影能力设置与声明式 DecisionPolicy；能力输出最终语义，Core 只执行通用组合逻辑。
relations: []
---

## 目的
- 让项目维护者显式决定哪些 records、comparison relations 与 capability run states需要展示、接受或阻断。
- 让新增 capability 可以接入同一通用 evaluator，而不在 Core 增加 feature-specific gate 分支。

## 背景
- 多个 capability 的结果天然并排存在；是否要求全部完成、允许partial、按level阻断或只关注某个reference，本质上都是可配置逻辑运算。
- 任意脚本或project executable会破坏tool-neutral config、安全边界、可验证性和确定性。
- Capability 必须拥有领域判定和final record level，否则Core仍会重新实现每项check语义。

## 决策
- 采用: Public config owner单向产生两类normalized output：每项capability消费自己的`CapabilityPolicyProjection`，Core消费named、closed typed、detached且不可执行的`DecisionPolicy` catalog。
- 采用: `DecisionPolicy`以record/run predicates、acceptance annotations、named views、boolean composition、collection reducers和唯一`blockWhen`表达跨能力决策。
- 采用: Capability按`CapabilityPolicyProjection`输出final semantic `QualityRecord`；Core只做schema/catalog validation与deterministic `DecisionPolicy` evaluation，不重新判断severity、threshold、parser outcome或comparison relation。
- 采用: Capability failure、partial coverage、record level、record count和comparison relation都是普通operands；没有任何单项被Core硬编码为全局pass、fail或not-evaluated。
- 采用: `add-file-policy-overrides`拥有public config v2、ordered file overrides、capability sections和named decision-policy JSON shape；quality capability contract只拥有两类normalized outputs及其执行边界。
- 不采用: 固定`all`/`changed`/`regressions`gate enum、任意脚本、dynamic module、backend object或第二套feature-specific evaluator。
