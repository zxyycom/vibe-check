# 统一质量能力契约

Change ID：`standardize-quality-capability-contract`

> **用途：**这是本OpenSpec change的状态与导航入口；proposal说明目标和范围，design说明架构取舍，delta specs是行为契约，tasks是实施入口。

## 状态

Change artifacts已写入且OpenSpec可以解析；这只表示artifact准备完成，不表示change已通过实现前审计。产品实现尚未开始，未勾选[tasks 1.1](tasks.md#1-实现前阻塞审计)前不得执行任何实现任务。

## 主承诺

内置quality capability逐条提交final `QualityRecord`并报告execution summary；Core验证通用契约、finalize `CapabilityRun`，再执行selected `DecisionPolicy`并发布结果。

```text
normalized inventory -> compile-time capability -> records + execution summary
                                                   |
                                                   v
                                records + finalized CapabilityRun[]
                                                   |
                                                   v
                              selected policy: acceptance -> views -> blockWhen
                                                   |
                                                   v
                                     run.json + records.ndjson + report
```

## 阅读顺序与权威性

本README只负责导航，不定义产品行为。实施或审查时按以下顺序读取；如果artifact之间出现冲突，必须先修正对应owner并保持task 1.1未完成，不能自行选择一种解释进入实现。

| 顺序 | Artifact | 用途与权威性 |
| --- | --- | --- |
| 1 | [proposal.md](proposal.md) | 定义问题、change范围、breaking surface和downstream obligations；不定义字段级行为。 |
| 2 | [design.md](design.md) | 定义稳定术语、owner、调用方向、关键取舍和migration顺序；不替代normative requirements。 |
| 3 | [quality-records](specs/quality-records/spec.md)与[quality-decision-policy](specs/quality-decision-policy/spec.md) | 新增长期behavior owners；其中的requirements与scenarios是对应行为的权威来源。 |
| 4 | [其它delta specs](specs/) | 修改现有scope、metrics、runs、output、CLI、dependency和acceptance行为；apply后与主spec共同构成contract。 |
| 5 | [tasks.md](tasks.md) | 定义实现顺序、证明目标和验证入口；不得新增spec中不存在的产品要求。 |

## 已确认边界

- [Quality Records](specs/quality-records/spec.md)只支持Product编译期注册的capability；capability决定record领域语义和final level。
- [Scan Completeness](specs/scan-completeness/spec.md)由Core finalize run/coverage；later failure不删除earlier committed records。
- [Decision Policy](specs/quality-decision-policy/spec.md)只使用explicit named references；`changed`和`regression`是普通relation/view名称，不是Core fixed channels。
- [Output Contract](specs/output-contract/spec.md)只发布policy identity、decision和evidence references，不嵌入resolved policy body。
- Public config v2与file overrides由`add-file-policy-overrides`拥有；本change只固定`CapabilityPolicyProjection`与`DecisionPolicy`两类normalized outputs，不实现后续feature checks。

Downstream changes的具体迁移范围见[proposal Impact](proposal.md#impact)和[tasks 6.6](tasks.md#6-cli文档与验收)。
