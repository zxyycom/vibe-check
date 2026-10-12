# 独立审查：batch-low-risk-complexity-optimizations

## 结论与范围

- **产品审查通过：未发现实质正确性、实现质量、测试证明力或公开契约阻断。**
- **证据说明需澄清（非产品阻断）**：`T01-T02-public-prepare` 是 `prepare（含 history read）+ 3 次 decide` 的组合 workload，不是 isolated prepare benchmark。现有 acceptance 表格已按组合路径表述；归档 results 的独立阅读边界仍应明确。见下文 E1。
- 本结论仅针对 baseline `b3c8fecce5a2ff835948f76f9fd4fa5a8e2fe853` 到稳定 HEAD `7b1ca20f8b8049b0c4ef7c499beeec6cae78bcb5` 的实际 diff。开始与结束工作树均干净，26 个 src 文件变化（538 insertions / 109 deletions）；没有修改仓库、Git、Change tasks、产品或原始证据，没有安装、联网、commit、push、finalize 或再委派。
- 本 reviewer 是新启动的非实施审查角色。结论来自实际 diff、调用者、owner、断言与本轮执行，不把实施者/测量者结论或 Gate 通过当作语义证明。未自行勾选 2.3，也不声明集成或结项完成。

## 已读取规则与方法

已完整读取 `/workspace/vibe-check/AGENTS.md`、`/workspace/vibe-check/docs/navigation.md`、`/workspace/vibe-check/docs/development/coding-style.md`、`/workspace/vibe-check/.codex/skills/test-evidence-review/SKILL.md`，以及测试策略与 Case 维护。

行为 owner：`/workspace/vibe-check/docs/development/{project-definition,project-run,check-results,scheduler,package-tools,scanner-dependencies,architecture}.md`；公开对应材料 `/workspace/vibe-check/docs/guides/{check-dependencies,learned-scheduling}.md`、`/workspace/vibe-check/docs/checks/{duplicate-detection,file-metrics,markdown-lint}.md`，以及 API lifecycle/normalization/results 与 prepared scheduling 的相关章节。另读知识治理的行为交付反查、性能 skill、临时文件生命周期 skill。

先用 CodeGraph callers 查询 `createCheckDependencies`、`prepareTaskGraph`、`learnedSelectionLayers`、`artifactDirectoryForCheck`、`parseUniqueIdentifiers` 与 `createLearnedCriticalPathStrategy`。当前工具未提供其描述推荐的 explore；callers 提供定位而非完整源码，故使用限制到这些 owner 的 `rg` 和逐行源码读取补足。没有索引或工具安装操作。

## 逐项正确性与实现质量证据

### C01 / C03：去重与拒绝不是同一语义

- `/workspace/vibe-check/src/project-definition/check-tree/collection-authoring.ts:4–16`：descriptor-safe 数组快照后，仍按原数组顺序逐项校验，seen 只跳过已出现字符串，第一次出现 push，空值/非字符串仍 fail closed。
- `/workspace/vibe-check/src/project-definition/check-tree/resolution.ts:152–164`：真实消费者将 exact/inherit collection canonicalize 并排序冻结，未改变最终 scheduling 顺序。
- `/workspace/vibe-check/src/check-settlement/outcome-normalization.ts:80–101`：reason 中 duplicate 是整体拒绝而非删除；known/非空/字符串验证与 add/push 次序保持。新增 Set 不改变已接受 reason 的原始 blocker 顺序。
- 没有使用 Map last-win 代替 first-occurrence，也没有跨调用集合。

### R08：稳定授权成员与实时 facts 分离

- `/workspace/vibe-check/src/project-run/check-execution/flag-controls.ts:22–44,126–146`：每次 selection 一个 flags Set；递归 AST child 顺序和 multiplicity 不变，`exactly-one` 仍数 true children，不去重 condition。
- `/workspace/vibe-check/src/project-run/check-execution/ready-check-execution.ts:50–61,88–92`：依赖 view 的输入来自 frozen normalized `dependsOn` 与 frozen direct union；`/workspace/vibe-check/src/project-definition/check-tree/resolution.ts:98–138,152–164` 保障成员生命周期。
- `/workspace/vibe-check/src/project-run/check-execution/dependencies.ts:30–35,43–74,85–107,145–152`：Set 仅索引授权成员。string read 仍 direct union，provider read 仍 direct dependsOn + provider identity，observes/transitive/lookalike 不扩大权限。每次 get/list 仍读取 session/handoff store 当前事实，不缓存 outcome；list 仍从原规范数组枚举。
- `/workspace/vibe-check/src/project-run/check-execution/resolved-checks.ts:108–127`：每次执行新 handoff store，finally clear。保留旧 reader 不能持有跨 Run 的 accepted handoff。
- `/workspace/vibe-check/src/project-run/invocation/paths.ts:116–145`：每次 paths resolution 重新创建私有 Map，外部只得 frozen get closure；编码与 collision check 未变。重复同 ID 即使 last set 也得到同一目录值，真实入口还有唯一 ID 验证。artifact base/null 与未知 ID→null 不变，不泄露 sibling namespace。

