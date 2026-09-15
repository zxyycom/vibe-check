# Proposal

本 Draft 拟把 Check 汇总明确为 Run 使用者的派生结论：Run 始终保留原始 Check facts，提供一个简单严格的默认聚合，并允许本次调用定制聚合函数。

## Why

当前 `RunControls.checkAggregation` 必须显式填写选择、`all | any` 与 unavailable/not-applicable/empty policy；不填时 `RunResult.aggregate` 为 `null`。这套闭合规则可以表达若干状态折叠，却不能表达“已知 failed 优先，只有纯不可用才 unavailable”等调用方判断；Gate 的 ast-grep pinned-version 与 rule-tests 依赖是现实触发场景。

聚合不是 Check 的产出，也不是 Product 对所有项目的最终质量判断。Run 使用者需要的是在已结算 Check 列表上形成自己可解释的调用级摘要，且不能因此失去原始四态、final data、Records 或 Run 的 operational `kind`。

## Outcome

形成完整 Check facts 的正常 Run 可从同一次 effective selection 得到默认严格摘要：选中集合非空且所有 Check `passed` 时为 `passed`，其余为 `failed`。调用方可为本次 Run 提供自己的聚合函数，得到同样可验证的调用级结论；原始 Check/Record facts 和 Run 分支保持独立，聚合不改写它们。Gate 可按自身验收目标选择默认或定制规则，而不重新计算 Product 的有效选择。
