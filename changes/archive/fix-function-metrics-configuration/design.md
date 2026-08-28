# Design

设计以 defaulted specialized constructor、area-owned measurement/finding policy、完整 finding evidence 和 adapter-owned Lizard protocol 替换当前完整 value、共享分类字段与任意 CLI argument passthrough。

## Context

`functionMetrics` 当前是普通完整 Check value，顶层拥有 files、共享 `CodeAreaDefinition`、scanner executable/args/availabilityArgs 与三个 threshold branches。execution 对 selected TypeScript/Rust paths 运行一次 Lizard，再以 first-match area 分类；不存在 area 或 `exclude-warnings` 时丢弃 candidate，其它四档 warning policy 没有差异。当前 preflight 只要求有限数，接受负数、小数、零与空 area map。用户已经确认参考 duplicate-detection 的 defaulted configuration 边界，并要求顶层与子空间都能声明 finding 是否阻断。

## Goals / Non-Goals

目标是让 consumer 配置只表达 files、metric limits、finding outcome policy 与明确 executable，让一次完整 measurement 产生不短路的可信 evidence，并让 constructor/preflight 精确表达合法状态。非目标是提前完成 TypeScript analyzer port、建立 Product-wide scanner registry、为 scc 同步改造同形 API、恢复通用 warning/Gate 系统、公开 Lizard thresholds/workers/output flags，或让 finding policy控制 scanner fail-fast。

## Decisions

### Intended Change

- `functionMetrics(options?)` 返回固定 identity、preflight、execution 与完整 resolved options。constructor input 只允许可省略的 `{ findingPolicy, codeAreas, scanner }`；无参时建立默认 `project` area。
- 顶层 `findingPolicy` 为 `"blocking" | "non-blocking"`，默认 `"blocking"`。每个 area 可省略 override；resolved area 总是拥有 effective finding policy。policy 只决定 Record 是否计入 `blockingFindingCount` 和最终 outcome，不中止 scanner 或 candidate conversion。
- 每个 area 恰好拥有 `{ files, limits, findingPolicy }`。显式 area 必须提供 files branch，其中 file lists 可省略；limits 的 nested fields 可省略并由 package 补齐。
- limits 使用 `codeLines.maximum`、`codeLines.lowComplexityAllowance.maximum`、`codeLines.lowComplexityAllowance.cyclomaticComplexityBelow`、`cyclomaticComplexity.maximum` 与 `parameters.maximum`。默认值暂沿用 50、150、5、10、5；constructor 要求正安全整数且 allowance maximum 不小于普通 code-line maximum。
- execution 为各 area 独立收集 exact paths，再把受支持路径的去重并集一次性交给 Lizard。measurement 根据 path 恢复全部 matching areas；每项 metric 使用所有 matching areas 中最严格的 maximum（最小值），任一 matching area 为 blocking 时 effective finding 为 blocking。
- 每个 metric finding 只生成一个 Record，记录 stable-sorted `codeAreas`、`blocking`、effective limit 和 measurement facts。final data 为 `{ findingCount, blockingFindingCount }`；blocking count 非零时 failed，否则 passed。
- public scanner input/resolved options 只保留非空 `executable`，默认 `"lizard"`。adapter 固定 version arguments 与 scan protocol；测试 fake command 使用真实 executable fixture 或 private adapter seam，不通过 public args 注入协议。

### Resulting Impacts

- `FunctionMetricsOptions` 成为 constructor input，另设内部 resolved type；public export、guide、README mechanics、dogfood Definition 和 isolated consumers 需从 value composition 改为 constructor call。
- `CodeAreaDefinition` 不再服务 function metrics；function options 不消费 description、globs、excludeGlobs 或五档 warning policy。file metrics 继续拥有其现状，不因表面相似被本 Change 顺带重构。
- target selection、measurement、candidate construction 与 tests 需承接 area exact union、overlap strictness、blocking aggregation 和 invalid constructor/preflight replacement。
- 未来 Lizard port 的 public-scanner open question被缩小为删除 executable policy的明确 hard cut；其 Change baseline 与 artifacts 需要在本 Change 完成后重新审阅，但本任务不实施 analyzer port或归档该 Change。

## Risks / Trade-offs

area-owned file lists会增加多 area authoring，但 constructor defaulting 和普通 TypeScript composition 降低重复，且消除 selected-but-unclassified 的静默状态。重叠 area 取最严格 maximum/任一 blocking 会偏保守，但稳定且不依赖顺序。non-blocking findings 使 passed Check 可以带 supplemental Records，因此 final data 与文档必须清楚区分 evidence count 和 blocking count。保留默认 blocking 与现有阈值可能继续让 repository dogfood failed；应通过显式 repository area policy选择 non-blocking或完成真实整改，不能偷偷提高 package defaults只为过门禁。

## Open Questions

无。用户已确认顶层默认 finding policy 与子空间 override；本设计把“继续下一个”解释为继续形成完整 findings，而不是 scanner fail-fast。
