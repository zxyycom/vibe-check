# repository-tooling

## Case AUX-TYPESCRIPT-TOOLCHAIN-001: Stable native compiler coexists with the retained TS6 API

Owner: `docs/tooling/workspace-dependencies.md#typescript-工具链`
Entities:

- `bun|scripts/package/compiler-toolchain.test.ts|stable native compiler and compatibility API retain distinct installed entrypoints`
  Proves:

- The official compatibility alias preserves TS6 AST API behavior and `tsc6` version while the explicitly resolved native bin executes stable TS7. Both development scopes invoke that bin directly; malformed identities and missing, directory or escaping bin declarations fail explicitly. The production fingerprint changes with each native, platform, wrapper and actual API material's bytes and returns to its baseline after restoration. Nested platform/API packages resolve relative to their owning manifests. Isolated material sensitivity and installed compiler/API execution are separate proofs.

## Case AUX-DOCS-VALIDATION-CLI-001: Root validation preserves default and focused material selection

Owner: `docs/tooling/repository-material-validation.md#material-task`
Entities:

- `bun|scripts/validation/workspace.test.ts|root validation adapter forwards default and focused material selections`
- `bun|scripts/validation/repository-material/workflow.test.ts|material workflow dispatches all default tasks and awaits asynchronous validators`
- `bun|scripts/validation/repository-material/workflow.test.ts|material workflow deduplicates focused selections without broadening them`
  Proves:

- The adapter used by workspace main forwards an empty default selection or exact focused argument order and repetition, preserves the material return code, and rejects unknown tasks before dispatch.
- Materials-only, invalid arguments and nonzero material results do not load layout. The default successful path awaits layout loading, runs it before the Git whitespace check, and propagates missing-module or layout failures without reporting success or starting the later Git check.
- The real workflow task map invokes all five default tasks, including package API check mode; independent expected leaf calls and reporter messages detect missing or miswired tasks. Focused selection keeps first-occurrence order, removes duplicates and does not add other tasks; the links repository root reaches its validator unchanged.
- Controlled pending JSON and example-publication operations prevent later tasks and the CLI return from completing prematurely. These tests prove in-process dispatch, completion and parameter wiring, not material contents or OS exit status; process-entry glue is covered by the owner's Manual CR conditions.

## Case AUX-DOCS-VALIDATION-REPORTING-001: In-process material validation keeps output reporter-owned

Owner: `docs/tooling/repository-material-validation.md#material-task`
Entities:

- `bun|scripts/validation/repository-material/workflow.test.ts|material validation library reports success only through an explicit reporter`
- `bun|scripts/validation/repository-material/workflow.test.ts|material workflow aggregates expected failures and continues selected tasks`
- `bun|scripts/validation/repository-material/workflow.test.ts|material workflow propagates unexpected failures instead of returning success`
- `bun|scripts/validation/workspace.test.ts|material CLI reports real link failures through stderr and a nonzero return`
- `bun|scripts/validation/repository-material/workflow.test.ts|material validation returns typed expected failures and keeps the Gate path console-silent`
- `bun|scripts/validation/repository-material/workflow.test.ts|material direct validation fails closed while the Gate adapter projects its safe Record subset`
- `bun|scripts/validation/repository-material/links.test.ts|documentation link validation retains every missing local-link occurrence in stable order`
- `bun|scripts/validation/repository-material/schema/strict-json.test.ts|workspace strict JSON validation matches public JSON Check BOM, encoding, and duplicate-key failures`
  Proves:

- The repository-material workflow only uses an explicit reporter for success summaries. Controlled leaf operations prove reporter routing and console silence without rescanning the repository; the Gate adapter projects supplied typed diagnostics into Records rather than printing them.
- Expected JSON, schema-publication and example-publication failures aggregate in task order while later tasks continue; failed diagnostics stay out of the success reporter, while a later successful task may still report. CLI presentation writes each diagnostic to stderr and returns 1; the real broken-links fixture independently proves ordered stderr-only failure. These are return-value and callback observations, not OS exit-status evidence.
- Unexpected synchronous or asynchronous validator errors retain their identity instead of being swallowed; package API projection failure also rejects. Provider-approved typed diagnostics are not reconstructed from thrown text.
- Empty collections, noncanonical data, duplicate IDs and unsafe one-line presentation fail before direct CLI presentation. The Gate adapter deliberately projects only its safe `{ id, data }` subset, so a direct-CLI-only unsafe presentation cannot suppress the corresponding failed Record or focused command message.
- JSON, schema, examples and links own their task-local ID/data/presentation. The link fixture proves every missing local-link occurrence has canonical repository-relative source/target, line, code-point column and occurrence, in deterministic source-location order, including repeated targets, skipped external occurrences and astral Unicode before multiple diagnostics.
- Workspace JSON validation creates one independent Product Run with the public `jsonValidation` constructor; BOM, invalid UTF-8 and duplicate-key fixtures prove it does not silently fall back to `JSON.parse` semantics or invoke the Project Gate.

## Case AUX-REPOSITORY-LAYOUT-001: Repository validation preserves architecture dependency boundaries

Owner: `docs/tooling/workspace.md#source-owners-and-dependency-direction`
Entities:

- `bun|scripts/validation/repository-layout.test.ts|validates repository layout and dependency boundaries`
- `bun|scripts/validation/repository-layout.test.ts|rejects forbidden dependencies from in-memory module analyses`
- `bun|scripts/validation/package-tools-core-closure.test.ts|enforces package-tool public contracts and Core closure`
- `bun|scripts/validation/package-tools-module-graph.test.ts|rejects unsupported loading syntax under Core and package-tool policies`
  Proves:

- Workspace validation rejects forbidden Product/Project/package dependency directions, direct imports of private process-execution implementation files, and an environment bootstrap dependency on process-execution. The negative matrix runs source text through real AST analysis and the dependency policies in memory; a minimal filesystem fixture and the current repository positive prove production adapter wiring.
- It also fail-closes the function-metrics private port boundary: only `analyzer-adapter.ts` may consume `analyzer/port-facade.ts`; port code cannot import Product; `analyzer-worker.ts` and `target-files.ts` must value-import the adapter; a later syntax error still reports its parse diagnostic once but cannot create a false missing-adapter-import violation; port-external Product tests cannot deep-import analyzer modules; and public/package entry points cannot leak the façade, adapter, Worker, or deep path.
- Real TypeScript projects prove recursive tool discovery, public symbol identity including aliases and type/value roles, approved external leaves, and rejection of private/test/unresolved edges and package-root round trips. Core traversal retains relative, absolute, alias and literal-dynamic edges, including indirect tool rejection; a separate no-emit proof catches an actual argument-type error. Loading syntax has exact in-memory diagnostic/edge assertions, with Core nonliteral and strict-tool dynamic loading retained as real project wiring.

## Case AUX-DEVELOPMENT-QUALITY-TARGETS-001: Development quality commands exclude only generated analyzer oracle fixtures

Owner: `docs/tooling/workspace.md#development-tooling`
Entities:

