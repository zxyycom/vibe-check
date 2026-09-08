# Design

先使用平台形成基线和反例，再设计小范围候选；以明确的比较与停止流程交付算法结论。

## Context

- 当前 [learned helper](../../src/learned-critical-path/strategy.ts)按 critical-path/layer ordering 选首项，受阻时 `wait`；这提供基线，不预先证明存在必须修改的缺陷。
- [Scheduler](../../docs/development/scheduler.md)拥有 admission、资源、cancellation 与 settlement；公开 AdmissionState 的 `select/settle` 只证明假设转换，不执行 Check 或预测时间。
- [虚拟评估 Decision](../../docs/decisions/evaluate-admission-heuristics-with-seeded-virtual-workloads.md)是 active / unaligned 的方向输入，不表示当前实现已对齐。[Gate 调查](../../docs/investigations/calibrate-gate-duration-variation.md)提供波动线索，不提供最终算法或真实竞争系数。
- 资源配置按静态工作特征完成；平台基础实现独立推进。算法实验继承二者的稳定输入，不能把尚未形成的平台结果写成候选依据。

## Goals / Non-Goals

主指标为 makespan；在主指标不更差时尽可能减少 slot·time 和每种资源的 unit·time，不跨资源相加。保持 legality、确定性、有限进展和低决策开销。

不预定最终算法，不追求所有 workload 更快，不增加用户关键任务、公共选项或预测模型，不扩展为深层搜索研究。平台和资源配置完成属于实验依赖，不是要求用户重新作产品决策。

## Decisions

### Intended Change

1. **先取得可消费输入。** 继承平台与 Gate 映射的稳定提交，固定场景/version、seed/重复、profile、预测及 history 输入。基线和候选共享外生条件，分别隔离历史写入；不继承旧比较计划的 private baseline 或采用结论。
2. **基线先于候选。** 使用当前 helper 跑场景，按 transition trace 解释等待、竞争或层序产生的具体反例。若无值得修正的问题，可直接保留现状。不能仅因占用率低就认定 makespan 可以改善。
3. **比较前固定协议。** 在 Implementation 1.2 中，以平台的确定性与波动边界固定逐场景的回归容忍度、seed/重复、宿主成本采样和接受上限，保存为版本化评估输入后再设计候选。确定性正确性场景不容忍行为错误；性能场景分别约定主指标与尾部退化口径，不用总平均掩盖差项。平台工程参数和接受上限由实施者在已确认目标内给出，不等待用户选择公式；不得看过候选结果后放宽门槛。
4. **反例驱动有限探索。** 最多两轮，每轮至多两个独立候选；优先尝试能解释反例的简单局部规则，回填和层序仅是可能方向。每个候选实现前写明选择顺序、并列规则、公开输入、复杂度、推演上限及合法退化；未使用推演时明确为零，不默认引入搜索器。后续轮次新增反例须保留既有场景并重跑基线，不删除不利样本。
5. **合法性与信息边界。** 选择和可选浅层推演使用公开 AdmissionState；Scheduler 仍重检真实 proposal。策略不能读取模拟真实剩余工作量或随机未来。缺少预测或达到预算时采用已核对的基线合法流程；只在有 running work 可推进时等待，否则选择合法任务或由既有错误路径报告无进展，不伪造状态转换。
6. **采用或停止。** 对固定协议逐场景比较 makespan；主指标不更差时再比较资源累计占用，不将不同资源加权成新主目标。通过正确性、性能和真实成本要求且收益有解释时采用；否则保留现状并交付理由。探索轮次用尽不自动扩深搜索；不以真实 Gate 加速百分比作为必要条件。

### Resulting Impacts

- 平台拥有场景模型、模拟指标、trace 和少量 shared-closure integration；算法只消费它们，不修改事实模型来帮助某个候选胜出。实际取消/drain 由真实集成证明，不扩张虚拟二元结算协议。
- 决策成本使用宿主单调时钟单独采样，在相同图、预热及运行环境下对照，记录原始样本、汇总和既定预算。虚拟 makespan 不证明 CPU 成本。
- 新增或修改测试前后运行 `bun run test-evidence -- check --root .`，执行 `bun test src/learned-critical-path/strategy.test.ts` 和平台目标测试；完成 `bun run package:candidate:integration`、少量正式 Gate 接线验证及 `bun run check -- --all`。
- 采用后分别反查 learned 用户指南、调度指南、内部 helper owner、JSDoc 和 release upgrade impact；不采用时明确无产品行为变更。非实施代理基于实际 diff 审查两类文档影响。
- 将采用或不采用结论、比较证据和稳定提交交接给发布；不采用同样可解除算法前置，不等于授权发布。

## Risks / Trade-offs

模型不代表真实剩余时间，更多回填可能延长 makespan。小范围探索可能找不到有价值的改动，因此保留基线是有效出口。固定比较协议限制事后挑样本；候选规则在平台产生反例后确定，避免以准备审计代替实际问题发现。

## Open Questions

无阻止按依赖推进的未决范围或用户选择。具体反例、候选、计算上限和采用结果是 Implementation 的产物；评估协议在候选比较前冻结，而不是在平台可用前预定最终算法。