### R04：局部 scope grouping 保持首错与四次 prepare

- `/workspace/vibe-check/src/project-run/task-scheduler/graph-validation.ts:27–31,113–129,185–197`：resource/relation/cycle 在 scopes 前；root cap 与 task membership 在 grouping 前；scope 原顺序与 cap→terminal→activation→reachability 次序未变。scope task buckets 保留原 task 遍历顺序，reachability 仍通过完整 taskById 支持跨 scope bridge。
- 没有 scopes 的 early return 在既有 root/membership 验证之后，不跳过 unknown scope 错误。
- 实际四个 Run 路径仍调用 prepare：`/workspace/vibe-check/src/project-run/invocation/run.ts:115–123`，`/workspace/vibe-check/src/project-run/invocation/execution.ts:85–101`，`/workspace/vibe-check/src/project-run/check-execution/resolved-checks.ts:68–73`，`/workspace/vibe-check/src/project-run/task-scheduler/scheduler.ts:49–53`。没有跨阶段 graph reuse。

### K04 / K07 / K14：保留原 policy、精确预算与 ordinal

- `/workspace/vibe-check/src/package-checks/duplicate-detection/area-policy.ts:50–80,89–116`：codeArea Set 仅回答原 some 的 equality membership；policies 数组保留原 policy 值和 multiplicity，第一次 location 的值继续拥有 max line/token 阈值。共同 area、排序与 `>=` 判定不变，未知 path 仍拒绝整个结果。
- `/workspace/vibe-check/src/package-checks/file-metrics/scc/batch-planner.ts:16–19,30–54`：至少有 executable，所以固定前缀已有首参数；每个追加 path 精确增加 `1 + 2*UTF16.length + 2`。固定基数含 terminal NUL，rolling sum 与原 estimator 对同一 argv 等价。oversized 检查仍在 flush 之前，第一个 infeasible path 原错误优先；空输入返回空 batches，即使固定前缀超过 ceiling，保持原语义。
- `/workspace/vibe-check/src/package-checks/markdown-lint/records.ts:65–91,110–129`：raw line/start column 与原 publicRange.start 完全相同，null fallback 仍 column 1；path locale comparator 与 catalog fallback rank 原样。sort 的相等键仍稳定，不引入 end-column 排序，因此同位置/rule 的不同 range 长度保留原相对次序、ordinal 和 ID。

### T01 / T02：prepared/per-call immutable 索引，不缓存动态边界

- `/workspace/vibe-check/src/project-run/invocation/execution.ts:85–101` → `/workspace/vibe-check/src/project-run/admission-strategy-provider/custom-strategy-preparation.ts:12–21`：prepare 接收真实 graph snapshot。`/workspace/vibe-check/src/project-run/task-scheduler/graph.ts:80–138,146–165,180–202` 从 normalized inputs 独立构造 deeply frozen graph，拒绝重复 task/scope ID。
- prepare 与 decide 的 graph 不必 object-identical：每阶段从同一 immutable normalized checks/capacities 经 `/workspace/vibe-check/src/project-run/check-execution/plan.ts:26–49` 确定性投影；没有任何阶段可以回写这些元数据。缓存的是本 prepared closure 的同义静态 facts，不是另一 Run 的 graph。
- `/workspace/vibe-check/src/package-tools/learned-critical-path/strategy.ts:76–144,201–243,286–304`：每次 prepare 建新 graph/prediction/score maps，score、priority、cap 与 ID tie 顺序不变。三个 maps 无公共 root 导出/跨 Run global；新增 helper 有明确稳定图索引职责，不是纯转发 wrapper。
- `/workspace/vibe-check/src/package-tools/learned-critical-path/selection-layers.ts:29–48,51–75` 每次 decide 重读 candidates、activeScopeIds、capacity；`/workspace/vibe-check/src/project-run/task-scheduler/custom-admission-policy.ts:40–59` 提供本 boundary 的新动态 DTO。
- `/workspace/vibe-check/src/package-tools/learned-critical-path/static-decision.ts:13–24` 仍调用默认 `learnedSelectionLayers(context)`，fallback 每次从当前 context.graph 建索引，不读失败 prepare 的索引。
- `/workspace/vibe-check/src/package-tools/learned-critical-path/critical-path-ranking.ts:39–54`、`/workspace/vibe-check/src/package-tools/learned-critical-path/duration-model/prediction.ts:60–66`、`/workspace/vibe-check/src/package-tools/learned-critical-path/duration-model/recording.ts:108–117` 与 strategy prediction/score index 均显式 first-win，保留旧 find 的 duplicate ID/identity 语义。
- recording 的可变 history map 仍保留既有 last-win 初始化；`/workspace/vibe-check/src/package-tools/learned-critical-path/duration-model/recording.ts:105–107,131–153` 每个 admission 重新 get 已更新 series，再 append/裁剪并 set。不会因同 identity 多 task 而覆盖先前样本；sequence、bounds、retention/sort 未改。
- `/workspace/vibe-check/src/package-tools/learned-critical-path/duration-model/preparation.ts:38–65` 从本调用 load 的 frozen history/prediction 出发；没有跨 Run cache、磁盘行为或 terminal lifecycle 变化。