- `bun|scripts/development/quality-targets.test.ts|development quality target boundaries > excludes only generated function-analyzer oracle fixtures from product lint and format`
  Proves:
- Product lint and workspace format retain every normal `src` target while excluding only the checked-in generated function-analyzer oracle fixture directory; no translated-only lint or format exception is allowed. Typecheck likewise has no translated-only exception. Gate-specific lint explicitly selects oxlint JSON while standalone development lint preserves its default output; Gate format explicitly selects list-different while standalone `format check` preserves `--check`.

## Case AUX-PROJECT-GATE-CATALOG-001: Project Gate 的组合、root binding 与质量 policy 闭合

Owner: `docs/tooling/project-gate.md#project-gate`
Entities:

- `bun|scripts/project/gate/run.test.ts|Project Gate entries, root binding, and controls > binds the sole project check command to the mise-backed Gate root`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > projects the central composition manifest into an ordinary Project Definition`
- `bun|scripts/project/gate/checks/repository-quality.test.ts|repository quality Checks > uses the strict repository policy and binds only the mise-provided SCC command`
- `bun|scripts/project/gate/checks/repository-quality.test.ts|repository quality Checks > settles four blocking Checks while retaining advisory Markdown lint Findings`
- `bun|scripts/project/gate/checks/repository-quality.test.ts|repository quality Checks > substitutes an unavailable absolute SCC command without a function-metrics command`
  Proves:

- `bun run check` 通过 mise 使用仓库锁定的环境；`scripts/project/gate/run.ts` 是唯一 root process entry。
- `definition.ts` 用一份稳定顺序的 manifest 组合普通 Check；test lane descriptor 和 repository-quality options 分别由 `checks/test-execution/checks.ts` 与 `checks/repository-quality.ts` 拥有。entry validation 校验 `dependsOn` / `observes` 的 exact collection、self 与 missing target；`observes` 还保持 selection-policy/fast/适用 change-region/preset selection closure。
- Repository scan displayName 与 Product 功能测试、installed acceptance 区分；Markdown 功能 lane 包含 lint/links，Core-and-tools 包含 Core/package-tools，package-tooling 是包工具测试。Prepared candidate、external-consumer provider、test lanes 和质量 Check 保持独立 identity。Artifact 使用 prepared candidate；external provider 独占 package-lifecycle mutex，三个 consumer 只读 provider material。Project Gate change selection 与其余 tooling、admission workbench、repository layout、package-tools/Core fixture、machine-artifact acceptance 与其余 material validation 分别为独立 test lanes；两组 material tests 与 schema/example validators 共享 repository-materials mutex，JSON grammar 和 Markdown path validators 不持有它。
- Scheduler 的 `maxParallel` 为 `3`，两个逻辑资源的 capacity 均为 `2`：所有行为测试与 acceptance lane 各 claim 一个 Bun runner unit，五项直接仓库质量 Check 各 claim 一个 repository-scan unit。其它 typecheck、lint、format、provider 和 native Check 不声明这两个 claim；mutex 仍独立表达独占关系。
- 仅 Product/scripts 两个 lint Check 共享 type-aware-lint mutex；两者保留独立 identity 与选择，互不声明依赖，其它 Check 不持有该 mutex。
- Markdown Link 显式使用绝对路径的本地 parse-facts cache 与默认容量提醒；完整 corpus、target work limits 和 blocking policy 保持。
- Duplicate、file、function metrics 与 Markdown Link 的 normal Finding 使用 blocking policy，未豁免 Finding 经 owning Check 和默认 aggregate 阻断 Gate。Function metrics 保留 `50 + 150/below 5 + CC 10 + parameters 5` 限值，只对 `createProjectGateEntries` 当前起始行的 `function-code-density` 使用一项精确 waiver；其它函数与指标继续阻断。
- File metrics 保持全仓 `300 + 500/decision tokens ≤ 10` 行数策略；仅对 `docs/guides/building-project-gate.md` 的 `code-lines` 配置用户确认的单页教程 waiver，该文件仍在扫描范围内，其它路径不继承豁免。
- Markdown Link 保持完整文档输入和 blocking policy；Gate 将 `maxOccurrences` 与 `maxTargetReads` 设为 `false`，其它资源限制及 root-external 授权边界保持。
- `markdown-lint` 独立使用八项固定规则、`docs/**/*.md` / `changes/**/*.md` 范围和 non-blocking policy；Gate 显式启用可删除的逐文件 findings 缓存，不缩小检查范围。真实质量组工厂接线保留 advisory Finding 的 Records、final data 和 passed outcome。
- 三项 metrics 的 `product-source` area 共同排除 `src/package-checks/function-metrics/analyzer/**`；function metrics 额外排除 Product test/test-support，duplicate/file 仍选择这些测试文件。Duplicate detection 不选择 Markdown；duplicate/file metrics 不选择 historical Schemas，但继续选择 current Schemas。两个 Markdown Check 的范围均限于 `docs/**/*.md` 与 `changes/**/*.md`。
- Artifact、external-consumer provider、types consumer、docs consumer 与 runtime consumer 共五个 physical process 都带 30 秒外层 timeout；其它 test lanes 不继承该特定防挂死限制。显式 `package:candidate:integration` 另有 30 秒进程硬限制，但不属于 routine `--test` preset。

## Case AUX-PROJECT-GATE-SELECTION-001: Project Gate 的快速、范围与变更选择闭合

Owner: `docs/tooling/project-gate.md#project-gate`
Entities:

- `bun|scripts/project/gate/run.test.ts|Project Gate entries, root binding, and controls > defaults to fast and normalizes combinable focused presets into opaque flags`
- `bun|scripts/project/gate/run.test.ts|Project Gate entries, root binding, and controls > adds named routine scopes to fast with closed canonical flags`
- `bun|scripts/project/gate/run.test.ts|Project Gate entries, root binding, and controls > requires the complete all selection for one explicit formal release receipt`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > keeps fast, changed, all, and focused membership golden while aggregation uses Product selection`
- `bun|scripts/project/gate/runtime/eligibility.test.ts|Project Gate change regions > selects independent script test lanes from their changed inputs`
- `bun|scripts/project/gate/runtime/eligibility.test.ts|Project Gate change regions > selects Product Check test lanes without losing shared or cross-owner inputs`
- `bun|scripts/project/gate/runtime/eligibility.test.ts|Project Gate change regions > covers every routine execution lane test file with its owning change region`
- `bun|scripts/project/gate/runtime/eligibility.test.ts|Project Gate change regions > keeps quality and material regions specific to their inputs`
- `bun|scripts/project/gate/runtime/eligibility.test.ts|Project Gate change regions > keeps the product Core-and-tools region complete for the lane resolver`
- `bun|scripts/project/gate/runtime/eligibility.test.ts|Project Gate change regions > selects package and Case checks only for their documented source boundaries`
- `bun|scripts/project/gate/runtime/eligibility.test.ts|Project Gate change regions > covers every registered package source and current Case owner`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > executes only Product flag-selected Checks and aggregates the same identities`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > adds routine scopes to fast without selecting unrelated slow work`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > starts a downstream-only Gate Check with its prerequisite and aggregates Product selection`
  Proves:

