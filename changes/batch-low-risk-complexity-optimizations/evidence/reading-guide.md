# 当前测量解释与审查入口

本文补充独立审查确认的计时边界。形成时的 44 项测量交付文件、原始数据、helper、summary 与 SHA 清单全部保持原样；阅读结论时同时应用下述澄清。

## 两处原始说明的澄清

1. `T01-T02-public-prepare` 的实际 workload 是 **`prepare`（包含空目录下 missing-history 的异步读取）+ 三次 `decide`**，三次决定分别使用 tightening、active continuation 和 wait context。原始名称及 row `boundary` 没有完整表达这些后续决定；不能把 512-task 的 19.174481 → 9.203477 ms 单独归因于 preparation。
2. 原始 `results.md` 第 5 行与 `protocol.md` 关于 IO 不计时的概括，不适用于上述组合 workload 内部的 history read。它们排除的是证据读写、fixture 创建等计时外工作；其它 workload 的实际边界仍以对应 invoke 和逐行说明核对，不能把本次结果称为纯内存 preparation 成本。

直接依据是归档 `helper-source.tar.gz` 中 `harness/after-workloads.ts:347–356` 和同义 before invoke，以及 `harness/measure.ts:40–52` 对整个 invoke 的计时；产品 `duration-model/preparation.ts` 在 prepare 内读取 history。
原始完整输出、计时批次和统计没有因此失效，无需重测。不得从两个不同 workload 的中位数相减来估算 isolated prepare；本批没有单独证明该成本。
主验收表从一开始已使用“public prepare + 三次决定”的组合路径名称，此处补齐原始材料单独阅读时的边界。

## 阅读与复现

- [验收交接](../acceptance.md)：实际采用范围、小规模代价、Gate 与剩余生命周期事项。
- [独立审查](independent-review/review.md)：源码/调用者、测试证明力、文档反查及 E1 证据说明问题；结论针对产品 source 稳定的 `7b1ca20f8b8049b0c4ef7c499beeec6cae78bcb5`。
- [原始测量交付说明](README.md)：解包与重建步骤，适用本文补充的解释；不是本轮重新执行记录。
- [形成时统计说明](results.md)与[完整统计](summary.json)：原始数值不改，`public-prepare` 和 IO 的文字按本文澄清阅读。
- [独立审查材料说明](independent-review/README.md)：本轮实际命令、日志、归档和未重跑边界。

这些数据仍只是局部 owner 或组合路径的测量，不证明 Run 端到端加速、所有小输入无回退、真实 scanner I/O、memory 或生产 SLA。
