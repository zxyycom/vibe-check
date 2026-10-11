---
title: "Lizard 1.24.1 移植与完整 Check 升级成本验收"
id: "261011-verify-lizard-1-24-1-implementation"
formedAt: "2026-10-11T14:18:36Z"
question: "固定 1.24.1 翻译、Rust/Kotlin 局部偏差、公开结果与同输入 Check 成本是否共同满足升级结果？"
tags:
  - "function-metrics"
  - "lizard"
  - "performance"
  - "source-alignment"
  - "verification"
relations:
  - type: "补充"
    target: "261008-assess-lizard-1-24-1-upgrade"
    summary: "实施选定新版并补充公开链和升级成本证据"
---

## 形成时背景

用户授权实施 `upgrade-lizard-source-baseline`，要求直接需求、编码规范和无多余抽象验收，并分别安排阶段正确性审核、最终优化审核。
前序[升级调查](assess-lizard-1-24-1-upgrade.md)保存固定新版与 14 项样例的采用价值；本轮补充真实移植、公开链与同输入完整 Check 成本。旧报告/资源保持形成时证据，不机械替换版本。

## 调查目的

验证七模块固定来源、Rust 真实 arm 贡献/Kotlin 正文位置局部偏差、来源与包法律闭合以及升级成本是否满足 Change Outcome。
两项 TypeScript 缺陷不由升级修复，Cognitive Complexity 只分类为 deferred，不扩大指标、公开 API 或通用 parser 框架。

## 调查范围与依据

实施前仓库基线为 `7ef5c73eaabecf0ad2e270a65ab0a62552429764`，旧固定来源为 `308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec`。
新来源 `0488a260e74e73ceba3149d7c600faac6a3616e6` 从已有本地 Git 对象只读 archive 取得，七模块 hash 逐项等于前序 source-review；未联网、fetch 或安装依赖。
Python oracle 生成使用已有 Pygments 2.18 环境与 `uv run --offline`，不成为产品运行时。

