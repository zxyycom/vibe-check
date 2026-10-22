# Repository 测试与补充入口全量审查

## 结论与范围

本分区已逐体审读 **29 个常规测试文件、79 个 Bun entity**；不是抽样。判断包括每个正文、内联矩阵、实际调用的 assertion helper、fixture，以及 Case 的 owner / Proves。没有整实体可直接删除的充分依据；四组证据须局部补强，一组清理 fixture 生命周期，一项 Case 文案应校正。另有一项已被正式 Gate mutex 缓解的隔离风险，不能误报成已复现竞态。

范围以本轮 `/workspace/vibe-check/.log/test-quality-audit/20261022-full-02N0Mb/repository-scope.json` 为准；逐实体读取闭合证据保存在同轮 `repository/coverage.json`，不作为提交后的第二账本。全仓 766 entity / 190 Case 的官方 registration closure 由主线程执行；本代理没有重复注册，也没有执行任何测试正文、Gate、build、install 或网络请求。

下列补充材料**另计，不加进 79 或全仓 766**：显式 candidate integration 的 6 个测试节点；4 个 ast-grep rule-test YAML 的 **14 个正/负片段**；documentation registry 的 29 篇 runtime source、33 个 projection region、1 个 acceptance support，以及 machine Definition；compiler-only 类型验收按工程证据分类。已在上一批完整读审且本轮受保护 diff 相同的 installed runtime / command fixture 和 typecheck contributions，归并 package 报告的既有证据，不冒称本轮重新全读。

## 判据与 owner

先读 `/workspace/vibe-check/AGENTS.md`、`/workspace/vibe-check/docs/navigation.md`、测试策略、Case 维护、`test-evidence-review` skill、编码规范，以及 tooling / governance owner。当前契约分别来自：

- `/workspace/vibe-check/docs/tooling/workspace.md`：development targets、process / repository-file capability、dependency direction。
- `/workspace/vibe-check/docs/tooling/documentation.md` 与 `/workspace/vibe-check/docs/tooling/repository-material-validation.md`：投影、映射、material workflow、独立验收和 process-entry Manual CR。
- `/workspace/vibe-check/docs/tooling/lizard-performance.md`、`/workspace/vibe-check/docs/tooling/lizard-upstream.md`、`/workspace/vibe-check/docs/tooling/admission-workbench.md`：统计、advisory 与虚拟比较边界。
- `/workspace/vibe-check/docs/tooling/project-gate.md#test-execution-partition`、package lifecycle / artifact owner：routine lanes、材料 mutex、显式物理集成、exact installed candidate。
- `/workspace/vibe-check/docs/development/output-maintenance.md#package-材料的维护与验证` 与各示例的公开专题：machine material 和可执行说明。

评价按“owner 承诺 → 可观察故障 → 实际 assert → 可靠性、独立性、维护价值”，不按运行慢、实体数量或同名 Case 决定删除。以下反例均为正文静态分析；未做 mutation execution，不能理解为已测得变异存活率。

## 有依据的候选

### R-01 / 补强实体内断言：ABBA / bootstrap 不能只用自等证明正确

- **完整实体：** `Lizard TypeScript developer performance evidence > uses every ABBA block in deterministic bootstrap classification and only marks IQR outliers`。
- **位置：** `/workspace/vibe-check/scripts/development/lizard-performance/command.test.ts:122-135`。
- **Owner / Case：** `/workspace/vibe-check/docs/tooling/lizard-performance.md#证据与测量方法`；`AUX-LIZARD-PERFORMANCE-EVIDENCE-001`。
- **具体缺陷：** CI 只与同函数、同输入的第二次调用比较；ratios 没有独立 expected，输入全部远离分类阈值。固定返回某个足够大的 deterministic CI 仍满足这些断言。测试也不调用 `/workspace/vibe-check/scripts/development/lizard-performance/sampling.ts:35-89` 的真实 `compareSamples` / ABBA 分组路径，因此“every ABBA block”不是它的当前失败信号。`summarize(...).outliers === [10]` 有独立价值，不能连带删除。
- **动作与证据去向：** 保留实体；对小型手算数据直接核对成对 ratios、分组完整性与已知统计结果，并使 bootstrap accuracy 与 deterministic replay 的信号分开。保留 outlier 标记、not-comparable 和温度边界；没有另一现存实体承接 ABBA 数值正确性，不能整删。无需每个矩阵行另建实体或 Case。

