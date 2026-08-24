# Scanner dependencies

本文拥有 `src/checks/**` 内 private scanner-adapter boundary。scanner adapter protocol 与 executable
resolution 是 Product implementation detail，不是 public operational-dependency API。

## Check-owned command options

[Configuration](configuration.md#defaults-and-native-composition) 拥有 default Check 的初始 options；本页只定义
`src/checks/measurement/scanners/**` 如何消费已验证的 `options.scanner`。每个 default Check 用：

1. `options.scanner.executable` 和 `options.scanner.args` 扫描；
2. `options.scanner.executable` 和 `options.scanner.availabilityArgs` 检查可用性。

`duplicate-detection` 的默认 marker 是唯一例外：private adapter 从 installed `jscpd` package manifest 解析声明的
bin target，并以 active Bun executable 调用它。该解析是 package-owned adapter behavior，不是公开 scanner
configuration、PATH discovery 或 environment override。调用方提供完整 `options.scanner` 时，adapter 精确执行其
command values。

Duplicate detection 另外消费 Check-owned `scanner.maxConcurrency`。Metric defaults 只消费自己的已验证
absolute-floor 与 allowance options。项目用 normal object spread 组成完整 replacement options；Definition validation
拒绝缺少 nested field、unknown key、invalid command value、zero concurrency 或 unknown code-area threshold。Run
Controls、environment variables、repository tooling 与 precedence map 都不能替换这些 Check-owned options。

## Adapter handoff and exact scope

`src/checks/builtins/**` 的 default callback 接收 validated options、normalized project context、Check reporter 和
signal；它把 Check-owned command data 与 Product-approved exact paths 交给
`src/checks/measurement/scanners/**`。adapter 拥有 availability probe、subprocess lifecycle、parser、raw material、
backend/cache mechanics 与 scanner-native protocol adaptation。

每个 reported source path 必须 slash-normalized 并属于 approved exact input list。任何 batch 包含 out-of-scope
source 时，在 Record conversion 前拒绝整个 batch，不能发布 partial result。一次 invocation 只使用一个 frozen
current-worktree scope。scanner-private command data 与 raw results 不进入 declarative fingerprints、Core facts、
public output 或 Run Controls。

## Cache and failures

Duplicate cache identity 包含 scanner backend identity、code area、current commit、exact-input fingerprint、
configuration version 与 normalized command arguments。default marker 映射到 Bun + installed-jscpd backend identity，
不包含 executable 或 declared-bin path，避免相同 dependency version 因 consumer install directory 不同而分裂。
cache hit 会重新验证 source paths；unrelated sibling options 与 project module location 不改变 cache key。调用方
提供 command 时保留 command identity behavior。

availability、process、parse、cache 或 exact-scope failure 由 Check callback/Product boundary 转换为 owning Check
的 `unavailable` outcome。该 outcome 可安全进入 Run/Core；raw command data 和 scanner output 不公开。

## Verification

`src/checks/**` 的 adapter and built-in tests 证明 Check-owned commands、direct context、exact scope 与 cache。
`src/run/**` execution tests 证明 callback failure 经同一 Core Check path 闭合。涉及 schema 或 artifacts 时，另按
[Output](output.md)运行 docs validation。
