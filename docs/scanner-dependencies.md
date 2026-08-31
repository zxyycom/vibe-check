# Check-owned scanner dependencies

本文拥有 package-provided metric Checks 的 private external-tool boundary。jscpd、scc 与 Lizard 不是一个集中
scanner subsystem 的三个 backend；它们分别是 `duplicate-detection`、`file-metrics` 与 `function-metrics` 的私有实现。
scanner command、adapter protocol 与 executable resolution 都不是 public operational-dependency API。

## Owner-local adapters

每个使用 external scanner 的 ordinary Check 完整拥有自己的 command options、availability probe、subprocess lifecycle、
parser、scanner-native failure、measurement conversion 与相邻 tests：

| Check                | Tool   | Private owner                                     |
| -------------------- | ------ | ------------------------------------------------- |
| `duplicateDetection` | jscpd  | `src/package-checks/duplicate-detection/jscpd/**` |
| `fileMetrics`        | scc    | `src/package-checks/file-metrics/scc/**`          |
| `functionMetrics`    | Lizard | `src/package-checks/function-metrics/lizard/**`   |

这些 adapter 没有共享 registry、统一 backend interface 或集中目录。它们可依赖 `src/package-checks/host-environment/**` 的 process/error
capability，以及 `src/package-checks/project-files/**` 的 exact-path membership 等真实共同不变量；SCC 与 Lizard 的 CSV parser 各自 local；共同使用底层机制不改变 scanner 仍由
唯一 producing Check 拥有的事实。

## Check-owned command options