### R-02 / 补强局部目标断言：format expected 引用同一个受测 targets

- **完整实体：** `development quality target boundaries > excludes only generated function-analyzer oracle fixtures from product lint and format`。
- **位置：** `/workspace/vibe-check/scripts/development/quality-targets.test.ts:12-39`。
- **Owner / Case：** `/workspace/vibe-check/docs/tooling/workspace.md#development-tooling`；`AUX-DEVELOPMENT-QUALITY-TARGETS-001`。
- **具体缺陷：** 第 29-35 行将受测导出的 `workspaceFormatTargets` 原样 spread 到 expected。若 `/workspace/vibe-check/scripts/development/format-targets.ts` 删除正向 `src/**/*.ts`，invocation 与 expected 一同缩小，负规则断言也不受影响。ignore 常量同样同时进入 SUT 与 expected，不能独立证明“only generated fixtures”。Case 中 standalone format `--check`、无 translated-only typecheck 例外也不是此实体的实际观察。
- **动作与证据去向：** 保留有效的独立 lint flags / scripts JSON 接线断言；对 owner 要求保留的普通 Product 输入及唯一生成目录排除增加独立边界 expected，而非复制整份可随意演变的 target 清单。Case 超出本实体的部分应与真正 compiler / default invocation 证据关联或收窄，不能靠此处 spread 宣称已证。无整删依据。

### R-03 / 补强局部矩阵：所谓 exact profile vectors 只观察 ID

- **完整实体：** `admission workbench > freezes exact profile vectors and the claimed-only Gate resource shape`。
- **位置：** `/workspace/vibe-check/scripts/project/admission-workbench/simulate.test.ts:328-350`。
- **Owner / Case：** `/workspace/vibe-check/docs/tooling/admission-workbench.md#evidence-与输出边界`；`AUX-ADMISSION-WORKBENCH-001`。
- **具体缺陷：** profile 部分只投影四个 `id`，不核对 `/workspace/vibe-check/scripts/project/admission-workbench/scenario-fixtures.ts:8-29` 的四项 `nominalWorkMs` 或倍率向量。Gate mapping identity 又直接等于同一导出对象的 identity。当前 17 / 4 claims 数量、root 3、virtual-not-Gate 标记仍有独立断言，不能因一段弱而整删。
- **动作与证据去向：** 保留实体及上述独立 shape 信号；按 owner 的固定来历，以独立字面量或明确冻结的原始来源核对精确数值和 identity，不从同一受测导出重建 expected。跨 policy 相同 sampled-work / deterministic replay 测试证明共享与复放，不承接原始 proxy 数值不漂移，不能作为删掉本义务的替代。

### R-04 / 改写边界观察器：顶层字符串搜索不能证明整个 workbench 不依赖 Gate

- **完整实体：** `workbench source consumes only the installed public package and never the Gate entry`。
- **位置：** `/workspace/vibe-check/scripts/project/admission-workbench/command.test.ts:108-117`。
- **Owner / Case：** `/workspace/vibe-check/docs/tooling/admission-workbench.md#virtual-admission-workbench`；`AUX-ADMISSION-WORKBENCH-001`。
- **具体缺陷：** 只 `readdir` 顶层 `.ts`，漏掉 `learned-heuristic-evaluation/**`；只搜索双引号 `from`，不识别单引号、dynamic import 或路径别名。Gate 相对路径还写成 `../../gate/`，而当前 workbench 顶层到 sibling Gate 的路径是 `../gate/`；合法拼写的 `from "../gate/run.ts"` 不匹配三个字符串。测试也没有正向确认实际 package import。
- **保留与替代：** `/workspace/vibe-check/scripts/validation/repository-layout.test.ts:90-109` 及 `/workspace/vibe-check/scripts/validation/import-boundaries.ts:25-45,72-75` 已从递归 source corpus 解析并拒绝 Project→Product deep import；它没有 Workbench→Gate 拒绝规则，不能据此整删此实体。
- **动作：** 复用现有 source walker / module-specifier analysis，在 owner-local 边界解析实际目标，包含子目录；保留 Gate 分离的独占证明。Product half 可在确认覆盖后交回已有 layout 证据，不再用字符串重复冒充同等保证。不要新增测试专用 public interface。

