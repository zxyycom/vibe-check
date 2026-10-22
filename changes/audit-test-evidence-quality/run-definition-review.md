# Run / Definition 测试证据全量审阅

## 结论与边界

- 已逐一读取本分区 **40 个测试文件、94 个实体、6,403 行测试源码**，包括所有矩阵行、实体内部 helper、28 个传递 test-support 文件，以及相关行为 owner / 当前 Case 的 `Proves`。不是抽样，也不是仅扫描测试名。
- 本分区没有形成可无损删除**整个实体**的高把握候选。可执行动作主要是修复被 containment 吞掉的断言、修正未进入声称 Git 分支的 fixture，以及删除两处没有 SUT 信号的局部断言。不能把这些问题扩大成删除实体的理由。
- 本报告仅审计，不修改测试、产品、Case 或现有并行 Gate 工作。没有运行本分区测试正文、Gate、build、install、网络或 Git 写入。全树 766 实体 / 190 Case closure 由主线程运行，本分区没有重复执行或将 closure 当作语义证明。
- 独立反证只有 RD-01：由主线程在 scratch 副本执行，故意使 execution 内部断言失败后，目标实体仍 `1 pass / 0 fail`。其它反事实均是明确标注的静态推演，不是已运行 mutation testing。

范围快照：`.log/test-quality-audit/20261022-full-02N0Mb/run_definition-scope.json`；当前 owner/Case 输入：同目录 `cases-by-entity.json`。逐实体精确闭合记录位于同目录 `run_definition/coverage.json`，只作本次审计证据，不是提交的新账本。

## 审阅依据

已读 `AGENTS.md` 提供的项目规则、`docs/navigation.md`、`docs/testing/strategy.md`、`docs/testing/case-maintenance.md`、`test-evidence-review` skill、`docs/development/coding-style.md`。行为 owner 包括：

- `docs/api-mechanics.md`、`docs/guides/callbacks.md`、`docs/guides/extending-check-lifecycle.md`；
- `docs/development/project-definition.md`、`docs/development/project-run.md`、`docs/development/check-results.md`、`docs/guides/check-dependencies.md`；
- `docs/development/scheduler.md` 的 graph、prepared lifecycle、context production / delivery 和验证边界，`docs/guides/scheduling.md` 的 callback schema / prepared lifecycle / terminal delivery；
- `docs/development/human-output.md#check-console-capture-maintenance`、`docs/guides/run-outputs.md`、`docs/guides/collecting-project-files.md#共享的-files-选择语义`；
- `docs/guides/learned-scheduling.md`、`docs/development/package-tools.md#learned-critical-path-helper-owner`。

CodeGraph 已用于状态、符号检索及 `executeResolvedChecks` / `executeCheckCallback` 调用关系；工具未提供完整测试正文/矩阵集合，因此全量实体与委托 helper 仍逐文件读取。对异常 containment、message settlement、Git acquisition 与 fingerprint 的争议点另读实际实现，不根据 helper 名称推断行为。

## 可执行候选

### RD-01：execution context 的关键断言被吞掉（重写，已独立反证）

- **实体：** `keeps preparation and execution views exact while reusing the Run project and signal`。
- **位置：** `src/project-run/check-execution/callback-context-needs.test.ts:110`；关键断言在 118–120，返回值丢弃在 139–147。
- **Case / owner：** `WB-RUNTIME-CHECK-CONTEXT-DEMAND-001`；`docs/guides/extending-check-lifecycle.md#callback-声明与字段`。
- **可观察缺陷：** execution callback 内的 exact keys、shared project、同一 signal 断言失败，被 `callback.ts:executeCheckCallback` 的普通 callback containment 转为 `source: "product" / unavailable`。测试没有检查这个返回值，最后只验证 preparation 已保存的 project 冻结。因此三个 execution 断言不构成有效失败信号。
- **反证：** 主线程将本文件复制到 scratch、把执行回调的 signal equality 改成 `assert.fail('audit: deliberately failing execution assertion')`，只跑该实体仍通过。日志：`.log/test-quality-audit/20261022-full-02N0Mb/independent-probes/callback-assertion.log`。正式源码未修改；该反证证明测试没有观察内部 assertion failure，**不证明 Product context 已回归**。
- **最小动作：** 捕获 execution context 后在 callback 外断言；或至少检查返回 `source === "author"`、精确 passed result 及调用次数。保留 preparation kind 检查与跨 phase identity 契约。
- **删除后的承接：** 不能删除实体；同文件前一个矩阵证明按需 capability 和空 context 取消，但不完整承接本项 preparation/execution 独立视图与共享 project/signal。独占义务应在本实体修复。

