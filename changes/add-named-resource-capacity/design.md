# Design

本设计把resource capacity限定为静态、命名、整数化的admission约束，并先证明消费者，避免发展成通用资源调度语言。

## Context

- `mutex` 是Check声明的string collection；任一同名mutex正在运行时，另一个claim同名mutex的Task不能admit，等价于capacity 1的binary exclusion。
- `maxParallel`约束Product总并发，并可由Check scope在运行期收紧；它不表示named pool或per-Task weight。
- `admissionPriority`只在现有eligible层级中排序，不能绕过dependency、mutex、scope capacity或已建立reservation。
- Scheduler为收紧`maxParallel`的Task维护单一reservation以保证合法进展；新增resource wait若独立维护抢占状态，可能产生饥饿或多reservation冲突。
- 当前没有Product-level named capacity consumer；本仓Gate的非零priority、mutex和capacity都要求重复对照证据。

本 Draft 使用以下固定术语，避免把配置值误解为实际系统监控数据：

| Term | Meaning |
| --- | --- |
| capacity | caller为一个named resource声明的静态可用单位总数 |
| claim | 一个Check在整个Task运行期原子占用的静态单位数 |
| available units | capacity减去当前running Tasks已占用claims的Scheduler内部计数 |
| weight | claim数值的通俗称呼，不表示自动测量的CPU或memory消耗 |

## Goals / Non-Goals

**Goals**

- 证明至少一个capacity大于一或claim weight不同的真实场景不能由现有primitive清楚表达。
- 定义静态resource capacity、Check claim、原子admission、release和configuration validation。
- 保持deterministic selection、有限进展、取消drain与diagnostic可解释性。
- 让默认未声明resource的Definition与当前trace保持兼容。

**Non-Goals**

- 不采集或预测实时CPU、memory、load average或历史duration，不自动调整weight。
- 不提供fraction、负数、动态claim、preemption、priority inheritance、distributed lock或OS resource enforcement。
- 不把resource capacity用于表达dependency status、observer、fail-fast、rate limit或业务quota。
- 不预先支持无限named pools、层级资源、borrow、burst、deadline或用户自定义调度函数。

## Decisions

### Intended Change

以下方向在Plan前仍需由consumer基线和Scheduler proof确认：

1. Definition scheduler拥有一个closed named-capacity mapping；每个capacity是positive safe integer。Check可声明closed claim mapping，每个claim也是positive safe integer且不得超过对应capacity。
2. Task只有在root/scope `maxParallel`、dependency/observation、mutex及全部named claims同时满足时才eligible；admission原子扣减全部claim，settlement一次释放。
3. 不进行逐资源部分获取，因此多个resource claim不会因持有部分资源等待另一资源而形成经典deadlock。
4. `mutex`在首版继续作为独立、易读的capacity-1 primitive，不自动改写为hidden resource entry；是否最终统一representation留待迁移和复杂度证据。
5. priority只在capacity-eligible Task间排序。resource shortage下是否建立reservation、如何与现有tightening reservation共存、如何避免大weight Task永久饥饿，必须在Plan前用纯decision tests闭合。
6. diagnostics记录normalized capacities、Task claims、当前available units与resource wait原因，但这些调度facts不进入Check/Record或machine schema。

### Resulting Impacts

- Project Definition grammar、normalization、fingerprint、Check inheritance/public declarations与Task graph metadata可能增加resource字段。
- Scheduler readiness、reservation、blocker summary、diagnostic rendering、cancellation和settlement release需要共同修改；算法仍应保持单一pending集合和确定性。
- 本仓Gate只有在同workload对照证明elapsed或peak resource改善后才配置非默认capacity/claim；否则产品能力由isolated fixtures验收而项目Definition不使用。
- 文档需要明确capacity是caller policy而非实际资源探测，并说明它与mutex、`maxParallel`和priority的选择顺序。

## Risks / Trade-offs

- 多named resources与不同weight会显著扩大admission状态空间；不受限地加入fairness策略会比能力本身更复杂。
- 静态weight可能随硬件和workload变化而失真，错误配置既可能闲置容量，也可能无法保护真实瓶颈。
- 为大weight Task保留capacity可能延迟许多小Task；不保留则可能使大Task饥饿。现有单一reservation不能未经证明直接复用于多资源。
- 若mutex和capacity长期并存，作者需要理解两个相邻primitive；过早统一又会使最常见的互斥配置变得冗长。

## Open Questions

- 首个真实consumer是什么，其capacity、claim weight、elapsed和peak resource基线如何复现？
- 首版只允许每个Check claim一个named resource，还是允许多个原子claim；哪个是最小真实公分母？
- resource definitions属于`ProjectDefinition.scheduler`，claims属于Check字段，还是应采用其它更闭合的owner？
- 大weight Task使用何种有限进展规则，且如何与当前tightening-scope reservation和admission priority组合？
- `mutex`保持独立public字段，还是在证明无语义损失后成为capacity-1 authoring shorthand？
