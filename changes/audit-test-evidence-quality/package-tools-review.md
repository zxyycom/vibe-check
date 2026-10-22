# Package tools / function-metrics 前门 / Markdown lint 全量审查

## 结论与范围

已逐一读完本分区 **31 文件、84 当前实体**：package-tools 12/36、function-metrics 前门 13/31、Markdown lint 6/17；不是抽样。已读全部参数行、实际委托 helper/child 和 analyzer adapter 的 82 项固定 oracle 及其全部 source fixtures。31 个文件的当前 SHA-256 均与本轮 scope 一致。

没有找到足以直接删除整个实体的证据。建议 **4 个实体局部重写、1 个实体删除单条恒真断言**；其余 79 个保留。没有据运行速度、Case 共用或上下层出现相同输入提出删测。以下是审计建议，未修改测试、Case 或 Product。

本轮以 AGENTS、文档导航、测试策略、Case 维护、`test-evidence-review`、编码规范为程序规则；行为依据为公开工具/Check 指南与 `docs/development/package-tools.md`、`scanner-dependencies.md`、`project-files.md`、`check-results.md` 对应 owner。已逐实体核对本轮 `cases-by-entity.json` 的 Owner / Proves。调用关系和正文优先通过 CodeGraph 读取；JSON、文档、未索引的多语言 fixture 与固定依赖规则直接读取。

## 有依据的局部处置

### PT-1：front matter fixture 对所声称的能力没有区分力（重写，P2）

- **实体：** `Markdown lint adapter > uses fixed front matter and ignores inline configuration`。
- **位置：** `/workspace/vibe-check/src/package-checks/markdown-lint/adapter.test.ts:32–43`。
- **Owner / Case：** `docs/checks/markdown-lint.md#工作原理`；`SCAN-SCOPE-MARKDOWN-LINT-DIALECT`。
- **具体缺陷：** YAML 区域仅为 `--- / title: Document / ---`，对所选 `heading-increment` / `no-missing-space-atx` 本来就不形成 Finding；外部只有 `#missing`，断言也仅要求“存在 MD018”。即使不识别 front matter，该断言仍成立。它有效证明禁用 inline configuration，却不能证明 Case 同时声称的 front matter recognition。
- **现存承接与动作：** 九规则矩阵和 constructor 的固定 Record 期望继续承担规则映射；本分区没有其它可区分 front matter 的 fixture。保留实体和 inline-config 义务，加入在不识别 front matter 时会触发选中规则的内容，并精确断言仅有外部诊断及其行号；按公开 YAML/TOML/JSON 支持范围组织变体，不为矩阵行另造实体或 Case。

### PT-2：MD052 的“helper 不泄漏”输入未让 helper 产生诊断（两实体局部重写，P2）

- **实体及位置：**
  - `Markdown lint adapter > warms MD052 parsing without leaking its helper rule`，`/workspace/vibe-check/src/package-checks/markdown-lint/adapter.test.ts:46–58`。
  - `Markdown lint Check > reports MD052 reference forms through the public single-rule Check`，`/workspace/vibe-check/src/package-checks/markdown-lint/constructor.test.ts:202–221`。
- **Owner / Cases：** `docs/checks/markdown-lint.md#工作原理` / `SCAN-SCOPE-MARKDOWN-LINT-DIALECT`；`docs/checks/markdown-lint.md#效果与结果` / `QUALITY-RUNTIME-MARKDOWN-LINT-REFERENCES`。
- **具体缺陷：** 两者相同的 `### Warmup heading` 是文档首个 heading，且无 front-matter title。固定 backend 的 `node_modules/markdownlint/lib/md001.mjs:18–29` 以 `MAX_SAFE_INTEGER` 初始化前级，首个 H3 不触发 MD001。因此移除 `/workspace/vibe-check/src/package-checks/markdown-lint/adapter.ts:138` 的 selected-rule 过滤时，该 fixture 仍只产生三项 MD052，无法反证 helper leakage。
- **现存承接与动作：** 两者确实证明 full/collapsed/image references、忽略 task label/shortcut 和仅选 MD052 的执行路径；不能删整实体。将文本改为先 H1 再 H3 等必然触发 MD001 的场景，继续要求仅三项公开 reference Findings。adapter 证明后端选择过滤，Check 层证明没有 Record 泄漏，二者层级不同，均保留。此为 fixture 行修改，不是删除两个实体。