### RD-02：preparation-blocked observer 的读取断言也被吞掉（重写）

- **实体：** `Package Run direct Check execution > blocks success dependents before their preparation and lets observers read the terminal result`。
- **位置：** `src/project-run/check-execution/task-local-preparation.test.ts:75`；observer 回调内断言 113–120，外部检查 137–197。
- **Case / owner：** `WB-RUNTIME-DEPENDENCY-BLOCKING-001`、`WB-RUNTIME-CHECK-DURATION-001`（`docs/development/project-run.md#check-执行与依赖交接`）；`WB-RUN-RESULT-CHECK-MESSAGES-001`（同文档 `#invocation-and-results`）。
- **可观察缺陷：** 读取断言失败时 observer 仍会 started、以 unavailable settled；外部只检查它 started，并精确检查 blocked / dependent 的 outcome，没有要求 observer passed。`result.kind === "completed"` 不表示其中 Check passed，故不足以发现吞错。
- **最小动作：** 将 `dependencies.get("blocked")` 保存到外部变量后精确断言，另断言 observer passed。145 行用 `result.checkDurations[2]?.durationMs` 回填 expected 只证明该槽位关联，不证明 observer duration 有效；如保留 duration 义务，应独立检查有限、非负的 number。
- **删除后的承接：** 不删整个实体。后面的 `makes a scheduler-blocked outcome available to its terminal observer` 在 243–279 行使用外部 `observed`，证明 Scheduler prerequisite-blocked 路径；当前实体则拥有 preparation block、messages、started/null-duration 的组合边界。现有 `resolved-checks.dependencies.test.ts:127–160` 也以 dependent passed 保护 callback 内断言，不能以它替代本项 preparation-blocked 输入。
- **验证边界：** 静态读取 containment 与外部 assertion 后的推演，未执行动态反证。

### RD-03：两个“unstaged”路径实际上都是 untracked（重写 fixture）

- **实体 A：** `Project Run Git changes > collects every Git delta once, retains rename and deletion paths, and matches frozen regions`，`src/project-run/changes/git.test.ts:23`；输入在 33 行，baseline 在 282–293。
- **实体 B：** `Project Run Git changes > scopes every Git delta to a nested project root and retains only its side of cross-root renames`，同文件 227 行；输入在 240 行，baseline 在 296–307。
- **Case / owner：** 两者均为 `WB-RUNTIME-CHECK-CATALOG-001`，`docs/development/project-run.md#invocation-and-results` / `#change-preparation-and-flag-projection`；Case 明确声称 committed、staged、unstaged、untracked 均有证据。
- **可观察缺陷：** `docs/unstaged.md` 与 `packages/app/config/unstaged.md` 没有先在 baseline 写入和提交。`git.test-support.ts:write` 只创建文件；`commit` 对先前完整 fixture 执行 `add .` 后 commit。这两个新文件随后没有 add，属于 `ls-files --others` 而非 tracked unstaged diff。若不再合并 `git.ts:collectGitChangedPaths` 中的 unstaged source，这两项 expected paths 仍可从 untracked source 得到——这是静态推演，未执行该 mutation。
- **最小动作：** 在各自 baseline 先提交对应路径，测试 action 后只改内容、不 add；在 scratch/最窄测试里确认 unstaged source 消失会导致失败。也可改已有 tracked baseline 文件，并同步独立 expected path。
- **删除后的承接：** 不能删这两个实体；固定 expected 列表仍独立证明 committed/staged/untracked、rename old/new、deletion、nested-root 与 cross-root rename。当前本分区其它 Git lifecycle 输入没有承接真实 tracked unstaged 分支，应修 fixture 而不是缩减 Case 承诺或删测试。