- 无 selection 参数时采用 fast 快速反馈，只运行有资格且命中输入的工程基础与两条快速测试 lane，加上固定 candidate/whitespace；不能替代验收。`--changed` 选择全部受影响 routine 验收，`--all` 不依赖变更命中选择完整 routine manifest；二者各自独占。focused preset 可重复、组合并替换默认选择，receipt 只与 all 同用，摘要反映实际范围。
- `--scope` 的构造边界验证非空及已知范围，固定去重、排序、独立冻结且可往返编码的选择状态；非法或混用输入、非规范 flags 及 scoped receipt 均被拒绝，非法 scope 不准备 candidate。
- 实际 Product Run 在正常 Git 零命中、无 Git 回退与无关工作区变更下，均选择 fast 加指定 routine 范围及必要依赖，不带入无关慢项或 non-routine 项；零命中不执行无关 fast，范围并集只追加指定工作。scoped golden 保留 manifest 顺序，观察关系须闭合。
- changed 通过 Gate 的 region 数据与 Product 所用的 `micromatch` 完整列表选项选择各 Check 的输入：Product 源码、已登记随包材料、schema/example、当前 Case Owner 和规则变化各触发对应检查，调查或决策文档不唤起无关 package/Case test lane。所有已登记 package source 与当前 Case Owner 均受 region 覆盖。Product 的真实 Git 快照测试单独证明 changed path 与不可用回退；未分类根路径也保守扩大至全部 routine 验收，已知家族下的新脚本模块则由所属保守 region 承接。Product Core-and-tools lane 的 region 覆盖其完整 test 分区及相关源码。
- 已登记的 `docs/examples/package-api-support/**` 验收支持源变化会选择 package tooling lane，避免只修改共享验收逻辑时漏掉复制与 fingerprint 回归；支持源仍不是发布材料。
- 七个 Product Check test lane 分别绑定自己的 change flag：私有实现与 fixture 触发所属组，已知 owner 的测试正文触发自身 Product lane 及扫描其正文的组。host-environment/project-files 测试属于 supporting Checks。file metrics 另消费 JSON validation/document 的实现、helper 和 fixture；function metrics 的 source-identity 审计覆盖全部 Product source。
- 根导出、共享实现/helper、未知新模块（含测试正文）、近似目录名和测试工具链保持保守选择。package tooling、Gate 本体与普通 tooling 三个 routine 脚本组消费 Product 实现、helper 与 fixture，已知测试正文由 owning Product lane 承接；layout、质量扫描及全树 Test Evidence 保留各自正文输入。实际 Product/Core-and-tools 和 routine 脚本 lane 的完整文件清单均能触发自身，启动分区校验保持完整文件分区，显式 test/all 覆盖 routine lanes。
- package-tools 模块语法配对测试与真实工程闭包测试同属既有快速边界 lane；其测试路径选择 layout 与 package-tools 边界测试 region，不选择其余 validation lane。
- JSON、Schema、publication、machine example、Markdown、质量扫描和规则测试保持各自的输入边界；schema source 变化会选择 publication validator，独立材料测试证明发布漂移被拒绝。Markdown links 因反向目标依赖仍检查完整 corpus，focused preset 与 `--all` 提供不依赖变更的强制路径。
- Product effective selection 决定 Check 执行、prerequisite 和 aggregate；未选中 Check 保留 not-applicable fact。fast/changed 保留 prepared candidate；changed 的相关 package 输入同时选择 artifact、external provider 与 installed docs/runtime，routine all 始终包含它们。types 使用 release-only policy，仅正式 receipt+all 或 consumer-types focused preset；workbench 使用 explicit-only policy，仅 admission-workbench preset，test/all/changed/unknown 或 Git-unavailable fallback 均不带入它。实际 Product 执行证明 consumer-types 自动带入两个 provider，workbench 不带入其它 lane；四扫描和 runner 数不变。

## Case AUX-PROJECT-GATE-DIAGNOSTIC-LOGGING-001: Project Gate 将 Product owner outputs 放入 invocation namespaces

Owner: `docs/tooling/project-gate.md#project-gate`
Entities:

- `bun|scripts/project/gate/runtime/bound-run.test.ts|binds owner-specific Product outputs and Check artifacts to the Gate invocation directory`
  Proves:

- Gate controls map one deterministic, test-owned invocation root to Product diagnostics at the root, `progress.log`, `checks/` artifact base and `machine/` publication. The isolated fixture runs one synthetic Check rather than scanning the current repository; it proves explicit channel naming with exact `core.log` / `scheduler.log` readback and root inventory, absence of a Product-specific learned channel, and the paired `machine/run.json` / `machine/records.ndjson` facts while proving root-level machine files, old `process/` and disabled progress output do not appear. It then removes only its own `.log/project-gate-tests/output-override-*` directory. It does not inspect, clean, or infer facts from pre-existing `.log/project-run` inventory, create a quality-only report, or establish a Gate performance budget.

## Case AUX-PROJECT-GATE-TRANSCRIPT-001: Project Gate 保存并闭合外层运行过程

Owner: `docs/tooling/gate-diagnostics.md#gate-terminal-and-transcript`
Entities:

- `bun|scripts/project/gate/runtime/transcript.test.ts|Project Gate transcript > records only Gate-owned messages and final facts without patching terminal writers`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > reports the invocation directory when Gate transcript setup fails`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > post-processes one initial Gate result before reporting the final exit`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > fails closed when the Gate transcript cannot be completed`
  Proves:

- invocation-local `gate.log` 保存显式写入的 Gate adapter / resultContributor message 与 `[GATE]` 标记的 invocation directory、最终 result 和 exit status；candidate/selection、aggregation 与 post-processing 的 info 不写 terminal。terminal 只保留启动摘要、Product progress、Gate warning/error、logs path 与最终 result。建立和关闭都不会 patch console 或 process stream writer，Product progress 与 Check presentation 保持各自的 terminal owner，重复关闭不会伪装成功。
- transcript 消费 resultContributor 处理后的唯一 result 及其 exit mapping，而不是初步结果或另一套聚合；directory 已创建但 transcript 无法建立时不启动 Product Run 并显示该 directory，已开始的 transcript 无法完整关闭时 fail closed 为 unavailable，只在终端报告 unavailable result 并保留 directory 供检查。

## Case AUX-PROJECT-GATE-AUTHORING-001: Project Gate 区分 native 与真实 process evidence

Owner: `docs/tooling/project-gate.md#project-gate`
Entities:

- `bun|scripts/project/gate/checks/process/native-operation.test.ts|Project Gate native operation > preserves native outcomes, diagnostic Records, and cancellation`
- `bun|scripts/project/gate/checks/materials-validation.test.ts|Project Gate repository material native diagnostics > publishes complete material native diagnostic Records while terminal progress stays bounded`
- `bun|scripts/project/gate/checks/native-projections.test.ts|Project Gate owner-safe native projections > publishes only owner-approved Decision and Test Evidence diagnostics`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > preserves two-step ast-grep process evidence and failures`
- `bun|scripts/project/gate/checks/entry-factories.test.ts|wires one plain command through Product execution and Gate failure evidence`
- `bun|scripts/project/gate/checks/entry-factories.test.ts|resolves a direct dependency environment and rejects unavailable providers before spawn`
- `bun|scripts/project/gate/checks/entry-factories.test.ts|projects a complete nonzero command through the Gate-owned failure projector`
- `bun|scripts/project/gate/checks/entry-factories.test.ts|rejects mixed dependency and failure projection adapters at runtime`
  Proves:

- Native operation 将 owner-approved safe diagnostics 逐项发布为完整 Check-local Records；它不创建 native `process.log`，也不再承载 diagnostic presentation。repository-material fixture 的 12 条 diagnostics 全部进入 Run snapshot 和 published `records.ndjson`；Product terminal 与 progress tee 用 generic Record preview 只显示五条、将每条 terminal-control-escaped text 限制为 240 Unicode code points，并说明另有七条 omitted。preview 不改变 failed status、final data、accepted focused-command message 或 effective aggregate。
- 空、重复或不安全 diagnostics，以及 operation throw，均 fail closed 为 unavailable；不会创建 synthetic failed Record 或 native transcript。预取消返回 execution-cancelled 且 operation 调用次数为零；operation 后取消仍保留同一 root 与 signal 的交接。
- Decision Records 只把已验证的 source/index/relationship facts 投影为 typed safe diagnostics，不转交 YAML、schema 或 filesystem `errors` 原文。semantic Test Evidence 只按 origin/code allowlist 和 code-specific policy 发布已验证的 path/location、Case ID 与 `runner: "bun"`；`topic.heading-unexpected` fixture 证明一条显式批准的 unexpected-heading Record。child/parser text、target、selector 和 entity key 不进入 native Record；generic Product preview 不读取或猜测 data fields。未知输入 fail closed 为 unavailable。
- Test Evidence rule validation 把 cancellation 交给真实 ast-grep process，并只在自身 `checks/test-evidence-rule-tests/process.log` 保留 version/rule-test evidence。nonzero、version mismatch 和 unavailable 仍可区分；version-mismatch Record 只含 expected version、fixed mismatch classification、exit code 和 invocation-relative log reference，不复制 stdout/stderr。
- Gate command entry factory 只把单一无 shell invocation、ordinary selection metadata、继承环境和安全完成阶段组合到 Product `commandCheck`；plain、typed dependency 或 structured failure projection 中的一种 adapter 仍保持互斥。typed dependency 通过 `dependsOn` 与执行时 resolver 读取，provider 不可用时不启动 child；混合 adapter 在 TypeScript authoring 和 runtime guard 都被拒绝。

## Case AUX-PROJECT-GATE-PROCESS-001: Project Gate 保留命令与 transcript 事实

Owner: `docs/tooling/gate-diagnostics.md#process-evidence`
Entities:

- `bun|scripts/project/gate/checks/external-consumer-material.test.ts|external consumer provider binds typed output to invocation provenance`
- `bun|scripts/project/gate/checks/external-consumer-material.test.ts|external consumer provider keeps nonzero output unavailable with generic evidence`
- `bun|scripts/project/gate/checks/oxlint-failure-records.test.ts|Project Gate oxlint failure Records > projects every complete scoped JSON diagnostic with installed-protocol label spans`
- `bun|scripts/project/gate/checks/oxlint-failure-records.test.ts|Project Gate oxlint failure Records > declines malformed, out-of-scope, and incomplete diagnostic protocols as one whole`
- `bun|scripts/project/gate/checks/oxfmt-failure-records.test.ts|Project Gate oxfmt failure Records > projects every authorized list-different path as a relative Record`
- `bun|scripts/project/gate/checks/oxfmt-failure-records.test.ts|Project Gate oxfmt failure Records > declines non-path text, duplicate paths, and paths outside the owned target set`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > settles lint-product with structured oxlint Records or exactly one generic fallback`
  Proves:

- **单命令 Checks：**所有单一无 shell Gate command（包括 development checks、test lanes、`lint-product` 与 `prepared-external-package-consumer`）使用 `commandCheck` 的 Product `process.log` format 和 `command-transcript-unavailable` boundary。Gate 绑定 environment、timeout、direct dependency resolver 和安全完成投影；普通 entry 两条流各限 64 MiB、`lint-product` 各限 1 MiB、external provider 各限 64 KiB，计量与回收沿用 Product 规则。Product 必须在 `afterCommand` 前写完 transcript。
- **保留的多步骤 workflow：**`test-evidence-rule-tests` 仍由 owner-specific Check 运行 ast-grep version 与 rule-tests 两步，并复用 Gate multi-step transcript/failure helper；它不是单一 command，不能压缩为一个 `commandCheck`。
- **Consumer-owned settlement：**`lint-product` 以 Gate oxlint projector 形成 safe Records，或回退一个 generic failure。external consumer 从 prepared-candidate dependency 派生 environment；仅 zero exit 解析并验证 stdout、physical material 和 provenance 后发布 typed data。nonzero exit 为 `unavailable / external-consumer-provider-failed`；解析或验证失败为 `unavailable / process-output-invalid`，不发布 typed data。这些 reason 与 projection 不属于 Product `commandCheck` contract。
- command entry 的 direct-execute evidence 覆盖 Product transcript、generic failure Record/message、dependency environment 成功与 provider fail-closed；`lint-product` 及 oxlint/oxfmt projector tests 覆盖 owner-specific structured Records 与 generic fallback。Product commandCheck 自身的 timeout、output limit、signal、取消和 transcript capability tests 是这些边界的唯一生命周期证据，Gate 不复制一套 runner。

## Case AUX-PROJECT-GATE-PREPARED-CANDIDATE-001: Gate 将已准备 candidate 保留为 typed fact

Owner: `docs/tooling/project-gate.md#project-gate`
Entities:

- `bun|scripts/project/gate/checks/prepared-candidate.test.ts|prepared package candidate Check > publishes versioned typed candidate data and rejects malformed dependency facts`
- `bun|scripts/project/gate/checks/prepared-candidate.test.ts|prepared package candidate Check > fails closed when the prepared artifact no longer matches its digest`
  Proves:

- prepared-candidate provider 只发布 closed、versioned、绝对路径且 containment 合法的 candidate data，并保留 artifact digest、文件 inventory、installed entry、preparation action/reason 与 reuse fact；schema 明确区分 local rebuild/reinstall/reuse 与 formal `release / release-receipt`。
- Provider 在 artifact、staging 或 resolved entry 缺失以及 artifact digest 漂移时 fail closed；artifact acceptance 与 external-consumer provider 只能按各自需要解析同一次 typed Gate candidate，不能把未验证路径当作 dependency input。

## Case AUX-PROJECT-GATE-ADAPTER-001: Project Gate 只闭合已准备的完整 invocation

