# Check-owned scanner dependencies

本文拥有 package-provided Check 的外部命令边界。`duplicateDetection` 与 `fileMetrics` 分别拥有
自己的 jscpd、SCC command；`functionMetrics` 使用产品内置 TypeScript analyzer，不依赖可执行文件、环境变量或
`PATH`。这些能力不是集中 scanner subsystem，也不形成公共的 scanner resolution API。

## Owner-local adapters

| Check                | Measurement implementation        | Private owner                                     |
| -------------------- | --------------------------------- | ------------------------------------------------- |
| `duplicateDetection` | jscpd command                     | `src/package-checks/duplicate-detection/jscpd/**` |
| `fileMetrics`        | SCC command                       | `src/package-checks/file-metrics/scc/**`          |
| `functionMetrics`    | product-owned TypeScript analyzer | `src/package-checks/function-metrics/analyzer/**` |

external adapters 各自拥有 command、availability、process、parser、tool-native failure 与 conversion；仅复用 host-environment 的 process/error capability 和 project-files 的 exact membership，不建立共享 backend interface。

function analyzer 的唯一目录外生产入口是 `analyzer/port-facade.ts`，仅 `analyzer-adapter.ts` 可消费。调用链为 measurement → Worker → Product adapter → façade → source-aligned internals：measurement 拥有 exact-path I/O、decode、资源与取消；Worker 只验证 transport/调用 adapter；adapter 独占 Product support/error 和 FunctionMetric mapping（含 CCN contributor/nesting depth）。Check 再应用 area limits、Finding、waiver 和 Record policy。

translated core/readers/shared/extensions 以 source fidelity 为先；手写 façade、adapter、Worker、Check/tests 仍按普通项目规则。façade 的 host-only reader-resolution seam 供 capability/analysis 共用，保持 registry selection、unsupported-input boundary 与 root provenance/source identity；未覆盖输入交由 source-aligned registry。所有 internals 仍私有，不形成 public plugin、可替换 backend 或 command protocol。

## Check-owned command options

[随包 Check 指南](../navigation.md#随包-check-指南)拥有初始 options；[Configuration](project-definition.md#package-provided-check-composition)
只拥有普通 Project Definition 的组合边界。

- `fileMetrics.scanner` 只接受 executable。SCC adapter 固定执行精确 `scc version 4.0.0` probe 与
  `--no-config --by-file --format csv` exact-path protocol；不允许 arguments passthrough。
- `duplicateDetection.scanner` 由其指南定义 package/custom command 的完整 policy；adapter 拥有 version
  probe、exact-input config、JSON report 与 worker policy。
- `functionMetrics` 无 command override；固定 reader registry、closed limits、资源上限与结果由 [Check 指南](../checks/function-metrics.md)拥有。

version probe 是 external adapter provenance，不是 consumer version policy。无法启动、无法识别版本、协议不兼容或
报告无效，都由对应 external-command Check fail closed 为 `unavailable`，不会形成成功空结果。`functionMetrics`
不执行这类 probe：分析失败与资源上限在其自身结果模型中结算。

constructor 与 task-local resolved-options preflight 的分工见[Project Definition](project-definition.md#package-provided-check-composition)；领域 options 不通过 Definition、Controls 或环境注册跨 Check backend。

### Gate-bound repository observations

Project Gate 只为 `fileMetrics` 注入 mise 提供的绝对 SCC executable。缺失或相对
`VIBE_CHECK_SCC_CMD` 不回退 ambient `PATH`：Gate 构造不可用的绝对 command，让 file-metrics owner
在正常 availability/process boundary 结算为 `unavailable`。

Gate 对 `functionMetrics` 直接调用普通 constructor，不传 command、scanner 或 Lizard environment binding。因而
默认 Gate 的 function metrics 结算只取决于其公开 policy、选中的 source 和内置 analyzer；它不触发 upstream
advisory。显式维护查询见 [Lizard upstream advisory](../tooling/lizard-upstream.md#run)。

## Exact-input handoff

每个 owning Check 依据自己的 file selection 收集 candidates，并形成 approved exact paths；三个 metrics Check
都使用每个 `codeAreas[id].files` 的去重并集。外部 adapter 与内置 analyzer 都不接收 project root 来重新发现或扩大
输入。

area membership 的恢复与 eligibility 在 owning Check 完成，见[Project files](project-files.md#package-provided-check-exact-inputs)；adapter 不计算共享领域 policy。任何 out-of-set batch 或不完整分析结果必须在 conversion/Record publication 前整批拒绝。

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
[`functionMetrics` 指南](../checks/function-metrics.md#not-applicable-与-unavailable)为准。合法空输入、nonzero
finding exit 和 parser header 的具体解释，仍各自属于 external adapter tests；不存在 Product-wide scanner failure taxonomy。

## Package maintenance evidence

`duplicateDetection` 的默认 jscpd v5 兼容范围由发布 manifest 声明。repository、candidate 与 external-consumer 验收核对 resolved manifest、contained bin 和实际 engine version 一致；这不把每次 runtime availability probe 变成 exact-5.1.1 gate。

`functionMetrics` 的 parent 有界读取 accepted source，再将完整 batch 交给 `node:worker_threads` Worker。Worker 只分析传入文本；取消终止 Worker，error 或未交付完整结果的 exit 映射为 analysis failure。私有 Worker `.mjs` 是必需包材料，artifact 与 installed-consumer 验收需证明其实际可执行。

`secretDetection` 的 Check owner 维护固定 Secretlint rule set、依赖升级与 synthetic corpus；Secretlint release、engine 或 dependency graph 改变时，重跑 candidate、installed consumer 与 leak-canary evidence。其用户安全承诺仍由[Secret Detection 指南](../checks/secret-detection.md)定义。

## Verification

external adapter tests 证明 command、availability、parser 与 tool-specific failure；对应 Check integration tests
证明 options、exact-input handoff、Record 与 terminal result。function-metrics analyzer tests 证明 source-aligned internals、port façade、由当前 provenance mapping 确定的 identity closure 和 archive-read guard；adapter/Worker tests
证明私有调用链与 whole-input mapping，function-metrics integration tests 证明 adapter 到 Check result 的映射。

当前 Lizard `1.24.0` baseline 的 oracle、malformed、reader mapping、identity 与 deviation evidence 位于
`src/package-checks/function-metrics/analyzer/fixtures/lizard-1.24.0/evidence/`；
`licenses/lizard-1.24.0-provenance.json` 拥有 source/range、hash、SPDX 与 translated-target mapping。
identity tests 从该 mapping 验证上述 source/target/symbol 闭合；测试 evidence 不参与 Product runtime 或 package payload。
上游 release 查询由[显式 advisory 命令](../tooling/lizard-upstream.md#run)执行。采用新 baseline 或改变 translated
source boundary 时，需另行批准，先更新根 provenance，再同步 current evidence、source-alignment review 并重跑相关证据。
Product runtime 与 package payload 只使用随包材料，不以归档、临时 clone 或网络获取替代当前 analyzer。
