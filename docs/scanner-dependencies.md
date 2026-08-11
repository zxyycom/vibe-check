# Scanner 依赖选择

本文是 Vibe Check `ScannerDependencySnapshot` 的 owner。它完整维护 external component defaults、
invocation-scoped resolution、operational overrides、eligibility、adapter handoff、process/report
隔离、cache backend identity 与替换条件。Semantic document 与 `ResolvedQualityConfig` 由
[Configuration](configuration.md) 拥有；metrics、warning、completeness 与 machine output 由各自
owner 维护。

## Current dependency boundary

`src/product/**` 当前通过 scc、Python/Lizard 和 jscpd 提供 file、function 与 duplication
measurement。`ScannerDependencySnapshot` 承接 executable、args、availability protocol 与
bounded concurrency；semantic document 只承接 Product-owned quality semantics。

| Capability | Current component | Vibe Check-owned result | Adapter-private material |
| --- | --- | --- | --- |
| file | scc | `FileMetric` | executable/process、by-file CSV、native errors |
| function | Python/Lizard | `FunctionMetric` | Python invocation、Lizard CSV 与 private fields |
| duplication | jscpd | `DuplicateCodeFragment` | temporary config、process、format detection 与 JSON reporter |

Scanner identities仍可出现在 internal diagnostics、raw artifacts、tool metadata 和 current
machine warning source fields；这不使它们成为 valid project config fields。Semantic accepted
warning 与 current machine identity 的兼容边界见
[Quality Metrics](quality-metrics.md#warning-rules-and-channels)。

## Invocation-scoped dependency snapshot

Product CLI 在 config/usage validation 后、banner、cache、artifact 和 capability eligibility 前，
从 host platform、Product defaults 与 supported operational overrides 构造一次 readonly
`ScannerDependencySnapshot`。它只有三个 capability-specific slices：

- `file`：executable、additional args 与 availability args。
- `function`：executable、fixed args 与 availability args。
- `duplication`：executable、additional args、availability args 与 bounded concurrency。

Current 与 baseline measurement 复用同一个 `ScannerDependencySnapshot`，不重新读取
environment、platform defaults 或 semantic document；两个 revision 仍分别根据自己的
normalized exact inputs 计算 eligibility。Scope、warning、report 和 output 不接收 snapshot 或
executable/args。

当前 defaults 是：

| Capability | Executable default | Dependency-owned settings |
| --- | --- | --- |
| file | `scc` | empty additional args；availability 追加 `--version` |
| function | Windows `python`，其它平台 `python3` | invocation prefix 固定为 `-m lizard`；availability 追加 `--version` |
| duplication | repository `node_modules/.bin/jscpd`（Windows 使用 `.cmd`） | empty additional args；availability 追加 `--version`；maximum concurrency `4` |

Resolver 不在 snapshot construction 时探测 executable。只有 eligible capability 才执行
availability check；因此 missing command 对 skipped/no-input capability 没有影响。

## Operational overrides

以下 environment variables 是 supported operational overrides。它们只改变
`ScannerDependencySnapshot`，不参与 semantic document selection、`ResolvedQualityConfig`
mapping 或 machine provenance：

| Variable | Effect |
| --- | --- |
| `VIBE_CHECK_SCC_CMD` | non-empty value 替换 file executable |
| `VIBE_CHECK_SCC_ARGS` | non-empty JSON string array 成为 file additional args |
| `VIBE_CHECK_LIZARD_CMD` | non-empty value 替换 function executable |
| `VIBE_CHECK_JSCPD_CMD` | non-empty value 替换 duplication executable |
| `VIBE_CHECK_JSCPD_ARGS` | non-empty JSON string array 成为 duplication additional args |

Unset/empty command 表示使用 Product default；unset/empty `_ARGS` 表示 empty additional-args
list。Product 不支持 `VIBE_CHECK_LIZARD_ARGS`：Lizard invocation prefix 固定为
`-m lizard`。

所有 supplied non-empty `_ARGS` 在 snapshot boundary 解析一次，并且必须是只含 strings 的
JSON array。Malformed value 产生 typed operational error、stderr 与 exit `2`；diagnostic 只
标识 variable 和 expected shape，不回显完整 value。该 validation 发生在 eligibility 前，
所以 quick/skipped 或 no-input scan 也不能隐藏 malformed caller input；但它仍不会探测或启动
component。Resolver 不从 project config fallback，也不把 applied override 写回 config、report
或 machine output。

## Eligibility and adapter handoff

Product Core 先按 resolved profile、semantic settings 与 normalized exact inputs 决定每项
capability 的 work：

1. Profile 未请求 capability，返回 `skipped`，不检查 availability 或启动 component。
2. Profile 请求 capability但没有 eligible input，返回 `no-input`，不检查 availability 或启动
   component。
3. 有 eligible work 时，adapter 只接收 Product-approved exact inputs、完成本次 measurement
   所需的 semantic slice，以及自己的 dependency slice。

Adapters 隔离 availability、process、timeout、native failure、CSV/JSON/private report 和 raw
material。每条成功 measurement 使用以下 internal contract 返回：

```ts
type ScopedMeasurement<T> = {
  readonly payload: T;
  readonly sourcePaths: readonly string[];
};
```

本 contract 中，approved exact inputs 是 Core 为当前 capability invocation 交给 adapter 的
完整 path list。Adapter 与 Core 分别承担以下不变量：

1. Adapter 从构造 payload 的同一组 CSV / JSON location values 生成 `sourcePaths`，并使用
   slash-form normalization；合法 measurement 的每个 declared path 必须与一个
   project-root-relative approved exact input 完全相等。Payload-specific location 与 declared
   source identity 的一致性由 adapter 保证。
2. 每条 measurement 至少声明一个 source path。一个 measurement 可以声明多个 paths，例如
   duplicate fragment 的两个 locations。
3. Source-scope acceptance 把 `payload` 当作 opaque Vibe Check-owned value，只检查每个 declared
   path 是否精确属于 approved exact inputs；它不读取 `FileMetric.path`、`FunctionMetric.file`
   或 duplicate locations 来重建 adapter 语义。验收成功后，capability consumer 再按对应
   Vibe Check-owned model 使用 payload。
4. 任一路径不属于 approved set 时，Core 拒绝该 invocation 的全部 measurements。Current
   capability 映射为 `invalid-result` 且不写入部分 metrics；baseline measurement 同样 fail
   closed。

`ScopedMeasurement<T>` 只统一 source identity handoff，不统一 capability payload 或 failure
protocol。它不进入 `QualityMetrics` 或 public machine output，也不建立 generic
scanner/provider/plugin hierarchy；三个 dependency slices、payloads 与 scanner-native failure
仍只包含各自消费者需要的 concrete fields。

## File measurement boundary

File adapter 对 Product-approved exact inputs 调用 scc by-file measurement，将 output 归一化为
`FileMetric`。Executable、additional args、CSV header、language taxonomy、native errors 和
process protocol 留在 adapter/dependency boundary；file quality semantics 由
[Quality Metrics](quality-metrics.md#scc-file-metrics-boundary) 维护。

Eligible invocation 的 unavailable、execution 与 invalid CSV/result 分别进入 normalized
failure；successful zero measurement 仍是 success，不能与 no-input 混淆。

## Function measurement boundary

Function adapter 只接收 Scan Scope 批准的 `.ts` / `.d.ts` / `.rs` exact inputs，通过 resolved
Python executable 与 fixed `-m lizard` prefix 运行 Lizard并解析 CSV。它不扫描 project root，
也不接收 unsupported 或 excluded files。

Python invocation、Lizard CSV 和 private fields 留在 adapter；Core 只接收 `FunctionMetric` 或
normalized failure。Future TypeScript port 只替换这个 internal dependency/process boundary，
不得改变 `checks.functions`、accepted-warning `checkId`、public schema/example/fixture 或 current
machine source identity；其独立计划见
[将 Lizard 统一后置于 Check 产品基础](decisions/product-priority/defer-lizard-until-after-check-foundations.md)
决策；其实施上下文通过 `bun run change-plan:list` 查询，本依赖 owner 不创建或命名 Change Plan。

## Duplicate measurement boundary

Product Core 按 code area 为 duplication 规划 work。每个至少包含两个 approved exact inputs 的
area 使用 `checks.duplication.minimumTokensByCodeArea[area]`；缺少 entry 时使用
`defaultMinimumTokens`。Adapter 只接收这些 paths、resolved minimum-token value 与 duplication
dependency slice。

jscpd private config 精确列出 input paths、minimum tokens 和 JSON reporter，但不写 format
override。Pinned backend 按 path extension 检测支持的 formats；同一 area 可以包含不同 supported
extensions，本 contract 不承诺跨 format clone matching。Backend replacement 必须在 adapter 内
保持 exact-input/no-expansion contract，不能恢复 public format field。

Temporary config、format detection、reporter structure、process protocol 与 private options 留在
adapter。Successful process without report、invalid report 与 non-zero execution 保持 distinct
normalized failure；quick profile skipped、insufficient/no input、successful zero duplicates 和
dependency unavailable也保持可区分。

jscpd per-area cache 命中后，从 cached fragment locations 重新构造 `ScopedMeasurement`，并再次
对该 area 的 approved exact inputs 验收。包含未批准来源路径的 cache hit 被忽略并重新扫描；
只有重新扫描返回的 measurements 通过同一 contract 后才能进入 metrics 和新 cache entry。

Duplicate input、依赖与 failure contract 由本节拥有；fragment、aggregation 与 warning 语义由
[Quality Metrics](quality-metrics.md#jscpd-duplicate-boundary)拥有。

## Cache identity

Cache identity 由对应 measurement/cache owner 投影，而不是由 Configuration 提供全量 config
hash。Identity 只包含该 cache consumer 的 relevant semantic measurement settings、normalized
exact-input fingerprint 与 relevant backend identity（executable/args/version 等实际依赖信息）。
Report/acceptance text、sibling capability settings 和 caller 自定义 version 不应成为无关
invalidation source；semantic config v1 的 fixed `version` 也不是手工 cache-bust control。

Current 与 baseline 复用 `ScannerDependencySnapshot`，但各 revision 的 input fingerprint 与
eligibility 独立。Cache artifact 可以保存 internal backend identity 以验证 reuse，不把它提升为
public config provenance。

## Failure and observability

以下状态不得等价处理：

- profile 未请求：`skipped`；
- requested 但无 eligible input：`no-input`；
- component 完成并产生 valid zero findings：`succeeded`；
- eligible dependency unavailable：`failed` / `unavailable`；
- process failure：`failed` / `execution`；
- report、parser 或 normalized validation failure：`failed` / `invalid-result`。

Raw scanner material、component version 和 internal command metadata可以用于复现，但 Output
只消费 normalized product data。Dependency change 不得自行重新设计 completeness、console、
artifact directory、quality status、gate 或 exit mapping。

## Runtime dependency closure

`src/product/**` 拥有 scanner runtime、entry 与实际可达 foundation helpers。正式 product
entry 的 runtime import 不得进入 `scripts/**` 或 toolkit gitlink。来源 commits 与 copied
closure 记录在 [`src/product/README.md`](../src/product/README.md)。

产品不为现有 adapters 抽出无独立消费者的 generic service/provider hierarchy。仍服务开发
脚本的 foundation / parallel-task-runner 可以留作开发依赖，但不成为 product runtime
dependency。

## Replacement and verification

Component 无法可靠运行、许可证/安全/安装成本不可接受、private protocol 频繁破坏，或 tests
证明 normalized semantics 不满足 product contract 时，可以在独立 change 中替换。替换必须：

1. 固定 current inputs、normalized outputs、failure 和 cache/backend identity baseline。
2. 保持 public semantic config 与 exact-input adapter contract，除非另有显式 public contract
   change。
3. 更新本 owner、capability spec、adapter tests 与受影响 consumers。

当前最低证明包括 `ScannerDependencySnapshot` single-read、operational override validation、current/baseline
reuse、revision-specific eligibility、skipped/no-input no-probe、各 adapter parser/process failure、
jscpd per-area exact-input/no-format planning、bounded concurrency、cache identity 与 product
runtime import closure。正式入口与 dogfood wrapper 必须到达同一 Product Core。
