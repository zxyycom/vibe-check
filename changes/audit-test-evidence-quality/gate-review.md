# Project Gate 测试质量审计

审计日期：2026-10-22。本文保存本轮静态审读结果，不定义新的测试或产品契约，不授权删测、改预算或修改现有 Case。

## 结论

- 已逐文件审读 `scripts/project/gate/**` 当前全部 **15 个 `*.test.ts`、61 个 Bun 实体**，包括各实体正文、矩阵及其实际调用的 test support；没有把参数行当作实体计数。
- 优先处理两项实质证明缺口：native transcript 的不存在断言没有连接被测目录，以及五项 quality fixture 没有证明 advisory Markdown lint Finding 仍被发布。
- 一项失败路径的 throw sentinel 会被被测 adapter 吸收，建议补可观察调用记录；一项 manifest 实体可以在迁走 exact keys 与 raw required metadata 断言后合并。**本轮没有确认可以不作替代就直接删除的完整实体。**
- 发现一项 Case `Proves` 已过期；这是语义漂移，不是映射闭合失败，也不是删测理由。
- 本轮未运行测试正文或 mutation 实验；以下假想故障是从当前代码与断言推出的静态可证伪性判断，不是已执行的故障注入结果。

## 审计基线与方法

读取了 `AGENTS.md`、文档导航、测试策略、Case 维护、编码规范、`test-evidence-review` skill，以及 Project Gate、Gate diagnostics 行为 owner。审读的是当前工作区，包含上一轮尚未提交的 Gate 阻断预算改动；未把 HEAD 版本当作当前事实，也未改动这些已有工作。

先使用 CodeGraph 的文件清单、逐文件带行号源码与关键实现查询，再按官方只读入口查询 Case：

```bash
bun run test-evidence -- list --query 'scripts/project/gate/' --limit 100 --root .
bun run test-evidence -- list --entity-key '<具体实体 key>' --root .
bun run test-evidence -- show <具体 Case ID> --root .
```

查询覆盖关联的 12 个 Case；对 authoring、catalog、selection、adapter、process、post-processing、performance 及 package acceptance 进一步运行了 `show`，并参考 Markdown lint、progress preview 的相关查询和直接断言。查询原始结果仅保存在本轮授权的 `.log/test-quality-audit/20261022-9LGQjv/gate/` scratch，不是提交的实体账本。

按“当前 owner → 可观察故障 → 实际断言 → 独立性、可靠性、维护价值”评判。fixture 预先给定的常量、声明式 policy golden、确有 wiring 目的的引用相等和 injected workflow 都不因形式本身被判为低质量。特别区分配置接线、单元机制、已安装 package 运行和真实 root import 边界。

主线程已独立运行本轮全树 closure，报告 282 个文件、766 个实体、190 个 Case；本组 15 文件、61 实体与主线程通过官方查询形成的范围计数一致。本代理没有重复运行 closure，也不把 closure 当成正文通过或 Case 语义正确的证据。

## 逐文件覆盖

以下计数来自官方 Case 查询与主线程 closure 联合核对；表格只记录本轮逐文件处置，不复制全树实体账本。每一行均审读了该文件全部实体，不是按名字抽样。