## 测试证明力与 Case 反查

新增/扩展断言观察真实 outcome、canonical relation、授权结果、路径、错误 message、Record range/ID、history samples、selection proposal，不测试 Set/Map 的实现步骤。预期不是从新 helper 计算而来：

- `/workspace/vibe-check/src/check-settlement/session-lifecycle.test.ts:67–99` 字面 blocker 顺序与 duplicate/unknown/empty 拒绝；`/workspace/vibe-check/src/project-definition/project-definition.scheduling-inheritance.test.ts:36–53` literal canonical relation 与 `__proto__` 安全。
- `/workspace/vibe-check/src/project-run/check-execution/resolved-checks.dependencies.test.ts:34–64` 同一个 reader 在 unsettled 时抛 invariant、settled 后取得最新 outcome/同一 canonical data 引用；不是新建 reader 后才测试。
- `/workspace/vibe-check/src/project-run/run-callback-context.test-support.ts:131–145` 第二 Run 不同 base 的可见路径；原测试另断言唯一 bounded encoding 与最小 callback keys。
- `/workspace/vibe-check/src/project-run/task-scheduler/task-engine.static-validation.test.ts:155–203` 故意交错 scope/task 顺序，字面断言 zeta-first error 与 activation-before-reachability；不是仅 valid singleton fixture。
- `/workspace/vibe-check/src/package-checks/duplicate-detection/default-check.overlap.test-support.ts:194–240` 相同 raw cache、一份 scan，token 严格阈值与 line 12/13 边界及两个共同 area，断言 literal final data/Records/scan count。
- `/workspace/vibe-check/src/package-checks/file-metrics/scc/scanner.test.ts:58–101` literal 34-code-unit Unicode/quote/backslash预算、34/33 equality boundary、顺序分批与首次 oversized；实际 scanner 无 process 断言补充纯 planner。
- `/workspace/vibe-check/src/package-checks/markdown-lint/default-check.test.ts:228–296` 七个 shuffled findings 的 literal 排序、null point range、unknown catalog rank fallback、不同长度同键稳定 ordinal。
- `/workspace/vibe-check/src/package-tools/learned-critical-path/critical-path-ranking.test.ts:30–57` 先有 literal 9/5/7 score，再断言重复 prediction 不变和不同首错；不是只比较两次同一实现。
- `/workspace/vibe-check/src/package-tools/learned-critical-path/duration-model/scheduler-duration-prediction.test.ts:30–63,98–113` literal mean 16.5/p90 29/count 32，再对抗 999 后置重复 identity，另有 literal prior 与 digest-order 断言。
- `/workspace/vibe-check/src/package-tools/learned-critical-path/duration-model/scheduler-duration-recording.test.ts:134–157` 同 identity 两 task 的 literal 两份 samples/sequence/settlement，证明不丢样本。
- `/workspace/vibe-check/src/package-tools/learned-critical-path/strategy.test.ts:33–46` 同一 closure 连续切换 boundary 再恢复，literal proposals；原 rank/tie/fallback 矩阵继续支持顺序。

