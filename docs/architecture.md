# 架构

本文是 Vibe Check 产品运行时的组件职责与运行边界 owner。正式入口是
`bun run product:cli -- scan [project-root]` 和 `bun run product:cli -- init [project-root]`；产品
运行时只位于 `src/product/**`。

## 核心定位

一次 `scan` 在 work 前选择配置、冻结 Check catalog、private bindings、selected policy 与可选的
named baseline reference。三个内置 Check（`file-metrics`、`function-metrics`、
`duplicate-detection`）只经其 private adapter 产生 Check run、record 和 reference facts。Core 的
最终事实是 `FinalCoreSnapshot`：definitions、runs、records、integrity 与由 run/coverage 得出的
snapshot completeness。它不把 scanner payload、runner、cache 或路径位置提升为公共事实。

`DecisionPolicy` 在 final snapshot 和 named reference facts 上产生 decision evidence 与
`GateResult`。Output 的 validated publication model 在构造时核对并冻结 human status projection；
machine set、`report.md`、console 与 process outcome 只消费该 model。质量状态与 process outcome 是
不同投影。

## 当前实现状态

`src/product/**` 拥有 CLI、semantic config、scope collection、scanner adapters、Check/Record Core 和
publication。`scripts/**` 只拥有开发自动化及已验证 artifact 的 consumer；`quality:*` 和
`scripts/quality/scan.ts` 显式传入仓库根并单向调用产品入口。产品不反向导入 scripts 或 toolkit。

## 调用链

```text
CLI -> config selection -> dependency snapshot -> normalized exact inputs
    -> frozen catalog / bindings / policy / references
    -> private scanner adapters -> final Core snapshot + decision evidence
    -> validated publication model
    -> run.json + records.ndjson + report.md + console
    -> success | gate-failed | failed
```

`init` 只进入 Configuration initializer，不进入 scan、dependency 或 publication 链。

## 输出分层

| 输出 | 用途 | Owner |
| --- | --- | --- |
| `run.json` + `records.ndjson` | 唯一 canonical machine set | Output runtime schemas / validator |
| `report.md` 与 console | 同源的人读投影 | Output / CLI |
| `raw/**` | scanner-private 复现材料；不属于 machine set | scanner adapter / Output |
| CI annotation | 严格验证 two-file machine set 后的 script consumer | `scripts/**` |

Output 不重新计算 Core 或 decision。machine artifacts 只有在 complete two-file set 通过验证并完成
canonical publication 后才是 trusted；输出失败不会被 GateResult 覆盖。

## 组件职责

### Product CLI

负责 command routing、project root、flags、scan 前 usage/config failure 与 exit mapping。它不解释
scanner output、Check 结果、records 或 artifact fields。

### Product core

负责把 resolved config、exact inputs 和 dependency snapshot 组合为一次冻结执行；CheckManager 和
RecordManager 分别拥有 run lifecycle/coverage 与 record provenance/identity/integrity。Core 不保留
全局 quality reducer；policy readiness 只属于选定 `DecisionPolicy`。

### Scanner adapter

adapter 仅消费 Product 批准的 exact inputs 和自己的 dependency slice。它隔离 availability、process、
parser、private payload 和 raw material，并以 Check-owned contribution、records 或 reference facts
交给 Core。越界 source batch 必须在 record conversion 前被拒绝；有效的早先 records 不因后续
failure 撤销。

### Output

Output 拥有 publication model 的 machine mapper、runtime schemas、serializers、two-file validator、
artifact lifecycle、readable projection 和 `src/product/machine-output.ts` shallow boundary。它在写入前
验证 candidate，使用同目录 owned temps，handled publication failure 清理 canonical files、`report.md`
和 owned temps；`raw/**` 可按 scanner 需要保留。

## 运行边界

- public catalog 只含 serializable Check/record-type metadata；bindings、runner、scanner payload 与
  executable 不进入 catalog、policy 或 machine set。
- 每个 definition 恰有一个 Check run；`not-applicable` 只来自 pre-work applicability，execution
  failure 的 run 没有 result。quality `failed` verdict 仍是 completed run 的领域结果。
- record identity 不依赖 location、message、arrival 或 checkRunId；RecordManager 保留独立的已提交
  records，并以 integrity evidence 表达 invalid candidate 或 conflict。
- machine schema/types/mappers/serializers/validator 位于 `src/product/**`。consumer 只经
  `src/product/machine-output.ts` 使用 validator；产品不读取 `docs/**` 或 `scripts/**`。
