本 design 起草 opt-in quality gate 的 product-owned policy 与结果模型；当前 change 仅在 `openspec/changes/add-configurable-quality-gates/` 下形成待审计临时计划，不影响现有其它文档或主规范。

## Context

当前 Product CLI 将 `passed` 与 `warning` 都映射为退出码 `0`，`--verification-output` 只选择 console 中展示哪组 warning。产品已经生成 `all`、`changed` 与 `regressions` 三个 normalized warning channels，也会用 `acceptedReason` 标记已接受 warning，但没有公开 contract 让调用者选择哪个 channel 可以阻断自动化。

本 change 依赖 `make-scan-completeness-observable` 先建立可信 measurement 边界。Gate 只在 current measurement 为 `complete` 或 `empty` 后执行；缺失 scanner 或失败 measurement 仍属于 runtime/completeness failure，而不是质量门禁失败。

## Goals / Non-Goals

**Goals:**

- 提供默认不改变现有行为的显式 gate policy。
- 从既有 normalized warning channels 计算可审计、可复用的 gate result。
- 让 gate failure、runtime/completeness failure 与 input/config error 具有不同退出码。
- 让 console、report 与 machine artifact 投影同一 gate result。

**Non-Goals:**

- 不改变 warning generation、threshold、channel membership 或 accepted-warning matching。
- 不把 gate failure 改写成第四种 quality status。
- 不在本 change 稳定 JSON schema；该工作由后续 `stabilize-machine-readable-output` 完成。
- 不让 `--verification-output` 隐式选择 gate policy。

## Decisions

### Decision 1: `--gate` 使用封闭 policy，默认 `never`

`scan` 新增 `--gate <never|all|changed|regressions>`。省略时使用 `never`，从而保留当前 warning 不阻断的行为。各 policy 映射如下：

- `never`：不选择 warning channel，blocking set 永远为空。
- `all`：选择 `warnings.all`。
- `changed`：选择 `warnings.changed`。
- `regressions`：选择 `warnings.regressions`。

无效 policy 在启动 scanner 前作为 input/config error 处理。第一版不增加 config-file default、环境变量或多 policy 组合，避免同一运行存在多个 precedence 来源。

### Decision 2: Gate result 与 quality status 分离

Core 在 completeness 成功并生成 normalized warning channels 后计算 `GateResult`。该 record 包含 `policy`、`evaluatedChannel`、`status`、`evaluatedWarningCount`、`blockingWarningCount`、`blockingWarnings` 与 optional `reason`：

- 非空 `acceptedReason` 的 warning 仍留在原 channel，但从 blocking set 排除。
- `never` 与没有 blocking warning 的其它 policy 得到 `passed`。
- 存在 blocking warning 时得到 `failed`。
- Completeness 失败时得到 `not-evaluated`，并记录 normalized reason。

Quality status 继续表达 measurement 后是否有 warning：`passed`、`warning` 或 `failed`。例如一个 complete scan 可以同时是 quality `warning` 与 gate `failed`；Output 和 CLI 不把两者压成含义模糊的单字段。

### Decision 3: Exit code 先按 failure class，再按 gate result

CLI 使用以下固定优先级：

1. input/config error 退出 `3`；
2. runtime、output validation 或 completeness failure 退出 `2`，gate 为 `not-evaluated`；
3. successful measurement 的 gate `failed` 退出 `1`；
4. successful measurement 且 gate `passed` 退出 `0`。

Gate failure 只有在正常 artifacts 已写出并验证后才能成为最终退出 `1`。本 change 不增加 output-failure exit `4`。

### Decision 4: Gate 只计算一次，Output 只做投影

Gate evaluator 位于 quality core，消费同一份 `WarningChannels` 并产出一次 `GateResult`。`metrics.json` 记录完整 result，Markdown report 记录 policy、channel、counts 与 blocking warnings，console completion 记录 policy 和 pass/fail。Output、CLI 与 automation MUST NOT 各自重新过滤 warning。

### Decision 5: `--verification-output` 继续只控制显示

`--verification-output` 保留当前“优先展示 regression warning”的人读用途。Gate evaluator 不读取该 flag；例如 `--verification-output --gate changed` 仍按 `changed` channel 阻断，只改变 console preview。

## Risks / Trade-offs

- [显式 gate 会让既有 automation 出现新的 exit `1`] → 默认保持 `never`，help、owner docs 与迁移示例明确 opt-in 行为。
- [accepted warning 仍可能被误认为已消失] → 所有 output 继续展示 accepted record，并分别报告 evaluated 与 blocking counts。
- [多个 status 容易被 consumer 混淆] → 使用独立 quality、completeness 与 gate records，并通过入口级矩阵固定组合语义。
- [后续可能需要 config default] → 第一版只建立 CLI source；真实使用数据证明需求后再单独设计 precedence。

## Migration Plan

1. 先完成并归档 `make-scan-completeness-observable`，重放 complete、empty 与 failed measurements。
2. 增加 `GatePolicy` / `GateResult` model、evaluator 与 invariant validation。
3. 增加 `--gate` parser/help，并保持 omitted policy 为 `never`。
4. 让 report、metrics、console 与 CLI exit 消费同一 gate result。
5. 更新 dogfood/CI consumer 以识别 exit `1` 与 gate data，但不替现有 invocation 静默选择非 `never` policy；具体阻断由调用者显式 opt in。
6. 更新 owner docs、fixtures 与入口级 acceptance matrix。

回滚时同时撤销 opt-in consumer 参数和 producer gate surface；不得让 consumer 保留 `--gate` 而回退到不认识该参数的 CLI。

## Open Questions

无。第一版 policy、precedence、accepted-warning 和 exit semantics 均在本 design 中固定。
