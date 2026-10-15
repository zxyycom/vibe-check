---
title: "无效 Check 声明提前拒绝与兼容性验证"
id: "261015-verify-invalid-check-tree-early-rejection"
formedAt: "2026-10-15T06:22:07Z"
question: "如何消除共享 executable 声明在失败前的指数展开，同时界定提前配置失败的兼容性变化？"
tags:
  - "algorithmic-complexity"
  - "performance"
  - "project-definition"
relations:
  - type: "补充"
    target: "261012-review-product-algorithmic-complexity"
    summary: "闭合C04提前拒绝的实现与错误分类取舍"
---

## 形成时背景

[全产品复杂度复查](review-product-algorithmic-complexity.md)保留了 C04：共享 executable DAG 会在重复 Task ID 的规划拒绝之前展开。本轮在源码基线 `b2926b14880da7546f39aba7c0e07424f65f3977` 的工作树上实施修复，并单独核对了提前失败的兼容性。报告保存这一轮的证据与取舍，不重写前轮调查，也不把其它性能候选的交付归入本问题。

用户先允许明确无效结构提前拒绝，随后明确接受重复 executable Check ID 从 `planning / task-graph-invalid` 提前变为 `configuration / invalid-project-definition`。Analyzer 改写、缓存容量管理和合法树规模上限均不在授权范围。

## 调查目的

判断如何避免无效共享声明的失败前指数展开，以及能否在最小责任边界内保持合法声明、container occurrence、继承与运行语义。尤其区分“尽早拒绝无效输入”和“保留无效输入原规划 fingerprint”的成本，明确需要消费者知晓的错误分类变化。

## 调查范围与依据

- 读取 `src/project-definition/check-tree/authoring.ts`、声明 validation/normalization 与公开 Run 的失败映射；核对 `docs/development/project-definition.md#recursive-check-tree` 和公开 [API 机制](../api-mechanics.md#递归组合与继承)。
- 将当前解析与 HEAD 的原 authoring 实现作局部对照；原文件副本仅改 import 定位，不替换整个旧 Product。用 Bun 1.3.14 的同一 Proxy `ownKeys` 计数、同形声明比较访问量，不测 wall time 或 heap。
- 输入为一个 executable leaf，外包 d 层 container，每层两个 child 指向同一个对象。不同 Check 对象仅 d+1 个；另覆盖不同对象的重复 executable ID、直接/间接循环、合法共享 container 与 warning 路径。
- 当前回归测试为 `src/project-definition/project-definition.recursive-checks.test.ts` 中的公开 Run 与独立 validator/normalizer 断言；扩大目标测试 54 项通过，独立审查的相关窄测试 29 项通过。完整工程与 candidate-backed 验收按当前 Change 交付，不能以这些窄测试替代。

## 调查结果与边界

### 原因与采用路径

原解析先递归处理 children，再由后续 Task Graph 验证 executable ID。共享 occurrence 因而产生 `2^(d+1)-1` 次对象枚举，之后才得到规划失败。只 memo parsed 子树仍不能消除 resolver、完整 normalized 声明与 fingerprint 的重复输出；在原规划分类中保留这些字节事实需要更复杂的私有失败 handoff，不能凭一张缓存就宣称整条路径线性。

本轮在当前递归路径维护对象 identity Set，在本次解析维护 executable ID Set：活动祖先再次出现立即拒绝；prelude 确认 executable 后，在 children 前检查 ID。对象路径 Set 在退出时恢复，ID Set 保持全树唯一。非循环共享 container 仍按 occurrence 处理，不把 container-only 重复 ID 一概当成无效声明。

| 深度 d | 原解析 ownKeys | 当前 ownKeys |
| --- | ---: | ---: |
| 3 | 15 | 5 |
| 5 | 63 | 7 |
| 7 | 255 | 9 |
| 9 | 1023 | 11 |

上述是解析反射操作计数，不是整个 Run 的时间复杂度证明。声明路径字符串、容器快照及合法完整输出仍各有成本；没有测量 heap 峰值、极深递归或所有 hostile Proxy。

### 兼容性与验证

公开 Run 对这些重复 executable 声明现在返回 `configuration`，diagnostic 为 `{ kind: "invalid-project-definition", path: "definition.checks", reason: "invalid-value" }`，execute 调用数为零；独立 validator 拒绝，独立 normalizer 抛 `TypeError`。这项错误阶段变化已取得明确用户确认，由[长期决策](../decisions/reject-duplicate-executable-checks-before-expansion.md)承接。

测试验证合法共享 container 的每个 warning path、与 executable 同名 container、兄弟/根节点间继承恢复和冻结结果。源码与文档影响经非实施代理复核。未增加合法树的节点或深度上限，未改变合法 Check ID、执行、取消或机器输出契约。循环仍属于配置失败，但不再依赖栈耗尽才返回。

本轮不承诺非法输入仍枚举原全部规划诊断或保留其展开 fingerprint；不将这一许可推广到其它错误分类。若后续改变 authoring reflection、executable prelude、container warning 或 normalization handoff，需重做本报告输入族与相邻公开入口验证。当前实现和持续证据以 owner、源码与测试为准，报告不承担任务进度或发布状态。