### PT-3：并发测试用 10ms 代替两次 computation 入场确认（重写，P2）

- **实体：** `caller-keyed JSON cache > permits concurrent computation while exposing only a complete cached target`。
- **位置：** `/workspace/vibe-check/src/package-tools/cache/cache-json-by-key.test.ts:338–375`，尤其 353–360。
- **Owner / Case：** `docs/guides/cache-results.md#缓存计算结果`；`AUX-CALLER-KEYED-JSON-CACHE-001`。
- **具体缺陷：** 测试启动两个异步 lookup 后固定等 10ms，就放行 computation，却断言两次都 computed、`calls === 2`。若第二次 filesystem read 在首次 publication 后完成，它可合法得到 hit；10ms 不是两次 miss/computation 已入场的同步事实。这是对 I/O 时序的隐含假设，不是 cache 的承诺，存在负载相关误失败风险；本轮没有实跑复现，不能称已观察到 flake。
- **现存承接与动作：** EEXIST/EACCES 两个隔离 child 继续证明 rename 失败分类，顺序 cold/hit 测试证明复用；它们不替代真实 concurrent miss 的完整发布义务。保留并发实体，让两个 compute 均显式通知已进入后再 release barrier，移除固定等待；保留最终 parser-backed hit 与临时文件清理断言。

### PT-4：手写数组长度断言恒真（只删单断言，P3）

- **实体：** `admission policy authoring > preserves policy identity and closed generic authoring types`。
- **位置：** `/workspace/vibe-check/src/package-tools/admission-policy/define-admission-policy.test.ts:85–91`。
- **Owner / Case：** `docs/guides/scheduling.md#自定义准入-policy`；`API-ADMISSION-POLICY-AUTHORING-001`。
- **具体缺陷：** `policies` 直接用四个元素的数组字面量创建，`assert.equal(policies.length, 4)` 与任何 helper 行为无关；helper 返回错误值甚至 undefined 也不会改变数组长度。
- **现存承接与动作：** 删除第 91 行的单条断言即可；保留数组的 `readonly AdmissionPolicy[]` assignability 校验（可用 `void policies` 消费），原对象 identity、literal inference、simple/prepared/async prepared 和 `@ts-expect-error` 闭合类型证据全部保留。不能据这一条断言删除整个实体，也不能把未运行 typecheck 的本轮审读称为类型验证通过。

## 逐文件处置

下表覆盖 scope 中全部文件；数量为当前 runner entity 数，不把矩阵行、hook、helper 或 child 当实体。路径相对于 `/workspace/vibe-check/`。