| 当前测试文件 | 实体数 | 主要处置与证明价值 |
| --- | ---: | --- |
| `scripts/project/gate/checks/entry-factories.test.ts` | 4 | 保留：真实 child + Product command callback、dependency environment、structured fallback、混合 adapter 拒绝各有不同信号。未把 generic command 生命周期测试复制到 Gate。 |
| `scripts/project/gate/checks/external-consumer-material.test.ts` | 2 | 保留：environment wiring 和真实 child 闭合 typed output；foreign artifact / escaped consumer provenance 与 nonzero unavailable settlement 不同于单纯 input parser。 |
| `scripts/project/gate/checks/materials-validation.test.ts` | 1 | 保留：12 条 diagnostics 到 snapshot 和 NDJSON、terminal child 与 progress tee、5 条预览及 omitted count、正确 artifact path 下无 native transcript。 |
| `scripts/project/gate/checks/native-projections.test.ts` | 1 | 保留：真实 Decision producer 及 Test Evidence allowlist 的安全字段/非法 path，直接检查不泄漏 parser/child 私有文本。 |
| `scripts/project/gate/checks/oxfmt-failure-records.test.ts` | 2 | 保留：独立工具协议样本的完整授权路径与整组拒绝边界。 |
| `scripts/project/gate/checks/oxlint-failure-records.test.ts` | 2 | 保留：工具 JSON fixture 的完整 scoped projection、排序、安全剔除与 mixed valid/invalid 整组拒绝。 |
| `scripts/project/gate/checks/prepared-candidate.test.ts` | 2 | 保留：真实 Product Run 发布 typed provider、closed parser、formal preparation facts，以及实际 artifact 篡改后 digest fail-closed。 |
| `scripts/project/gate/checks/process/native-operation.test.ts` | 1 | **G1 改写；只可直接清理无效局部断言。** outcome、完整 Records、accessor 不读取和取消结算仍有独立价值。 |
| `scripts/project/gate/checks/repository-quality.test.ts` | 4 | **G2 改写一实体；其余保留。** policy golden、SCC binding、五项实际 outcome 和完整 package Run 的空/不可用输入不混为同一义务。 |
| `scripts/project/gate/definition.test.ts` | 7 | 保留：中央 composition / relation 验证、membership、Product effective selection、downstream-only propagation、隔离的单 Finding aggregate，以及 lint/workflow settlement。合并 G4 时还须迁入 exact keys 与 raw required metadata。 |
| `scripts/project/gate/run.test.ts` | 20 | **G3 改写一实体；G4 条件合并一实体；其余保留。** controls、formal input、真实 import probe、candidate identity、日志失败、aggregate adapter、contributor、预算到退出码闭合分别有直接信号。 |
| `scripts/project/gate/runtime/bound-run.test.ts` | 2 | 保留：中央 contributor 的精确引用投影，以及一个 synthetic Product Check 的 invocation-local output/readback/inventory。不把 `typeof run` smoke 夸大为 bound Run 全流程执行证据。 |
| `scripts/project/gate/runtime/eligibility.test.ts` | 7 | 保留：显式独立路径矩阵、删除/rename 路径、已登记包源/Case owner、所有当前 lane 文件各自触发 region；不是只锁定实现文本。 |
| `scripts/project/gate/runtime/performance-observation.test.ts` | 5 | 保留：先验预算、profile/runtime、null/zero、nearest-rank 边界、非法 duration、显式本机文件只读/唯一性分别可证伪。没有以实测时长或快慢评价必要性。 |
| `scripts/project/gate/runtime/transcript.test.ts` | 1 | 保留：真实文件内容、stdout/stderr 通道分离、writer descriptor 不被 patch、二次关闭失败；fixture 在 finally 恢复 writer。 |
| **合计** | **61** | **15 / 15 文件、61 / 61 实体完成静态审读。** |

## 优先候选

### G1 · P2 · native transcript 的不存在断言检查了未参与执行的目录

**实体：** `Project Gate native operation > keeps native Check outcomes transcript-free`，`scripts/project/gate/checks/process/native-operation.test.ts:15`。问题断言位于 197–200、396–399、420–423；fixture 创建于 16 行。

**Owner / Case：** `docs/tooling/gate-diagnostics.md#native-诊断与-record-预览`（10、23 行：native 不创建 transcript，非法结果也不发布 synthetic failed Record）；`docs/tooling/project-gate.md#每次运行的证据目录`（33–57 行：artifact 路径为 `checks/<encoded-check-id>/process.log`）；`AUX-PROJECT-GATE-AUTHORING-001`。

