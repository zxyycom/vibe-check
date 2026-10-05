---
title: "从 Project Gate 演进提炼多场景指南素材"
id: "261005-derive-gate-guide-scenarios-from-history"
formedAt: "2026-10-05T03:01:53Z"
question: "过往 Project Gate 在哪些不同问题下改变了结构、选择、调度和结果责任，哪些历史做法可转化为当前公开 API 的教学例子，哪些仍需纠正或补证？"
tags:
  - "documentation"
  - "gate-evolution"
  - "project-gate"
relations: []
---

## 形成时背景

[Gate 构建指南 Draft](../../changes/add-project-gate-building-guide/proposal.md)希望帮助 package consumer 从质量目标形成 Check 图、运行 Gate 并判断结果；现有[设计](../../changes/add-project-gate-building-guide/design.md)主要围绕同一案例组织能力。本轮按用户要求，从过往 Gate 的不同问题和取舍提炼多场景素材，供后续选择和改编。

调查基线为 `e1164d27177f4b4b010a0603ffe999ac6c98084d`。仓库已有性能、candidate 自举、增量选择与调度报告，可提供历史依据；其中既有采用的做法，也有撤回的解释和未采用的方案。

## 调查目的

找出值得分别讲解的用户情境，说明历史变化、适用条件和验证重点，为后续指南提供候选例子。本轮交付调查材料；教程代码、最终案例数量、发布形式及 Draft 后续设计留待整理时决定。

## 调查范围与依据

三名 `gpt-6.1-sol` 代理分别调查结构、选择、调度与结果；主代理审阅资源并抽查关键 diff 和当前 owner。取证按“已有报告 → 路径限定 Git log/show → 实际前后差异 → 当前契约”的路径进行；当前调用关系先查 CodeGraph，结果不足时回到明确路径源码。

| 随附资源 | 覆盖内容 | 何时展开 |
| --- | --- | --- |
| 结构与职责 S1–S6 | 正式入口、native/process、typed provider、重复工作、commandCheck、manifest。 | 复核共享与拆分改变了什么，是否仍证明同一行为。 |
| 选择与复用 F1–F6 | 依赖选择、flags、材料输入、比较基准、测试输入、findings 缓存。 | 判断何时可以少运行，以及何时应完整运行但复用计算。 |
| 调度与结果 R1–R7 | 超时解释、逻辑资源、未采用启发式、关系、质量 policy、contributor、诊断。 | 复核并发、失败责任和性能反例。 |

共覆盖 **19 组历史素材**，按问题抽样从 2026-08-20 candidate-backed Gate 及父版本延伸至 2026-09-26，并核对至上述基线；不是完整提交年表。资源保留 SHA、路径、符号和复核命令，S/F/R 仅为本报告内定位编号。

依据分三层：

- **历史事实与认识：** 指定 revision 的源码和 diff 证明实际变化；既有调查解释当时背景、测量和修正。来源包括 [candidate 重复工作](audit-project-gate-candidate-lifecycle-process-overhead.md)、[增量选择](audit-incremental-project-gate-selection-and-cold-cost.md)、[Markdown lint 缓存](measure-and-cache-markdown-lint-findings.md)、[超时纠正](correct-project-gate-candidate-timeout-interpretation.md)及[启发式拒绝](explain-learned-heuristic-rejection.md)，其余定位见资源。
- **当前用法：** [Project Gate](../tooling/project-gate.md)拥有本仓库接线；公开用法以 [API 机制](../api-mechanics.md)、[自定义 Check](../guides/extending-check-lifecycle.md)、[依赖与数据](../guides/check-dependencies.md)、[commandCheck](../guides/command-check.md)、[调度](../guides/scheduling.md)和[输出](../guides/run-outputs.md)等 owner 为准。
- **教学建议：** 下列场景及资源中的 TypeScript 片段是改编候选，尚未完成类型检查或运行验收。历史通过数、计时与虚拟 makespan 也不是本轮执行结果。

本轮未执行历史版本、示例草图、benchmark 或完整 Gate，未审计全部历史分支、测试语义或 callback 文档。既有报告回答各自故障或性能问题，本轮回答教学取材问题，因此以引用保留来源，`relations: []`。

## 调查结果与边界

### 找到十类候选例子

19 组素材可归纳为以下 **十类用户问题**。它们分别改变执行责任、复用、选择、并发、判定或呈现；适合共享讲解框架，分别使用能显露差异的小例子。