| 文件 | 实体 | 处置与独立证明信号 |
| --- | ---: | --- |
| `src/package-checks/function-metrics/analysis.test.ts` | 1 | 保留：完整 metric 正控及 contributors / ND 缺损拒绝。 |
| `src/package-checks/function-metrics/analyzer-adapter.test.ts` | 3 | 保留：55 suffix / 27 reader 的固定外部 oracle、contributors/ND 映射、整批 unsupported 拒绝。 |
| `src/package-checks/function-metrics/analyzer-worker.test.ts` | 1 | 保留：真实 Worker source-tree adapter、Rust/Kotlin/TS 完整 facts 与 malformed transport。 |
| `src/package-checks/function-metrics/constructor.area-findings.test.ts` | 1 | 保留：四指标、重叠区域最严限制/阻断、完整 contributors 与 message 截断。 |
| `src/package-checks/function-metrics/constructor.input-rejection.test.ts` | 2 | 保留：混合输入的 area-aware rejection 与全 rejected 的完整 12 Records。 |
| `src/package-checks/function-metrics/constructor.test.ts` | 4 | 保留：defaults/authoring、真实 Run、可控在途取消清理、Check 级资源失败无 audit。 |
| `src/package-checks/function-metrics/finding-waivers.test.ts` | 4 | 保留：authoring、完整空集合 audit、applied/stale、真实重复函数 overmatch。 |
| `src/package-checks/function-metrics/measurement.admission.test.ts` | 4 | 保留：pre-abort、真实默认 setImmediate 的 timer/I/O 取消、跨文件停止、真实 Worker 清理。 |
| `src/package-checks/function-metrics/measurement.encoding.test.ts` | 1 | 保留：13 个独立固定 bytes/text 观察，覆盖 BOM、合法 U+FFFD、UTF-8 fallback 与换行差异。 |
| `src/package-checks/function-metrics/measurement.resource.test.ts` | 6 | 保留：8/64 MiB 等限及 +1、读取失败、post failure、reply/event 矩阵、Check 取消无 partial facts。 |
| `src/package-checks/function-metrics/target-files.test.ts` | 1 | 保留：adapter capability 与 default globs/runtime eligibility 一致、大小写与拒绝控制。 |
| `src/package-checks/function-metrics/typescript-metrics.integration.test.ts` | 2 | 保留：public Run 的 typed-tail/??、四 profile、waiver 和 9 contributors/8 preview 边界。 |
| `src/package-checks/function-metrics/upgrade.integration.test.ts` | 1 | 保留：Rust/Kotlin/JS 经真实 Worker 到 Finding/waiver/等限终态。 |
| `src/package-checks/markdown-lint/adapter.test.ts` | 3 | 保留规则矩阵；2 个实体按 PT-1/PT-2 重写 fixture，不删实体。 |
| `src/package-checks/markdown-lint/constructor.test.ts` | 4 | 3 个实体保留；reference 实体按 PT-2 重写。固定 Records、IDs、message、范围排序与终态均有有效证据。 |
| `src/package-checks/markdown-lint/finding-waiver-authoring.test.ts` | 2 | 保留：独立深冻结、完整 rule/range 正控及逐层非法/hostile/resolved 输入。 |
| `src/package-checks/markdown-lint/finding-waiver-boundaries.test.ts` | 1 | 保留：空 selection 与完整空 lint 的不同 audit；decode/byte/finding/cancel 无 partial lint。 |
| `src/package-checks/markdown-lint/finding-waivers.test.ts` | 2 | 保留：原 evidence/counts 与 live policy；synthetic 完整 range overmatch/稳定 audit。 |
| `src/package-checks/markdown-lint/findings-cache.test.ts` | 5 | 保留：cache identity、完整 cold/warm/fresh parity、live waivers/limits、fault fallback、独立 child 缺失能力拒绝。 |
| `src/package-tools/admission-policy/define-admission-policy.test.ts` | 1 | 按 PT-4 删除单断言；整个 authoring/type 实体保留。 |
| `src/package-tools/cache/cache-json-by-key.test.ts` | 11 | 10 个实体保留；并发实体按 PT-3 改同步屏障。parser、identity、read/write failure 各有区别。 |
| `src/package-tools/change-flag-debugging/change-flag-debugging.boundary.test.ts` | 2 | 保留：no-follow/defaults 与空/非法/FS failure 不能互相替代。 |
| `src/package-tools/change-flag-debugging/change-flag-debugging.test.ts` | 4 | 保留：固定映射、public Run differential、快照刷新与阻断 I/O 的隔离 child。 |
| `src/package-tools/context-callback/define-context-callback.test.ts` | 1 | 保留：descriptor identity、真实 callback 业务返回及七阶段正负类型约束。 |
| `src/package-tools/finding-presentation/finding-presentation.test.ts` | 1 | 保留：明确前缀、原引用与 overflow 计数/冻结、zero limit、非法 limit。 |
| `src/package-tools/finding-waivers/reconciliation.test.ts` | 5 | 保留：default/structural/overmatch、原 finding 引用、detached waiver、hostile 输入。 |
| `src/package-tools/learned-critical-path/critical-path-ranking.test.ts` | 1 | 保留：固定 2+max(5,7)=9，依赖/观察边、冻结与缺失项失败。 |
| `src/package-tools/learned-critical-path/duration-model/scheduler-duration-prediction.test.ts` | 2 | 保留：固定 mean/p90、digest-only 与 learned/prior/cold hierarchy、顺序不变性。 |
| `src/package-tools/learned-critical-path/duration-model/scheduler-duration-recording.test.ts` | 3 | 保留：sample window/sequence、admitted timing、共享 identity 合并、series eviction。 |
| `src/package-tools/learned-critical-path/duration-model/scheduler-duration-storage.test.ts` | 2 | 保留：digest-only、float roundtrip、invalid/incompatible/read/write 与 last-writer 完整模型。 |
| `src/package-tools/learned-critical-path/strategy.test.ts` | 3 | 保留：public comparator/layers/wait/fallback、prepared index 复用、observer failure 包含。 |
| **合计** | **84** | **79 原样保留，4 局部重写，1 仅删单断言；0 整实体删除。** |

