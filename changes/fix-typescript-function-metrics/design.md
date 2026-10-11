# Design

在最小私有 owner 内修复 callback 与操作符路径，分别证明来源偏差和公开正确性；实施出口见 [Tasks](tasks.md)。

## Context

- [行为](../../docs/investigations/verify-typescript-function-metrics-defects.md)、[来源](../../docs/investigations/trace-typescript-metrics-upstream-origin.md)、[新版复查](../../docs/investigations/verify-lizard-latest-typescript-defects.md)保存 11 项对照、根因和回调候选；补丁及公开链验收由 [Tasks](tasks.md)承接。
- [准备度核对](../../docs/investigations/prepare-function-metrics-change-plans.md)读取当前共享状态机、TS/TSX/JS/Vue、pipeline 与 ND/complextags。实施前 shared-state 测试明确断言原始清槽顺序；当前测试按获批偏差更新，原始来源观察独立保留。
- [`??` Decision](../../docs/decisions/align-nullish-coalescing-with-short-circuit-function-metrics.md)确认单 token、每 token CCN +1、完整贡献和既有短路 ND；本 Change 承接该方向的工程路线。实施前为 active + unaligned，现已基于直接行为、owner 与安装证据核对为 aligned；本项最终组合 Gate 仍由 [Tasks](tasks.md)单独验收。

## Goals / Non-Goals

- **目标**：函数边界精确、空白不变的 `??`，并在公开链证明指标/贡献及 Finding 结算。
- **保持**：可选参数、真实三元、内部嵌套、共享 reader/extension、资源/取消及 waiver 身份契约。
- **非目标**：整库升级、AST parser 重写、其他语言操作符重定义、默认阈值调整、新模式/公共配置或上游写入。

## Decisions

### Intended Change

#### 1. Callback 完成顺序

在 `analyzer/shared/code-reader.ts:CodeStateMachine.consume` completed 分支恢复 savedState 后，保存旧 callback、先清空槽、再 `oldCallback?.call(this)`；继续既有 lastToken/toExit 处理。避免清掉回调重入 `consume` 安装的新槽，保持 receiver，不建立 callback stack 或额外状态机框架。

用显式/推断返回类型 × 有/无尾随块四对照，以及正常嵌套证明边界。共享状态机直接断言旧回调一次、receiver 正确、新槽跨下一 token 保留/完成、无 callback 和非重入不变；既有原始来源观察单列保真。

#### 2. `??` 分类与 CCN

不扩 shared tokenizer 全语言符号表。在 `readers/typescript.ts` addition 给 `??` 显式双问号优先匹配，并把可选标识符 `\w+\?` 收窄为 `\w+\?(?!\?)`；核对动态字符串转义与正则优先级。`readers/tsx.ts` 直接调用 CodeReader、不经 TS generateTokens，必须同步 `??` addition。TypeScript logicalOperators 加 `??`，conditionCounter/complextags 沿已有集合取得 CCN 和真实 line，不另建重复计数器。

JavaScriptReader 和 VueReader 继承 TypeScript tokenizer/condition 集合，TSXReader 同时服务 `.tsx`/`.jsx`；这些是同一修正的必要影响面，分别验收正常 `??`/空白不变性及原有语法。Kotlin 已自有 `??` token，其他 reader 不变。

#### 3. ND 复用实际路径

在 `extensions/lizardnd.ts` 的现有 `&&`/`||` 分支增加“token 为 `??` 且 reader.logicalOperators 包含它”的局部条件；不全局将 `??` 加 DEFAULT_LOOPS。condition tracking、condition 内首个运算符、condition 外逐次处理、hidden bracket、括号深度、semicolon 和函数切换均沿既有状态。

验收矩阵用独立期望和同形 `&&`/`||` 控制项：return condition 外单项/链、括号内单项/链、if condition、混合 `??` 与 `&&`/`||`、nested parentheses、分号后再次表达式、嵌套控制块及下一函数 reset；每项同时断言 CCN、完整 contributors 和 ND。合法 JS 混合语法使用括号。固定具体期望按状态路径推导，不用单一链概括所有 ND。

### Resulting Impacts

1. **基线/来源。** 默认继承已验收固定 `1.24.1` 来源的稳定提交；以[来源 owner](../../docs/development/scanner-dependencies.md)及[实施调查](../../docs/investigations/verify-lizard-1-24-1-implementation.md)核对基线与局部偏差。维护 code-reader/TS/TSX/ND 偏差说明、source identity/header、原始 oracle 与修正期望，再通过来源公共入口派生 pin；不把上游 hash 改为本地补丁 hash。
2. **测试/共享生命周期。** 四边界、七操作符原始样例作输入线索；增加上文状态矩阵及不同简单/对象/泛型返回类型、typed arrow/TSX 的直接影响探针。合法形态仍失败且根因超出本修正时明确记录，不扩成返回类型支持重写。共享回调修改必须覆盖 27-reader oracle、normal nesting、malformed 和 extension lifecycle；按测试 owner 管理 Case，不为样例行单独建 Case。
3. **公开解释/结算。** adapter→真实 Worker→公开 Check 对照私有结果；诊断 profile 验证逐项字段，默认 profile 验证真实影响。四项 `??` 的旧 ND 8 blocking Finding 应消失或随已确认状态路径重算，不能预设短路 ND 总为零；完整 Record 不受 human message 八项展示上限截断。保持 waiver identity、rejection/取消和完整批次失败。
4. **owner/包。** 实现并验证后同步指南的 `??`、condition 内外 ND 精确解释、内部 source-fidelity 偏差和 changelog；核对 Decision 完整方向才 mark-aligned，不在准备阶段勾 aligned。exact artifact、installed Node consumer 的 Worker/指标/贡献及完整 Gate 是独立出口。

## Risks / Trade-offs

- shared callback 改动会推翻现有 source-order 断言；保留 raw oracle 与修正直接期望，不能通过删除证据掩盖差异。
- TSX/JS/Vue 继承和 ND 的语言 gating 必须直接验证，避免 Kotlin/其他语言取得未授权新计量。
- ND 数值依赖实际状态；公共指南须在实施验证后明确 condition 内外边界，并与 Decision 的对齐状态一致。
- 后续修复共享 analyzer、来源、Case 和包 owner，串行实施、独立验收/提交；固定来源交付不改变修复必要性或本计划的实施授权。

## Open Questions

无。实现及验证按 [Tasks](tasks.md)推进；若发现必须改变其它语言策略、支持面或公开配置，先停止扩大范围并取得决定。