通过官方 queries 反查既有 Case：WB-PROJECT-DEFINITION-001、WB-RUNTIME-CHECK-LIFECYCLE-001 / CHECKPOINT-001、WB-RUNTIME-DEPENDENCY-OBSERVATION-001、AUX-PARALLEL-RUNNER-001、AUX-SCC-ADAPTER-OUTCOMES-001、WB-SCANNER-DUPLICATE-SCOPE-001、QUALITY-RUNTIME-MARKDOWN-LINT、WB-RUNTIME-SCHEDULER-{HISTORY,PREDICTION,CRITICAL-PATH,LEARNED-ADMISSION}-001。目的仍由原 owner 与可观察结果拥有；扩展输入变体不要求拆新 Case。Case closure 不等于正文证明，本轮分别核对断言并运行正文。

## 文档/API/example/schema 影响的独立判断

无需改变随包用户页面、README、public JSDoc/API、examples 或 machine schema：没有新增公开导出/选项/能力；flags、direct authorization、first-match、默认 policy、callback时机、错误/取消、Record ID/顺序和 I/O/安全边界均保持原语义。内部 `ResolvedInvocationPaths` 类型变化是 Run-private lookup representation，不是 public capability。

内部 owner 已明确 normalized/frozen inputs、per-Run prepared closure、实时 boundary facts 与 terminal history 责任。本批私有索引落实这些既有规则，没有需要新文档定义的生命周期或责任；局部 selection-graph JSDoc 恰当地分开静态索引和动态 facts。新增纯索引 helper 没有第二套 grammar/schema/策略，也未形成 Core→Non-core 依赖。

实际 `git diff --quiet` 验证 public entry `/workspace/vibe-check/src/index.ts`、`/workspace/vibe-check/docs/package-documents.json`、`/workspace/vibe-check/docs/examples`、`/workspace/vibe-check/docs/schemas`、C05 `/workspace/vibe-check/src/data-boundary/closed-values.ts` 在指定 diff 中未变（exit 0）。无新 doc projection/published material 义务；唯一维护说明澄清是下述历史性能 evidence 边界，不是产品契约改变。

## 性能证据与采用边界

独立解包到本临时根后，`audit-evidence.py` 使用 Python 标准库直接重算，而非调用测量者 summarize helper：

- before 的 722 个 manifest entries 与 baseline 的 `git show` bytes 一致；after 的 722 个 entries 与当前实际文件 bytes 一致。
- delivery 与 root-validation 各自 SHA 清单全部通过；七份 raw text 解包原始 bytes SHA 通过。
- before/after workload helper 除 source-root 字符串外逐字节同义；raw-final 中 summary 与归档 summary 完全一致。
- 十个独立 process IDs、B A / A B / B A / A B / B A 顺序、37 row metadata/全部 serialized output/两次 smoke输出、每进程三倍迭代 warmup与七 batches一致。全部 stderr空。
- 独立复算 2,590 samples 的 pooled median/MAD/min/max/count、每 process median与每 pair ratio，逐值等于 summary。

放大局部收益足以支持当前低风险算法采用，但不能外推 Run E2E、真实 scanner I/O、SLA、memory、capacity 或统计显著性。共享 host/JIT/GC 和五对 process 的测量不是跨 host 独立实验。C01/8 的 +1.26µs、dependency construction+8 reads 的 +1.02µs、小 R04/无 scope 的不一致方向均实际存在、已保存；本 review 不声称无退化。没有硬 budget，因此这些已披露小成本不是自动产品阻断，最终接受取舍属于调用方/产品判断。C05 实际 source 未改，保留不采用结论；未重新执行其探索候选或把其数据混入 final。

### E1：组合 preparation workload 的阅读澄清（非产品阻断）

可复现依据：解包的 `/tmp/vibe-low-risk-review.5n66j6/harness/after-workloads.ts:347–356`（before 对应同义代码），计时 invoke 在 await strategy.prepare 后返回三次 fresh.decide；`/tmp/vibe-low-risk-review.5n66j6/harness/measure.ts:40–52` 对完整 invoke计时。prepare 经 `/workspace/vibe-check/src/package-tools/learned-critical-path/duration-model/preparation.ts:38–44` 包含 async history读取。

因此 `/workspace/vibe-check/changes/batch-low-risk-complexity-optimizations/evidence/results.md:28` 的 19.174481→9.203477ms 证明的是 **prepare（含 missing-history read）+ 三个 selection decisions**，不能单独归因于 preparation。该文第 5 行的统一 “IO outside timing” 应读作排除 evidence IO与其它 owner的IO，不能覆盖这一组合 workload 的 history read。原始 row boundary承认 async history read但未说明三次decide。

