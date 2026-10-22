# Package 测试质量审计

## 本轮结论

- 2026-10-22 逐文件审读当前 `scripts/package/**/*.test.ts` 全部 **22 文件、41 实体**，不是抽样。参数矩阵、test-local helper 与委托验收均纳入正文检查，矩阵行不另算实体。
- **没有得到可直接删除整个实体的证据。** 优先处理 P-01～P-03 的观察器/负向证据缺陷；P-04/P-05 仅删除各一条断言，不删除实体或 Case。P-06 是须进一步验证的 fixture 耦合，不作为删测结论。
- 以静态质量审计为主；P-01/P-02 另有主线程的小型 helper/TypeScript 语言行为反证，不宣称正式测试正文通过、真实 Product 已修改、完整 Gate 已绕过或真实包已重新验收。未修改测试、Case、Product、现有 Gate 改动；未 build/install、运行 Gate、联网或提交。
- 完整实体身份继续由 Test Evidence 提供，不在本文保存第二套完整清单。每文件计数与主线程的 `/workspace/vibe-check/.log/test-quality-audit/20261022-9LGQjv/scope-counts.json` 一致。

## 依据与边界

先读取 `/workspace/vibe-check/AGENTS.md`、[导航](../../docs/navigation.md)、[测试策略](../../docs/testing/strategy.md)、[Case 维护](../../docs/testing/case-maintenance.md)、`/workspace/vibe-check/.codex/skills/test-evidence-review/SKILL.md`、[编码规范](../../docs/development/coding-style.md)，再读取 [Package lifecycle](../../docs/tooling/package-lifecycle.md)、[Package artifact](../../docs/tooling/package-artifact.md)、[Package release](../../docs/tooling/package-release.md)、[Source mapping](../../docs/tooling/source-mapping.md)。有关公开 authoring、工具链、prepared candidate 与文档消费边界另读 [Project Definition](../../docs/development/project-definition.md#public-authoring-surface)、[Workspace 工具链](../../docs/tooling/workspace.md#typescript-工具链)、[Gate prepared candidate](../../docs/tooling/project-gate.md#prepared-candidate-data)、[随包材料验收](../../docs/tooling/repository-material-validation.md#随包材料验收)及 API 机制相关章节。

审查顺序为 owner 承诺 → 可观察故障 → 实际断言 → 独立性/可靠性/维护价值。Case 仅作定位，不能以 `Proves` 代替读取断言。

已实际运行只读查询：`bun run test-evidence -- list --query scripts/package --limit 100 --root .`、按完整 ESM entity key 的 `list --entity-key`、`show AUX-PACKAGE-RELEASE-001`。package 查询取得 16 个相关 Case，去重后为 41 个 package 实体；输出保存在 `/workspace/vibe-check/.log/test-quality-audit/20261022-9LGQjv/package/case-query.json`。一次按猜测 ID 查询 `AUX-PACKAGE-ESM-SPECIFIERS-001` 返回不存在，随后通过 entity 查询恢复到当前 `AUX-PACKAGE-ESM-NORMALIZATION-001`，未据猜测建立结论。

读取主线程 `/workspace/vibe-check/.log/test-quality-audit/20261022-9LGQjv/test-evidence.before.log`：全树 `check --root .` 已通过，766 个 current/Bun 实体由 190 Cases 映射；本代理未重复执行。该结果只证明身份/映射闭合，不证明以下候选已动态复现。

## 优先清理候选

### P-01 / 改写：exact export observer 与被审实现存在同形盲区

- **完整实体：** `public API inventory > publishes only the approved runtime and type roots`；`package artifact > emits a readable ESM runtime layout and exact exports`。
- **位置：** `/workspace/vibe-check/scripts/package/public-api-inventory.test.ts:208-220,291-307`；`/workspace/vibe-check/scripts/package/artifact/artifact.test.ts:159-162,393-408`。
- **Owner：** [Public authoring surface](../../docs/development/project-definition.md#public-authoring-surface)，该文第 15 行以 `src/index.ts` 为公开 inventory；[artifact pack 前后验收](../../docs/tooling/package-artifact.md#pack-前后验收)，第 59 行要求验收公开运行时导出。对应 `AUX-PUBLIC-AUTHORING-TYPES-001`、`AUX-PACKAGE-ARTIFACT-MATERIAL-001`。
- **可观察回归：** package 根出现不在 approved inventory 中的新 runtime/type root。
- **实际缺陷：** source observer 只匹配 `export { ... } from` 和 `export type { ... } from`；例如直接的 `export const unexpected = 1;`、`export type Unexpected = string;` 不进入提取结果。artifact observer 也只匹配 braces re-export。生产 `/workspace/vibe-check/scripts/package/artifact/staging-audit.ts:220-235` 使用同形 regex，因此测试与 audit 可能共同忽略直接导出。不是“同契约跨层测试重复”，而是 observer 复制了同一种限制。installed type fixture 是正向 import，不能证明不存在额外类型 root。
- **最小动作：** 保留两个实体及各自 source/staging 边界，改用能覆盖实际导出形态的独立观察；runtime 可比较真实 namespace keys，type root 用 TS AST/实际 export symbols 或明确拒绝不受支持的 export 形态。为 direct export、alias、wildcard 等加入可证伪反例。不要改成调用生产 `declaredRuntimeExports` 来生成 expected。
- **删除后的承接：** 不能直接删除 exact-root 义务；应由改写后的两个实体继续分别覆盖源入口与 emitted artifact。其它 consumer 正向用法不能替代 closed export 集合。
- **验证状态：** 主线程在 `/workspace/vibe-check/.log/test-quality-audit/20261022-9LGQjv/crosscheck-public-inventory.mjs` 提取当前 source helpers，向真实入口文本的临时副本追加 direct value/type export，确认两份提取清单均不变。结果见 `/workspace/vibe-check/.log/test-quality-audit/20261022-9LGQjv/public-inventory-crosscheck.log`，本代理已读取。此反证只证明 helper 的语法盲区；未修改 Product，未构建相应产物，也未实际证明完整 Gate 能被该变化绕过。

### P-02 / 改写或在 P-01 后移除无效片段：负向 type export 检查落在值空间

- **完整实体：** `public API inventory > publishes only the approved runtime and type roots`。
- **位置：** `/workspace/vibe-check/scripts/package/public-api-inventory.test.ts:309-328`，九组 `@ts-expect-error`（辅助 type aliases 不是九个实体）。
- **Owner：** [Public authoring surface](../../docs/development/project-definition.md#public-authoring-surface)与 `AUX-PUBLIC-AUTHORING-TYPES-001` 的 approved named type roots。
- **可观察回归：** 不受支持的辅助类型被作为 package root 类型导出。
- **实际缺陷：** `ProjectModule = typeof import("../../src/project-definition/project-definition.ts")` 再取 `ProjectModule["CheckReason"]` 等，只查询 module 的值空间，且目标是内部 module，不是 `src/index.ts`。即使同名 `export type CheckReason = ...` 被加入，值空间仍可缺此 property，预期错误不会消失；因而不能证明注释所称 “not a named public type root”。Bun 正文也不会执行这些类型语句。
- **最小动作：** 若保留特定 forbidden-type 的独立负向义务，直接从真实根入口做 `import type` 负例，并由现有 scripts/installed typecheck 执行；若 closed inventory 已足以表达全部义务，可在 P-01 的观察器补强后删除这组无效 aliases。不得用 `typeof import` 再包一层 helper。
- **删除后的承接：** P-01 的真实 type export 清单比较承接“无额外 root”；installed consumer 正向 import 继续承接已批准类型可用性。P-01 尚未改写前，不声称这两者已覆盖所有导出语法。
- **验证状态：** 主线程用已安装 `nativeTypeScriptBinPath` 在独立 fixture 编译：没有/增加 type-only export 两状态下，现 `typeof import` 形式均 exit 0；改为真实 named `import type` 负向 guard 后，增加该类型触发 TS2578。脚本与日志同 P-01，本代理已读取结果。这是语言行为反证，不表示当前生产 API 已泄漏类型或完整项目 typecheck 已重跑。

### P-03 / 改写：manifest mutation 矩阵不能区分独立安全审计与 equality 拒绝

- **完整实体：** `checked-in release manifest projects only version and rejects static-source or safety drift`。
- **位置：** `/workspace/vibe-check/scripts/package/artifact/manifest.test.ts:41-69`。
- **Owner：** [依赖与发布清单](../../docs/tooling/package-artifact.md#依赖与发布清单)，第 45/47 行：禁止 private/bin/scripts/subpath 等，且 source→projection equality 不取代 source 与 tar/staging 的独立 closed audit。Case 为 `AUX-PACKAGE-ARTIFACT-MATERIAL-001`。
- **可观察回归：** source 与 projected manifest 同时持有非法许可、发布字段或依赖形态，不能因为彼此相等而通过。
- **实际缺陷：** 六个 mutation 只更改送给 audit 的投影 JSON，fixture source 保持正常；`assert.throws` 不区分拒绝原因。生产 `/workspace/vibe-check/scripts/package/artifact/manifest.ts:76-83` 的 equality 单独就能拒绝这六行。因此独立 license/closed-fields/dependency/export policy 漏检时，矩阵仍可能全绿。第 75-80 行仅对 source sentinel 有直接负例。
- **最小动作：** 保留实体。对投影安全反例检查相应 safety 原因，而不是任意 throw；对 source 安全反例修改 fixture source，并观察 writer/source policy 的对应拒绝。必要时令 source 与待审投影同时非法但彼此一致，避免 equality 作为唯一故障信号。保留目前的 projection drift 与 sentinel 义务，不为每行新建 Case。
- **删除后的承接：** 当前 artifact 的硬编码合法 manifest assertions 只观察正常产物，不承接非法 source 的拒绝；必须由改写后的同一矩阵承接独立 safety 义务，不能整删。
- **验证状态：** 静态核对到 equality 可兜底拒绝，尚未做定向 mutation。

### P-04 / 可直接删除一条断言：自造数组的尾元素检查

- **完整实体：** `public API inventory > publishes only the approved runtime and type roots`。
- **位置：** `/workspace/vibe-check/scripts/package/public-api-inventory.test.ts:64-70`。
- **Owner：** [Public authoring surface](../../docs/development/project-definition.md#public-authoring-surface)及 [Package lifecycle 的安装后类型验收](../../docs/tooling/package-lifecycle.md#候选包安装与外部使用方验收)。
- **问题：** 测试自己构造 `[...defaultProjectFileSelection.patterns, "!**/fixtures/**"]`，仅检查 `.at(-1)` 等于刚追加的字面量。除输入可迭代性外，该信号由测试自己的 spread/append 保证，不能观察 Product selection 行为。
- **动作与承接：** 删除这一条 assert，不删除实体。第 61-63 行的默认值/深冻结断言继续保留；`external consumer type acceptance` 经 `/workspace/vibe-check/scripts/package/candidate/external-consumer/typecheck-fixture.ts:163-171` 真正构造 selection 并调用 public `collectProjectFiles`；`external consumer runtime acceptance` 的 `/workspace/vibe-check/scripts/package/candidate/external-consumer/fixtures/runtime.mjs:45-54` 断言实际 collection 结果与冻结状态。不是要求删除这些独立消费者证据。
- **验证状态：** 由表达式可直接判定冗余；未执行删除后的测试。

### P-05 / 可直接删除一条断言：guard 后重复检查固定字段

- **完整实体：** `package artifact > emits a readable ESM runtime layout and exact exports`。
- **位置：** `/workspace/vibe-check/scripts/package/artifact/artifact.test.ts:326`，位于该实体调用的 `assertReadableRuntimeLayout`。
- **Owner：** [Pack 前后验收](../../docs/tooling/package-artifact.md#pack-前后验收)的 source-map 一致性。
- **问题：** 第 318-325 行已经在 `sourceMap.file !== "index.mjs"` 时抛错，正常到达第 326 行的普通 JSON 对象必然满足同一个比较。该 assert 没有增量失败信号。
- **动作与承接：** 仅删除第 326 行；保留前置 shape/file guard、第 327-330 行独立 packaged-source bytes 比较，以及 `runtime source maps > normalizes and verifies one map against its packaged TypeScript source`。不能因此删除整个 layout/source-map 实体。
- **验证状态：** 控制流静态确定；未执行删行测试。

### P-06 / 待证后改写：法律材料 fixture 的第二次读取注入

- **完整实体：** `package legal materials > fails closed in the translated-analyzer audit phase order`。
- **位置：** `/workspace/vibe-check/scripts/package/legal-materials.test.ts:82-119,159-174`。
- **Owner：** [随包法律材料](../../docs/tooling/package-artifact.md#随包法律材料)第 53 行的 header→ledger→license、deferred absent 闭合；Case 为 `AUX-PACKAGE-ARTIFACT-MATERIAL-001`。
- **信号与风险：** `afterApprovedBytes` 对同一路径第一次返回真实 pin-matching provenance，后续返回变造 inventory，以越过 byte identity 阶段观察更深层错误。这确实能到达 inventory/header 分支，不能称为恒真或吞错；但它依赖生产先 hash 再重新 read 的次数。若实现改为一次读取后复用已验证 bytes，稳定包的语义可以不变，现有 malformed/target/header 注入却不再发生，测试会报与 owner 无关的失败。
- **建议：** 保留真实 legal byte/notice/deferred/untracked-header 验收及整个实体；后续核对是否将深层错误直接置于现有 parser/header helper 边界测试，并用稳定 byte view 保留主审计的 fail-closed 顺序。不要为绕过 pin 新增测试专用生产接口。未经替代证明不直接删这三组深层负例。
- **承接与未决：** `/workspace/vibe-check/scripts/package/legal-materials.ts:95-118` 是当前组合边界，`provenance-inventory.ts`、`packaged-audit.ts` 是现有 child owner；本轮未完整审查两者的独立测试面，故还不能认定迁移后覆盖闭合，也不把本项计为可直接删除。

### 同一 public inventory 实体的后续收窄提示

`/workspace/vibe-check/scripts/package/public-api-inventory.test.ts:71-128,158-183` 的大量 `.name` 检查会把内部函数名绑定到公开 export key；第 225-226 行对 inventory 源文扫描 `host|legal|license|manifest|version`，连无关说明注释也可能触发。当前 owner 承诺的是 approved root 与可调用性，不是函数内部名字或源文件不得出现这些英文词。实施 P-01 时宜用实际 namespace key、binding/callability 和结构/import 责任检查替代，保留 root/JSDoc/constructor 的真实义务。本轮不将它们扩张为整实体删除，也未对安全改名/注释做动态反例。

## 全量文件覆盖与处置

下表路径相对仓库根。

以下为全部实际审读的 scope 内测试文件；“保留”表示本轮未发现足以清理的具体缺陷，不表示所有可能 mutation 均已证明可检测。

| 测试文件 | 实体数 | 处置与独立信号 |
| --- | ---: | --- |
| `scripts/package/artifact/acceptance-input.test.ts` | 2 | 保留；实际 staging inventory/identity 与缺字段/异根拒绝。 |
| `scripts/package/artifact/artifact.test.ts` | 6 | 保留物理 artifact、docs/machine bytes、JSDoc、dependency/distribution 义务；P-01 改写 exact-root observer，P-05 删一断言。test-local JSDoc scanner 的反例验证其用于真实声明验收的观察能力，不作纯 helper 无价值处理。 |
| `scripts/package/artifact/compiler-cache.test.ts` | 1 | 保留；compile 调用次数/增量状态与真实 staging bytes 独立观察 docs-only、source/config/graph/lock/patch/corruption 变化。 |
| `scripts/package/artifact/esm-module-specifiers.test.ts` | 2 | 保留；独立 literal expected，覆盖静态/动态/re-export、普通字符串不改、密集 replacement、Worker 0/2 matches、各类语法拒绝。 |
| `scripts/package/artifact/manifest.test.ts` | 3 | 一个实体按 P-03 改写；fingerprint 原始 bytes、输入新增/复制隔离及 explicit-root missing-source 拒绝保留。fixture copier使用当前输入清单不等于 expected hash 重用实现，具体 byte mutations 仍给出非相等信号。 |
| `scripts/package/artifact/runtime-source-maps.test.ts` | 1 | 保留；精确 normalized map 与后续 packaged-source drift 拒绝。 |
| `scripts/package/candidate/acceptance-input.test.ts` | 2 | 保留；hash/输入拒绝与独立 child marker 直接观察 import/显式 Gate input 不加载 builder、缺输入才 fallback。 |
| `scripts/package/candidate/candidate.test.ts` | 3 | 保留；overlap 与 private manifest 在 install 前拒绝；integration target 的非 routine 名称/绝对目标/30 秒配置是有 owner 的运行边界，不等价于已运行 cold integration。 |
| `scripts/package/candidate/dependency-license-audit.test.ts` | 1 | 保留；top-level/scoped/nested 三包数量和分布独立 expected，随后逐步增删不合法声明/manifest/路径/symlink，避免前一个负例遮住下一个。 |
| `scripts/package/candidate/external-consumer/documentation.test.ts` | 2 | 保留；真实隔离目录 support bytes 与 installed Markdown/machine bytes、Node examples/Definition 的进程完成和结果核对，不能与 source renderer 单测等同。 |
| `scripts/package/candidate/external-consumer/input.test.ts` | 1 | 保留；closed shape、containment、已存在目录不覆盖，以及纯解析与 physical drift 的刻意分离。 |
| `scripts/package/candidate/external-consumer/runtime.test.ts` | 1 | 保留；绝对 Node/no Bun、依赖/bin containment、实际 installed Worker/Run/command、privacy canaries、waiver/cache/relation 等跨安装边界证据。没有因内部已有 unit tests 删除它。 |
| `scripts/package/candidate/external-consumer/type-acceptance.test.ts` | 2 | 保留；独立 consumer strict profile 与实际 declaration dependencies，真实 native compiler 的 public imports/正负类型用法及 installed adjacent JSDoc。 |
| `scripts/package/candidate/receipt.test.ts` | 1 | 保留；独立 malformed/stale reason expected 与 owned legacy-path 清理。writer→reader 的组合不构成全部自证，stale 输入与独立 reason 仍可证伪。 |
| `scripts/package/command.test.ts` | 1 | 保留；注入只替换外部动作，真实 command parser/分发/输出与 stale/current/action 及 complete Gate invocation 仍直接被观察。 |
| `scripts/package/compiler-toolchain.test.ts` | 1 | 保留；实际 TS6 API、两个实际 compiler `--version`、development 调用接线、隔离 resolver 的 malformed/escaping bin 矩阵。fingerprint shape/determinism 不夸称证明所有材料 byte sensitivity。 |
| `scripts/package/dependency-version.test.ts` | 1 | 保留；exact 与 range 下界/上界的独立布尔 expected 和 diagnostic requirement 文本。 |
| `scripts/package/legal-materials.test.ts` | 1 | 保留实体；P-06 对 stateful deep-error fixture 待证/改写。实际法律材料完整性不因是审计工具而失去价值。 |
| `scripts/package/legal-materials/source-mapping.test.ts` | 3 | 保留；真实 fixture bytes、独立 node crypto digest、只删指定 counts、其余 curated bytes不变；拒绝前不写和部分写失败后恢复有不同可观察义务。identity audit seam不用于冒充 analyzer semantic coverage。 |
| `scripts/package/public-api-inventory.test.ts` | 1 | 保留实体并按 P-01/P-02 改写，P-04 删一断言；root/JSDoc/constructors义务不能整删。 |
| `scripts/package/release/command.test.ts` | 1 | 保留；真实 closed argv 与 source package script 接线、receipt/path/完整 --all invocation、原样返回非零验证结果。 |
| `scripts/package/release/release.test.ts` | 4 | 保留；canonical version/tag、portable receipt/写前 owned-path 与摘要、非法 inventory/contract/extra fields、artifact drift、formal/local 隔离、真实 test-local clean Git/untracked dirt。receipt 语法单测不冒充真实 tarball acceptance。 |
| **合计** | **41** | **22 文件；无整实体直接删除候选。** |

## 相邻实现与委托证据的实际读取范围

本报告保持该分区形成时的读取边界；全仓普查已由 [Repository 补充审读](repository-review.md)补齐下述 documentation examples 与显式 integration，整体完成依据见[覆盖证明](coverage.md)。

除上表完整测试外，实际读取以下当前源码；括号注明只读取具名函数者，其余按文件读取。CodeGraph 为主要代码读取/调用定位入口，未升级或重建其索引。

- `/workspace/vibe-check/scripts/package/artifact/`：`acceptance-input.ts`、`esm-module-specifiers.ts`、`runtime-source-maps.ts`、`manifest.ts`、`staging-audit.ts`、`staging-runtime-layout.ts`；`compiler-cache.ts`（`prepareCompilerEmit`）、`fingerprint.ts`（`collectArtifactFingerprintInputFiles`）、`fingerprint.test-support.ts`（`copyArtifactFingerprintFixture`）。
- `/workspace/vibe-check/scripts/package/`：`command.ts`、`public-api-inventory.ts`、`package-contract.ts`、`legal-materials.ts`、`legal-materials/source-mapping.ts`。
- `/workspace/vibe-check/scripts/package/candidate/`：`acceptance-input.ts`、`integration-command.ts`；`prepare.ts`（`assessPackageCandidatePreparation`）、`install.ts`（`installCandidate`）、`receipt.ts`（`assessReusableArtifact`）。
- `/workspace/vibe-check/scripts/package/release/receipt.ts`（`verifyFormalReleaseReceipt`）。
- `/workspace/vibe-check/scripts/package/candidate/external-consumer/`：`documentation.ts`、`documentation-fixture.ts`、`type-acceptance.ts`、`typecheck-fixture.ts`、`runtime.ts`、`input.ts`、`command-result.ts`；所有被 typecheck template 拼入的 `check-options-type-acceptance.ts`、`command-check-type-acceptance.ts`、`custom-admission-strategy-type-acceptance.ts`、`data-boundary-type-acceptance.ts`、`handoff-type-acceptance.ts`、`project-changes-type-acceptance.ts`、`markdown-lint-type-acceptance.ts`、`finding-waiver-type-acceptance.ts`、`package-check-constructor-options-type-acceptance.ts`。
- `/workspace/vibe-check/scripts/package/candidate/external-consumer/runtime-evidence/`：`run.ts`、`assertions.ts`、`function-metrics.ts`、`learned-scheduling.ts`、`command-check.ts`、`durations.ts`、`messages.ts`、`runtime-host.ts`。
- `/workspace/vibe-check/scripts/package/candidate/external-consumer/fixtures/runtime.mjs` 全部 858 行、`command-check-runtime.mjs` 全部 544 行，包括进程 PID/overflow/force-kill/cleanup 断言，不只读取 wrapper 测试名。
- 配置读取：`/workspace/vibe-check/tsconfig.json`、`/workspace/vibe-check/scripts/test-evidence/supported-runner-profile.json`；本 Change 的 proposal/design/tasks 与主线程 scope/closure evidence。

**未越过的边界：** documentation acceptance runner 的 orchestration、installed bytes 比较、Definition outcomes 对照已读，但其导入的每篇受管 runtime example source 的业务断言未逐篇重新审读；本轮不据 wrapper 判定这些示例业务断言全部高质量。Product 各 Check、scheduler、parser 的实现/单元测试、真实 `candidate.integration.ts` 的全部故障注入，以及法律 child audit 的完整测试面不在本批 quality 全审范围。它们可为后续跨层反查提供候选，但不能从本报告推导“包支持测试之外全审完成”。

## 后续最窄验证与实施顺序

1. P-01/P-02 的小型 observer/TypeScript 对照已由主线程执行并反证当前片段；它不等于实际 Product mutation/complete Gate。P-03 尚可用 test-local source fixture 对照 equality 与 safety，本轮未运行这项 mutation。
2. 优先联合处理 P-01/P-02，再改 P-03；P-04/P-05 可随 owning test 的局部清理实施。P-06 先确认 child owner 的替代信号，不直接删。
3. 实施测试变化后运行最窄目标 Bun tests及 `bun run test-evidence -- check --root .`。涉及真实 artifact/consumer 的最终证明仍由 owner 的同一产物 complete acceptance承担，不能以本轮静态审计或小型 probe 代替；本轮授权不运行 build/install/complete Gate。
4. 本报告仅新增审计 Markdown；主线程统一运行文档/Change 材料验证，并核对既有源码/Case/Gate diff未被改变。