### R-05 / 保留实体并清理 fixture 生命周期：成功与失败路径都要回收独占临时目录

- **完整实体与位置：** `/workspace/vibe-check/scripts/project/admission-workbench/command.test.ts:51-62` 的 `command exclusively creates an explicit output after complete serialization`；第 64-86 行的 `command rejects malformed arguments inputs and unsafe output targets`；第 88-106 行的 `command returns nonzero error evidence with parsed identity for a public graph rejection`。
- **Owner / Case：** `/workspace/vibe-check/docs/tooling/admission-workbench.md#evidence-与输出边界`、编码规范的副作用 / 资源边界；`AUX-ADMISSION-WORKBENCH-001`。
- **具体缺陷：** 三个独占 `mkdtemp` root 均没有清理，且 `evidence.json` / malformed / graph fixture 不属于稳定 evidence。第 140-168 行 bootstrap helper 已有 `try/finally`，不会替前述三个不同 root 回收。
- **补充材料的同类问题：** `/workspace/vibe-check/docs/examples/package-api/cache-json-by-key.ts:4-33` 和 `/workspace/vibe-check/docs/examples/package-api/learned-critical-path.ts:17-47` 每次 documentation acceptance 都向全局 `/tmp` 新建随机 cache/history，未回收；consumer 根目录的最终清理不覆盖这些外部路径。对应 `AUX-PACKAGE-API-DOCUMENTATION-001`；公开 cache / learned owner 明确由 caller 管理 retention。
- **动作与承接：** 保留所有输出独占、拒绝、graph identity、cache reuse 与两次 learned Run 的业务证据；由已有 fixture owner 加入失败安全的清理。验收辅助可留在非投影区域，但不能只在成功末尾 `rm`。这不是慢测试删除候选，也不要求新建 Case。

### R-06 / 只校正 Case，不删测：upstream baseline 文案漂移

- **实体：** `/workspace/vibe-check/scripts/maintenance/lizard-upstream-advisory.test.ts:10,36,49,68` 的 `Lizard upstream advisory reports the pinned 1.24 baseline as current without ambient credentials`、`Lizard upstream advisory reports a stable newer release without changing anything`、`Lizard upstream advisory keeps HTTP, malformed, and oversized responses advisory`、`Lizard upstream advisory maps timeout and network failures to stable advisory results`。
- **Owner / Case：** `/workspace/vibe-check/docs/tooling/lizard-upstream.md#transport-and-result`；`AUX-LIZARD-UPSTREAM-ADVISORY-001`。
- **事实：** owner 与测试的独立 expected 均为 `1.24.1`；`/workspace/vibe-check/docs/testing/cases/repository-tooling.md:568` 的 Proves 仍写 `1.24.0`。这是合法映射闭合不能发现的语义漂移，不是测试正文坏掉。
- **动作：** 保留全部四实体，更新该处 Case baseline；`1.24` 的测试名无需为 patch version 机械 rename。performance 的 fixed Python `1.24.0` 对照属于另一个 owner，不连带改写。

## 已有缓解的风险，不作为已证删除候选

`independent repository material machine artifact validation > detects generated schema and example drift` 在 `/workspace/vibe-check/scripts/validation/repository-material/machine-artifacts/validation.test.ts:236-243,339-360` 暂改真实 checkout 的 schema、run 和 Definition，再 `finally` 还原；这是唯一 generation drift 负向证据，不可整删。当前 Gate owner 明确给材料测试与 validators 共用 mutex，已缓解正式 Gate 内部并发。直接并行 Bun、其它进程或人工同时编辑不受该 invocation-local mutex 保护，恢复旧 bytes 也可能覆盖期间的新内容；本轮没有执行或复现该场景。若将来要求这些并行方式，优先在独占 repository fixture / 隔离 child 中运行同一真实生成器，或明确 serial-only 约束；不为审计直接增加根参数或 public seam。