### RD-04：malformed message matrix 允许错误的 passed outcome（局部收紧）

- **实体：** `Package Run direct Check execution > contains invalid or duplicate Record writes without revising prior Records`。
- **位置：** `src/project-run/check-execution/resolved-checks.failure.test.ts:15`；委托 `assertMalformedMessageAttachments` 的 68–102，尤其 93–97。
- **Case / owner：** `WB-RUNTIME-CHECK-FAILURE-001`，`docs/development/project-run.md#check-执行与依赖交接`；实体另映射 `WB-RUNTIME-RECORD-MANAGER-001`，`docs/development/check-results.md#check-and-record-facts`。
- **可观察缺陷：** level/code/message/extra-key 五个非法 message item 当前只要求 status 属于 `["passed", "unavailable"]`。即使实现只丢 messages 并继续发布 passed，只要保留 malformed diagnostic，测试仍通过。公开 owner 明确要求非法 attachment 使 owning Check unavailable。
- **最小动作：** 精确断言 owning outcome 为 `{ status: "unavailable", reason: { code: "invalid-execution-result" } }`，保留 `checkMessages === []` 和无 partial prefix；这与当前 terminal-result / Core closed normalization 一致。
- **删除后的承接：** 不能删除实体或五行矩阵。相同实体下 hostile-values matrix 已精确检查 unavailable，但其输入为 Proxy/accessor/toJSON/cycle/array-shape/nonfinite/prototype 等，不替代普通非法 message leaf 的独立边界；duplicate Record 和 trusted invariant escape 也必须保留。

### RD-05：对 atom string 调用 Object.isFrozen 没有冻结证明（局部删除）

- **实体：** `Project Definition > normalizes opt-in dependency propagation as declarative identity`。
- **位置：** `src/project-definition/project-definition.flag-enablement.test.ts:72`，候选为 **116 行单个 assert**。
- **Case / owner：** `WB-PROJECT-DEFINITION-FLAG-ENABLEMENT-001`；`docs/development/project-definition.md#flag-enabled-checks`。
- **可观察缺陷：** 108–114 已断言 `conditions[0]` 是 atom string `"analysis"`。primitive string（包括 undefined）上的 `Object.isFrozen` 恒返回 true，无法区分是否有任何对象冻结回归。
- **最小动作 / 承接：** 只删 116 行。115 行继续检查真正可变的 `conditions` 数组冻结，108–114 保留重复次数与 propagation，117–153 保留 declarative identity 的差异信号。不得删整个实体，也不需要给 primitive 增加新的冻结测试。

### RD-06：handoff helper 返回 expected，外层只比较 fixture（局部删除 / 简化）

- **实体：** `Package Run direct Check execution > delivers accepted provider handoffs only to direct dependents and clears them after each Run`。
- **位置：** `src/project-run/check-execution/resolved-checks.handoff.test.ts:19`；helper 在 182 行 `return expectedHandoff`，外层 52–54。
- **Case / owner：** `WB-RUNTIME-DEPENDENCY-HANDOFF-001`；`docs/development/project-run.md#check-执行与依赖交接`。
- **可观察缺陷：** `firstRead` / `secondRead` 不是 SUT read 返回值，分别就是传进去的两份 expected Map。外层 equal / notEqual 无论实际 handoff 如何都只确认 fixture identity。
- **最小动作 / 承接：** helper 改为 `Promise<void>`，仍 await 两次 Run，去掉仅为 52–54 提供假 read 的返回值/变量/断言。**164–165 行**已经分别对两个真实 consumer 捕获值做 strict identity 检查，且每次以本 Run 的独立 expected Map 比较；166–180 保留 observes/transitive/foreign/lookalike 授权边界；58–61 保留前一 Run retained dependency reader 的关闭证明。因此只删局部自证层，不删实体或两个实际 Run。

