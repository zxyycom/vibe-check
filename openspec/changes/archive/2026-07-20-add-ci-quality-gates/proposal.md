## Core Purpose

让启用 gate 的 CI 只有在所需扫描与比较成功完成、且所选 warning 范围不存在未接受问题时才通过，否则以明确退出码阻断。

## Why

Product CLI 当前将可信 scan 的 `passed` 与 `warning` 都映射为 exit `0`，调用者只能查看
warning，不能选择由 `all`、`changed` 或 `regressions` 阻断自动化。

同时，comparison unavailable 会让 `changed` / `regressions` channels 为空。Gate 如果只
检查 channel 是否为空，就会把“没有比较证据”误报成“没有问题”。因此 gate 必须同时证明
measurement evidence 和 warning policy，而不是只增加一个退出码开关。

## What Changes

- `scan` 接受 opt-in `--gate <all|changed|regressions>`；省略 option 时 gate 为
  `disabled`，现有调用继续非阻断。
- `all` 评价 resolved profile 产出的全部 warnings；`changed` / `regressions` 自动请求
  baseline comparison。已知无法满足 comparison 的参数组合在扫描前退出 `3`。
- Quality core 只计算一次 `GateResult`，明确区分 `disabled`、`passed`、`failed` 与
  `not-evaluated`；accepted warnings 保持可见且不阻断。
- CLI 将成功、evaluated gate failure、无法评价/运行失败和 usage error 分别映射为 exit
  `0`、`1`、`2`、`3`。
- `metrics.json` 总是记录 gate result；report 与 console 只在请求 gate 时显示同一结果；
  warning streams 保持现有内容和顺序。
- 新增 `bun run quality:gate` dogfood regression gate；既有 `quality:*` 命令保持观察
  行为。

## Success Criteria

1. 省略 `--gate` 时，现有 exit、artifact 生成、warning streams 和人读输出保持兼容；
   metrics 只增加 `disabled` result。
2. Gate 只有在 policy 所需 evidence 可用时产生 `passed` / `failed`；empty、failed 或
   comparison unavailable 均产生 closed `not-evaluated` reason 和 exit `2`。
3. 每个 policy 只评价其声明的 warning channel；accepted warnings 保持可见且不进入
   blocking set。
4. Core result、metrics、report、console 和 CLI exit 由同一个 `GateResult` 驱动，并由
   formal-entry acceptance matrix 证明。
5. `quality:gate` 真实 dogfood full regression gate，既有 `quality:*` 与 workspace
   invocations 不被隐式改成阻断。

## Capabilities

### Modified Capabilities

- `quality-metrics`：增加 evidence-aware、core-owned gate result 与 policy owner。
- `cli-contract`：增加 `--gate` surface 与可区分 gate/runtime/config 的 exit mapping。
- `output-contract`：从同一 gate data 投影 console、report 与 machine artifacts。
- `product-runtime`：增加 opt-in `quality:gate` dogfood 入口。
- `test-fixtures`：增加各 policy、comparison prerequisite、accepted warning、未评价状态与
  exit code 的入口级证明。

## Impact

- 影响 argument parsing、quality metrics model、core completion、output projection、CLI
  process outcome、dogfood scripts、repository consumers 以及对应 tests/docs。
- 前置 change `make-scan-completeness-observable` 已归档；本 change 直接消费其
  `complete` / `empty` / `failed` contract，并消费现有 comparison status。
- 本 change 完成后，`stabilize-machine-readable-output` 可以基于最终 gate fields 冻结
  stable schema。
- `metrics.json` 增加 additive gate data；repository producers/consumers 在本 change
  内同步，stable field contract 由 `stabilize-machine-readable-output` 冻结。
- Config-file gate default、组合 policy、scanner behavior、threshold、warning generation
  和 acceptance matching 保持现有 owner。
