# Check-owned scanner dependencies

本文拥有 package-provided metric Checks 的 private external-tool boundary。jscpd、scc 与 Lizard 不是一个集中
scanner subsystem 的三个 backend；它们分别是 `duplicate-detection`、`file-metrics` 与 `function-metrics` 的私有实现。
scanner command、adapter protocol 与 executable resolution 都不是 public operational-dependency API。

## Owner-local adapters

每个使用 external scanner 的 ordinary Check 完整拥有自己的 command options、availability probe、subprocess lifecycle、
parser、scanner-native failure、measurement conversion 与相邻 tests：

| Check | Tool | Private owner |
| --- | --- | --- |
| `duplicateDetection` | jscpd | `src/checks/duplicate-detection/jscpd/**` |
| `fileMetrics` | scc | `src/checks/file-metrics/scc/**` |
| `functionMetrics` | Lizard | `src/checks/function-metrics/lizard/**` |

这些 adapter 没有共享 registry、统一 backend interface 或集中目录。它们可依赖 `src/foundation/**` 的通用 process/CSV/error
mechanism，以及 `src/project-files/**` 的 exact-path membership 等真实共同不变量；共同使用底层机制不改变 scanner 仍由
唯一 producing Check 拥有的事实。

## Check-owned command options

[Configuration](configuration.md#package-provided-check-composition) 拥有随包提供 Check 的初始 options。三个 scanner Check
都以自己的 `options.scanner.executable` 和 `options.scanner.args` 执行工具，并以
`options.scanner.availabilityArgs` 做 availability probe。`duplicateDetection` 另外拥有
`scanner.maxConcurrency`。

`duplicateDetection` 的默认 executable 是 package marker `vibe-check-package-jscpd`。只有其 Check-local jscpd adapter
认识该 marker：它从 installed `jscpd` package manifest 解析声明的 bin target，并以 active Bun executable 调用。
这不是公共 scanner configuration、PATH discovery、environment override 或跨 Check backend。调用方提供其它完整
`options.scanner` 时，jscpd adapter 精确执行这些 command values。

三个 scanner Check 都携带自己的 block preflight，并与 execution 内部保障复用 owning options helper。Definition 只形成
canonical immutable authored snapshot；Run 在这些 Check 的 scanner 或 author callback work 前执行全局 preflight
barrier，malformed/unknown/incomplete replacement 只把 owning Check 结算为
`unavailable / invalid-options`。Definition 不按 package Check ID、tool name 或 option shape 分支，也不保存 validator
registry。项目可用 normal object spread 组合完整 replacement options；Run Controls、environment variables、repository
tooling 与 precedence map 都不会隐式替换它们。

## Exact-input handoff

owning Check 依据自己的 `options.files` 收集 candidates，并形成该工具的 approved exact paths；scanner 不接收 project root
重新发现输入。adapter output 中每条 measurement 都声明 source paths，Check 在 Record conversion 前使用
`src/project-files/exact-input-measurement.ts` 验证 exact membership。任一 out-of-set path 拒绝整批 conversion，不发布
partial result。

一次 Check invocation 只使用自己冻结的 options 与 exact input。scanner-private command data、raw results 和 parser AST
不进入 declarative fingerprint、Core facts、public output 或 Run Controls。

## Cache and failures

Duplicate detection 的 Check-local cache identity 包含 jscpd backend identity、code area、current commit、exact-input
fingerprint、configuration version 与 normalized command arguments。default marker 映射到 Bun + installed-jscpd backend
identity，不包含 consumer install directory；显式 command 则保留 command identity behavior。

availability、process、parse、cache 或 exact-input failure 由 owning Check 转换为 `unavailable` outcome。该 four-state fact 可安全
进入 Run/Core；raw command、tool path 和 scanner output 不公开。各 tool 对合法空输出、非零 finding exit 和 parser header
的具体解释由自己的 adapter 与 tests 固定，不存在 Product-wide scanner failure taxonomy。

## Verification

三个 owner-local tool 目录的 tests 证明 command、availability、parser 与 scanner-specific failure；对应 Check 的
`default-check.test.ts` 证明 option validation、exact-input handoff、Record 与 terminal result。`src/project-files/**` tests 只
证明真正共同的 collection/exact-membership 机制。