## 次要但明确的局部证明修正

以下不是整个测试低价值的结论，更不是删除配额；它们只说明具体 assertion 没有隔离其表述的变量。

### RD-07：两处 fingerprint 差异断言有混杂变量（同构输入重写）

1. **实体：** `Project Definition > normalizes executable flag enablement as declarative identity`，`src/project-definition/project-definition.flag-enablement.test.ts:16`；委托 `project-definition.flag-builders.test-support.ts:106–115`。Case `WB-PROJECT-DEFINITION-FLAG-ENABLEMENT-001`，owner `project-definition.md#flag-enabled-checks`；changes inclusion 的完整 owner 为同文档 `#project-changes`。`configuredChanges` 有一个 executable Check，而 `differentComparison` 没有 Checks；两边不仅修改 `compareWith`。即使 fingerprint 遗漏 comparison，Check membership 变化仍足以令 notEqual 通过。保留 helper 其它 builder shape / grammar / immutable projection；将 comparison variant 从相同基础 Definition 派生，仅改 revision。`project-changes.test.ts:34–49` 承接 snapshot / equality / detachment，但没有承接这个纯 revision sensitivity；因此该 assertion 应重写，不直接删其意图。
2. **实体：** `Project Definition > normalizes signed admission priority by nearest explicit ancestor`，`src/project-definition/project-definition.scheduling-inheritance.test.ts:130`，候选 189–192。Case `WB-PROJECT-DEFINITION-001`，owner `project-definition.md#recursive-check-tree`。`defaultPriority` 是单个 `default-priority` Check，而 `normalized` 是两个不同 ID 的 Check；即使 fingerprint 遗漏 priority 也可能仍不同。应让两边 Check identity / 数量 / 其它字段相同，仅改 priority。173–188 的 nearest-ancestor 结果、冻结、omission 与 explicit zero equivalence 都应保留；本分区没有另一处隔离 priority 变化的 fingerprint 断言，不能删除这项意图。

这是对差异信号的审查，不把“同一个 Product normalizer/fingerprint 用于两边”本身视为自证：在输入关系受控时，equivalence / inequality 是合法 metamorphic evidence。

### RD-08：名为变更需求的 fingerprint 检查实际上比较两个零需求（局部补强）

- **实体：** `Scheduler context declaration validation > validates Definition descriptors before callbacks and excludes needs from the declarative fingerprint`，`src/project-definition/scheduler-context-validation.test.ts:76`，尤其 81–94。
- **Case / owner：** `WB-SCHEDULER-CONTEXT-DECLARATION-001`；`docs/development/project-definition.md#scheduler-配置`。
- **可观察缺陷：** `valid` 是 `contextNeeds: []` descriptor，`full` 是普通 function；当前公共契约规定两者都是零需求。二者相等可以证明等价 authoring，但没有实际改变 demand，无法区分“非空 contextNeeds 意外参与 fingerprint”。
- **最小动作 / 承接：** 保留 valid/invalid descriptor 与 callback 未执行断言，并以合法 `contextNeeds: ["graph"]`（同一 callback、同一其它 Definition）对照零需求 fingerprint。第一个实体 18–31 已证明非空 needs detachment/freezing，但没有 fingerprint assertion；因此不能删整个实体或用该独立输入验证替代 fingerprint 义务。此结论只限本分区，没有据此宣称全仓缺失。

### RD-09：取消消息 helper 对错误 phase 可以提前成功返回（局部收紧）