## 逐文件审查闭合

以下每行的计数覆盖文件全部实体及其调用的测试辅助；“保留”不表示已执行通过，也不表示证明 owner 全部可能输入。

| 常规文件（均位于 `/workspace/vibe-check/`） | 实体数 | 主要判断 |
| --- | ---: | --- |
| `scripts/development/lizard-performance/command.test.ts` | 7 | 保留；R-01 补统计 oracle。参数拒绝、metric field 定位、排序、温度、digest drift、Linux scope label 各有可观察信号。 |
| `scripts/development/quality-targets.test.ts` | 1 | 保留；R-02 修 targets 同源 expected。 |
| `scripts/docs/package-api/command.test.ts` | 1 | 保留；fixture 上 write/check、stale Markdown/JSDoc、不写 check、正文保留信号不同。 |
| `scripts/docs/package-api/render.test.ts` | 2 | 保留；128 disjoint replacements 的全字节 expected、每 registry payload、长 fence，以及全部 malformed heading/fence/region/JSDoc 矩阵。 |
| `scripts/docs/package-documents.test.ts` | 3 | 保留；source/package 分离、真实链接重定位、11 行非法 mapping 矩阵与各输入 byte fingerprint 变化。 |
| `scripts/docs/package-markdown.test.ts` | 4 | 保留；完整当前 inventory、独立缺链/额外页/guide closure、LF 与两种 marker × 两类材料。 |
| `scripts/maintenance/lizard-upstream-advisory.test.ts` | 4 | 保留；stub transport 无网络，稳定 code / kind、credentials、timeouts/cancel/body failure；R-06 只修 Case。 |
| `scripts/process-execution/process.test.ts` | 4 | 保留；真实 plain-text child、readiness handshake 后取消、显式 timeout 与 failure 状态；不是只 mock 被测效果。 |
| `scripts/project/admission-workbench/command.test.ts` | 5 | 保留；真实 CLI stdout/file/error/bootstrap 边界；R-04 改 source observer，R-05 清理三个 root。 |
| `scripts/project/admission-workbench/learned-heuristic-evaluation/evaluation.test.ts` | 2 | 保留；独立 204→300 regression 与 cost-pass 反例；raw decide 后 sticky fallback 的拒绝。 |
| `scripts/project/admission-workbench/learned-heuristic-evaluation/input.test.ts` | 1 | 保留；完整字段矩阵、最小合法值、真实 frozen bytes 的独立 crypto digest。 |
| `scripts/project/admission-workbench/policy.test.ts` | 3 | 保留；absolute 独占 history、bytes 与跨目录隔离、fallback 拒绝、prepare/terminal-effect 计数。末尾 expect-error 是类型证据，不冒充 Bun runtime assert。 |
| `scripts/project/admission-workbench/shared-closure.test.ts` | 2 | 保留；deferred barrier 直接证明 drain 与 pending 不启动；public unsatisfied successor 与真实取消分开。 |
| `scripts/project/admission-workbench/simulate.test.ts` | 11 | 保留；独立手算 150/200、trace/失败前缀、captured context、资源/关系/复制等；R-03 补 exact profiles，其他关系断言不等于数值原始身份。 |
| `scripts/repository-files/files.test.ts` | 1 | 保留；小型独立目录 fixture 的排序、忽略与不可读 root 错误。 |
| `scripts/repository-files/paths.test.ts` | 1 | 保留；slash spelling、严格后代、parent 自身与 prefix sibling 是不同边界。 |
| `scripts/test-evidence/ast-grep/scan.test.ts` | 1 | 保留；同一 caller signal 的传递；不冒称已启动 scanner 的终止证明。 |
| `scripts/test-evidence/catalog.test.ts` | 2 | 保留；真实 parser/query/CLI，完整 malformed / layout / symlink fixtures、blocking diagnostic 身份及局部精确 expected。 |
| `scripts/test-evidence/closure.test.ts` | 2 | 保留；独立 static/runtime identities 及两侧 duplicate、缺侧 failure origin。 |
| `scripts/test-evidence/discovery/bun-files.test.ts` | 2 | 保留；新增文件进入、positive globs、include/ignore/supplemental 与 symlink/缺失/重复拒绝。 |
| `scripts/test-evidence/discovery/profile.test.ts` | 3 | 保留；冻结配置、实际文件集对照、JUnit skipped closure、signal top-level 传递。独立 walker 不是完整 ignore 语义证明；实际 nested ignore 仍由 profile / resolver 边界拥有。 |
| `scripts/test-evidence/discovery/runner-process.test.ts` | 1 | 保留；真实 child readiness 后取消与 SIGTERM/error/null status。 |
| `scripts/validation/package-tools-core-closure.test.ts` | 1 | 保留；完整 19 行不同 import / loading / symbol 边界矩阵与真实 TS no-emit 负例；不因一个实体很大而机械拆分。 |
| `scripts/validation/repository-layout.test.ts` | 1 | 保留；完整 29 行 layout/import/analyzer/entry 矩阵、独立合法 fixture 与 syntax-error 不伪造 adapter 缺失。 |
| `scripts/validation/repository-material/links.test.ts` | 1 | 保留；完整 occurrence diagnostics，重复 target、external skip、astral code-point 位置与有序失败。 |
| `scripts/validation/repository-material/machine-artifacts/validation.test.ts` | 3 | 保留；独立 schema/artifact mutation、canonical invalid objects、四个历史版本行与六个 v4 mutation；generation drift 隔离风险见上节。 |
| `scripts/validation/repository-material/schema/strict-json.test.ts` | 1 | 保留；真实三类非法 bytes 与独立 reason / path 顺序，不由 JSON.parse 自证。 |
| `scripts/validation/repository-material/workflow.test.ts` | 7 | 保留；真实 task map 的 controlled leaf calls、await barriers、focused 顺序、expected/unexpected failure、reporter 与 safe Record 投影分工清楚。 |
| `scripts/validation/workspace.test.ts` | 2 | 保留；默认/focused dispatch、真实 broken links，以及隔离 child 的 dynamic layout load / Git 次序；不夸称 OS exit glue 自动覆盖。 |
| **合计** | **79** | **29 文件，全体读审；无整实体直接删除候选。** |

