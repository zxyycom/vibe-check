## Context

Product CLI 当前把可信 scan 的 `passed` 与 `warning` 都映射为 exit `0`。产品已经拥有
normalized warning channels、accepted-warning 标记、scan completeness 与 comparison
status，但没有把它们组合成可供 CI 信任的阻断结果。

关键风险是 `baseline-unavailable` 会抑制 `changed` / `regressions` channels。空 channel
因此可能表示“没有问题”，也可能表示“没有比较证据”。本 design 必须让这两种状态在
core、output 和 exit code 上始终可区分。

## Goals / Non-Goals

**Goals:**

- 提供默认兼容、显式 opt-in 的 CI gate。
- 只有 evidence 满足 policy prerequisite 时才产生 `passed` / `failed`。
- 让 gate policy、evaluation、output projection 与 process mapping 各有单一 owner。
- 让新增同类 policy 通过一个 descriptor 扩展，而不是跨层增加平行分支。

**Non-Goals:**

- Warning generation、threshold、channel membership 与 accepted-warning matching 保持现有
  owner。
- Quality status 继续表达扫描质量，不承载 gate failure。
- Stable JSON schema、config/env precedence、组合 policy 与 severity threshold 由后续
  change 设计。

## Decisions

### Decision 1: `--gate` 表达要执行的 policy，省略表示关闭

`scan` 接受 `--gate <all|changed|regressions>`：

- `all` 选择 resolved profile 的 `warnings.all`。
- `changed` 选择 `warnings.changed`。
- `regressions` 选择 `warnings.regressions`。

省略 option 时 result 为 `disabled`。`all` 不升级 profile；quick profile 跳过的
capabilities 继续由现有 completeness/output 表达。缺失值、重复 option 与 unknown value
在 scanner 和 artifacts 启动前作为 usage error 退出 `3`。

### Decision 2: Comparison policy 自动请求证据

Policy descriptor 记录 `requiresComparison`。`changed` / `regressions` 在 full profile
中自动启用 baseline auto-detection，显式 `--baseline <sha>` 继续选择指定 commit。

Comparison policy 与 quick profile 或显式 `--skip-baseline` 是启动前可确定的无效组合，
因此退出 `3` 且不创建 artifacts。运行时无法取得 baseline 时，baseline owner 保留具体
状态，gate 产生 `not-evaluated: comparison-unavailable` 并退出 `2`。

### Decision 3: `GateResult` 使用 discriminated union

`QualityMetrics.gate` 只允许以下状态：

1. `disabled`：`policy = null`，不包含 evaluated、blocking 或 reason fields。
2. `passed` / `failed`：记录 policy、evaluated channel、evaluated/blocking counts 与按
   channel 顺序排列的 blocking warnings。
3. `not-evaluated`：记录 policy 和 closed `reasonCode`，不包含 evaluated 或 blocking
   fields。

Closed reason codes 为 `scan-incomplete`、`no-eligible-input` 和
`comparison-unavailable`。Actionable detail 来自 capability diagnostics 或
`metrics.baseline.status`；gate model 不复制 free-form diagnostics。

### Decision 4: Policy descriptor 是扩展 owner

Quality core 的单一 descriptor 同时拥有 CLI value、selected channel、
`requiresComparison` 与 help text。`GatePolicy` type、合法 values 和 help 从 descriptor
派生；scan planning 与 evaluator 消费 descriptor；output 只消费 normalized
`GateResult`。

新增同类 channel-selection policy 时，只需扩展 descriptor、对应 acceptance case，以及
确有新语义时的 evaluator 分支。CLI、process mapping 与 output 不按 policy 名称维护
平行 switch。

### Decision 5: Core 按固定优先级评价一次 gate

Evaluation 在 final completeness、comparison status、warning channels 与
`acceptedReason` 确定后、output 之前执行：

1. Omitted request → `disabled`。
2. `failed` completeness → `not-evaluated: scan-incomplete`。
3. `empty` completeness → `not-evaluated: no-eligible-input`。
4. Comparison policy + `baseline-unavailable` →
   `not-evaluated: comparison-unavailable`。
5. 其余情况评价 selected channel；没有 unaccepted warning 为 `passed`，否则为
   `failed`。

`input-unchanged` 是有效 comparison evidence，因此可以评价 empty changed/regressions
channel 并通过。Evaluator 保留 warning identity、ordering 与 accepted records，不修改
quality status。

### Decision 6: Process outcome 与 gate status 分离

| Gate / process condition | Process outcome | Exit |
| --- | --- | --- |
| Gate `disabled` 或 `passed`，且 core/output 成功 | `success` | `0` |
| Gate `failed`，且 artifacts 写出并验证 | `gate-failed` | `1` |
| Gate `not-evaluated`，或 completeness/runtime/output 失败 | `failed` | `2` |
| Input、config 或 CLI usage error | top-level usage mapping | `3` |

Output write/validation failure 优先于已计算的 gate status；未验证的 artifacts 不构成可信
gate-failure evidence。本 change 不增加 exit `4`。

### Decision 7: Output 只投影 core-owned result

`metrics.json` 总是记录完整 `GateResult`。省略 gate 时，report 与 console 保持既有结构，
不显示空 gate section 或“gate passed”。请求 gate 时，report 在 summary area 显示
deterministic gate section，console 显示同一 state-specific result。

Evaluated completion 写 stdout；evaluated gate failure 本身不写 fatal stderr。
`not-evaluated` 与 runtime/completeness/output failure 使用 failure stderr boundary。
`warnings.ndjson`、`warnings-all.ndjson` 及 accepted records 不因 policy 改变。

### Decision 8: `--verification-output` 只控制 preview

`--verification-output` 继续选择人读 warning preview，不选择 policy、不改变 prerequisite，
也不参与 gate evaluation。

### Decision 9: 仓库通过独立命令 dogfood regression gate

新增 `quality:gate`，通过 thin wrapper 对仓库根执行
`--profile full --gate regressions`。它证明真实 comparison prerequisite 与 process
mapping；controlled acceptance cases 证明 blocking warning 的 exit `1`。

既有 `quality:check`、`quality:full-check`、`quality:scan`、workspace verifier 与 CI
invocations 保持省略 gate；required CI adoption 不在本 change 范围内。

## Risks / Trade-offs

- Comparison gate 会增加 baseline 扫描成本；help 明确该 prerequisite，quick/skip
  冲突在启动前失败。
- Shallow history 可能让 comparison unavailable；gate 以 closed reason 和 exit `2`
  失败关闭。
- `GateResult` 在 metrics 中重复 blocking warning records；它复用 normalized records 与
  ordering，serialized identity 由后续 machine-output change 冻结。
- `disabled` result 是 additive metrics change；repository consumers 与 docs 在本
  change 中同步，人读输出保持兼容。

## Migration Plan

1. 保存 omitted-gate compatibility baseline，并盘点 repository consumers。
2. 增加 descriptor、`GateResult`、validation 与 evaluator。
3. 增加 CLI parsing、comparison prerequisite normalization 与 process mapping。
4. 让 metrics、report、console 和 CLI exit 消费同一 result。
5. 新增 `quality:gate`，同步 owner docs、consumers、fixtures 与 case ledger。
6. 运行 formal-entry acceptance matrix 和 required workspace verification。

回滚时同时撤销 gate CLI surface、metrics result、process mapping、`quality:gate` 与相关
consumer 逻辑。