- **实体：** `Package Run Check facts integration > contains invalid callback outcomes and Record misuse in the owning Check`，`src/project-run/check-facts-record-misuse.test.ts:11`；委托 `check-facts-record-misuse.test-support.ts:84–91`。
- **Case / owner：** `WB-RUN-RESULT-CHECK-MESSAGES-001` / `project-run.md#invocation-and-results`；实体其它部分另承接 `WB-RUNTIME-CHECK-LIFECYCLE-001`、`WB-RUNTIME-RECORD-MANAGER-001`、`WB-RUNTIME-CHECK-FAILURE-001`。
- **可观察缺陷：** 87 行只要求 `kind === "cancelled"`；88 行遇到非 execution phase 直接 return，不验证 prior accepted messages。若 execution cancellation 被错误映射成 pre-work/planning cancellation，这个消息义务会静默跳过。
- **最小动作 / 承接：** 在 narrowing 后明确要求 `phase === "execution"` 再断言 messages；不能删实体，它还拥有 invalid terminal reason、Record misuse 与 closed reporter。`run-preparation-cancellation.test.ts:47–53` 已独立检查 admitted preparation 的 execution phase，但没有此前已接受 messages；不能直接替代本项输入。

## 必要保留与不作为删除依据的信号

- **Definition metamorphic tests：** fingerprint 的 callback exclusion、字典/collection canonicalization、默认值等价，以及 direct validation → normalization 的一致性有公开 identity 契约，不因两边调用同一函数就自动低质量。RD-07 针对的是未控制变量，而不是禁止 metamorphic evidence。
- **私有边界与公开 Run：** `executeCheckCallback` / `executeResolvedChecks` 单元级 producer、reporter/diagnostic/lifecycle 注入和公开 `run` 接线观察不同边界。public / injected prepared lifecycle 也分别证明 provider handoff 与公开 strategy adapter；不是仅凭名称接近就删除一层。
- **继承性能证据：** recursive shared-DAG 的 reflection count 与 deep inheritance marked-sort count 有 owner 明确的“重复 executable 在共享展开前拒绝”“中间 container 不物化增长前缀”成本边界；并有固定 semantic collection / warning-path assertions。暂不以私有 seam 或操作计数本身为由删测试，也未将其当作真实 wall-clock benchmark。
- **恶意值矩阵：** getter、Proxy reflection、toJSON、cycle、sparse/accessor/symbol/prototype array、nonfinite 的 `final/messages/record` channel 矩阵有不同接收边界；callbacks 抛错被 Product containment 是被测行为，只有缺失外部失败见证时才形成 RD-01/RD-02。
- **观察与 handoff：** string get/list 四态、direct relation union、provider identity、same-Run fan-out、post-graph reader unavailable 和 diagnostics secret omission 保留；本次证据不证明 GC、外部资源处置、provider mutation 安全或跨 package-instance compatibility。
- **Git native lists：** dot/brace/extglob/negative-only/reinclude/empty 与 default-exclude bypass 直接断言固定 path/flags，非 SUT 自己计算 expected；真实 Git fixture 有 owner-local acquisition 集成价值。RD-03 只修 branch input。
- **learned Run 集成：** 两次真实 history 的 schedule 翻转、caller-owned observations、取消/正常 terminal 后写入有独立 lifecycle 价值。2ms/30ms 的真实 timer 排序可能受 host load 影响，本次未复现时序失败、未测性能；不得因慢删或据此更换整个证据层。局部 write-failure 的 `history-unavailable || recording-unavailable` 是宽松退化观察，不足以单独宣称每个 recording error 分类已证明。
- **console integration：** 独立 terminal screen helper 解释最小 cursor 操作，固定 message readback 与 console restoration 断言不从 Product renderer 生成 expected。当前实体的“只在 settle 后呈现”主要依赖最终可见行与实现链，未做 streaming-prefix mutation 反证；没有将最终画面直接等价为所有中间时刻均正确。

## 逐文件完成清单

表内实体计数来自分区 scope；每个文件的全部实体、矩阵与委托正文均已读。`保留` 表示未形成上述具体低质量候选，不表示已运行正文或证明所有可能输入。