1. **接入已有脚本或 validator（S2、S5）。**
   - 做法：对照 native operation、按 exit status 结算的 `commandCheck`、用 `afterCommand` 解析领域结果。多个步骤共同产生一个质量结论时，可保留一个 execution。
   - 验证：import 不启动 CLI；显式确定 environment、timeout、output；按 single-command 契约接入，领域解析与进程生命周期各归其 owner。
2. **共享昂贵准备，保留独立验收（S3、S4）。**
   - 做法：一个 typed provider 产出事实，多个只读 consumer 各自验收；另用独立材料承接 failure-injection。
   - 验证：准备最多一次，判决分别保留；provider 失败阻断 consumer；direct read、parser 与物理 provenance 分层，cleanup 晚于最后一个 consumer。
3. **区分成功前置与失败终态观察（R4、F1）。**
   - 做法：同一 provider 失败后，材料 consumer 使用 `dependsOn` 停止执行，失败审计者使用 `observes` 等待终态。
   - 验证：observer 需被选中，`observes` 不传播选择；只读 direct relation，并处理无 data 的终态。
4. **为本地、专项检查与 CI 选择不同集合（F1、F2）。**
   - 做法：caller 将自己的 preset 映射为普通 flags；对照 downstream-only 的依赖传播、正向变更条件和显式 force。
   - 验证：`propagateDependsOn` 显式启用；selection 与 callback 使用同一 effective flags；区分未选 facts 与有效检查列表。preset/CLI 由 caller 拥有。
5. **按材料真实输入增量选择（F3、F4）。**
   - 做法：JSON、Schema 各自声明输入；链接检查展示反向依赖未建模时的保守路径；本地反馈与整条 PR 选择各自比较基准。
   - 验证：覆盖共享读取、生成器、删除和 rename；区分可信零命中与 Git unavailable；保留 force 完整路径。
6. **按测试实际消费的输入分组（F5、S4）。**
   - 做法：对照独立私有 Check、跨 owner constructor test、全源 identity audit，说明同名目录或 import 图为何不足以定义输入。
   - 验证：每个 test file 能触发自己的 lane；共享和未知输入保守选择；减少 runner 前核对独立证明目的。
7. **保持完整检查，只缓存重复计算（F6）。**
   - 做法：Markdown lint 仍遍历完整范围，只缓存成功的逐文件 findings；对照内容变化、policy/waiver 变化与损坏 cache。
   - 验证：核对当前 bytes、安全与范围；实时结算结果；cache 故障回退 fresh lint，目录由 caller 管理。
8. **表达不同并发限制（R2）。**
   - 做法：分别展示 root 总任务数、同名 mutex 排他、named resource 可计数额度，再加入不竞争该资源的任务。
   - 验证：多个 claims 原子验收和释放；units 是逻辑预算。空槽可供其它任务使用，但是否选中、是否更快需另行证明。
9. **决定普通问题警告还是阻断（R5）。**
   - 做法：对照 Finding 的 non-blocking/blocking，再加入 scanner unavailable；展示 owning Check outcome → aggregate → caller exit。
   - 验证：advisory 由 Finding policy 表达，而非将整项 Check 排除聚合；`completed` 不等于质量通过，Record/message 不替代 verdict。
10. **提供安全、结构化的失败诊断（R7、S5）。**
    - 做法：分别展示 native safe diagnostics 与 process owner-specific projection；加入第二条非法 diagnostic 导致整组投影拒绝的反例。
    - 验证：raw child text 留在 private transcript；完整验证后再发布结构化结果；native 无效结果与 process generic failed fallback 分别结算，preview 不改变完整 facts。

十类是本轮的候选组织方式，不是十个已完成的可运行程序。后续可增加组合例子检验相互作用，但每个例子仍应有独立情境和可观察结果。

### 历史取舍如何影响选例