Owner: `docs/tooling/project-gate.md#project-gate`
Entities:

- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > returns help before candidate or log work`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > does not load or run a candidate consumer after preparation failure`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > loads no Definition or package runtime before candidate preparation`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > uses explicit formal receipt preparation without invoking local candidate preparation`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > rejects an imported entry that differs from the prepared candidate before run or resultContributor`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > consumes package aggregation without traversing the raw Check snapshot`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > maps aggregate, definition warning, output and malformed facts to Gate exits`
  Proves:

- 隔离 child process 在没有 candidate package 的 project root 中加载真实 root adapter，并以会 throw 的本地 Definition 替身取代 Definition；它证明 candidate preparation 前不会直接或间接加载 package public runtime 或 Definition。`--help`、preparation failure 或 prepared/imported entry mismatch 均在 consumer execution 与 definition-owned `resultContributor` 前停止；help 与 mismatch 也在 invocation log 创建前停止，help 还不会准备或导入 candidate。
- 成功 invocation 只各执行一次 candidate preparation、consumer load、log-directory creation 和 bound Run，并把同次 normalized selection flags 与 prepared candidate 交给 consumer。Formal mode 只调用 receipt preparer，并把其 exact installed artifact 与 all+release flags 交给 Run，不调用或回退到 local fingerprint preparer；all+release 的 manifest 选择另由 selection Case 证明。
- 初步 Gate 结果要求 Package Run 的 default aggregate 为 passed；definition warning、progress failure 或非-passed aggregate 形成 failed，non-completed 或 malformed result 形成 unavailable。adapter 不遍历 snapshot 重建 aggregate。

## Case AUX-PROJECT-GATE-POST-PROCESSING-001: Project Gate 后处理只产出一个最终结果

Owner: `docs/tooling/project-gate.md#project-gate`
Entities:

- `bun|scripts/project/gate/runtime/bound-run.test.ts|projects the central resultContributor configuration with candidate-bound run`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > post-processes one initial Gate result before reporting the final exit`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > fails closed when resultContributor throws`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > fails closed when resultContributor returns an invalid result`
  Proves:

- candidate-bound module 从中央 `definition.ts` 投影唯一 `resultContributor` 与 Product `run`；entry identity 验证后，Hook 在 bound Run 返回并形成初步 Gate 结果后执行一次。它可以同步或异步接收冻结的初步结果，以及包含 normalized selection、repository root、prepared candidate、invocation logs、原始 RunResult、Gate started、initial-result timestamp、总 `elapsed-to-initial-result` 与 candidate preparation / adapter-setup / Product Run 三个连续 phase 的只读 Gate context；返回闭合的 `{blocks,messages}`，adapter 只允许初步 passed 降为 failed，并由唯一最终状态映射 exit。
- Hook context 不因当前性能用例退化成 elapsed 参数集合，也不暴露 loader、clock、console writer 或 candidate preparer 等执行依赖；invalid 或 non-monotonic phase timing 不能被归一化为 0ms 后进入 threshold comparison，初步 passed 时必须阻断。
- Hook 抛错或返回无效结果形成带受控诊断的 unavailable 最终结果，不静默放行，也不对外暴露 base/acceptances/final 并行结果集合。

## Case AUX-PROJECT-GATE-PERFORMANCE-001: Project Gate 三项预算阻断与失败现场

Owner: `docs/tooling/project-gate.md#性能预算与-check-耗时分布`
Entities:

- `bun|scripts/project/gate/runtime/performance-policy.test.ts|Project Gate performance policy > preflights complete standard policies and rejects malformed budgets before use`
- `bun|scripts/project/gate/runtime/performance-observation.test.ts|Project Gate performance budgets > blocks exceeded budgets or invalid measurements and retains failure context`
- `bun|scripts/project/gate/runtime/performance-observation.test.ts|Project Gate performance budgets > enforces each standard profile's versioned budgets independently of runtime and declaration identity`
- `bun|scripts/project/gate/runtime/performance-observation.test.ts|Project Gate performance budgets > summarizes current Check costs and evaluates mean and nearest-rank p95 independently`
- `bun|scripts/project/gate/runtime/performance-observation.test.ts|Project Gate performance budgets > rejects malformed, duplicate, or overflowing Check duration facts without emitting statistics`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > blocks total and Check budgets with failure evidence without revising Product facts or retrying`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > fails before candidate preparation when the version-controlled performance policy is invalid`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > leaves focused selections outside the total-time budget`
  Proves:

- fast/changed/all 使用同一版本化策略：总预算为 30000/30000/90000ms，均值 2000ms、P95 5000ms；receipt 的 all+release 仍使用原 all 预算，不增加发布档。完整三档策略在 candidate preparation 前校验；非法或 loader 抛错失败，不读取本机配置或按 runtime/指纹改变门限。
- `elapsed-to-initial-result` 包括三个连续阶段；等于预算为 info，总耗时、均值或 P95 任一独立超标即 error / blocks。无效 timing 或 duration facts 仍阻断，初步非 passed 不提升，focused preset 和 scoped 局部选择不加载策略或评估标准预算；scoped 明确返回未套标准预算的诊断。
- Check 分布不计 null，但计入真实零值；输出执行数量、累计执行耗时和独立判断的均值/P95，累计值明确不等于墙钟。nearest-rank 对小集合、20 项和 34 项具有确定结果，空集合显示 n/a，最慢三项按耗时及 ID 确定排序。重复 ID、非法耗时和累计溢出不产生伪统计。
- 领域 API 覆盖三档总耗时、均值、P95 独立及组合超标的 blocks 与消息；adapter 分别以总耗时、Check 分布超标代表用例证明默认 contributor 返回 exit 1，error、唯一 failed / exit 1 与安全现场实际落入 gate.log，终端只显示超标和日志入口。准备、load、Run 各执行一次，预算对象与 Product facts 不改写；现场保留完整 duration facts、实际测量、candidate 身份/准备动作及 runtime，未超标时无失败现场。现场只投影授权字段，控制字符转义后仍通过 contribution 校验，JSON 读回保留原值。

## Case AUX-PARALLEL-RUNNER-001: Static Task engine 保持通用调度契约

Owner: `docs/development/scheduler.md#admission-state-与-real-shell`
Entities:

- `bun|src/project-run/task-scheduler/task-engine.static-validation.test.ts|static task engine > validates static task identity dependency and scope structure before execution`
- `bun|src/project-run/check-execution/plan.test.ts|Check execution plan > projects normalized admission priority into the static task graph`
- `bun|src/project-run/task-scheduler/task-engine.admission.test.ts|static task engine > respects one root budget for dependency order and named mutex execution`
- `bun|src/project-run/task-scheduler/task-engine.graph-observation.test.ts|static task engine > distinguishes full graph identities with identical Task IDs but different scheduler semantics`
- `bun|src/project-run/task-scheduler/task-engine.graph-observation.test.ts|static task engine > records one graph and references its fingerprint from every scheduler decision`
- `bun|src/project-run/task-scheduler/task-engine.admission.test.ts|static task engine > uses priority only among dependency and mutex eligible ordinary ready tasks`
- `bun|src/project-run/task-scheduler/task-engine.admission-observation.test.ts|static task engine > emits immutable root admission and mutex decisions`
- `bun|src/project-run/task-scheduler/task-engine.admission-observation.test.ts|static task engine > emits root capacity and running-drain decisions`
- `bun|src/project-run/task-scheduler/task-engine.scope-capacity.test.ts|static task engine > keeps a scope cap active through terminal settlement and prioritizes its continuation`
- `bun|src/project-run/task-scheduler/task-engine.scope-capacity.test.ts|static task engine > recomputes tighter-scope selection after capacity becomes available`
- `bun|src/project-run/task-scheduler/task-engine.scope-capacity.test.ts|static task engine > orders constrained selectors by cap then priority without Scheduler policy state`
- `bun|src/project-run/task-scheduler/task-engine.scope-capacity.test.ts|static task engine > does not activate a cap for a scope with no activation task`
- `bun|src/project-run/task-scheduler/task-engine.settlement.test.ts|static task engine > settles executor failures and blocks only their dependent tasks`
- `bun|src/project-run/task-scheduler/task-engine.settlement.test.ts|static task engine > blocks unmet prerequisites while admitting terminal observers`
- `bun|src/project-run/task-scheduler/task-engine.settlement.test.ts|static task engine > accepts Product-owned pre-admission results without admitting those Tasks`
- `bun|src/project-run/task-scheduler/task-engine.settlement.test.ts|static task engine > stops new admission after abort while admitted work receives the same signal and drains`
- `bun|src/project-run/task-scheduler/task-engine.admission-policy.test.ts|task engine admission policy > recomputes static select or wait from each frozen scheduler snapshot without reservation state`
- `bun|src/project-run/task-scheduler/task-engine.admission-policy.test.ts|task engine admission policy > adapts custom select from a detached frozen full-graph context`
- `bun|src/project-run/task-scheduler/scheduler-context-needs.test.ts|Scheduler context demand > provides detached candidates/runtime without implicit historical or measurement fields`
- `bun|src/project-run/task-scheduler/task-engine.admission-policy-failures.test.ts|task engine admission policy > consumes the same caller closure independently across overlapping custom Runs`
- `bun|src/project-run/task-scheduler/task-engine.admission-policy-measurement.test.ts|task engine admission policy > shares one frozen graph while exposing only decision-boundary measurement scalars`
- `bun|src/project-run/task-scheduler/task-engine.admission-policy-measurement.test.ts|task engine admission policy > commits a settled running-cohort interval before the next custom policy callback`
- `bun|src/project-run/task-scheduler/task-engine.admission-policy-measurement.test.ts|task engine admission policy > retains custom action effects while unavailable clocks omit interval contributions`
- `bun|src/project-run/task-scheduler/task-engine.admission-policy-failures.test.ts|task engine admission policy > fails custom policy faults without fallback, cancels pending work, and drains admitted work`
- `bun|src/project-run/task-scheduler/task-engine.admission-policy-failures.test.ts|task engine admission policy > drains an admitted public Check before returning an admission policy fault`
- `bun|src/project-run/task-scheduler/task-engine.admission-policy-failures.test.ts|task engine admission policy > classifies every bounded custom fault without exposing callback values`
- `bun|src/project-run/task-scheduler/task-engine.admission-policy-failures.test.ts|task engine admission policy > returns the dedicated execution result for a custom callback failure`
  Proves:

- Engine 在任何 executor work 前验证静态 Task identity、`dependsOn` / `observes` union、scope membership、activation/terminal relation、root/scoped cap、named-resource capacities/claims 和 signed admission priority；Check plan 将规范化 claims 与 root capacities 投影到该图。它以一个 root budget 处理 relation readiness、mutex、generic scope cap 与原子 named-resource occupancy。
- 关系校验先拒绝 unknown observes，再按 dependsOn 声明顺序报告首个 overlap；多 Task scope 从 terminal 一次计算可达集合，随后按 scope Task 声明顺序报告首个不可达成员。稀疏 chain 输入断言至多 3N 次 taskById.get，检测重复遍历回归。
- 宽关系列表中的合法重复项全部通过校验并保留，避免展开为函数参数而触发数量上限。
- Executor failure、executor 返回的 prerequisite-unsatisfied signal，或 Product 在 admission 前已真实形成的 terminal Task result，都只阻断 `dependsOn` dependent Task；pre-admission Task 不会再次 admission，terminal observers 与 unrelated Task 仍可完成。abort 后不再 admission pending Task，已 admitted Task 接收同一 signal 并 drain；engine 的 settlement 是唯一通用 execution accounting，且不读取 Check status、reason 或 data。
- 纯 `SchedulerDecision` 从 immutable scheduler snapshot 与 trigger 选择下一项 generic Task action：每轮依完整图、relation/mutex candidate、root/scoped/named-resource capacity 与 runtime facts 重算 exact `select(taskId)` 或 `wait`；static ordinary selection 不让一个 resource-blocked candidate 排斥其它 admissible work。priority 只来自 Task metadata，不能越过 dependency、mutex、capacity 或 lifecycle hard guard。命令式 shell 记录无状态 decision evidence，再执行 admission、wait/drain、blocked settlement、cancellation 或 completion；它不保存或解释 reservation、sticky、reason、公平或饥饿 state，也不取得 Check owner 身份。
- custom adapter 仅在每次**实际** callback 前交接 detached、ordinary、deep-frozen context。普通 function 为冻结空 context；显式 candidates/runtime 需求不隐式附加历史或 measurement 字段，不启用在线 measurement，且各次 decision 的动态 context 彼此独立。同一 Run 按需共享一次冻结 graph，包含 canonical capacities/claims，inspection 只暴露冻结的 resource occupancy。callback 不获得 private Scheduler objects、`Set`/`Map`、priority side input、resource handle 或 Task capability。独立 cumulative 字段只交接已 flush 的 scalar/peak/discrete facts，actionHistory 字段交接 captured-prefix append-only frozen action observation；`measurementCount` 截止旧 context 可读 prefix，synchronous `measurementAt` 不返回 live array 或 per-round slice，且不复制 terminal per-Task measurement table。每条 observation 从 accepted `select`/`wait` 的 post-state 到下一实际 callback 前，记录 state interval 与期间 admitted/settled effects，不归因给 action；interval 以 closed union 区分 available contribution 与 unavailable reason，clock throw/non-finite/backward 时离散 action effects 保留但没有伪造数值。Scheduler 对 malformed/thenable/throw、non-candidate、capacity/lifecycle-invalid select 和 undrainable wait 以有界 admission-policy fault 停止 admission、取消 pending 并 drain running，不 fallback；public Run 直到已 admitted Check settlement 才以专用 `admission-policy-failed` execution result 返回，且不暴露 policy console、checkMessages 或 timing artifact。diagnostic 不泄漏 caller value。