| 文件 | 实体数 | 结论 / 主要证明边界 |
| --- | ---: | --- |
| `src/project-definition/project-changes.test.ts` | 2 | 保留；closed region/source、accessor safety、frozen detached changes。 |
| `src/project-definition/project-definition.authoring-defaults.test.ts` | 1 | 保留；完整 default、scheduler/output grammar、retired field rejection。 |
| `src/project-definition/project-definition.fingerprint.test.ts` | 1 | 保留；受控 canonicalization、callback kind、resources、progress policy、own __proto__。 |
| `src/project-definition/project-definition.flag-enablement.test.ts` | 3 | RD-05 局部删、RD-07 局部重写；其余 builder/AST/limits/protected-token/propagation 保留。 |
| `src/project-definition/project-definition.options-preparation.test.ts` | 2 | 保留；Definition 不按 Check options 领域解释，不执行 prepare。 |
| `src/project-definition/project-definition.quiet-pass-policy.test.ts` | 2 | 保留；literal true/undefined/container/legacy grammar、inherited Object.prototype restoration。 |
| `src/project-definition/project-definition.recursive-checks.test.ts` | 3 | 保留；cycle/duplicate early reject、shared container occurrence/warnings、ordinary recursive projection。 |
| `src/project-definition/project-definition.scheduling-inheritance.test.ts` | 5 | RD-07 priority fingerprint 局部重写；rollback/exact/inherit/resource/marked-cost 矩阵保留。 |
| `src/project-definition/project-definition.typed-provider.test.ts` | 1 | 保留；parser/handoff retention、invalid declaration、identity exclusion。 |
| `src/project-definition/scheduler-context-validation.test.ts` | 2 | RD-08 局部补强；phase safety、getter-not-called、detached needs 保留。 |
| `src/project-run/changes/git.test.ts` | 7 | RD-03 两 fixture 重写；其余 zero/unavailable/NUL/raw-path/native-lists/nested-root 保留。 |
| `src/project-run/check-execution/callback-context-needs.test.ts` | 2 | RD-01 修复一个实体的 execution 见证；capability-production 矩阵保留。 |
| `src/project-run/check-execution/console-capture.test.ts` | 2 | 保留；并行归属、canonical readback、phase order、throw retention、escape/restoration。 |
| `src/project-run/check-execution/flag-dependency-selection.test.ts` | 4 | 保留；direct/opt-in closure/shared prerequisite/observes exclusion/pre-work cancellation。 |
| `src/project-run/check-execution/plan.test.ts` | 1 | 保留；normalized priority/observes/resources → static graph 的固定 expected。 |
| `src/project-run/check-execution/preparation-cancellation.test.ts` | 1 | 保留；pre-callback/after-callback cancellation、admitted signal、消息无 partial escape。 |
| `src/project-run/check-execution/preparation-failures.test.ts` | 1 | 保留；throw/block+fallback/cycle/message failure outcome 与 diagnostic evidence。 |
| `src/project-run/check-execution/preparation-messages.test.ts` | 1 | 保留；fallback canonicalization、prep/execute message ordering、throw retention。 |
| `src/project-run/check-execution/resolved-checks.dependencies.test.ts` | 1 | 保留；四态 direct get/list、immutable identity、unsettled invariant、stable union。 |
| `src/project-run/check-execution/resolved-checks.execution.test.ts` | 3 | 保留；scripted finite duration、parallel settlement-vs-canonical order、pending cancellation。 |
| `src/project-run/check-execution/resolved-checks.failure.test.ts` | 1 | RD-04 malformed leaf outcome 收紧；Records/hostile channel/invariant escape 保留。 |
| `src/project-run/check-execution/resolved-checks.handoff-diagnostics.test.ts` | 1 | 保留；record containment 与 after-callback cancellation 的 handoff stripping。 |
| `src/project-run/check-execution/resolved-checks.handoff-failure.test.ts` | 1 | 保留；declared/unflagged handoff 各 branch 拒绝、dependent 不读、诊断不泄密。 |
| `src/project-run/check-execution/resolved-checks.handoff.test.ts` | 1 | RD-06 只删 fixture-return 外层；实际引用、授权、跨 Run close 保留。 |
| `src/project-run/check-execution/resolved-checks.test.ts` | 1 | 保留；supplemental Record 与 final status 独立、messages detach/无隐式上限/四态附件。 |
| `src/project-run/check-execution/task-local-preparation.test.ts` | 4 | RD-02 observer 外部见证；independent task-local prep、三种 nonpassed blocker、terminal observer 保留。 |
| `src/project-run/check-facts-aggregation.test.ts` | 2 | 保留；default/custom、error rejection/cleanup、private effective selection、publication integration。 |
| `src/project-run/check-facts-record-misuse.test.ts` | 1 | RD-09 cancellation phase 收紧；malformed reason/Record conflict/late write/accepted reason 保留。 |
| `src/project-run/controls/flags.test.ts` | 7 | 保留；invalid/reserved flags、canonical frozen snapshot、四 mode true/false 与 blocker/observer。 |
| `src/project-run/controls/outputs-override-validation.test.ts` | 2 | 保留；逐字段 undefined/0/null、closed exact diagnostic path/expected/accessor safety。 |
| `src/project-run/invocation/invocation-admission-strategy-lifecycle.test.ts` | 11 | 保留；injected/public lifecycle、cancel/fault/setup failure、overlap isolation、output participants/failure priority。 |
| `src/project-run/invocation/learned-scheduling.test.ts` | 4 | 保留；caller-owned history/observer、两 Run 学习、normal/cancel terminal 后记录；真实时钟风险未动态复核。 |
| `src/project-run/project-changes-lifecycle.test.ts` | 3 | 保留；prepare/execute 同一 frozen project、derived selection、option-like rejection、unavailable honest fallback。 |
| `src/project-run/run-callback-context.test.ts` | 1 | 保留；public context 精确能力、artifact encoding/root separation、no-output Date seam。 |
| `src/project-run/run-controls.test.ts` | 1 | 保留；invalid controls public wiring + frozen blocked preparation 的不同信号。 |
| `src/project-run/run-dependency-data.test.ts` | 1 | 保留；public unavailable read/inherited get/list 与 canonical identity。 |
| `src/project-run/run-planning.test.ts` | 1 | 保留；unknown/overlap/cycle/self graph 在任何 callback 前拒绝。 |
| `src/project-run/run-preparation-cancellation.test.ts` | 1 | 保留；public admitted-preparation cancellation 明确 execution phase/outcome/callback zero。 |
| `src/project-run/run-prepared-facts.test.ts` | 2 | 保留；shared immutable graph、scopes/resources、mutable authored Definition 每 Run revalidation。 |
| `src/project-run/run-scheduler-context-needs.test.ts` | 3 | 保留；generic/prepared exact view、independent terminal groups、malformed returned needs early fail。 |
| **合计** | **94** | **40 文件全部完成；未审实体 0。** |

## 验证与交付限制

- 完成的是**静态正文质量普查**与精确 scope key/hash 核对，不是本分区 94 实体的执行通过证明。
- RD-01 具有主线程 scratch 独立反证；RD-02 / RD-03 / RD-04 / RD-07 / RD-08 / RD-09 的建议需后续在获授权的隔离副本或正式实施中进行最窄动态验证。未把预测会存活的 mutation 写成已经存活。
- 后续实施若修改正文，即使 entity key 不变，也应运行最窄测试及完整 `bun run test-evidence -- check --root .`；不凭本次 closure 免除实施后的闭合。
- 没有执行 `bun run validate` / Change validation：本分区仅新增这份审阅材料及 scratch coverage，最终报告合并和材料验证由主线程决定；不存在已应用到运行环境的行为改变。