## 必要保留与实际委托材料

- **不是由 SUT 自算 expected：** cache 的 fresh/cold/warm、change-flag 与 Run differential、waiver 前后同一原 Record 的保留比较，证明的是不同入口/状态间的等价与不变量；另有固定内容/计数/终态锚点，不能一概当循环 oracle 删除。
- **层级不是重复依据：** analyzer adapter、真实 Worker 与 public Run 分别证明转换、可执行传输和 Check publication/policy。resource 矩阵的 resolved-Promise seam 不证明生产默认让步，`measurement.admission.test.ts` 的实际 setImmediate 委托才承担该义务；真实 Worker 清理证明 unsubscribe/terminate 调用次数，不证明物理线程已退出。
- **固定 oracle 的 edge 边界：** 82 项实际源码均已读；27 个 edge 是对应 normal 的额外尾随换行变体，合法证明 NLOC/函数位置不被尾随空行污染，不把“edge”解释为覆盖额外语言语法。55 suffix 的重复正文仍证明 suffix 路由，不因字节相近删除参数行。
- **类型证据不是 runtime 冒烟的替代品：** admission/context callback 文件内的赋值和 `@ts-expect-error` 由 TypeScript 承担；本轮只审读，没有执行其 typecheck。
- **synthetic publication 有明确边界：** Markdown lint 重复完整 identity 由 `publishMarkdownLintTraversal` 的 synthetic candidates 证明，Case 已明确不声称真实 backend 必然生成重复诊断；无需把它改成不稳定后端复现。

完整读取的直接 test-support 包括：共同 `check-execution.test-support.ts`、function-metrics `constructor.test-support.ts`、`code-quality-findings/finding-waiver-evidence.test-support.ts`；Markdown lint `markdown-lint.test-support.ts` 与完整 `reference-capability.test-support.ts` child；change-flag `change-flag-debugging.test-support.ts` 和实际 `git.test-support.ts`；learned `strategy.test-support.ts`、`scheduler-duration-model.test-support.ts` 与 `scheduler-graph-snapshot.test-support.ts`。内联 child、nested source builders、byte/resource/authoring/failed-event 矩阵亦全部审读。

必要实现已核对 cache identity/envelope/atomic publish、waiver materialization/reconciliation、change-flag snapshot/query/formatter、两项 type helpers、Finding presentation、learned prediction/recording/storage/strategy，以及 function measurement/admission/execution/adapter、Markdown adapter/cache/traversal/publication/Records。固定 MD001 实现仅用于核对 PT-2 的实际触发条件；未将第三方上游测试扩张为本项目待普查实体。

## 验证边界

- 主线程已执行全树实体/Case 闭合，本分区未重复执行。当前只完成静态语义审读、完整委托材料读取和 31 个 hash 复核，不能宣称 84 个正文运行通过。
- 依授权未运行测试正文、Gate、build、install、网络、stage 或 commit；未改其它已有 Gate/报告。正式输出仅本报告；精确 `reviewedEntityKeys` 与空 `unreviewedEntityKeys` 位于本轮 `.log` scratch 的 `package_tools/coverage.json`，仅作本地完成证据，不提交第二账本。
- PT-1/PT-2 可由主线程在隔离副本移除 front-matter 识别 / selected-rule 过滤取得动态反证；PT-3 可受控延迟第二次 read 验证。不将尚未执行的 mutation 或 flake 当成已发生事实。后续若实施，按对应实体运行最窄测试，并执行当前 Test Evidence / 材料验证；涉及类型 fixture 另运行实际 typecheck。