**具体缺陷：** `logDirectory` 从未传给 `invokeCheck` / `invokeCheckWithRecords`。后者在 `checks/check-execution.test-support.ts:108–120` 默认使用 `artifactDirectory: null`。断言却检查 `logDirectory/process/<check-id>.log`，既不是被测调用获得的目录，也不是当前 process transcript 布局。因此三个 `existsSync(...) === false` 对实际被测 I/O 没有证明力；即使回归写出当前正确布局的 transcript，它们仍可能为 false。创建和删除这个未连接目录也不使断言有效。

**动作：改写保留；局部断言可直接删除，不可整实体删除。** 用真正授予该 Check 的 artifact root 检查 inventory，或在这一单元边界明确证明 native descriptor 不索取 artifact capability；需要证明实际无文件时，应接到一个真实 synthetic Product Run 的 artifact base。不要只把旧路径改名，而仍不把目录接入执行。

**证据去向：** `materials-validation.test.ts:61–64、82–85` 已在真实 Product Run 中提供 artifact base，并检查 `checks/materials-links-validator/process.log` 不存在，承接 material native 的实际文件边界。当前实体的 193–196、268–271、300–305、340–345、376–381、392–395、414–419 等 outcome/Records/accessor/cancel 断言没有因此被替代，必须保留。后续清理不能把整条 native Case 一并撤掉。

### G2 · P2 · “保留 advisory lint Findings”没有断言任何 lint Finding

**实体：** `repository quality Checks > settles four blocking Checks while retaining advisory Markdown lint Findings`，`scripts/project/gate/checks/repository-quality.test.ts:291`；关键断言 311–319，输入 451–455。

**Owner / Case：** `docs/tooling/project-gate.md#finding-与状态`，183 行要求 Markdown lint Finding 进入 owning Check 的 Records、消息和 final data，同时保持 non-blocking；`AUX-PROJECT-GATE-CATALOG-001` 与 `WB-EXPLICIT-AGGREGATION-001`。

**具体缺陷：** fixture 明确包含 `#Heading`，但测试只确认 `markdown-lint` status 为 passed，并对**全部 Checks**断言 `snapshot.records.length >= 4`。duplicate、file、function 与 Markdown Link 四项 blocking Finding 已可提供四条 Records；完全丢掉 lint Finding / final findingCount 时，这些断言仍可成立。测试不能区分“有 advisory evidence 的 passed”和“根本没有执行/保留有效 lint evidence 的 passed”。

**动作：改写保留。** 按 `checkId === "markdown-lint"` 检查当前 fixture 的 lint Record（至少 public rule/path/kind），并检查其 outcome final data 中预期的 finding/source/rejected counts；继续保留 passed status 与整体 aggregate 断言。无需新增名义实体或拆 Case。

**证据去向：** 现有 `uses the strict repository policy and binds only the mise-provided SCC command`（22 行，62、71–82 行）证明配置与规则，不承接运行后的 Finding 留存。`src/package-checks/markdown-lint/constructor.test.ts:50–119` 的 `Markdown lint Check > publishes Product-owned findings only after a complete bounded traversal` 证明 Product executor 的 payload；不替代 Gate 五项组合中 advisory Finding 的独立可观察性。故当前不能直接删该集成实体。

### G3 · P3 · preparation failure 的日志 throw sentinel 被 adapter 的同类退出吸收

**实体：** `Project Gate adapter closure > does not load or run a candidate consumer after preparation failure`，`scripts/project/gate/run.test.ts:306`；callbacks 309–318，最终断言 321–322。

**Owner / Case：** `docs/tooling/project-gate.md#组合配置与-candidate-绑定`（26–29 行，先准备再加载）、`#每次运行的证据目录`（33 行，preparation 完成后建目录）；`AUX-PROJECT-GATE-ADAPTER-001`。

**具体缺陷：** `createInvocationLogDirectory` 只有 `throw new Error("logs must not be created")`，没有调用记录；preparer 也没有记录自己是否被到达。`run.ts:145–150` 会把 log setup throw 映射成与 preparation failure 相同的 unavailable / exit 2。若错误地先进行 log setup 并被此 sentinel 中止，当前 `status === unavailable`、`loaded === false` 仍可通过，测试没有证明实际命中了自己声明的 preparation failure 边界。这是吞掉禁止步骤 sentinel 的可观察性缺口，不是说当前实现顺序错误。

