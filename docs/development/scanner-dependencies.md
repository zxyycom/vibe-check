# Check-owned scanner dependencies

本文拥有 package-provided Check 的 scanner 依赖与实现边界，包括外部命令、内置 analyzer、Markdown lint cache 和 Secretlint 依赖维护。`duplicateDetection` 与 `fileMetrics` 分别拥有
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

shared tokenizer 对独立 addition 分支采用私有尾部成本防护：普通输入保持原生迭代，
风险输入仅在完整 source 游标进入确定不能闭合的注释或固定 TS/TSX 模板尾部时惰性省略对应分支。
完整 token、factory、模板拆分及 Worker 取消契约保持；该机制不是语法判定或任意 malformed 的线性保证。
采用取舍见[局部决策](../decisions/bound-unclosable-tokenizer-tail-cost.md)，精确资格、来源同步与持续测试由
[当前偏差说明](../../src/package-checks/function-metrics/analyzer/fixtures/lizard-1.24.1/evidence/source-alignment-deviations.md#私有-tokenizer-的不可闭合尾部成本防护)拥有。

## Product-private process capability

`src/package-checks/host-environment/process/**` 拥有 Product 内部的异步/同步进程执行与统一 `ProcessResult`；
Check adapter 仍拥有工具协议及 Check 结算，repository automation 使用独立的 `scripts/process-execution/**`。

- `status` 保留数值退出码，`signal` 保留终止信号，缺失时分别为 `null`。默认原因只依据原始结构化标记选择，
  不从 native error text 猜测；精确优先级由 [commandCheck 默认终态](../guides/command-check.md#默认终态与失败边界)拥有。
  `isCanceled`、`timedOut` 与 `isMaxBuffer` 是互斥的默认原因投影，而非全部原始标记的副本。
- `isComplete` 直接依据原始结果独立判断：具有数值退出码且没有取消、超时、超限或 signal 标记才为真。
  因此完整零/非零退出均可供调用方解释；非零退出即使赢得默认原因，也不能覆盖原始不完整事实。
- 异步 runner 传递 caller cancellation、timeout 与 `maxBuffer`；同步 runner 保留已有数值退出与文本捕获能力。
  两者共用结果规范化，`stdout` / `stderr` 均为字符串，已捕获文本保留末尾换行；同步选项限定在文本 encoding 分支。
- 任一输出流超限后由 Execa 主动终止直接 child，异步调用在 child 退出后交付结果；POSIX child 忽略软终止时沿用底层默认强杀升级。
  文本计量及直接 child 之外的回收边界见 [commandCheck 输出](../guides/command-check.md#输出)，不将该机制扩张为任意后代进程树回收保证。

## Check-owned command options

[随包 Check 指南](../navigation.md#随包-check-指南)拥有初始 options；[Configuration](project-definition.md#package-provided-check-composition)
只拥有普通 Project Definition 的组合边界。

- `fileMetrics.scanner` 只接受 executable，且不得 arguments passthrough。SCC adapter 固定执行一次精确
  `scc version 4.0.0` probe；measurement 以 `--no-config --by-file --format csv` 将 approved exact paths
  作为一次 logical scan 传输。
  - adapter 私有地按保守 Windows UTF-16 argv 上界稳定分 batch，逐 batch 验收，并且只在全部 batch 成功后汇合。
  - 300 秒 shared deadline、stdout/stderr 各 64 MiB 的累计预算和 command-line ceiling 都是 adapter 实现细节，
    不进入 options。
- `duplicateDetection.scanner` 由其指南定义 package/custom command 的完整 policy；adapter 拥有 version
  probe、exact-input config、JSON report 与 worker policy。
- `functionMetrics` 无 command override；固定 reader registry、closed limits、资源上限与结果由 [Check 指南](../checks/function-metrics.md)拥有。

version probe 是 external adapter provenance，不是 consumer version policy。无法启动、无法识别版本、协议不兼容或
报告无效，都由对应 external-command Check fail closed 为 `unavailable`，不会形成成功空结果。`functionMetrics`
不执行这类 probe：分析失败与资源上限在其自身结果模型中结算。

constructor 与 task-local resolved-options preparation 的分工见[Project Definition](project-definition.md#package-provided-check-composition)；领域 options 不通过 Definition、Controls 或环境注册跨 Check backend。

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

area membership 的恢复与 eligibility 在 owning Check 完成，见[Project files](project-files.md#package-provided-check-exact-inputs)；adapter 不计算共享领域 policy。SCC 的私有 transport batch 必须有序、非空且不重叠地覆盖 approved union；每批只接受其 own exact paths。最终重复 measurement 或任一 batch 失败都必须在 conversion/Record publication 前拒绝完整 logical scan；合法但 SCC 不支持的 approved file 可以不产生 row。

一次 Check invocation 只使用冻结 options 与 exact input。external command data、raw output、parser internals 和
analyzer token state 都不进入 declarative fingerprint、Core facts、public output 或 Run Controls。

## Cache and failures

Duplicate detection 的 Check-local v3 cache 保存 exact-input accepted raw fragments；area annotation 与 policy
filtering 不持久化。identity 包含 raw-scan configuration version、jscpd backend identity、current commit、完整
exact-input fingerprint、configuration version 与结构化 scanner configuration。只改变 area membership 或严格阈值但
不改变 exact-input union 和 scanner 下界时，可以复用 raw measurement，再按当前 area policy 重新标注和过滤。

扫描输入携带 root、approved exact paths 与 area policy；cache identity owner 拥有 cache directory、commit 和内容 fingerprint。
少于两个输入时结算为 not-applicable；有扫描工作时先验证输入并取得实际 availability/version。
可用且 cache enabled 时，在 scan 前采样一次完整身份，供 lookup 与 write 共用；其它分支跳过 cache-only
内容读取/hash、Git 与 directory resolve。scanner 自身读取、version 检查和 exact fragment 验收保持完整。

fingerprint 的 unreadable sentinel 不是 readability preflight；identity preparation 失败为 `source-unavailable`，
cache read 失败退化为 miss，write 失败结算为不可用。

external command 的 availability、process、parse、cache 或 exact-input failure 由对应 owner 转换为
`unavailable`。`functionMetrics` 的 source collection、cancellation、analysis 和资源上限失败同样由其 Check owner
转换为稳定 `unavailable` reason；原因、message 和恢复操作以
[`functionMetrics` 指南](../checks/function-metrics.md#not-applicable-与-unavailable)为准。合法空输入、nonzero
finding exit 和 parser header 的具体解释，仍各自属于 external adapter tests；不存在 Product-wide scanner failure taxonomy。

### Markdown lint findings cache

`markdownLint` 的逐文件 findings cache identity 包含内部 adapter 契约版本。adapter 规则配置或 Finding 解释变化时，
维护者必须提升该版本，使旧 findings 不再命中；公开配置、复用与失败语义由
[Markdown lint 指南](../checks/markdown-lint.md#逐文件-findings-缓存)拥有。

同一 markdownlint 版本的不同依赖组合可能遗漏 MD052 undefined-reference 能力，因此 adapter 验证实际行为：
仅在选择 `reference-links-images` 时，通过公开 `strings` API lint 固定的 full/collapsed/image 引用语料，进程内共享一次 Promise。
这项资格检查先于 fresh lint 和 cache lookup，避免缓存掩盖已加载 backend 的能力缺失；失败映射为 `backend-failed`，
不发布合成或缓存 lint Findings。Product 不依赖上游私有模块路径来判定能力。

当前 cache adapter 契约为 `markdown-lint-findings-v2`，使采用该资格解释之前的 facts 失效。

## Package maintenance evidence

`duplicateDetection` 的默认 jscpd v5 兼容范围由发布 manifest 声明。repository、candidate 与 external-consumer 验收核对 resolved manifest、contained bin 和实际 engine version 一致；这不把每次 runtime availability probe 变成 exact-version gate。

`functionMetrics` 的 parent 有界读取 accepted source，再将完整 batch 交给 `node:worker_threads` Worker。Worker 只分析传入文本；取消终止 Worker，error 或未交付完整结果的 exit 映射为 analysis failure。私有 Worker `.mjs` 是必需包材料，artifact 与 installed-consumer 验收需证明其实际可执行。

Parent 对每个非空、至多 `32 KiB` 的读取 chunk 使用私有 `setImmediate` Promise 让步，再由既有 checkpoint
观察同线程 timer/I/O 取消。既有 checkpoint、实际 byte caps、decode 和整批提交保持不变。
同步 open/read/concat/decode 仍不可抢占，chunk 大小不构成毫秒响应承诺。成功打开的 FD 在 finally 中关闭；
Worker 结算移除 abort/transport listeners 并调用 terminate 一次；该结算不等待物理线程退出。

`secretDetection` 的 Check owner 维护固定 Secretlint rule set、依赖升级与 synthetic corpus；Secretlint release、engine 或 dependency graph 改变时，重跑 candidate、installed consumer 与 leak-canary evidence。其用户安全承诺仍由[Secret Detection 指南](../checks/secret-detection.md)定义。

## Verification

external adapter tests 证明 command、availability、parser 与 tool-specific failure；对应 Check integration tests
证明 options、exact-input handoff、Record 与 terminal result。function-metrics analyzer tests 证明 source-aligned internals、port façade、由当前 provenance mapping 确定的 identity closure 和 archive-read guard；adapter/Worker tests
证明私有调用链与 whole-input mapping，function-metrics integration tests 证明 adapter 到 Check result 的映射。

默认 admission 取消测试委托原 `setImmediate`，在首次实际 yield 安排 timer/I/O abort；私有 resolved-Promise
seam 只隔离资源矩阵的调度成本，不能证明生产默认让步。early-file chunk 取消与真实 Worker 在途取消分别证明
后续 exact inputs 不提交、已有 rejection 保留和一次清理；完整 Check 性能以精确安装、同一冻结语料和配置的
显式对照取证，不能从 controlled port、源码测试或局部让步成本外推 Gate 收益。

当前 Lizard `1.24.1` baseline 的 oracle、malformed、reader mapping、identity 与 deviation evidence 位于
`src/package-checks/function-metrics/analyzer/fixtures/lizard-1.24.1/evidence/`；
`licenses/lizard-1.24.1-provenance.json` 拥有 source/range、hash、SPDX 与 translated-target mapping。
源码忠实翻译之外，Rust 实际 match arm CCN 增量的 `=>` tags 与 Kotlin expression/when 的函数行/NLOC 边界具有两项局部偏差；
具体机制、原始 oracle 与修正期望的分离见该目录的 [source-alignment-deviations.md](../../src/package-checks/function-metrics/analyzer/fixtures/lizard-1.24.1/evidence/source-alignment-deviations.md) 和 [README.md](../../src/package-checks/function-metrics/analyzer/fixtures/lizard-1.24.1/evidence/README.md)。
公开 contributors 的语义由 [Check 指南](../checks/function-metrics.md#效果与结果)拥有，不等同全部内部 CCN 事件。
上游 Cognitive Complexity body 在 inventory 中归为 deferred，不注册可执行 processor 或公共 metric。
identity tests 从该 mapping 验证上述 source/target/symbol 闭合；测试 evidence 不参与 Product runtime 或 package payload。
上游 release 查询由[显式 advisory 命令](../tooling/lizard-upstream.md#run)执行。采用新 baseline 或改变 translated
source boundary 时，需另行批准，先更新根 provenance，再同步 current evidence、source-alignment review 并重跑相关证据。
Product runtime 与 package payload 只使用随包材料，不以归档、临时 clone 或网络获取替代当前 analyzer。

### TypeScript 函数指标的有界偏差

共享 `CodeStateMachine.consume` 在完成时先释放旧 callback 槽，再以原 receiver 调用一次；
重入 token replay 安装的新槽保留，`lastToken`/`toExit` 生命周期不变，继续使用单 callback 槽。
TypeScript-local addition 单 token 识别 `??`，可选标识符规则不吞其首个问号；TSX 的独立 addition 同步。
TypeScript `logicalOperators` 由现有 `conditionCounter`/`complextags` 提供每 token CCN +1 和真实 source-order line。
JavaScript、TSX/JSX、Vue 的继承影响属于同一偏差；其他 reader 不获得新的操作符计量。

`lizardnd` 仅为 `logicalOperators` 已声明 `??` 的 reader 复用现有 `&&`/`||` 路径，全语言 `DEFAULT_LOOPS` 保持不变。
每次打开括号重置首项标记，condition 内只处理当前标记下的首个短路运算符，condition 外逐项处理；
hidden bracket、分号和函数 reset 继续由既有状态机维护。公开 ND 解释与数值示例见[指南](../checks/function-metrics.md#参数与默认配置)；直接矩阵、
27-reader/55-suffix oracle、malformed/extension lifecycle、真实 Worker 和 installed consumer 分别验收相应边界。
原始固定 oracle 保留不改，产品修正期望独立声明；source inventory 的 upstream hash 指向来源字节，与本地 patch 分开。
