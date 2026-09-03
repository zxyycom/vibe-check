# Check-owned scanner dependencies

本文拥有 package-provided Check 的外部命令边界。`duplicateDetection` 与 `fileMetrics` 分别拥有
自己的 jscpd、SCC command；`functionMetrics` 使用产品内置 TypeScript analyzer，不依赖可执行文件、环境变量或
`PATH`。这些能力不是集中 scanner subsystem，也不形成公共的 scanner resolution API。

## Owner-local adapters

| Check | Measurement implementation | Private owner |
| --- | --- | --- |
| `duplicateDetection` | jscpd command | `src/package-checks/duplicate-detection/jscpd/**` |
| `fileMetrics` | SCC command | `src/package-checks/file-metrics/scc/**` |
| `functionMetrics` | product-owned TypeScript analyzer | `src/package-checks/function-metrics/analyzer/**` |

两个 external-command adapter 分别拥有 command options、availability probe、subprocess lifecycle、parser、
tool-native failure、measurement conversion 与相邻 tests。它们可复用
`src/package-checks/host-environment/**` 的 process/error capability，以及
`src/package-checks/project-files/**` 的 exact-path membership；这些真实共同不变量不建立共享 backend
interface。`functionMetrics` 的 reader registry、tokenization 与分析状态同样保持在自己的 analyzer owner，
不把 analyzer internals 公开为可替换插件或 command protocol。`analyzer/port-facade.ts` 是 analyzer
目录唯一面向目录外生产代码的 Check-private entry；port 外仅 `analyzer-adapter.ts` 可消费它。实际链固定为
measurement → Worker → Product adapter → port façade → source-aligned internals：measurement 保留 exact-path
I/O、decode、资源与取消，Worker 只验证 transport 并调用 adapter，adapter 独占 Product support/error 与
`FunctionMetric` mapping。translated core/readers/shared/extensions 以 source fidelity 为先；手写 façade、adapter、Worker、Check
与 tests 仍按普通项目规则审查。它们均不形成 public export、scanner protocol 或可替换 backend。

## Check-owned command options

[随包 Check 指南](navigation.md#随包-check-指南)拥有初始 options；[Configuration](configuration.md#package-provided-check-composition)
只拥有普通 Project Definition 的组合边界。

- `fileMetrics.scanner` 只接受 executable。SCC adapter 固定执行精确 `scc version 4.0.0` probe 与
  `--no-config --by-file --format csv` exact-path protocol；不允许 arguments passthrough。
- `duplicateDetection.scanner` 由其指南定义 package/custom command 的完整 policy；adapter 拥有 version
  probe、exact-input config、JSON report 与 worker policy。
- `functionMetrics` 的公开 options 只有 `codeAreas`、`findingPolicy` 与 `findingWaivers`；没有 scanner、
  executable、command 或 environment override。它的内置 analyzer 使用固定 reader registry，资源上限和
  unavailable result 由 [`functionMetrics` 指南](checks/function-metrics.md)定义。

version probe 是 external adapter provenance，不是 consumer version policy。无法启动、无法识别版本、协议不兼容或
报告无效，都由对应 external-command Check fail closed 为 `unavailable`，不会形成成功空结果。`functionMetrics`
不执行这类 probe：分析失败与资源上限在其自身结果模型中结算。

每个 constructor 都同步拒绝 malformed/unknown/incomplete authoring input 并物化 defaults；Run 在
owning callback work 前仍进行 task-local resolved-options preflight。普通 object composition 破坏完整 options 时，
owning Check 结算为 `unavailable / invalid-options`。Definition、Run Controls、environment variables 与
repository tooling 不会替换 Check options 或注册跨 Check backend。

### Gate-bound repository observations

Project Gate 只为 `fileMetrics` 注入 mise 提供的绝对 SCC executable。缺失或相对
`VIBE_CHECK_SCC_CMD` 不回退 ambient `PATH`：Gate 构造不可用的绝对 command，让 file-metrics owner
在正常 availability/process boundary 结算为 `unavailable`。

Gate 对 `functionMetrics` 直接调用普通 constructor，不传 command、scanner 或 Lizard environment binding。因而
默认 Gate 的 function metrics 结算只取决于其公开 policy、选中的 source 和内置 analyzer；它不触发 upstream
advisory。显式维护查询见 [Lizard upstream advisory](maintenance-lizard-upstream-advisory.md#run)。

## Exact-input handoff

每个 owning Check 依据自己的 file selection 收集 candidates，并形成 approved exact paths；三个 metrics Check
都使用每个 `codeAreas[id].files` 的去重并集。外部 adapter 与内置 analyzer 都不接收 project root 来重新发现或扩大
输入。

`duplicateDetection` 一次把完整 approved scope 交给 jscpd。raw fragment 只有在全部 locations 的 area 集合存在
非空交集时才形成 Finding；line/token 下界取共同 areas 的最严格值。`fileMetrics` 一次把稳定去重 union 交给 SCC，
每个 file measurement 按全部 matching areas 的最严格有效 code-line maximum 结算。

`functionMetrics` 先用其内置 reader registry 将每个 selected path 分为 accepted/rejected。accepted union 一次交给
内置 analyzer，rejected path 只形成 non-blocking input-rejection Record；同一 metric finding 恢复全部 matching
areas，使用最严格有效 limits，并在任一 matching area 为 blocking 时成为 blocking。任何超出 exact set 或无法形成
完整可信分析结果的路径都不能发布 partial records。

一次 Check invocation 只使用冻结 options 与 exact input。external command data、raw output、parser internals 和
analyzer token state 都不进入 declarative fingerprint、Core facts、public output 或 Run Controls。

## Cache and failures

Duplicate detection 的 Check-local v3 cache 保存 exact-input accepted raw fragments；area annotation 与 policy
filtering 不持久化。identity 包含 raw-scan configuration version、jscpd backend identity、current commit、完整
exact-input fingerprint、configuration version 与结构化 scanner configuration。只改变 area membership 或严格阈值但
不改变 exact-input union 和 scanner 下界时，可以复用 raw measurement，再按当前 area policy 重新标注和过滤。

external command 的 availability、process、parse、cache 或 exact-input failure 由对应 owner 转换为
`unavailable`。`functionMetrics` 的 source collection、cancellation、analysis 和资源上限失败同样由其 Check owner
转换为稳定 `unavailable` reason；原因、message 和恢复操作以
[`functionMetrics` 指南](checks/function-metrics.md#not-applicable-与-unavailable)为准。合法空输入、nonzero
finding exit 和 parser header 的具体解释，仍各自属于 external adapter tests；不存在 Product-wide scanner failure taxonomy。

## Verification

external adapter tests 证明 command、availability、parser 与 tool-specific failure；对应 Check integration tests
证明 options、exact-input handoff、Record 与 terminal result。function-metrics analyzer tests 证明 source-aligned internals、port façade、current evidence 的 42/37/81/792 identity closure 和 archive-read guard；adapter/Worker tests
证明私有调用链与 whole-input mapping，function-metrics integration tests 证明 adapter 到 Check result 的映射。
