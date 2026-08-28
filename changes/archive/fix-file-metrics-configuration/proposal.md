# Proposal

本 Change 以 defaulted constructor、area-owned files/thresholds 和 adapter-owned SCC protocol 修复 `fileMetrics` 的配置责任与不同文件策略表达。

## Why

当前 `fileMetrics` 公开 `args` 与 `availabilityArgs`，把 private SCC protocol 变成 consumer policy；顶层 `files`、全局 `codeLines` 与事后 `codeAreas` 又无法直接表达不同文件集合的不同阈值，并允许非法数值、空 area 或未匹配 measurement 静默形成失真结果。

## Outcome

消费者通过 `fileMetrics(options?)` 按 area ID 共同声明文件范围与 code-line policy，省略值由 package 补齐；SCC adapter 只接收 executable 和全部 area exact paths 的去重并集，一次扫描后按每个文件涉及区域的最严格有效上限生成至多一条可解释 finding。

## Scope

### Intended Change

把 `fileMetrics` 从完整 default Check value 改为 defaulted specialized constructor；让每个 code area 直接拥有 files 与 codeLines，删除顶层 files/global threshold/legacy classification policy；把 public scanner 缩为 executable-only，并同步 measurement、Record、dogfood Definition、公共类型、文档、测试与 Case 证据。

### Resulting Impacts

公共 prestable API hard cut：consumer 从 `fileMetrics` 改为 `fileMetrics()`，`FileMetricsOptions` 成为 constructor input，resolved options 使用 area-owned shape；Record 的单数 `codeArea` 改为稳定 area ID 数组。配置 fingerprint、package inventory、candidate types、owner 文档和 repository quality authoring 必须同步，既有 object-spread customization 不保留兼容 reader。

## Success Criteria

- `fileMetrics()` 产生通过 owning preflight 的冻结默认 Check，局部 input 可省略由 package 拥有的 defaults。
- 显式 area map 非空；每个 area 有 files branch 和 resolved files/codeLines，非法整数、未知字段与无效 allowance 同步失败。
- 不同 area 可以声明不同阈值；重叠路径只扫描一次并按全部匹配 area 中最严格的有效上限产生至多一条 finding。
- public scanner 只允许 executable；version、CSV、exact inputs 与 timeout 由 SCC adapter 独占，argument passthrough 退出。
- 没有顶层 files/global codeLines、隐式 unknown area 或当前无效的 description/warningPolicy 配置。
- 目标测试、Test Evidence、typecheck、lint、docs validation 与 required workspace verification 通过。

## Affected Owners

- `docs/checks/file-metrics.md`
- `docs/configuration.md`
- `docs/scanner-dependencies.md`
- `docs/scan-scope.md`
- `src/package-checks/file-metrics/**`
- `scripts/project/quality/definition.ts`
- `src/index.ts` 与 package public inventory/candidate type evidence
- `docs/testing/cases/**`