**动作：改写保留。** 记录 preparer 调用次数为 1、log factory 为 0、loader 为 0；必要时检查受控的 candidate-preparation failure 分类。被 SUT catch 的 throw 不能独自充当“从未调用”断言。无需在失败 callback 内写一个同样会被 catch 的 `assert.fail`。

**证据去向：** `returns help before candidate or log work`（280–300 行）及 entry mismatch 实体（406–432 行）都用外部布尔值显式断言禁止步骤，但输入分别是 help 和 identity mismatch，不覆盖 preparation throw。真实 import probe（325 行）有另一项 import 时序义务，也不能替代这个失败阶段证据。因此不是可删实体。

### G4 · P3 · 同一 manifest 被两个实体重复锁定；先迁移 raw metadata 证据再合并

**候选实体：** `Project Gate entries, root binding, and controls > keeps the explicit assurance identities and current selection metadata closed`，`scripts/project/gate/run.test.ts:162`；duplicated golden 89–141，断言 170–176。

**Owner / Case：** `docs/tooling/project-gate.md#组合配置与-candidate-绑定`（中央稳定顺序 manifest）及 `#依赖选择与关系闭合`；`AUX-PROJECT-GATE-CATALOG-001`。

**具体重复：** 它直接调用 `createProjectGateEntries`，没有运行 root adapter。170 行 Check ID set 已由 `definition.test.ts:181` 的 `Project Gate Definition > projects the central composition manifest into an ordinary Project Definition` 在 188–190 行按**完整顺序**锁定。两者使用同一中央 factory，而不是“unit 与真实入口”的不同边界；第二份完整 ID 清单增加同步成本。但 raw required set 与 Definition 的有效 membership 不是完全相同的观察。

**尚不能直接整删的原因：** run 测试 175–176 行独立断言归一化 entry 的 exact keys 只有 `check/presets/required`；172–174 行还精确检查 raw `entry.required` 集合。独立审查发现 `runtime/eligibility.ts:463–465,474–482` 对 `tests-product-runtime` 使用专门的 enablement，不消费该 entry 的 required 字段。因此即使这一 raw metadata 错改为 false，Definition 的 membership golden 仍可能通过，run 的 raw-set 断言却会失败（静态反事实，未执行 mutation）。不能用 Definition 584–607 的有效选择证明替代全部原始 metadata 义务。

**动作：条件合并。** 先把 exact-key 与完整 raw required-set 断言迁入上述 Definition composition 实体，再删除 run 中重复 manifest 实体及仅服务它的第二份 golden，并维护 `AUX-PROJECT-GATE-CATALOG-001` 的 entity 映射。迁移前仅可把 Check ID set 视为已被承接的局部重复，不能宣称整个实体已被当前断言完全替代。真正的 root manifest command binding（run.test.ts:150）仍保留。

## Case 语义漂移（不涉及删测）

`docs/testing/cases/repository-tooling.md:311`，`AUX-PROJECT-GATE-CATALOG-001` 的 `Proves` 仍称 Gate 使用有限的 `maxTargetReads: 3_000`。

关联实体为 `repository quality Checks > uses the strict repository policy and binds only the mise-provided SCC command`，`scripts/project/gate/checks/repository-quality.test.ts:22`；94–98 行明确断言 `maxOccurrences: false`、`maxTargetReads: false`。当前 owner `docs/tooling/project-gate.md#仓库选择范围` 也明确拥有这两个 false。建议以后只按当前 owner 修正这一条 `Proves`，不修改测试去迎合旧叙述、不调整任何运行预算。全树 closure 无法发现这种语义漂移。

## 保留判断与未决边界

