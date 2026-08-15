---
title: 使用带递归 composition 的单一 Check shape
status: active
alignment: unaligned
createdAt: 2026-08-15T15:31:09Z
purpose: 让 Project Definition 只用一种可执行 Check 表达 Product 预先提供和项目提供的 Check，并用同形 checks 组合递归选择。
background: 专门 group 与按来源拆分的 authoring model 把来源、结构和运行身份拆成多个模型，导致父节点不能作为普通 Check 执行。
decision: 所有 authoring 节点都是同一种 Check；checks 只表达递归选择和继承上下文，不产生运行顺序、聚合或另一类实体。
relations:
  - type: 替代
    target: configuration/keep-check-groups-authoring-only.md
---

## 目的

- 让项目用一个 closed、可递归的 Check shape 表达所有 tree position，而不再按来源或树位置分出 authoring type。
- 让 Product 预先提供的 Check value 与项目提供的 Check value 只有来源不同，拥有相同的声明、组合、验证、执行和结果语义。

## 背景

- 旧的 group-only 父节点不产生 Normalized Check、Resolved Check、Core Check 或自己的 executable work；这把 containment 错误地等同于非运行组织层。
- Product 预先提供的 Check value 与项目提供的 Check value 都需要进入同一 construction/binding handoff；来源不能选择另一套 binding 解析路径。
- 当前 Product 已把 declarative normalization 和 invocation resolution 分成两个明确阶段；这两个 lifecycle 是内部需要保留的区分，而不是 public authoring variant。

## 决策

- 采用: public authoring 只使用一种 `Check` shape；Product 预先提供的 Check value 与项目提供的 Check value 都通过相同的 trusted private construction/binding handoff 进入 normalization 与 resolution。该 handoff 对所有 Check 一视同仁，Run 不按 Check 来源、`kind`、`checkId` lookup 或 tree position 选择 binding。具体 implementation 和 options 可以不同；direct/TaskPlan 是此共同 handoff 决定的 private execution layout，不是来源 variant。
- 采用: authored、materialized 和 Normalized Check 的 `checks` 要么缺失，要么是非空 closed collection；缺失表示没有子 Check。`checks` 派生输入中的普通 child array `[]`，以及 add/remove 后最终为空的 children，都表示清除 `checks`；materialized 结果必须省略该 field，不能保留空数组。每个出现的节点都表示选择该 Check，拥有全树唯一的稳定 `checkId`，并恰好形成一个 Normalized Check、一个 Resolved Check 和一个 Core Check。
- 采用: 带 `checks` 的 Check 仍执行自身；父、子 Check 独立形成 Core Check outcome 和 QualityRecords。containment 不生成 aggregate outcome、Record 复制、隐式 prerequisite、implicit wait 或 Task order；实际 admission 只受既有显式 `dependsOn`、`mutex` 与 `maxParallel` 约束。
- 采用: `checks` 只表达 recursive selection、有效字段继承的上下文和 Check value composition。`dependsOn`/`mutex` collection 的继承表达式由独立 Configuration 决策拥有，`maxParallel` 的 nearest-explicit 规则和 scope 投影由 scoped-cap 决策拥有；`checks` 自身不向 child 继承。
- 采用: normalization 在任何 work 前验证 closed shape、非空 children、全局 identity、合法显式 references 和 inherited effective values，并保留每项一致的 trusted handoff；它只输出 canonical Normalized Checks。Run pre-work 再经该 handoff 把每个 Normalized Check 解析为 Resolved Check；Normalized/Resolved 是内部 lifecycle phase，不按 Check 来源、tree position 或 tree path 建立另一套 variant。
- 不采用: 仅作 authoring context 或没有执行身份的父节点、按来源或树位置分裂的 public Check variant、由 containment 导出的顺序或聚合，或执行中新增 Check。