## 常规 profile 之外的显式入口与委托正文

### 发现范围与计数

- 当前不存在旧称 `scripts/project/test-targets` / `test.ts`；正式入口为 `/workspace/vibe-check/scripts/development/test.ts:8-12`（只跑 `src`），与 `/workspace/vibe-check/scripts/project/gate/checks/test-execution/lanes.ts:114-145` / `entries.ts:160-174`（完整 profile 分区和显式 file argv）。这些路由不是新的测试实体。没有把 installed `node_modules`、第三方 vendor 或历史 investigation 的脚本纳入当前测试。
- `/workspace/vibe-check/scripts/package/candidate/integration-command.ts:14-24` 显式运行 `/workspace/vibe-check/scripts/package/candidate/candidate.integration.ts`，30 秒外层上限，非 routine profile。已读全部 248 行及 **6 节点**：`package candidate preparation > builds, installs, and reuses a physical candidate`；`> keeps staging audit in build acceptance after packed artifact reuse`；`> rejects installed documentation drift without another installation`；`> rejects installed dependency license drift before candidate reuse`；`> reinstalls a missing dependency instead of accepting ancestor fallback`；`> classifies a malformed preparation receipt for cold rebuild`。串行共享 test-local candidate、license mutation 还原、ancestor fallback 的 fresh child 和最终回收都已读；各自保留，不以 cost 整删。staging 节点只证明 reuse assessment 不读 staging，不能单独冒称 staging rejection 已被执行。
- `/workspace/vibe-check/scripts/test-evidence/ast-grep/rule-tests.ts`、`sgconfig.yml`、四个 rule YAML 及四个 rule-test YAML 全读。`bun-native-test.yml` 为 3 valid / 2 invalid，`bun-unsupported-alias.yml` 为 1 / 1，`bun-unsupported-dynamic.yml` 为 2 / 2，`bun-unsupported-parameterized.yml` 为 1 / 2，总 **7 valid + 7 invalid = 14**。覆盖 literal test/it、dynamic wrapper、Bun alias 与 `.each` grammar；不是完整 runner closure 或 Case 语义质量证明。
- `/workspace/vibe-check/scripts/package/execa-type-compatibility.type-test.ts` 的 12 项 Equal/Assert 及真实 overload 正/负类型片段已读；它由 scripts tsconfig / TS6/TS7 工程验收拥有，不是 Bun entity，未调用含 execa 的函数。

