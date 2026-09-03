# Proposal

建立仅供开发与验证使用的可重复性能对照，以有可审计边界的证据回答历史 Python/Lizard 路径是否可能比当前 TypeScript analyzer 更快；本 Plan 不实施或执行基准。

## Why

`functionMetrics` 已在 `d356dcb495941918c90e3a6606cb635262d50c8b` 完成 hard cut：其 first parent 的生产路径通过 Python/Lizard 1.23 的同步 `lizard <exact files> --csv` 子进程和 CSV parser 生成 metrics，而当前 `5ff3149e689ad0cef789956bfab0de2baa8adf5a` 以产品内 TypeScript Lizard 1.24 port、exact-source read、one-shot Worker 和 adapter 完成分析。两条路径的运行时、版本、I/O、进程边界和资源模型不同；现有 resource spike 与 Project Gate elapsed observation 都不能公平地回答哪条路径在何种范围内更快。

没有同一输入、等价输出检查、cold/warm 定义、wall/CPU/RSS 采集及噪声处理的测量，就不能把语言直觉或历史 observation 当作性能结论。

## Outcome

完成后，仓库拥有一个不进入 Product、package 或默认 Project Gate 的开发/验证专用比较工具与 workload manifest。它会以原始样本、环境和可比性状态，分别报告历史 Product end-to-end、固定 Lizard 1.24 analyzer-only、以及当前 Product 分解三个对照层；结果能够有条件地回答 Python/Lizard 是否在某一明确层和环境中更快，或明确说明该问题尚不可比较。

## Scope

### Intended Change

- 实现一个显式选择的开发/验证 benchmark workflow；它不成为 `src/index.ts` API、package export、Product runtime、默认测试发现或 Project Gate task，也不改变 Gate outcome、advisory timing 或任何 Check 的资源/结果契约。
- 固定并版本化 workload manifest、输入快照和 canonical output normalizer。每个可比较 sample 必须先通过同层的 output-equivalence check；不相等、缺少运行时或测量 capability 时输出可行动的 `not-comparable`/failure evidence，绝不静默过滤或将其计入速度比。
- 在同一受控宿主上采集并保留 raw wall time、CPU（user/system，注明 process 或 process-tree scope）和 peak RSS（注明观测边界与平台单位），另生成 median、p90、min/max、IQR/离群标记、配对 ratio 的 95% bootstrap confidence interval 和 interleaved-sample order。每种 condition 的 cold/warm 定义、未计入 warm-up、样本数、固定顺序/随机种子、runtime/toolchain/host/worktree identity 与噪声事件必须写入结果；5% practical-equivalence band 只用于本次 evidence 分类，不是 Product budget。
- 对比恰好三个层次，而不是生成单一“Python vs TypeScript”数值：
  1. historical Product end-to-end：`d356dcb^` 对 current `HEAD` 的真实产品 invocation；它反映迁移影响，但必须标识 1.23→1.24、public/configuration、decode/I/O 与 subprocess/Worker 边界差异；
  2. fixed Lizard 1.24 analyzer-only：固定源码和 canonical metrics 下的 Python Lizard 1.24 API 与当前 TypeScript private port façade；它隔离 analyzer/runtime，且不把 façade 变成 public API 或一般 backend contract；
  3. current Product decomposition：current exact-path read/decode、Worker startup/transfer、adapter/analysis 以及总测量，用相同 request/result 证明各阶段可加总的边界，定位差距但不伪装成与历史 Product 的等价替代。
- 只在可复原的、隔离的 historical worktree/toolchain 中运行旧 Product；若 historical dependency、platform、command 或 output 无法复原，则记录原因并保留 analyzer-only 或 current-only evidence，同时禁止以代理结果声称 historical Product end-to-end 结论。

### Resulting Impacts

- `scripts/development/**`、其 root workflow documentation 和可能的 validation/package inventory guard 需要共同证明 benchmark 是显式开发入口且没有被 package、Product 或默认 Gate 吸收。
- `src/package-checks/function-metrics/analyzer/**` 的 private boundary需要一个仅由开发 benchmark 启动的、非 package/非生产 harness，或其他经 layout policy 验证的等价方案；生产 consumers 仍只能是 adapter，不能为 scripts/public API 放开 façade import。
- historical Product evidence 需要从 `d356dcb^` 恢复其 Python/Lizard 版本和 `lizard/scanner.ts` + `parser.ts` protocol；其输出须 canonicalize 后再与 current 层比较。历史的 1.23 事实不升级为当前运行时依赖。
- fixed 1.24 analyzer-only 层需要单独锁定 Python Lizard 1.24 provenance，且只使用两个实现共同支持、可固定的输入；它不能由 1.23 end-to-end result、upstream oracle 或 archive observation 代替。
- measurement capability 不是普适事实：process-tree CPU/peak RSS 的实现、单位和不可用条件必须逐平台记录。两个 condition 的 CPU 或 RSS scope 不同、或 parent/child scope 未经验证时，只保留各自诊断值并将对应资源比较标为 `not-comparable`。旧 Change 的 resource spike/maxRSS 是设计输入，不是 comparative baseline、budget 或验收门槛。
- 结果是 developer evidence，不新增 performance SLO、merge blocker、默认 Gate warning/error、worker pool、cache、fallback、subprocess/CSV 或 Python/Lizard Product runtime。

## Success Criteria

- 一个开发者可用文档化命令在已声明环境中复现三层 measurement；每一层都输出 workload、revision/runtime、raw samples、wall/CPU/peak-RSS scope、统计摘要、cold/warm semantics 和 comparability status。
- fixed 1.24 analyzer-only 的每个计时 condition 都在 canonical output equality 后才有统计结果；historical Product end-to-end 的 output/contract mismatch 被保留并阻止该 workload 的 cross-path claim。
- 结果以预注册规则明确区分 `python-faster`、`typescript-faster`、`no-material-stable-difference`、`inconclusive` 与 `not-comparable`：速度方向必须由配对 ratio 的 95% bootstrap confidence interval 完全越过 5% practical-equivalence band 且 p90 同向支持；不对未测语言、输入、版本或产品层作泛化结论。
- Product exports、`functionMetrics` options/outcomes、default Project Gate aggregate/observation、package payload 和 production import policy 经目标验证保持不变；Python/Lizard、subprocess、CSV 和 fallback 不回到 Product runtime。
- 所有 timing 均为 evidence/observation，不作为 Gate blocker；如未来需要预算或 policy，另行以测量证据和授权决定。

## Affected Owners

- `docs/scanner-dependencies.md`、`docs/checks/function-metrics.md`：functionMetrics 的内置 analyzer、private boundary及禁止 Python/Lizard runtime的稳定约束。
- `docs/script-tooling.md`、`scripts/development/**`：开发期 workflow 的唯一入口与不进入默认 Gate 的选择。
- `src/package-checks/function-metrics/measurement.ts`、`analyzer-worker.ts`、`analyzer-adapter.ts`、`analyzer/port-facade.ts`及相邻 tests：当前 Product 分解事实、adapter-only production consumer 与 private port policy。
- `scripts/validation/layout-characterization.ts`、package candidate/inventory owner：开发 benchmark harness 不泄漏到 package 或扩张 import boundary 的验证。
- `scripts/project/gate/runtime/performance-observation.ts`、`performance-baseline.ts`：现有 Gate timing 是可比 workload 的 advisory observation；本 Change 不改变它。
- `changes/archive/replace-lizard-with-typescript-function-analyzers/`：仅作为形成时 resource/maxRSS observation 和 hard-cut history，不能作为 current baseline 或 runtime input。