## Case AUX-SCRIPT-BOUNDARIES-001: Repository 与 process capability 的边界稳定

Owner: `docs/tooling/workspace.md#process-repository-file-and-narrow-boundary-capabilities`
Entities:

- `bun|scripts/process-execution/process.test.ts|detects failed process results`
- `bun|scripts/repository-files/files.test.ts|walks repository files deterministically and reports unreadable roots`
- `bun|scripts/repository-files/paths.test.ts|normalizes slash paths and identifies contained paths`
  Proves:

- `toSlashPath` 返回确定性 slash-normalized 路径，`isPathWithin` 只接受 resolved parent 的严格后代并拒绝 parent 自身与 sibling。
- repository 文件遍历忽略指定目录并返回稳定排序的相对路径；无法读取根目录时反馈实际目标，不静默返回空集合。
- process failure 对开发脚本 consumer 保持可观察，不被误判为成功。

## Case AUX-WORKSPACE-PROCESS-001: Process execution 保持纯文本捕获边界

Owner: `docs/tooling/workspace.md#process-repository-file-and-narrow-boundary-capabilities`
Entities:

- `bun|scripts/process-execution/process.test.ts|runs child processes with plain text output environment`
  Proves:

- 开发脚本启动子进程时使用 plain-text / no-color 环境，并返回可判断的 status、stdout 与 stderr。

## Case AUX-WORKSPACE-PROCESS-CANCELLATION-001: Process execution 保留 caller cancellation 事实

Owner: `docs/tooling/workspace.md#process-repository-file-and-narrow-boundary-capabilities`
Entities:

- `bun|scripts/process-execution/process.test.ts|cancels an already-started child process`
  Proves:

- 已运行 child 收到 caller 的 `cancelSignal` 后终止，并保留 `error`、`SIGTERM` 与 `status: null`，不被误判为成功。

## Case AUX-WORKSPACE-PROCESS-TIMEOUT-001: Process execution 保留 timeout 事实

Owner: `docs/tooling/workspace.md#process-repository-file-and-narrow-boundary-capabilities`
Entities:

- `bun|scripts/process-execution/process.test.ts|times out an already-started child process`
  Proves:

- 已运行 child 超过显式 timeout 后终止，并保留 `error`、`SIGTERM`、`status: null` 与 `timedOut`，不被误判为普通失败或成功。

## Case AUX-LIZARD-UPSTREAM-ADVISORY-001: Lizard upstream 查询保持显式、受限且非阻断

Owner: `docs/tooling/lizard-upstream.md#transport-and-result`
Entities:

- `bun|scripts/maintenance/lizard-upstream-advisory.test.ts|Lizard upstream advisory reports the pinned 1.24 baseline as current without ambient credentials`
- `bun|scripts/maintenance/lizard-upstream-advisory.test.ts|Lizard upstream advisory reports a stable newer release without changing anything`
- `bun|scripts/maintenance/lizard-upstream-advisory.test.ts|Lizard upstream advisory keeps HTTP, malformed, and oversized responses advisory`
- `bun|scripts/maintenance/lizard-upstream-advisory.test.ts|Lizard upstream advisory maps timeout and network failures to stable advisory results`
  Proves:

- 显式 maintenance lookup 只请求固定的 Lizard GitHub HTTPS release endpoint，禁用 credentials 与 redirects，并以 owner 指定的 pinned Lizard 为 baseline；current release 产生 `no-update`，较高 stable release 只产生 `update-available`，不会修改 repository state。
- HTTP、malformed、oversized、timeout、network 和 caller cancellation 都结算为稳定的 `unavailable` advisory code；预取消时 fetch 调用次数为零。它们不伪造“无更新”、不泄漏 transport error，也不形成默认 Gate 的阻断结论。

## Case AUX-LIZARD-PERFORMANCE-EVIDENCE-001: Opt-in Lizard comparison keeps equality and statistical interpretation explicit

Owner: `docs/tooling/lizard-performance.md#lizard--typescript-performance-evidence`
Entities:

- `bun|scripts/development/lizard-performance/command.test.ts|Lizard TypeScript developer performance evidence > requires an explicit bounded developer invocation`
- `bun|scripts/development/lizard-performance/command.test.ts|Lizard TypeScript developer performance evidence > locates invalid child and manifest fields at the evidence boundary`
- `bun|scripts/development/lizard-performance/command.test.ts|Lizard TypeScript developer performance evidence > canonicalizes metric ordering before output equality`
- `bun|scripts/development/lizard-performance/command.test.ts|Lizard TypeScript developer performance evidence > uses every ABBA block in deterministic bootstrap classification and only marks IQR outliers`
- `bun|scripts/development/lizard-performance/command.test.ts|Lizard TypeScript developer performance evidence > selects counted-operation wall only for warmed statistics and gives both B sides one warmup flag`
- `bun|scripts/development/lizard-performance/command.test.ts|Lizard TypeScript developer performance evidence > blocks statistical sampling on counted output drift and refuses non-Linux supervisor semantics`
- `bun|scripts/development/lizard-performance/command.test.ts|labels Linux wait4 resource scope without relabeling max RSS as tree aggregate`
  Proves:

- Developer comparison selection is explicit, bounded and developer-only; fixed Lizard executable/source inputs require host-absolute paths while the output path may remain caller-relative. Unknown CLI names, including inherited object-property names, fail closed rather than selecting a layer, an ambient language condition or a Gate path. The workflow cannot become a Product/package surface or authorize a performance optimization. Child-result and workload-manifest failures identify the invalid metric index or manifest field without accepting a partial evidence shape.
- Fixed-Lizard analyzer comparison canonicalizes the Product-consumed metric fields before equality with stable slash-path and field ordering. When a location-number subtraction is non-finite, the comparator falls through to the later text key, preserving deterministic ordering rather than inventing a numeric result.
- ABBA paired ratios, deterministic bootstrap confidence intervals, practical-equivalence classification and IQR marking preserve all samples; resource scope can independently make a resource comparison non-comparable.
- Warm statistics select the target-internal counted operation rather than whole-target startup/warm-up wall; drift after preparation and unsupported collector platforms stop comparability.
- Linux parent/child collector evidence names CPU plus reaped-descendant semantics and a single-process maximum RSS boundary, never falsely labeling it process-tree aggregate RSS.

## Case AUX-ADMISSION-WORKBENCH-001: Private virtual admission workbench keeps legality and synthetic time separate

Owner: `docs/tooling/admission-workbench.md#virtual-admission-workbench`
Entities:

- `bun|scripts/project/admission-workbench/command.test.ts|command writes identified virtual stdout for static and isolated learned replicates`
- `bun|scripts/project/admission-workbench/command.test.ts|command exclusively creates an explicit output after complete serialization`
- `bun|scripts/project/admission-workbench/command.test.ts|command rejects malformed arguments inputs and unsafe output targets`
- `bun|scripts/project/admission-workbench/command.test.ts|command returns nonzero error evidence with parsed identity for a public graph rejection`
- `bun|scripts/project/admission-workbench/command.test.ts|workbench source consumes only the installed public package and never the Gate entry`
- `bun|scripts/project/admission-workbench/policy.test.ts|prepared learned policy copies fixed history into isolated absolute state and keeps identity stable`
- `bun|scripts/project/admission-workbench/policy.test.ts|prepared learned policy invalidates identity and setup fallback instead of scoring it`
- `bun|scripts/project/admission-workbench/policy.test.ts|formal simple and prepared adapters prepare once and never complete virtual observations`
- `bun|scripts/project/admission-workbench/simulate.test.ts|admission workbench > matches shared-resource and serial hand-calculated oracles`
- `bun|scripts/project/admission-workbench/simulate.test.ts|admission workbench > matches empty single and chain boundaries without invoking policy for an empty graph`
- `bun|scripts/project/admission-workbench/simulate.test.ts|admission workbench > shares sampled external work across policies while deriving replicates deterministically`
- `bun|scripts/project/admission-workbench/simulate.test.ts|admission workbench > provides only formal context and a real captured action-observation prefix`
- `bun|scripts/project/admission-workbench/simulate.test.ts|admission workbench > preserves non-empty trace, time, boundary, and identities after a later policy failure`
- `bun|scripts/project/admission-workbench/simulate.test.ts|admission workbench > separates scenario schema rejection from public graph rejection`
- `bun|scripts/project/admission-workbench/simulate.test.ts|admission workbench > backfills past a capacity-blocked head and enforces scoped capacity`
- `bun|scripts/project/admission-workbench/simulate.test.ts|admission workbench > recomputes weak multi-resource rates after weighted and mutex occupancy changes`
- `bun|scripts/project/admission-workbench/simulate.test.ts|admission workbench > settles ties canonically and distinguishes unsatisfied dependencies from observers`
- `bun|scripts/project/admission-workbench/simulate.test.ts|admission workbench > freezes exact profile vectors and the claimed-only Gate resource shape`
- `bun|scripts/project/admission-workbench/simulate.test.ts|admission workbench > rejects wait without running work and illegal proposals without fallback`
  Proves:

- Private runner 只从 exact installed package public entry 消费 `AdmissionGraph` 与 learned helper；版本化 scenario 对 profile/task claim、policy registry、有限正数和图输入保持 closed validation，非法 public graph 与非法 policy 不会被静默替换为平台选择。
- FNV-1a UTF-8 NUL tuple 与 mulberry32 让同一 seed/replicate 可复放，并使不同 policy 共享同一 task 外生 work；空图不调用 policy，事件循环覆盖回填、scope、mutex、weighted/multi-resource、同刻 canonical settlement 与 `unsatisfied` forced block。
- 错误 evidence 保留已经发生的 boundary、virtual time、action-observation 和 trace prefix，并保留可可靠解析的 scenario/profile/policy/candidate identity；正式 policy context 以 `public-admission-policy-context-v2` 标识，只含 public graph/state、候选、capacity/runtime、独立 cumulative 与已关闭 actionHistory prefix，不暴露 sampled/remaining work、PRNG 或完整 trace。保留的旧 context 只可读取捕获时已关闭的 observation 前缀；负数、非整数及越界索引返回 undefined，累计 wait 与该前缀一致且不随后续执行改变。
- static 是版本化的简单合法 baseline；learned prepared adapter 通过 descriptor 的 `.callback` 直接准备并选择；为每个 replicate 复制同一固定 history snapshot 到独占 absolute state directory，记录 projection/model/fallback identity，不调用 `complete`，且 history/setup 或非预期 prediction fallback 使比较失败。
- makespan 与 slot·time、逐 named-resource unit·time 分开；四个调查 proxy profile 保留精确 median 与倍率且不冒充完整 Gate baseline，三档 contention/5.5x 长尾与 claimed-only Gate resource shape 都明确是合成或静态输入，virtual milliseconds 不等于 Gate timing。
- CLI 成功 JSON 只写 stdout 或独占新建的显式文件；输入、已有目标、符号链接与 public graph failure 返回非零结构 evidence。拒绝再次创建时保留首次 evidence 的完整字节；非法输入及目标拒绝后，已有文件、链接本身与链接目标字节保持原状。运行 workbench 不调用 Gate entry、真实 Check 或 private Scheduler source。
- 缺少执行模块的真实 bootstrap 仍先拒绝非法参数；有效输入才装载 execution，装载失败沿既有 failure evidence 结算为退出 `1`，不伪造 candidate identity。

## Case AUX-ADMISSION-WORKBENCH-SHARED-CLOSURE-001: Public shared closure distinguishes cancellation from virtual settlement

Owner: `docs/tooling/admission-workbench.md#evidence-与输出边界`
Entities:

- `bun|scripts/project/admission-workbench/shared-closure.test.ts|admission workbench shared closure > drains an admitted real Check while cancellation closes pending work before it starts`
- `bun|scripts/project/admission-workbench/shared-closure.test.ts|admission workbench shared closure > keeps virtual unsatisfied settlement separate from real cancellation`
  Proves:

- The public installed-package Run drains an admitted Check after cancellation while a pending Check never begins: both are unavailable with `execution-cancelled`, the pending duration is null, and the admitted Check has a duration. Separately, public AdmissionGraph `settle(..., "unsatisfied")` blocks `dependsOn`, releases `observes`, and does not introduce a cancellation transition.

## Case AUX-LEARNED-HEURISTIC-REPLAY-001: Dual-artifact replay rejects regressions without hiding boundary failures

Owner: `docs/tooling/admission-workbench.md#learned-admission-heuristic-对照记录`
Entities:

- `bun|scripts/project/admission-workbench/learned-heuristic-evaluation/evaluation.test.ts|learned heuristic replay rejects a 204 to 300 makespan regression even when its cost guard passes`
- `bun|scripts/project/admission-workbench/learned-heuristic-evaluation/evaluation.test.ts|learned heuristic replay keeps a sticky fallback failure outside direct prepared decide replay`
  Proves:

- Frozen dual-artifact comparison treats a per-replicate/tail makespan regression as rejection even when the independent 1.25× host-cost guard passes. The bounded timing path calls the raw public prepared `decide.callback` only; public context capture and sticky fallback validation remain outside that interval, and a later fallback invalidates the replay rather than being scored as a candidate benefit.

## Case AUX-LEARNED-HEURISTIC-PROTOCOL-001: 对照协议先建立有效的重放输入

Owner: `docs/tooling/admission-workbench.md#learned-admission-heuristic-对照记录`
Entities:

- `bun|scripts/project/admission-workbench/learned-heuristic-evaluation/input.test.ts|learned heuristic protocol validates consumed fields before replay without rewriting frozen bytes`
  Proves:

- 协议解析拒绝歧义或空的场景来源、非法整数计数和非字符串 eligible IDs，并在错误中定位对应字段；合法最小值可构成重放输入。
- 读取现有冻结协议时保留全部场景输入，并报告原文件 bytes 的 SHA-256，验证投影不替代协议身份。