### Documentation delegates：29 source / 33 region 全部读审

从 `/workspace/vibe-check/scripts/package/candidate/external-consumer/documentation-fixture.ts` 追到 `/workspace/vibe-check/scripts/package/candidate/external-consumer/documentation.ts:44-96`：按 registry 去重、排序，在 consumer-owned Node child 中逐个 import。下面不是以 wrapper 通过代替正文判断；已逐篇读取 projected 代码与 region 外验收。

| 源文件（均位于 `/workspace/vibe-check/docs/examples/package-api/`） | region 数 | 直接观察与边界 |
| --- | ---: | --- |
| `admission-graph.ts` | 1 | public select/settle 与 downstream selectable；保留为例子执行，不冒称全部 predecessor immutability 已在此验证。 |
| `cache-json-by-key.ts` | 1 | computed→cache、compute count 与 1024 value；业务保留，R-05 回收外部目录。 |
| `collect-project-files.ts` | 1 | immutable collection smoke；可能合法空集合，不夸称 exact selection oracle；真实 installed collection fixture 的独立路径 expected 由 package 报告承接。 |
| `command-check.ts` | 1 | installed command 真正退出 0，核对 passed / exitCode。 |
| `custom-admission-policy.ts` | 1 | 实际 Run、compile→publish 次序；不单独证明自定义偏好优于默认策略。 |
| `custom-check.ts` | 1 | 实际 failed / deniedCount 1 与自定义 aggregate；Record/message 全模型由其它直接 owner tests 承接。 |
| `data-boundaries.ts` | 3 | input mutation 后独立 frozen copy、重排 key 文本/bytes 一致、shallow callback/nested identity。 |
| `debug-change-flags.ts` | 1 | 临时 corpus 的 2/1/0 命中、双向/未知区别、formatter 与 frozen scope，finally 回收。 |
| `gate-cached-measurement.ts` | 1 | 真实 gzip bytes、冷/热、换阈值仍 hit、内容变更 miss、删 cache 重算。 |
| `gate-change-selection.ts` | 1 | test-local Git 与禁 hook、四行输入变化矩阵、zero/force/unavailable；恢复 cwd / exitCode / root。 |
| `gate-existing-command.ts` | 1 | 真实 Node child 的 0/1/timeout status，非 mock terminal outcome。 |
| `gate-json-diagnostics.ts` | 1 | 完整合法 Record；混合非法 code/path/null 时 group 全拒，不发布 partial。 |
| `gate-minimal.ts` | 1 | 实际 completed / passed aggregate / exit mapping，并恢复 exitCode。 |
| `gate-resource-claims.ts` | 1 | 包装真实 execute 观察 peak 2、最终归零、claim-free metadata overlap。 |
| `gate-shared-preparation.ts` | 1 | provider 一次、独立 size/content 结论、失败 provider 阻止两个 consumer。 |
| `gate-task-selection.ts` | 1 | local/ci/docs 三组独立 status expected、聚合与 exit mapping。 |
| `gate-terminal-observation.ts` | 1 | prerequisite failure 不启动 consumer，observer 读取真实 failed outcome 与 blocked reason。 |
| `gate-text-diagnostics.ts` | 1 | 合法文本映射，以及混合 unsupported/path escape 整组拒绝。 |
| `learned-critical-path.ts` | 1 | 两次 completed 接线 smoke，不能单独证明 history hit 或策略收益；R-05 清理。 |
| `maintenance-reminders.ts` | 1 | placeholder Git baseline 的可执行 authoring smoke，不把 completed 当通过或到期算法证明。 |
| `markdown-link-validation.ts` | 1 | public constructor/cache authoring 与 completed smoke；不冒称目标校验已因这一断言通过。 |
| `markdown-lint.ts` | 2 | 基础 lint passed 或明确 no-input；waiver region 仅构造接受配置，没有执行该 waiver Check，不冒称 waiver runtime reconciliation 证据。 |
| `prepared-custom-admission-policy.ts` | 1 | prepared terminal effect 真正观察两项 settled execution；不冒称独立调度优先级 oracle。 |
| `presenting-findings.ts` | 1 | limit 1 得到 detail + omitted code；完整计数与各字段合同不由此例独占。 |
| `progress-preview.ts` | 1 | formatter authoring + Run completed smoke；没有捕获 rendered bytes，不当作 truncation 正确性证据。 |
| `project-changes.ts` | 1 | Git consumer 无仓库亦可完成，passed / not-applicable 的诚实 smoke；真实 positive/zero/unavailable 矩阵在 gate-change-selection 和 Product owner tests。 |
| `project-file-region-index.ts` | 1 | overlap、known empty/unknown、append 新视图与 predecessor 不变、frozen paths。 |
| `quick-start.ts` | 1 | 实际 passed / 82000 terminal data。 |
| `typed-dependency.ts` | 2 | 实际 get/handoff 与 observer Run，aggregate 与 audit 两项 direct dependencies / 一项 file 的独立 expected。 |
| **合计** | **33** | **29 篇；全部保留，区分 executable smoke 与完整领域证明。** |

