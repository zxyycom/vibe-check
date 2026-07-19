## Context

当前 runtime 在 scan scope 构造前检查 measurement components，并把 unavailable component 记录为 skip。Current scan 随后使用初始化为空的 metric arrays 继续 aggregation；因此 profile skip、没有可执行输入、successful zero findings、component unavailable 和 execution failure 可能共享相似的 zero output。最终 `passed` / `warning` 仍主要由 warning 数量决定。

本 change 为 current measurement 增加 product-owned completeness model。稳定 contract 只描述用户能够观察并据此判断结果可信度的语义；scanner backend、cache、exact work unit 和 process sequencing 仍由实现 owner 管理。

## Goals / Non-Goals

**Goals:**

- 在 normalized scope 之后判断每项 current capability 是 skipped、没有输入、成功还是失败。
- 缺失 required measurement 时 fail closed，并提供可行动诊断。
- 将 legitimate empty scan 表达为正常退出的 `warning`，而不是质量通过。
- 让 aggregation、console、report、machine artifact 和 CLI exit 消费同一 completeness source。
- 让新增 capability 复用同一 result type、归约和 output mapping。

**Non-Goals:**

- 不改变 scanner 算法、warning threshold 或 supported language。
- Eligibility work unit、cache behavior、backend metadata 与 invocation strategy 继续由 scanner implementation owner 管理。
- 不在本 change 冻结公共 JSON schema version、字段兼容性或 examples；该工作由 `stabilize-machine-readable-output` 完成。
- 不增加 quality gate；gate policy 与 exit `1` 由 `add-configurable-quality-gates` 完成。
- 不改变 baseline comparison behavior；comparison completeness 与 failure policy 由独立 change 承接。

## Decisions

### Decision 1: 每项 capability 只产生一个最小 final result

Current orchestrator 在 normalized scope 和 capability-specific eligibility 判断完成后，为稳定 IDs `file-metrics`、`function-metrics` 与 `duplicate-detection` 各产生一个 final result：

1. `skipped`：当前 profile 未请求该 capability；不解析或启动 component。
2. `no-input`：profile 已请求，但没有 eligible input；不解析或启动 component。
3. `succeeded`：全部 eligible work 完成并得到有效 normalized result；zero findings 仍属于成功。
4. `failed`：required work 未完整完成。

Failed result 必须包含 normalized diagnostic：

- `kind` 使用 `unavailable`、`execution` 或 `invalid-result`。
- `message` 说明失败原因。
- `action` 给出下一步恢复方式。

Final result contract 只要求 capability ID、status 和 failed diagnostic。Component 和 phase 等实现信息可以作为额外诊断，但不参与 capability identity、状态归约或兼容性承诺。

### Decision 2: Overall completeness 使用简单归约

Core 只从 final capability results 计算 current overall completeness：

1. 任一 capability 为 `failed`，overall 为 `failed`。
2. 没有 failure 且至少一项 capability 为 `succeeded`，overall 为 `complete`。
3. 没有 capability 成功或失败，overall 为 `empty`。

`skipped` 不降低 completeness；mixed `succeeded` + `no-input` 属于 `complete`。该归约不需要 capability-specific 分支。

### Decision 3: Completeness 先于质量结论和进程状态

- `complete`：core 根据 normalized quality warnings 返回 `passed` 或 `warning`。
- `empty`：core 固定返回 `warning`，CLI 退出 `0`；human conclusion 说明没有 eligible input、质量未评价，不输出绿色通过。
- `failed`：core 返回 `failed`，CLI 退出 `2`；其它 capability 的成功数据不能形成可信质量结论。

Empty warning 是 scan conclusion，不伪造 quality finding，也不写入 normalized quality warning channels。Failed capability 的缺失或部分数据不得作为 measured zero 参与可信质量评价；其 raw material 和缓存处理仍由 scanner implementation owner 决定。

### Decision 4: Output 只投影 core-owned results

Core-owned model 是 capability results 与 overall completeness 的唯一来源。`metrics.json`、`report.md`、console summary/completion 和 CLI 不得各自重算 status 或 overall。

Machine artifact 必须提供 overall completeness、每项 capability 的 ID/status，以及 failed result 的 normalized diagnostic。Human output 必须区分 profile skip、no input、successful zero findings 与 failure，并为 empty/failed 使用非绿色结论。JSON schema identity、最终 nesting、兼容性和 examples 由 `stabilize-machine-readable-output` 决定。

无法归属到 capability 的 serialization、artifact write 或其它 runtime failure 继续使用现有 top-level failure mapping。

### Decision 5: 保留显式 orchestrator，只共享结果语义

Current measurement 保留现有显式 orchestrator。各 adapter 或其薄 wrapper 返回相同 `CapabilityResult`，共享层只拥有 result type、overall reducer 和 output projection。

新增 capability 时，开发者只需增加稳定 ID、eligibility/run mapping、domain metrics 与对应测试；overall reducer、quality outcome 和通用 output mapping 不增加 capability-specific 分支。

## Risks / Trade-offs

- [缺少 required component 会从成功变为失败] → 这是有意的 correctness change；failed result 提供 failure kind、原因和恢复动作。
- [Empty 返回 warning，但没有 quality finding] → output 同时表达 `overall: empty` 与“质量未评价”，consumer 不通过 warning-record 数量推断 completeness。
- [失败 snapshot 可能包含诊断数据] → overall 与 human conclusion 始终 failed；consumer 只能在 `complete` 时把 metrics 当作可信质量评价。
- [先收集 scope 再检查 component 会改变进度顺序] → 更新 CLI/output owner 和入口测试，不把旧 banner 顺序当作更高优先级 contract。
- [Machine shape 尚未稳定] → 本 change 只固定 source semantics 和 required information，schema change 再固定字段名称、nesting 与兼容策略。

## Migration Plan

1. 保存当前 unavailable component 得到成功结果的 failing regression evidence。
2. 引入 minimal capability result、failure diagnostic 与 overall reducer。
3. 将 eligibility 判断放在 component resolution 前，并让 current adapters 产出 final results。
4. 让 aggregation、quality outcome、output 和 CLI 原子切换到同一 completeness。
5. 更新 owner docs、tests 和 case ledger，重放 skipped、no-input、zero findings、failed 与 complete scenarios。

回滚必须同时撤销 producer model、output projection 和 CLI status mapping；不得保留只写新 completeness、但仍按旧逻辑返回绿色成功的混合版本。