`/workspace/vibe-check/changes/batch-low-risk-complexity-optimizations/acceptance.md` 的组合路径表达已经准确；建议主线程在独立阅读入口增补显式勘误，保留形成时 raw/helper/summary/hash 与原44项交付材料SHA清单原样。无需改产品、重测或从组合数据相减估算 isolated prepare；本轮未修改它们。主线程已同意增加当前测量阅读说明并更新其阅读入口，这是后续证据解释澄清，不是产品阻断或重测前提；本review没有读取或预先认可尚未实施的说明。

## 本轮实际执行

所有项目命令从 `/workspace/vibe-check` 运行，均 exit 0：

1. `mise exec -- bun run test-evidence -- check --root .` → 704 current实体（704 Bun）、176 Cases、15 Topics全树闭合。日志 `/tmp/vibe-low-risk-review.5n66j6/case-check.log`。
2. `mise exec -- bun test`，目标为 session-lifecycle、scheduling-inheritance、resolved-checks.dependencies、task-engine.static-validation、SCC scanner、Markdown default-check、critical-path-ranking、duration prediction/recording、learned strategy 共10文件 → **31 pass / 0 fail**。完整日志 `/tmp/vibe-low-risk-review.5n66j6/target-tests.log`。
3. `mise exec -- bun test`，flag-dependency-selection、handoff、handoff-failure、run-callback-context、invocation learned-scheduling 共5实际文件 → **11 pass / 0 fail**。日志 `/tmp/vibe-low-risk-review.5n66j6/integration-tests.log`。命令还包含不存在的 `src/package-checks/duplicate-detection/default-check.overlap.test.ts`，Bun没有加载它；未把它计作执行证据，随后通过正确 owning test 执行。
4. `mise exec -- bun test src/package-checks/duplicate-detection/default-check.test.ts src/project-definition/project-definition.flag-enablement.test.ts` → **6 pass / 0 fail**；实际执行了被修改 overlap test-support。日志 `/tmp/vibe-low-risk-review.5n66j6/overlap-and-flag-tests.log`。
5. `mise exec -- bun test src/project-run/controls/flags.test.ts src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts` → **18 pass / 0 fail**，覆盖overlapping Run closure isolation。日志 `/tmp/vibe-low-risk-review.5n66j6/flags-and-lifecycle-tests.log`。
6. 官方 `mise exec -- bun run test-evidence -- list --query ... --limit 100 --root .` 按 learned/direct/SCC和具体修改 test路径读取相关Case；不执行正文，也不写派生账本。
7. `uv run --no-project --offline python /tmp/vibe-low-risk-review.5n66j6/audit-evidence.py` → 上述全部 source/archive/原始统计检查通过，日志 `/tmp/vibe-low-risk-review.5n66j6/evidence-audit.log`。
8. `git diff --check b3c8fec 7b1ca20` →通过；`git status --short` →审查前后空；public/schema/C05 no-diff检查 →exit 0。

合计 **66 tests / 19 files / 0 failures**。本轮实际 runner为 Bun 1.3.14，日志已有版本；没有声称本轮执行 Node consumer或完整 Gate。

## 未验证边界与归宿

- 未主动重跑 full benchmark、完整 Gate、typecheck/lint/format、package artifact/Node installed consumer、真实 Windows/CreateProcess 或 scanner性能。读取的 `/workspace/vibe-check/changes/batch-low-risk-complexity-optimizations/evidence/root-validation/gate-all-final.txt` 实际保存43/43通过（另有p95 warning，非收益证据）；这是历史验证事实，不是本reviewer的新执行。原始失败42/43与305-code-line日志仍保留，最终源SHA与最终Gate/测量after相同，未发现通过改限额/waiver规避。
- 未证明随机或全部输入的形式化等价；owner承诺范围依靠源码代数/生命周期审查、目标与既有集成测试、归档fixture parity共同覆盖。私有函数对违反声明类型/immutable契约的任意JS mutation不是新支持面。
- E1 是证据的独立阅读说明澄清，不是产品bug或测试缺口。除此没有可行动实质发现；未列纯风格偏好或范围外优化。
- `file-lifecycle-hygiene`：本临时根由reviewer通过mktemp新建，来源为只读归档解包、审查Python与本轮日志；只复制helper/归档数据，不复制整个仓库或安装依赖。形成/状态确认：2026-10-12 UTC（精确时间见工具执行）。最终review.md、audit-evidence.py与日志留给主线程审阅/归档；解包helper/raw是可重建辅助物。主线程取得审查与所需归档后，可按明确授权清理此精确临时根；本reviewer不自行清理、勾选任务或 finalize。