冻结实施前真实 `src/**/*.ts` 共 597 文件、3,021,891 bytes，以同一 corpus 比较升级前后实现；逐项 SHA-256、来源身份及形成方法已随附保存。
旧 exact candidate `0.0.0-local.af431b9f93b1` 的 status、tarball 与公开 Run 输出曾留存在临时目录 `/tmp/vibe-lizard-upgrade-20261011`；最终结论依赖随附持久证据，而非该临时目录仍存在。
完整 Check 比较以公开 `functionMetrics` → `run` → 真实 Worker 分析相同 exact patterns，四项 limits 严格设为 1 以观察完整 Finding 差异；这不是默认 Gate 速度测量。最终 120 样本及其输出对照见下文[成本证据](#最终完整-check-成本)。

实施阶段使用锁定 Bun 1.3.14、Node 24.18.0，已取得：

- 最窄 regex/Rust/Kotlin、整个 function-metrics 及 advisory 共 107 tests 通过；公开 Run 直接验证严格阈值、blocking、Rust 完整真实 arm 贡献、Kotlin 位置导致的 NLOC Finding、applied/unused waiver。
- 原始新版 14 项样例、两项 TypeScript controls、六消费者 78 项 raw-token 观察，与获批覆盖字段分开保存；27-reader/55-suffix、malformed 与 selected lifecycle 原始 corpus 实际重建并运行。
- source-mapping 只读审计/公共 sync 闭合 83 classes、841 symbols、46 translated records；85 项完整上游 records 包含 23 deferred、16 excluded。来源闭合不单独证明包产物或行为正确。

28 项随附资源共同保留来源/输入冻结、两轮性能样本与定位方法、完整输出差异及三轮 Gate 证据。
`corpus-manifest`、`seven-source-identity` 与 `measurement-identity` 用于复核输入/来源；`pre-guard-*`、`guard-diagnostic-samples`、`performance-*` 与 `final-cost-location` 区分诊断转折和最终统计；`changed-source-parity`、`output-difference` 解释行为变化；三份 Gate 文本与 `acceptance`/`gate-closure-metrics` 证明失败、更正及最终验收。
drivers、probe 和 `measurement-method` 保存形成时做法，不构成新增产品或维护入口。

## 调查结果与边界

### 本轮结论

- 固定 `1.24.1` 七模块移植、两项有界偏差、来源/法律材料及公开结果闭合；最终同一 local candidate 的完整 Gate 为 **43/43 passed、exit 0**。两项既有 TypeScript 缺陷仍由独立 Change 承接。
- 同输入完整 Check 的 warm median **+2.11%**，为已解释并接受的采用成本；cold paired 差异的 95% CI 跨零。**不声称无性能退化或 Gate 加速**。
- 结论只覆盖本轮冻结 corpus、锁定 runtime 与 local candidate；不代表正式发布、Git 提交/合入或其它环境已生效。剩余归因是有证据支持的推断，不是逐 stage 的因果分解。

### 核心行为与有界偏差

七模块移植保留 regex literal 优先识别/streaming、TS/TSX 共享 template、Python PEP 695 泛型、PHP trait 括号生命周期、Rust 独立 match scope 及 Kotlin expression/when。
两项获批局部偏差的直接验收结果为：

- **Rust：** 仅在真实 CCN 增量处、tags 已初始化时记录 `=>`；三 arm CCN 3，第 4/5 行两项贡献。首 arm/非 match 不计，无扩展不采集。
- **Kotlin：** 只恢复持有的 `FunctionInfo` 正文 endLine/NLOC，再重放 next token；全局 currentLine/file NLOC 不回退。expression 为 1/1、when 为 4/4，后续函数独立。

Kotlin `->` 不属于 reader conditions，其 CCN 内部事件不承诺全部投影为 condition-token contributors；公开说明据此解释而不新增事件模型。
两项 TypeScript 原始 controls 仍为 typed-tail CCN 4/NLOC 10、四次 `??` CCN 9/ND 8，单纯来源升级没有修复它们。

### 必要探索转折与修正

#### 两轮 source-start 翻译错误

1. 初译以 JS `^` 替 Python `\A`，但共享 tokenizer 固定多行模式。独立审阅用合法跨行 division 证明其吞掉 `?` 条件：错误 CCN 1/ND 0，原始新版 CCN 2/ND 1、`?` 在第 3 行。
2. 改为绝对起点 `(?<![\s\S])` 后，定向审阅发现锁定 Bun 1.3.14 对 astral 字符后 lookbehind 错误成功：`😀x` 的匹配 offsets 为 0、2，Node 24.18 仅 0；合法 `𝒜/(flag ? a : b)/y` 再次被误吞。
3. 最终 `(?<![^])` 在两宿主均仅匹配 offset 0，跨行/Unicode identifier 的 raw 与 metric 回归通过。独立 reviewer 进一步核对换行/BOM/astral/孤立 surrogate 及 78 项 raw oracle，零差异。

这些修正恢复 source fidelity，不是新增产品结果偏差。两轮原型性能测量被中断并降为非验收材料，未用于最终性能结论。

#### 阶段文档优化与代码核对

最终优化按 ai-ready-docs 与 coding-style 核对本轮 diff：区分实施前背景与当前进度，把公开结果、source-fidelity 偏差和本轮验收过程分别留在其 owner。
Kotlin 的函数边界快照、PHP 进入函数正文的 helper、Rust source states 和共享 template 均承接实际不变量或上游身份；未发现需要删除的多余抽象，未为风格偏好重写 translated state machines。

该阶段只改文档与 Case 正文，不改生产 TypeScript、测试代码、provenance/identity/pin 或原始 oracle；10 项相关 direct/Worker/public Run 测试及材料/治理检查通过。
当时随包指南与 changelog bytes 已改变，需要后续重建 candidate；这一阶段结果不单独证明包或性能。最终重建与组合验收见下文[包与 Gate 证据](#最终包与组合验收)。

#### 性能定位与等价 prefix guard

在最终 absolute anchor 固定后，首次 120 样本显示 cold 中位数增加 3.58%、warmed-operation 增加 4.66%。独立 Node profile 将主要增量定位到新 regex/tokenizer 与 streaming wrapper；发现本地 prefix 扫描对所有普通 token 重复调用 whitespace 判断。

随后只增加 `token.indexOf("/") > 0` guard：无 slash 或首位 slash 不可能发生前缀拆分。5-block ABBA、每侧 10 个 warmed facade 诊断样本的中位数从 470.96ms 降至 431.06ms，完整 facts digest 相同。7 个 supplied-token 边界、78 项 raw oracle、factory/streaming、cross-line/astral、6 项局部测试及独立正确性、最终规范复核通过；这不是第三项结果偏差。首次完整样本保留为定位转折，未覆盖或删除。

#### 两轮 42/43 Gate 与 typecheck 误报更正

1. **首轮 42 passed/1 failed：** artifact、installed Node 24.18.0 consumer、types、documentation 均通过；唯一失败为固定新版正确识别 `scripts/test-evidence/catalog/markdown.ts` 的 `parseCaseEntities`，CCN 11/NLOC 54 超过原有 10/50 限值。
2. **必要影响整改：** 不改指标、限值或 waiver，只将每条 Entities bullet 的格式/重复/seen 处理提为 private `parseCaseEntity`。block owner 继续持有字段要求、cursor、终止和 accepted 顺序；现有 malformed 测试补充非法 bullet 后接受 valid、完整 duplicate 位置身份断言。新版测量为 caller CCN 9/NLOC 29、helper CCN 4/NLOC 36。两文件不属于 Product runtime 或 package fingerprint，冻结 src/corpus 与最终性能不受影响。
3. **第二轮仍为 42/43：** Function Metrics 已通过，但新增断言把 `entityKey/line` 传给只接受 `caseId/path` 的既有 helper，导致 scripts typecheck 失败。最初连续 shell 命令没有 fail-fast，运行时测试通过掩盖了 typecheck 失败；先前“typecheck 通过”的阶段表述已撤回更正，不能将运行时测试成功视为类型验收。
4. **更正与复验：** 改为对完整 diagnostic 对象深比较，不扩大 helper 签名；以 fail-fast 重跑两项 catalog tests、typecheck/lint/format，均通过。局部整改经独立正确性与 coding-style/无多余抽象审核后，再重跑完整 Gate；两轮失败证据均保留，最终结果见下节。

### 最终完整 Check 成本

guard 审核后重新冻结最终 source，完整重跑两个 temperature 各 15-block ABBA、每侧 30 样本；测前/测后 source 与 597-file corpus hashes 相同，所有 counted samples 的完整 Check outcome/Records 稳定，且与 guard 前相同。

| Temperature 与统计范围 | Before median / p95 | Final median / p95 | 有界判断 |
| --- | --- | --- | --- |
| cold whole fresh target wall | 3171.15 / 3432.17ms | 3227.78 / 3272.18ms | median +1.79%；paired mean +21.40ms，block bootstrap 95% [-14.08, 49.20]ms 跨零，冷态不确定性保留。 |
| warmed-operation 第二次 public Run | 2395.97 / 2491.28ms | 2446.49 / 2511.08ms | median +2.11%；paired mean +51.90ms，95% [37.25, 66.66]ms，承认可重复新增成本。 |

raw samples 全保留，没有剔除 IQR outliers。cold before 有三个尾部 outliers，不将较低 after p95 当作加速；bootstrap 按 15 个 ABBA blocks 重采（seed 261011、5000 次），只估计当前样本条件下的 paired mean 差异。cold 不等于清空 OS 文件缓存，warmed 不等于长期 warm session。

输出为 non-blocking passed，Findings 9032→9188：8974 unchanged、13 removed、169 added、45 changed。28 个变化文件中，精确两版 Python 与各自本地 facade 全部字段均零差异，函数数 547→624；完整 597-file facade 数量 5632→5709。因此输出变化来自固定上游识别路线，而不是 Rust/Kotlin 偏差（冻结语料均为 TypeScript）。原始完整 Record 差异随附；anonymous occurrence 因函数识别变化可能重排，不能只按相同 identity 的位置变化解读为移动。

最终 Node profile 的同已解码 corpus facade 约 408ms/遍，旧版约 349ms/遍，guard 前约 453ms/遍；独立 tokenizer 10 次样本 median 91.54→96.75ms、tokens 784377→787446。结合 source-aligned regex/template、eager→streaming 顺序、profile 热点和精准双版输出对照，推断剩余约 50ms 完整 warm 成本来自固定新版识别/streaming 行为；这不是逐个函数或每个 stage 的因果拆分证明，诊断绝对值也不替代 paired 完整 Check 统计。已证明可避免的本地扫描已删除，没有为消除所有毫秒差扩大到新算法优化。

本计划要求无未解释的可重复退化，不要求升级零成本；独立 root 审核据上述边界接受 +2.11% warm 采用成本，成本出口据此闭合。
已使用 Node CPU sampling profile 定位热点；**未测量进程 CPU time/RSS 资源指标**，不声称资源改善。默认阈值、其他语言比例、其它 Node/主机及长期 warm 情境未覆盖；固定旧 Python 的 B workflow 没有被用来证明新版 parity。

### 最终包与组合验收

最终 guard 后已重跑整个 function-metrics/advisory 107 tests、source-mapping 只读、typecheck/lint、Case 全树 692 entities/173 Cases 及 357 Decision 检查，均通过。
公共 `package:build` 重建并安装 exact local candidate `0.0.0-local.fa733ec0cf8d`，`package:status` 为 current；并非正式发布。
报告通过公共 candidate/preflight/publish 建立后，validate（139 JSON、5 schema、512 Markdown）通过。随后两轮 Gate 的失败与必要整改如上，未改变 candidate 或性能测量边界。

最终 `mise exec -- bun run check -- --all` **43/43 passed、exit 0**，耗时29.4s，evidence root 为 `.log/project-gate/2026-10-11T15-08-55.528Z-1567523-dcedc07b-f682-4ffc-bb82-bd7a1a7b2aba`。同一 candidate 的 artifact、法律/来源、隔离 installed declarations/docs 与 Node 24.18.0 runtime 全通过；Rust fixture 通过 installed public root 执行 emitted Worker，CCN3与第4/5行两个真实 `=>` Finding/message符合预期。机器结果的43个终态逐项复核为 passed，没有 not-applicable 或 unavailable。candidate tarball SHA-256 为 `39273b62b0228c88ded1361d34e0420d8bdcdb66ed437d82ba42f73065f464e9`。

Gate 事实补入后通过公共 `sync-index` 与全量 Investigation 检查（65 reports/full index current）、validate（141 JSON/5 schema/512 Markdown）、17/17 Change 集合检查、Case 692/173、Decision 357、current package 状态与 diffcheck，均 exit 0。目标任务 16/16；Git 提交与 Change finalize 尚未执行。

相邻 TypeScript typed-tail/`??` 修复和 input-admission 优化仍为独立授权任务，不由本轮验收代替。

## 随附资源

- [acceptance.json](./_resources/261011-verify-lizard-1-24-1-implementation/acceptance.json)
- [benchmark.py](./_resources/261011-verify-lizard-1-24-1-implementation/benchmark.py)
- [changed-source-parity.json](./_resources/261011-verify-lizard-1-24-1-implementation/changed-source-parity.json)
- [compare-facts.py](./_resources/261011-verify-lizard-1-24-1-implementation/compare-facts.py)
- [completed.json](./_resources/261011-verify-lizard-1-24-1-implementation/completed.json)
- [corpus-manifest.json](./_resources/261011-verify-lizard-1-24-1-implementation/corpus-manifest.json)
- [corpus-port-probe.mjs](./_resources/261011-verify-lizard-1-24-1-implementation/corpus-port-probe.mjs)
- [corpus-upstream-probe.py](./_resources/261011-verify-lizard-1-24-1-implementation/corpus-upstream-probe.py)
- [final-cost-location.json](./_resources/261011-verify-lizard-1-24-1-implementation/final-cost-location.json)
- [final-gate-43-of-43.txt](./_resources/261011-verify-lizard-1-24-1-implementation/final-gate-43-of-43.txt)
- [first-gate-42-of-43.txt](./_resources/261011-verify-lizard-1-24-1-implementation/first-gate-42-of-43.txt)
- [gate-closure-metrics.json](./_resources/261011-verify-lizard-1-24-1-implementation/gate-closure-metrics.json)
- [guard-diagnostic-samples.json](./_resources/261011-verify-lizard-1-24-1-implementation/guard-diagnostic-samples.json)
- [measurement-identity.json](./_resources/261011-verify-lizard-1-24-1-implementation/measurement-identity.json)
- [measurement-method.md](./_resources/261011-verify-lizard-1-24-1-implementation/measurement-method.md)
- [output-difference.json](./_resources/261011-verify-lizard-1-24-1-implementation/output-difference.json)
- [paths.json](./_resources/261011-verify-lizard-1-24-1-implementation/paths.json)
- [performance-samples.json](./_resources/261011-verify-lizard-1-24-1-implementation/performance-samples.json)
- [performance-summary.json](./_resources/261011-verify-lizard-1-24-1-implementation/performance-summary.json)
- [port-cost-driver.mjs](./_resources/261011-verify-lizard-1-24-1-implementation/port-cost-driver.mjs)
- [pre-guard-measurement-identity.json](./_resources/261011-verify-lizard-1-24-1-implementation/pre-guard-measurement-identity.json)
- [pre-guard-performance-samples.json](./_resources/261011-verify-lizard-1-24-1-implementation/pre-guard-performance-samples.json)
- [pre-guard-performance-summary.json](./_resources/261011-verify-lizard-1-24-1-implementation/pre-guard-performance-summary.json)
- [pre-guard-profile-summary.json](./_resources/261011-verify-lizard-1-24-1-implementation/pre-guard-profile-summary.json)
- [product-driver.mjs](./_resources/261011-verify-lizard-1-24-1-implementation/product-driver.mjs)
- [second-gate-42-of-43.txt](./_resources/261011-verify-lizard-1-24-1-implementation/second-gate-42-of-43.txt)
- [seven-source-identity.json](./_resources/261011-verify-lizard-1-24-1-implementation/seven-source-identity.json)
- [token-cost-driver.mjs](./_resources/261011-verify-lizard-1-24-1-implementation/token-cost-driver.mjs)
