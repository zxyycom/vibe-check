# Design

候选以 typed relation condition、公共因子 cell 和不可变队列质量传播贯穿真实生产切片；B1/B2 净收益不足，设计仅作为可恢复候选保存，不进入 Product。

## Context

稳定实现不变量与职责边界以 [Scheduler owner](../../docs/development/scheduler.md) 为准；以下描述的是本轮候选，不是恢复后 Product 的现行设计。本 Change 的性能比较基线为 c45e549971813d7a01a89c89e75975b0530f1eb4，Product source digest c15611bd51afcdb393155c6a25ecc9d56f2c132d1766322494e9a61d74919629。
两份 261017 Investigation 是只读形成时证据；其中的 ordinary-only 模型不代表生产契约，也不证明本候选的性能收益。

## Goals / Non-Goals

目标是减少共享关系的同义写入且保持 discoverable work、即时聚合与个体差异。非目标：改变策略/API/时间边界、通用条件 DAG、overlay、引入依赖、删除既有 Change 或未知 tmp、修改历史调查。

## Decisions

### Intended Change

- 完整关系按 source slot、dependency/observation 类型和 occurrence 数 canonicalize，重复签名共用条件。
- 对完整签名不同但共享单 typed source 的成员，只提取一个高复用 source 条件；剩余关系仍 exact group。公共部分和 residual 的计数相加仍得到原 Task relation facts。
- precompiled residual×constraint member roots 在 residual ready 时合并进 common×constraint cell。公共 gate 打开只暴露 cell root/mass；已打开 gate 的 residual crossing 直接发布同源 root。两个排序 backing 和全局 static frontier 保留。
- Task status 始终个体化。pending mass 随 Task leave 更新；非 head tombstone 只在 transition 清理，query 只读。forced 在 dependencies 全 settled 且有失败时按 descending slot 立即 drain，不等待 observes。
- collector 消费 cell/group mass 而非重新逐 Task enter；公共 gate 与 residual readiness 分别捕获同一 constraint 分类累计 clock。Task 有效 baseline 是两者各分量的 max，等价于较晚 readiness 事件；leave/admission/terminal 才物化个体 delay。

### Resulting Impacts

- 私有 relation store 与 membership/delta API 变化由所有直接消费者统一迁移；公开 DTO 和 callback 需求不变。
- cancellation canonical effects 保持声明顺序与各自 post-state，collector 的批次净变化不得记录零时长中间入队；delay marks 的共享入口保留同原 clock boundary。
- seed 支持 running、absent test snapshot 与 pre-admission failures；viable 与 raw relation-ready 分开，失败依赖从不进入 viable peaks/delay。
- common cell 数与编译队列增加成本；低复用、H=N、full read 与 retained forks 单独比较。若复杂度或实测成本不能支持采用，按事实收窄或拒绝候选。
- B1 经独立 correctness 审查与最终优化；B2 只有局部验证和双 runtime 语义对照，因小矩阵不足而停止，不再安排 B2 独立产品审查或采用验收。
- root 已恢复本轮 Product、稳定 owner 与 Case 改动；最终文档优化及已通过的完整 Gate 只针对恢复后的保留 tree。[证据入口](evidence/README.md#恢复与生命周期)区分候选可恢复性证明与实际基线恢复。

## Risks / Trade-offs

候选的有限 factoring 启发式不覆盖任意 overlap；不追求通用分解。候选不变量要求 root meld 不重复引入同一 Task、ready gate 单调只打开一次，且多个 blocker 的 category clocks 保持非负单调，max baseline 使用精确 BigInt clock。
实际 total 与 memory 证据表明，本轮编译与保留索引的代价不足以支持采用；这些候选约束不成为恢复后 Product 的新增规则。

## Open Questions

无待定采用问题：root 已确认拒绝 B1/B2 并停止本方向，精确恢复、保留文档复核及恢复后的 dependency/入口、完整 Gate 与安装验收均已完成；不授权 Change finalize/delete。

## B1 Evidence and B2 Bound

完整 [B1 total/memory](evidence/b1/README.md) 不支持采用。独立 allocation 将额外成本定位到重复 signature/atom 编译、
重复发布的 singleton 质量/roots、parent/constraint 双重 prune，以及 common 关闭时无效的 residual delay baseline。
仅进行同一共享模型内的有界 B2：去除这些重复职责，不新增旧 route、配置或 overlay；保持所有公开/逐 effect/精确数值不变量。
先局部正确性和小矩阵作停走判断，不把修正后的候选自动视为采用。

B2 完成局部正确性和双 runtime 214-cohort 对照，小矩阵确实改善 exact multi 的 Core total；
但 N1024 A+Bi、unique 与 deep 仍大幅回退，真实 Run 的 exact 收益弱、A+Bi 回退，最小 retained-memory 对照也没有消除额外成本。
因此停止，不运行 B2 完整矩阵、独立 profile 或完整采用 Gate。[原始输入和结果](evidence/README.md)按 B1/B2 身份分别冻结，不能跨轮绝对数比较。
