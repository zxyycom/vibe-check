# Design

以 typed relation condition、公共因子 cell 和不可变队列质量传播兑现共享状态，而非把 fanout 推迟到 query 或 collector。

## Context

当前事实与边界以 [Scheduler owner](../../docs/development/scheduler.md) 为准。基线 c45e549971813d7a01a89c89e75975b0530f1eb4，Product source digest c15611bd51afcdb393155c6a25ecc9d56f2c132d1766322494e9a61d74919629。两份 261017 Investigation 是只读形成时证据；生产并非其中的 ordinary-only 模型。

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
- 稳定 owner 更新只表达已实际实现事实；最终独立 correctness 审查、优化子代理与完整 Gate 由 root 编排。

## Risks / Trade-offs

有限 factoring 的提取启发式可能无法覆盖任意 overlap；不追求通用分解。root meld 不能重复引入同一 Task，ready gate 单调只打开一次。多个 blocker 的 category clocks 保持非负单调，max baseline 必须在精确 BigInt clock 上进行。编译与保留索引可能抵消小图收益，需真实 total 与 memory 证据。

## Open Questions

暂无需用户决定的公开语义或授权问题；采用仍待最终同条件证据。
