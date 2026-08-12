# Configuration

本文是 Vibe Check semantic configuration、runtime schema、selection 与 `init` 的 owner。它不定义 Check/Record policy internals、scope collection、scanner executable 或 machine output fields。

## Current semantic config v1

complete document 是 version `1` 的 JSON；runtime schema 是唯一 config field owner。它解析为 detached readonly `ResolvedQualityConfig`，包含 scan scope、code areas、check thresholds、report/artifact settings、cache settings 与 `acceptedWarnings`。published schema/example 由 docs tooling 从 runtime owner 检查 drift。

`report` 是 `report.md` 的 presentation input：`title`、`nonBlockingNotice`、`timeZone`、
`footerGeneratedBy` 与 `footerNotice` 控制标题、notice、格式化 timestamp 和 footer；`topN`
限制每个 accepted / unaccepted record section 的条数；`showWatchlist` 控制 changed-record
watchlist 是否出现，`watchlistMax` 独立限制该 section 的条数。这些字段不改变 machine v2、
console preview、DecisionPolicy、GateResult 或 process outcome。

## Neutral default

没有 file-backed config 且未请求 gate 时，scan 使用未持久化 neutral default。gate 必须选择完整 file-backed config（discovered 或 explicit）。default 不会被 explicit/discovered document 继承或叠加。

## Selection and path rules

优先级是 explicit `--config` > discovered `.vibe-check/config.json` > neutral default。relative config、artifact、cache 和 changed-file paths 相对 normalized project root；input validation 必须在 consumer work 前完成。`init` 只确保 Configuration-owned targets，保留 existing safe bytes 并补齐缺失 target。

## Acceptance adapter

`acceptedWarnings[]` 是 current semantic input，含 `checkId`、`reason` 与可选 catalog-supported filters。每个 `checkId` 由 adapter 穷尽映射为 owning Check + 同名 `recordTypeId` selector；filter 仅转换为该 record type 声明的 typed operands/relations。该映射不为 public catalog 增加 alias，也不建立第二套 policy language。acceptance 由 [Quality Metrics](quality-metrics.md) 的 DecisionPolicy 消费。

## Failure and validation

schema、selection、path 或 gate file prerequisite failure 都是 configuration/usage failure（exit `3`），不会启动 scanner 或 artifact publication。configuration tests 覆盖 neutral/default、strict parsing、detached resolution、explicit/discovered precedence、init idempotence 和 acceptance adapter。