support `/workspace/vibe-check/docs/examples/package-api-support/gate-example-acceptance.ts` 全 84 行亦已读：只关闭 acceptance 输出，按 Definition 顺序读取真实 snapshot；两个诊断例共享完整合法 Record 与非法 group 零 Record 的业务义务，不是“测试 helper 自己生成 expected”。machine `/workspace/vibe-check/docs/examples/artifacts/mixed-outcomes/definition.ts` 全 195 行以及 `/workspace/vibe-check/scripts/docs/machine-artifacts/examples/definition-execution.ts` 全 179 行已读：实际 JSON / provider / policy / N/A / blocked preparation，生成器独立核对五 Checks、两 Records、三个 messages；installed documentation runner 再按 checked-in 二文件事实核对，不从 Product validator 取得独立材料验收结论。

### 已归并与未扩张的边界

实际读审还包括 docs fixture copier、artifact fingerprint copier、catalog fixture、layout fixture、workbench fixture model / registry / 全部 scenario fixtures / Gate shape、统计实现与 Linux supervisor / parent-child fixture。叶子 helper 是被调用的证据构件，不新建 entity。

`/workspace/vibe-check/changes/audit-test-evidence-quality/package-review.md` 已全读 installed `fixtures/runtime.mjs` 858 行、`command-check-runtime.mjs` 544 行、全部 runtime-evidence assertions 和拼入的 typecheck contributions。主线程确认受保护输入与上一批逐字相同后归并；本报告补齐其先前明确未逐篇重审的 documentation source 边界。没有把历史 heuristic evidence、第三方上游测试、普通 benchmark workload 或 engineering validation 自动升级为 Bun Case。

## 验证与后续

本轮只改本报告，另写 ignored scratch coverage。已实际执行的是只读代码 / owner / Case / 配置读取、scope/hash 核对和局部 diff；没有跑正文，也没有运行 Gate/build/install/网络。全仓 registration closure 的既有主线程结果只能证明身份与映射，不能证明本报告建议实施后的行为。

后续若获授权实施，先处理 R-01 至 R-04 的独立 observer / oracle，再清理 R-05，R-06 只改 Case。运行相应最窄正文测试、官方全树 `test-evidence check` 和材料验证；涉及 installed documentation 则由同一 exact candidate 的正式 consumer acceptance 验证。直接并行运行 machine drift 测试之前须尊重已声明 mutex / 独占边界。不要为清理数量删掉独占义务，亦不要因本次报告而新建测试接口。