[随包 Check 指南](navigation.md#随包-check-指南)拥有各 Check 的初始 options。[Configuration](configuration.md#package-provided-check-composition)
只拥有它们与普通 Project Definition 的组合边界。`fileMetrics` 与
`functionMetrics` 的 public scanner 都只保留 executable；SCC adapter 固定 `--version` probe、`--by-file --format csv`
与 exact paths，Lizard adapter 固定 `--version` probe、exact paths 与 `--csv`，并在 scan 前执行 [`functionMetrics` 指南拥有的 version output contract](checks/function-metrics.md#定制-lizard-executable)。两者都不允许参数透传扩大输入、改变
parser contract 或把 tool tuning 变成产品配置。
`duplicateDetection` 的 defaulted constructor input 与 custom 示例由
[`duplicateDetection` 指南](checks/duplicate-detection.md#定制-jscpd-executable)定义；本页只拥有 constructor 形成的完整
options 如何进入 private adapter：

1. package command 从随 `@zxyycom/vibe-check` 安装的 `jscpd` manifest 解析相对 bin target，确认 target 仍位于该 package 目录，
   再以 active Bun 执行。仓库 lockfile 固定当前验证基线 `5.0.11`，发布 package 以 `^5.0.11` 接受从该基线开始的同
   major v5 版本；它不是 PATH discovery、environment override 或跨 Check backend。
2. custom command 只使用已验证的 executable。adapter 固定执行 version probe，并拥有 exact-input config 与 JSON report
   output protocol；availability readback 将其 source 标为 `custom command`，不会猜测它来自 repository devDependency。
3. adapter 不传 `--workers`，沿用 jscpd 自动 worker policy；没有真实 execution budget 或 profiling evidence 时，工具支持的
   tuning flag 不成为 public capability。Check 也不按 code area 启动多个 scanner 进程。

version probe 的结果是 adapter provenance，不是 consumer version policy。package 和 custom command 只要返回可识别版本并
满足实际 CLI/config/report contract，就不会因为不等于仓库基线而被拒绝；实际版本进入 raw-cache identity，防止版本变化后
复用旧 measurement。无法识别版本、启动失败或不兼容升级导致的 process/report failure 都由 owning Check fail closed 为
`unavailable`，不会形成成功空结果。candidate 安装验证实际解析版本满足声明范围，external consumer 再用该安装完成真实
duplicate-detection Run；这证明当前 package 可用，而不声称启发式 scanner 的 findings 在所有兼容版本间逐条相同。

三个 scanner Check 都携带自己的 block preflight，并与 execution 内部保障复用 owning options helper。三个 metric
constructor 先同步拒绝 malformed/unknown/incomplete input 并补齐 defaults；Definition 只形成
canonical immutable authored snapshot；Run 在这些 Check 的 scanner 或 author callback work 前执行全局 preflight
barrier，malformed/unknown/incomplete replacement 只把 owning Check 结算为
`unavailable / invalid-options`。Definition 不按 package Check ID、tool name 或 option shape 分支，也不保存 validator
registry。Run Controls、environment variables、repository tooling 与 precedence map 都不会隐式替换这些 options。

### Gate-bound repository observations

Project Gate 只在自己的四项 repository observations 构造时，为 `fileMetrics` 与 `functionMetrics` 显式给出 SCC/Lizard
executable；这不是 package Check 的默认 resolution、public environment override 或跨 Check registry。正式 Gate root 与
`package:verify` 的 full child 都经 `mise exec` 启动，mise 提供 `VIBE_CHECK_SCC_CMD` 和 `VIBE_CHECK_LIZARD_CMD` 的绝对
tool paths。Gate 只接受绝对值并将其作为 owning Check 的已创作 scanner option 传入。

mise binding 缺失或不是绝对路径时，或调用方直接注入相对 command 时，Gate 都不回退到 ambient `PATH`；它构造一个不可用的绝对 command，使 owning scanner Check 在其
正常 availability/process boundary 结算为 `unavailable`。这一 Gate-private fail-closed handoff 不改变 SCC/Lizard adapter
自己的 version probe、exact-input protocol、parser 或 failure semantics，也不适用于 standalone package consumer。

## Exact-input handoff

owning Check 依据自己的 file selection 收集 candidates，并形成该工具的 approved exact paths；三个 scanner Check 都使用
每个 `codeAreas[id].files` 的去重并集。scanner
不接收 project root 重新发现输入。adapter output 中每条 measurement 都声明 source paths，Check 在 Record conversion 前使用
`src/package-checks/project-files/exact-input-measurement.ts` 验证 exact membership。任一 out-of-set path 拒绝整批 conversion，不发布
partial result。

`duplicateDetection` 一次把完整 approved exact scope 交给 jscpd，使不同或重叠 code areas 可以互相比较。collection 继续用 project-relative slash paths 保存 exact-input identity；jscpd adapter 在项目根外临时 config 中把每个 approved path 按本次 project root 解析为平台原生绝对路径，避免 config 目录改变 scan target。report locations 再归一化为 project-relative identity 后才进入 exact-scope reconciliation。scanner 的 line/token 下界分别使用实际 input areas 的最低值；raw result 恢复每个 location 匹配的全部 areas 后，finding 的
line/token 必须分别满足所有涉及 area 的最严格值。

`fileMetrics` 同样一次把稳定去重的 area-path union 交给 SCC，并保存 collection 形成的 path membership。每个 file
measurement 分别计算全部匹配 area 的普通或 low-decision-token maximum，以最小的最严格值结算；同一路径最多发布一条
Record，并保存稳定排序的全部匹配 area IDs。

`functionMetrics` 一次把稳定去重的 area-path union 交给 Lizard。每个 function measurement 恢复全部 matching areas，
分别计算 function NLOC、cyclomatic complexity 与 parameter count 的最严格 maximum；同一 metric finding 最多发布一条
Record，并保存全部 area IDs。effective blocking policy 是“任一 matching area blocking 即 blocking”，不依赖 area 顺序或
最严格 maximum 来自哪个 area。blocking 只影响 Check outcome，不短路 measurement 或后续 Record conversion。

一次 Check invocation 只使用自己冻结的 options 与 exact input。scanner-private command data、raw results 和 parser AST
不进入 declarative fingerprint、Core facts、public output 或 Run Controls。

## Cache and failures

Duplicate detection 的 Check-local v3 cache **storage format** 保存 exact-input accepted raw fragments；area annotation 和 policy filtering
不持久化。identity 另含 raw-scan configuration version（当前为 `4`）以及 jscpd backend identity、current commit、完整 exact-input union fingerprint、configuration version 与
结构化 scanner configuration；其中明确记录最低 line/token 阈值、JSON/absolute report policy 和 tool-default worker policy，
不再把 config fields 伪装成 command arguments。package command 使用 portable identity，不包含 consumer install
directory；custom command 保留项目显式配置的 executable identity。只改变 area membership 或严格阈值但不改变
exact-input union 和 scanner 下界时，可以复用 raw measurement，随后仍按当前 area policy 重新标注和过滤。

availability、process、parse、cache 或 exact-input failure 由 owning Check 转换为 `unavailable` outcome。该 four-state fact 可安全
进入 Run/Core；raw command、tool path 和 scanner output 不公开。各 tool 对合法空输出、非零 finding exit 和 parser header
的具体解释由自己的 adapter 与 tests 固定，不存在 Product-wide scanner failure taxonomy。

## Verification

三个 owner-local tool 目录的 tests 证明 command、availability、parser 与 scanner-specific failure；对应 Check owner 的
integration test 证明 option validation、exact-input handoff、Record 与 terminal result。`src/package-checks/project-files/**`
tests 只证明真正共同的 collection/exact-membership 机制。