- **单 Finding 与五项同时失败不是现成可删重复。** `Project Gate Definition > settles a blocking normal quality Finding through its owning Check and effective aggregate`（definition.test.ts:785）在 zero/one Finding 间切换，并断言 one Record 与 aggregate，隔离“仅这一项 failed 就能阻断”的义务。G2 的四项同时失败会互相掩盖 aggregate 输入遗漏；目前不建议整删 785 行实体。与 Product Markdown Link 的交叉层裁决交由主线程复核。
- **真实 root import probe 保留。** run.test.ts:325 复制 Gate 源到无 candidate 的 sandbox、让 Definition import 会 throw，再由独立 child 加载真实 `run.ts`。这证明静态/间接 import 边界，不能由注入 `loadRunModule` 的 unit adapter 测试代替。
- **Product-owned empty/unavailable lint 实体暂保留。** `repository quality Checks > preserves Product-owned empty and unavailable Markdown lint outcomes`（repository-quality.test.ts:326）确实直接使用 package `markdownLint` / `defineConfig` / `run`，不是 Gate factory 测试。Product constructor 单元的 zero-input（constructor.test.ts:136、154–157）和 waiver 边界的 source-unavailable（finding-waiver-boundaries.test.ts:18、65–68）能承接部分语义，但没有证明与本实体相同的 installed-package 完整 Run + missing project root + 空 Records 边界。不能只因“不调用 Gate factory”或 Case 名相同就确认整删；若后续治理其 owner/位置，应保持这一独立入口义务。
- **native material 预览测试保留。** Gate 测试验证真实 terminal child、progress tee 与 machine 完整性。240-code-point / escaping 的精确算法由 `Package Run progress Record and message previews > renders independent bounded Record and message previews without changing their source facts`（`src/project-run/progress-rendering/renderer-formatting-records.test.ts:26、63–70`）直接证明。Gate 当前只检查 marker 不独占这一算法义务，不宜机械复制整套 formatter 矩阵，也不能据此删掉实际 channel 闭合。
- **两步 ast-grep 单元保留但不夸大。** definition.test.ts:905 的 `preserves two-step ast-grep process evidence and failures` 注入 workflow result，直接证明 Gate transcript / safe Record / cancellation 后结算；其 helper（1093–1108 行）不运行真实 ast-grep，也不检查 `runRuleTests` 收到的 `cancelSignal`。这条实体本身不能被描述为真实 child cancellation 证明；`AUX-PROJECT-GATE-AUTHORING-001` 中对应“真实 process”表述应连同 Test Evidence producing owner 的执行证据另行复核，不因使用 stub 就删掉 Gate settlement 证据。
- **发现但未裁决的配置承诺差异。** 当前 Project Gate owner 239–240 行及 `AUX-PROJECT-GATE-PROCESS-001` 概括单命令 64 MiB；`definition.ts:62、189` 的 lint-product 实际传入 1 MiB，`checks/external-consumer-material.ts:35、84` 实际传入 64 KiB。这两项在所审实体没有直接 limit 断言。它是需要 owner 确认适用范围的当前事实差异，不是本轮删测候选；本轮未修改规则、实现或任何预算，也未执行超限命令。

## 验证与交付边界

已执行：官方 `list` / `show` 只读查询、CodeGraph 全部 15 个测试文件与相关实现/test-support 审读、当前 owner/Case 对照、报告局部 diff 自审。以上没有执行测试正文。

主线程统一负责全树 closure 与正式审计材料验证；本代理没有重复运行完整 Gate、package build、候选安装、重测试或性能测量。没有测试/实现/Case 修改，没有 Git add/commit，也没有删除或 finalize Change。G1–G4 的正文修改及其最窄 Bun test、mutation 对照和修改后 closure 均属后续实施，不是本轮已完成事实。

静态审读覆盖完整 61 实体，但不证明当前安装 candidate 与源码同一、测试当前通过、跨层全部等价或安全整删数量。scratch 留在本轮授权日志目录供主线程复核；正式交接仅本文，不产生提交的实体清单。
