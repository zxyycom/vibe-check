# Design

本 Draft 先回答“规则是否增加独立证明价值、在哪些 scope 生效、现有诊断代表什么”，再据此形成配置与代码实施计划。

## Context

当前 `tsconfig.product.json` 与 `tsconfig.json` 继承共享配置并启用 `strict`；Product、scripts 和 package external-consumer acceptance 使用不同的 typecheck scope。调查报告 [`diagnose-deep-readonly-option-type-erasure.md`](../../docs/investigations/diagnose-deep-readonly-option-type-erasure.md) 提供本审计的触发证据：

- `noUncheckedIndexedAccess` 能暴露 widened array 的不安全索引读取，但 tuple erasure 仍需类型契约证据直接证明。
- `unknown -> never` 会放行不安全赋值，只能由类型契约的负向证据捕获。
- 临时对现有完整 scope 开启 `noUncheckedIndexedAccess` 时，product 得到 73 条诊断、涉及 29 个文件；scripts 得到 125 条诊断、涉及 40 个文件，且 scripts scope 包含其传递导入的部分 `src/**`。这些计数尚未去重或分类，不能等同于 Bug 数量。

`DeepReadonly` 作为局部公共类型修复直接处理；本 Change 只承接持续影响 typecheck、Gate、贡献者工作流和 package consumer compatibility 的规则策略。

## Goals / Non-Goals

### Goals

- 建立 product、scripts/tests 与 external consumer 三类类型检查的配置、责任和差异矩阵。
- 审计 `strict` 未包含或项目尚未决定的高价值规则，优先覆盖 indexed access、optional property、index signature、override、return 和 switch control-flow 风险。
- 对候选规则的诊断按 owner 和原因分类，区分真实缺陷、类型建模缺口、已证明的运行时不变量、test-only ergonomics、lint 重叠与不值得承担的迁移成本。
- 决定公共 package declarations 需要通过哪些独立 consumer compiler profiles，避免只用仓库自身设置验证库类型。
- 形成按 owner 分阶段实施和验证的计划，并为 assertion、suppression 与过渡机制规定证据和退出条件。

### Non-Goals

- Draft 只形成审计方案，不修改 tsconfig、typecheck runner、Gate、产品代码或测试正文。
- 诊断计数不代表运行时 Bug 数量；每条诊断必须经过分类。
- 独立产品缺陷由其行为 owner 局部处理，不并入规则配置实施。
- consumer compatibility 只覆盖实际运行过的 compiler profiles。
- TypeScript 检查不替代 runtime boundary validation、lint、测试或 installed package acceptance。

## Decisions

### Intended Change

以下为 Draft 的审计方向，待诊断分类和成本证据完成后再冻结为 Plan：

1. 建立 typecheck matrix，分别记录 product、scripts/tests、declaration emit 和 installed consumer 的 config、compiler、输入集合与 Gate 入口。
2. 选择一组会改变缺失值、optional、索引、继承和 control-flow 可信度且未被现有 lint 等价覆盖的 compiler rules；至少独立评估 `noUncheckedIndexedAccess` 与 `exactOptionalPropertyTypes`，其它规则按实际代码形态和工具重叠决定。
3. 对每项候选规则分别生成诊断清单，按唯一位置去重，并以 owner 和原因分类代表样本与总量；启用决策基于独立证明价值、修复方式和迁移成本，而非错误总数。
4. 区分仓库源码规则与 package consumer compatibility。公共 declaration 可使用专用严格 consumer fixture 建立保证，而不要求仓库所有内部实现同步采用完全相同的 rule set。
5. 根据分类结果选择一次启用、按 scope 分阶段启用、先修阻断项再启用，或有依据地不采用。暂时过渡需有 owner、退出条件和阻止新增违规的机制。
6. 审计结论稳定后派生 `tasks.md` 并进入 Plan；独立产品 Bug、测试建模和工具配置分别交给其 owner。

### Resulting Impacts

- 审计结论可能要求修改共享/分区 tsconfig、`scripts/development/typecheck.ts`、Project Gate typecheck binding、workspace tooling 文档与相关测试 Case。
- 若新增 installed-consumer profiles，package lifecycle、candidate input fingerprint 和 complete Gate 验收成本可能增加，需要测量并限定重复 compiler work。
- 规则启用可能暴露真实边界缺陷，也可能要求用 tuple、判别联合、显式 guard 或局部 assertion 表达既有不变量；相应代码变化由行为 owner 验证。
- 分阶段策略需阻止新代码增加目标诊断，并为现有例外保留明确 owner 与退出条件。
- 公共 `DeepReadonly` 修复不依赖本 Change；其 installed-consumer 验收可作为严格 consumer profile 的首个输入样本。

## Risks / Trade-offs

- 全量诊断跨越多个 owner，若不先分类就实施，容易把真实 Bug、测试便捷写法和编译器无法推导的不变量混在一次大范围重构中。
- 只在 external consumer 开启严格规则可保护公共声明，却不会改善内部 source；只在 source 开启又可能漏掉 emitted declaration 与消费者配置组合。
- 无证据的 `!`、cast 或 suppression 会降低可信度；拒绝所有迁移则继续保留已确认的漏检窗口。
- 多 profile 会增加 typecheck 与 Gate 时间；是否值得必须结合失败归因和实际执行成本，而不是追求规则数量。

## Open Questions

1. Product、scripts/tests 与 installed consumer 是否采用同一 rule set，还是以共享最低线加分区增强规则组织？
2. 除 `noUncheckedIndexedAccess` 与 `exactOptionalPropertyTypes` 外，哪些 compiler rules 提供了现有 Oxlint/type tests 没有的独立证明价值？
3. 现有诊断中各类原因、owner 和真实缺陷比例是多少；哪些必须在启用前修复，哪些适合独立后续 Change？
4. 若不能一次闭合，项目是否接受按 scope 分阶段启用；过渡机制如何阻止新增违规而不建立永久 suppression baseline？
5. 严格 external-consumer profile 是内部 release evidence，还是需要形成公开的 TypeScript compiler compatibility 承诺？
6. 增加 profile 后的 routine/complete Gate 成本是多少，能否复用同一次 declaration emit 和 candidate installation？