| 历史证据 | 取材判断 |
| --- | --- |
| S1 的早期 verifier 已调用 `runTaskGraph`；candidate 绑定与 cold import 后续仍有修正。 | 重点是统一运行责任和 exact runtime，而非虚构“串行升级 DAG”。candidate 自举适合项目自验旁注，普通 consumer 从公开入口导入。 |
| S3 当前用 canonical data 传 path/provenance；Gate 未采用 handoff。 | typed provider 是主例。确需同 Run 非 canonical reference 时，才另讲 handoff；它不提供 disposer 或传递读授权。 |
| S4 的 `fa4d45f5` 在去重时也删除 `jscpd --version` probe，并将 QuickInfo 改为读取 declaration JSDoc。 | 引擎执行版本与 manifest、hover 与声明文本证明不同对象。保留这一反例；今天是否需补测由当前 owner 决定，历史材料不自动创建 Case。 |
| F2 简化多套 flag 语法；S6 删除无语义薄包装。 | 用最小公开组合表达真实条件；复杂 DSL、函数数量或行数本身不是改善依据。 |
| F2–F5 改变选择，F6 在完整执行中复用计算。 | 两类优化分开讲。Git evidence 可用不等于 region 命中，缓存热态收益不等于完整 cold Gate 收益。 |
| R3 的组合启发式在反例中由 204 增至 300 虚拟 ms，未采用；缺少单变量实验。 | 可作进阶反例，区分合法性、利用率和 makespan；既不能证明所有补位都坏，也不能证明基线最优。 |
| R1 的 case 20 秒是有意硬预算，原“假失败”解释已撤回；R6 后来把整次 Gate 超预算改 warning。 | timeout 层级与 owner 意图必须明确。后者是另一范围的新决定，不能倒推前者；私有 contributor 仅作 caller 责任案例。 |

本仓 root 3/capacity 2、120 秒 timeout、64 MiB 输出上限、0/1/2 退出映射和性能预算都是项目政策。它们适合解释条件性集成经验，不是 package 默认值或通用性能建议。

### 编写例子前需校正的两处来源摘要

基线 [callbacks 指南](../guides/callbacks.md)还有两处已确认的过时摘要，本轮记录而未修改：

- **Project facts 准备仍标为相邻 Change（F2）。** API mechanics、Check authoring 与 `src/project-run/changes/git.ts` 已有 selection 前 changes 准备和 effective flags；可据当前契约取材，但这不是新增公共 invocation-wide callback。
- **Gate contributor 仍标为 message-only（R6）。** Gate owner 及 `runtime/result-contributor.ts`、`runtime/result.ts`、`run.ts` 已使用 `{ blocks, messages }`，允许 passed 单向降为 failed。当前性能 observer 超预算只 warning，不代表该能力消失；contributor 仍是私有接线。

### 后续整理与实际交付

后续按用户情境选择例子，每个补齐：**起始问题、适用条件、最小运行路径、采用理由、保留的不变量、有意改变的行为、失败或不适用对照、预期结果与验证**。

随包指南可按[文档机制](../tooling/documentation.md)从受管源码投影代码块。直接分发可运行目录是另一个发布决定，届时再确定材料映射与 installed-consumer 验收；历史源码继续作为 Git 研究依据。

本轮产物为本报告、三份资源和派生索引。Product、Gate、测试、现行规范、发布映射与 Change artifacts 均未改动，指南 Change 保持 Draft。API、真实输入或 owner 意图变化后，应重新核对所选场景。

### 验证记录

- 初稿由另一名未参与编写的 `gpt-6.1-sol` 代理审阅，抽查关键 diff/owner，未发现实质阻断项；不等于全量历史审计。
- 本次整理按“识别十类场景、定位历史依据、区分当前用法与测量边界”复核阅读路径；三份资源的 19 组素材、完整 SHA 集合、Git 复核命令和 TypeScript 草图均保留。
- 整理后同步索引，`bun run investigations` 通过（52/52）；`bun run validate` 通过，包括 92 个 JSON、5 个 schema、4 项 report examples 和 485 份 Markdown 链接检查。
- `bun run test-evidence -- check --root .` 通过（667 实体、160 Cases、15 topics），证明映射闭合而非测试正文通过；目标 Change 检查通过，仍为 Draft、0/0 tasks。

## 随附资源

- [调度、结果责任与反例：R1–R7](./_resources/261005-derive-gate-guide-scenarios-from-history/scheduling-outcomes-and-counterexamples.md)
- [选择、真实输入与结果复用：F1–F6](./_resources/261005-derive-gate-guide-scenarios-from-history/selection-inputs-and-reuse.md)
- [结构与职责演进：S1–S6](./_resources/261005-derive-gate-guide-scenarios-from-history/structure-and-responsibility.md)
