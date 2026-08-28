# repository-tooling

## Case AUX-QUALITY-DOGFOOD-001: Repository callers use the bound Project Run

Owner: `docs/script-tooling.md#quality-dogfood`
Entities:

- `bun|scripts/project/quality/project-run.test.ts|repository Project Run binds its definition before another caller supplies controls`
  Proves:

- The repository Run imports the installed public `vibe-check` entry, binds the repository Project Definition, and lets another caller supply only the controls that Run exposes.

## Case AUX-PACKAGE-CANDIDATE-001: Candidate lifecycle reuses only verified local package state

Owner: `docs/script-tooling.md#package-artifact-与-candidate`
Entities:

- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation > rejects overlapping package build and cache roots`
- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation > rejects invalid private consumer manifests`
- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation > builds, installs, and reuses a physical candidate`
- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation > keeps staging audit in build acceptance after packed artifact reuse`
- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation > rejects installed documentation drift`
- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation > reinstalls missing dependency without ancestor fallback`
- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation > classifies a malformed preparation receipt for cold rebuild`
- `bun|scripts/package/candidate/receipt.test.ts|rejects malformed and stale receipts before artifact reuse`
- `bun|scripts/package/command.test.ts|package root commands distinguish stale status from a completed rebuild and bind verification to full acceptance`
  Proves:

- Candidate preparation rejects overlapping build/cache roots and accepts only a valid private consumer manifest; it derives a reusable local build, packed artifact, installation, and resolved entry from one exact package state. Default build evidence is isolated from receipt/compiler cache state even when fixtures supply their own roots.
- Reuse revalidates the packed artifact and installed consumer actually used downstream, including exact machine-contract resource bytes; invalid receipts, installed material drift, or a missing candidate-owned dependency select the declared reinstall or rebuild action rather than an ancestor fallback. Build-only staging material is re-audited by artifact acceptance, not re-scanned by reuse.
- Root package status is read-only and reports `current` or `stale` separately from the required repair action; after build, its current state is reported separately from the performed preparation action. Root verify delegates to the complete package acceptance owner rather than accepting stale material or inventing another acceptance path.

## Case AUX-PACKAGE-ARTIFACT-MATERIAL-001: Artifact audit closes the physical package material

Owner: `docs/script-tooling.md#package-artifact-与-candidate`
Entities:

- `bun|scripts/package/artifact/artifact.test.ts|package artifact > packages approved docs and machine materials`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > emits documented public declarations`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > emits a readable ESM runtime layout and exact exports`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > declares the audited production dependency set`
  Proves:

- Artifact construction and audit produce one package with the approved single-README documentation inventory, no package or Check index page, public declarations and root exports, readable ESM layout, and the complete audited production dependency requirements.
- The same byte-level allowlist carries `docs/output.md`, both current v4 schemas, and all four complete current artifact examples through staging and tar audit, including exact zero-byte NDJSON files and excluding historical material.

## Case AUX-PACKAGE-ESM-NORMALIZATION-001: Artifact-relative ESM references remain resolvable

Owner: `docs/script-tooling.md#package-artifact-与-candidate`
Entities:

- `bun|scripts/package/artifact/esm-module-specifiers.test.ts|emitted ESM module specifiers > rewrites relative module references without changing ordinary path strings`
- `bun|scripts/package/artifact/esm-module-specifiers.test.ts|emitted ESM module specifiers > rejects malformed emitted JavaScript before artifact normalization`
  Proves:

- Artifact normalization rewrites every emitted relative ESM import form to a resolvable `.mjs` target without changing ordinary path strings, and rejects malformed emitted JavaScript before producing trusted output.

## Case AUX-PACKAGE-RUNTIME-SOURCE-MAPS-001: Packaged source maps match their emitted modules

Owner: `docs/script-tooling.md#package-artifact-与-candidate`
Entities:

- `bun|scripts/package/artifact/runtime-source-maps.test.ts|runtime source maps > normalizes and verifies one map against its packaged TypeScript source`
  Proves:

- A packaged runtime source map derives its source path from the emitted module, embeds that exact packaged TypeScript source, and rejects later source drift.

## Case AUX-PACKAGE-ACCEPTANCE-INPUTS-001: Package acceptance consumes closed provider material

Owner: `docs/script-tooling.md#prepared-candidate-data`
Entities:

- `bun|scripts/package/artifact/acceptance-input.test.ts|accepts provider-owned artifact staging material`
- `bun|scripts/package/artifact/acceptance-input.test.ts|rejects incomplete or unrelated artifact staging material`
- `bun|scripts/package/candidate/acceptance-input.test.ts|accepts an exact Gate candidate artifact input`
- `bun|scripts/package/candidate/acceptance-input.test.ts|rejects incomplete or mismatched Gate candidate artifact input`
- `bun|scripts/package/candidate/external-consumer-input.test.ts|external consumer provider input is closed and fail-closed`
- `bun|scripts/project/gate/external-consumer-material-check.test.ts|external consumer provider binds typed output to invocation provenance`
  Proves:

- Artifact, candidate, and external-consumer acceptance each consume only their closed provider-owned path, digest, containment, and inventory material; incomplete, unrelated, mismatched, or malformed material fails before acceptance work begins.
- The external-consumer provider additionally binds its typed output to the prepared artifact path and digest plus its invocation-owned lease root and consumer paths; a same-digest foreign artifact or escaped consumer provenance fails closed.

## Case AUX-PACKAGE-EXTERNAL-CONSUMER-001: An external consumer runs the installed candidate without ancestry fallback

Owner: `docs/script-tooling.md#prepared-candidate-data`
Entities:

- `bun|scripts/package/candidate/isolated-consumer-runtime.test.ts|external consumer runtime acceptance`
  Proves:

- An ancestry-external consumer resolves the installed candidate's declared runtime tooling rather than repository or ancestor dependencies and completes the supported package Run with the installed entry. It imports all seven named final-data parsers and exercises both named and Check-attached parser paths against the installed runtime.

## Case AUX-QUALITY-CANDIDATE-FAIL-CLOSED-001: Quality refuses to scan after candidate preparation failure

Owner: `docs/script-tooling.md#quality-dogfood`
Entities:

- `bun|scripts/project/quality/locked-run.test.ts|candidate-backed quality workflow > does not start the repository scan when candidate preparation fails`
  Proves:

- Candidate preparation failure is an infrastructure failure before repository scanning begins; quality never falls back to a stale installed candidate.

## Case AUX-PACKAGE-API-DOCUMENTATION-001: Package API documentation projections stay executable and exact

Owner: `docs/script-tooling.md#documentation-validation-and-package-material`
Entities:

- `bun|scripts/docs/package-api/command.test.ts|package API documentation CLI > writes expected projections and detects stale output through --check`
- `bun|scripts/docs/package-api/render.test.ts|package API documentation renderer > projects every registry source region to its declared Markdown fence and JSDoc target without changing payload bytes`
- `bun|scripts/docs/package-api/render.test.ts|package API documentation renderer > replaces generated JSDoc tails and rejects malformed source or Markdown example targets`
  Proves:

- The renderer projects each allowlisted TypeScript payload byte-for-byte into the unique TypeScript fence under its declared natural heading path, or into a source JSDoc target. Published Markdown keeps headings, surrounding prose and ordinary links without projection comments.
- The registry and renderer reject duplicate source/region/target identities, unsafe JSDoc tails, malformed heading paths, missing or duplicate heading targets, ambiguous or unclosed example fences, and package example projection markers. Heading paths follow authored ancestry even when heading levels skip; removing a JSDoc target clears its obsolete managed tail.
- Write mode updates only projected Markdown fences and JSDoc tails. Check mode writes nothing and fails when a checked-in projection is stale.

## Case AUX-PACKAGE-API-EXTERNAL-EXECUTION-001: Installed package documentation remains exact and executable

Owner: `docs/script-tooling.md#documentation-validation-and-package-material`
Entities:

- `bun|scripts/package/candidate/isolated-consumer-docs.test.ts|external consumer docs acceptance`
  Proves:

- The ancestry-external installation carries the exact checked-in published-path README, API mechanics guide, hand-written Check guides, machine output guide, current v4 schemas, and four current artifact example sets; every projected package API runtime example executes against that exact candidate package.

## Case AUX-PACKAGE-CHECK-GUIDES-001: Package Check guides close the package-provided ordinary Check inventory

Owner: `docs/script-tooling.md#documentation-validation-and-package-material`
Entities:

- `bun|scripts/docs/package-api/check-guides.test.ts|package Check guides > requires one README-linked guide for every package-provided Check function`
- `bun|scripts/docs/package-api/check-guides.test.ts|package Check guides > rejects a missing direct README link and an extra Check guide page`
- `bun|scripts/docs/package-api/check-guides.test.ts|package Check guides > rejects package documentation without exactly one trailing LF`
  Proves:

- Package documentation has exactly one README-linked guide for every package-provided Check function and a direct machine-output guide link; generated and hand-written Markdown use canonical LF text with one trailing LF, while the README and exact guide directory cannot omit a direct link, publish an unregistered extra page, or restore a Check index layer.

## Case AUX-PACKAGE-DEPENDENCY-VERSIONS-001: Candidate dependency requirements validate actual resolutions

Owner: `docs/script-tooling.md#package-artifact-与-candidate`
Entities:

- `bun|scripts/package/dependency-version.test.ts|package dependency versions satisfy only their declared requirement`
  Proves:

- Package tooling distinguishes exact dependency versions from bounded semver ranges, accepts only actual resolutions covered by the declared requirement, and renders the same requirement in rejection diagnostics.

## Case AUX-DOCS-VALIDATION-CLI-001: Root validation preserves default and focused docs selection

Owner: `docs/script-tooling.md#documentation-validation-and-package-material`
Entities:

- `bun|scripts/validation/workspace.test.ts|root validate CLI runs every docs task by default`
- `bun|scripts/validation/workspace.test.ts|root validate CLI forwards focused docs selections`
  Proves:

- The root validation adapter runs every declared documentation task by default and forwards an explicit focused selection without silently broadening or skipping it.

## Case AUX-DOCS-VALIDATION-REPORTING-001: In-process docs validation keeps output reporter-owned

Owner: `docs/script-tooling.md#documentation-validation-and-package-material`
Entities:

- `bun|scripts/validation/documentation/workflow.test.ts|docs validation library reports success only through an explicit reporter`
  Proves:

- Documentation library validation remains silent when no reporter is supplied and sends success summaries only to an explicit reporter, so an in-process Project Gate Check cannot corrupt Product-owned TTY progress with direct console output.

## Case AUX-REPOSITORY-LAYOUT-001: Repository layout preserves module ownership and dependency direction

Owner: `docs/coding-style.md#2-owner-与实现归属先行`
Entities:

- `bun|scripts/validation/layout-characterization.test.ts|characterizes repository layout and dependency boundaries`
  Proves:

- Workspace validation rejects retired source roots, unapproved `index.ts` files, generic module basenames, unexpected Product owners, forbidden Product/Project/package dependency directions, direct imports of private process-execution implementation files, an environment bootstrap dependency on process-execution, and a package artifact entry other than `src/index.ts`.

## Case AUX-PROJECT-GATE-CATALOG-001: Project Gate 的 catalog、root binding 与 controls 闭合

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project/gate/run.test.ts|Project Gate entries, root binding, and controls > binds retained workspace verification names directly to the Gate profiles without disabled tags`
- `bun|scripts/project/gate/run.test.ts|Project Gate entries, root binding, and controls > keeps the explicit assurance identities and current profile membership closed`
- `bun|scripts/project/gate/run.test.ts|Project Gate entries, root binding, and controls > defaults to required and normalizes explicit profile plus repeatable enabled and disabled tags into opaque flags`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > projects ordinary Check entries without a command catalog or policy`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > derives required, full, and partial aggregates from the same entries`
  Proves:

- 保留的 `verify:vibe-check-workspace`、`:required` 与 `:full` root names 分别直接调用 Project Gate default/full、required 与 full profiles，且正式 target 不传 disabled tags。
- Project-private entries 只附加 profile/tag metadata；Test Evidence entity closure、prepared candidate typed provider、按 Product 行为 owner 细分的 test 子 Checks、轻量 package calculation/material Check、candidate lifecycle、artifact、external-consumer provider，以及 types/docs/runtime consumer Checks 都使用独立 assurance identities，Definition 与 explicit aggregation 从同一 entries 投影 eligibility；root 使用三路调度，只有 candidate lifecycle 与 provider 共享 named lifecycle mutex，artifact 直接消费 prepared candidate，三个 consumer 只读 provider material。
- adapter 无参时默认 required，接受合法显式 profile、重复 disabled tag 与受控 `package-tests` enabled tag，并将其规范化为 opaque flags；正式 full 自动选择全部未禁用 Checks。独立 `--help` 在任何 candidate/log 工作前返回完整 profile、opt-in tag、disable-filter 与示例说明。
- Required 默认不选择带 `package-tests` 的 candidate lifecycle、artifact、external-consumer provider 与 types/docs/runtime consumer Checks；prepared candidate typed provider 仍在 required 中。显式 enable tag 或 full 才纳入这些 Checks；excluded Checks 的 reason code 指明具体 profile/tag，terminal message 指明没有运行的 Check 动作和恢复命令，aggregate 只消费同次 selection 的 eligible identities。启动 summary 另明确 package acceptance 是未选择、按 profile/tag 选择还是被禁用。
- Candidate lifecycle、artifact、external-consumer provider、types consumer、docs consumer 与 runtime consumer 共六个 physical process 都带 30 秒外层 timeout；其它 test lanes 不继承该特定防挂死限制。

## Case AUX-PROJECT-GATE-AUTHORING-001: Project Gate 区分 native 与真实 process evidence

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > keeps native Check outcomes transcript-free`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > preserves two-step ast-grep process evidence and failures`
  Proves:

- Native operations 直接形成 passed/failed/unavailable Check facts；validation failure 保留安全的 diagnostic code/count Record，并用 terminal message 指向对应 focused root command，不暴露 raw diagnostics，也不会创建空 process transcript。
- Test Evidence rule validation 向真实 ast-grep 步骤传递 cancellation，保留已发生的 version/rule-test process transcript，并区分 nonzero、version mismatch 和 unavailable 结果。

## Case AUX-PROJECT-GATE-PROCESS-001: Project Gate 保留命令与 transcript 事实

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project/gate/check-execution/process.test.ts|Project Gate process Check > publishes closed success data only after a settled transcript`
- `bun|scripts/project/gate/check-execution/process.test.ts|Project Gate process Check > writes one complete transcript and passes only a zero command exit`
- `bun|scripts/project/gate/check-execution/process.test.ts|Project Gate process Check > writes a running transcript before process start and replaces it after settlement`
- `bun|scripts/project/gate/check-execution/process.test.ts|Project Gate process Check > derives process environment from one typed provider dependency`
- `bun|scripts/project/gate/check-execution/process.test.ts|Project Gate process Check > reports a safe failure Record and command-failed message for nonzero exit without copying child output`
- `bun|scripts/project/gate/check-execution/process.test.ts|Project Gate process Check > requires an explicit timeout before reporting safe timeout evidence`
- `bun|scripts/project/gate/check-execution/process.test.ts|Project Gate process Check > avoids starting cancelled work and maps process/log boundaries to unavailable`
- `bun|scripts/project/gate/check-execution/process.test.ts|Project Gate process Check > maps a settled cancellation fact to transcript evidence and unavailable`
  Proves:

- eligible command 只有在零退出并写入包含 stdout/stderr 的 per-Check transcript 后才通过。普通单进程 Check 在启动 child 前先写同路径 running transcript，包含 command 与 timeout；结算后将其替换为完整结果，startup 写入失败则不启动 child。
- Dependency-backed process 只读取声明的 direct provider，要求 upstream passed，经 provider parser 恢复 data 后才派生无冲突 environment；unreadable、failed 或 malformed data 不启动 child process。
- A typed-success process publishes its typed final data only after a zero exit and a successfully written settled transcript. It then closed-parses stdout and validates it against its typed dependency; malformed stdout or invalid parsed/provenance data settles `unavailable / process-output-invalid`, never a passed result.
- 非零退出产生含 command、exit code、signal 与 log reference 的 Check-local supplemental Record，随后得到 failed final data 和唯一 `error` / `command-failed` message；message 只含 exit code、signal 和 transcript basename，不复制 child output、完整路径、command、credential URL 或 digest。
- The same nonzero Check executed through the installed public Run keeps its failure Record, presents only that approved summary, and returns the corresponding `{ checkId, level, code, message }` item from `RunResult.checkMessages`; transcript-only material remains absent from both surfaces.
- 启动前取消不启动 process；spawn、exit facts 或 transcript 边界失败得到对应 unavailable outcome。settled transcript replacement 失败时不把缺失最终日志误报为 command 结果；running evidence 只保证存在到 replacement 开始前。
- Process descriptor 把显式 timeout 交给 process facade；只有 descriptor 声明该时限时，timeout fact 才结算为带安全 `command-timeout` message 的 `process-timeout` unavailable，否则 fail closed 为普通 process unavailable。timeout transcript 保留 `timed-out: yes`。
- 已运行 command 被取消时，transcript 保留 signal 与 error summary，outcome 为 `execution-cancelled` unavailable。

## Case AUX-PROJECT-GATE-PREPARED-CANDIDATE-001: Gate 将已准备 candidate 保留为 typed fact

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project/gate/prepared-candidate-check.test.ts|prepared package candidate Check > publishes versioned typed candidate data and rejects malformed dependency facts`
- `bun|scripts/project/gate/prepared-candidate-check.test.ts|prepared package candidate Check > fails closed when the prepared artifact no longer matches its digest`
  Proves:

- Required provider Check 只发布 closed、versioned、绝对路径且 containment 合法的 candidate data，并保留 artifact digest、文件 inventory、installed entry、preparation action/reason 与 reuse fact。
- Provider 在 artifact、staging 或 resolved entry 缺失以及 artifact digest 漂移时 fail closed；artifact acceptance 与 external-consumer provider 只能按各自需要解析同一次 typed Gate candidate，不能把未验证路径当作 dependency input。

## Case AUX-PROJECT-GATE-ADAPTER-001: Project Gate 只闭合已准备的完整 invocation

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > returns help before candidate or log work`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > does not load or run a candidate consumer after preparation failure`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > rejects an imported entry that differs from the prepared candidate before log/run`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > consumes package aggregation without traversing the raw Check snapshot`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > maps aggregate, definition warning, output and malformed facts to Gate exits`
  Proves:

- `--help`、preparation failure 或 prepared/imported entry mismatch 均在 consumer execution 前停止；help 与 mismatch 也在 invocation log 创建前停止，help 还不会准备或导入 candidate。
- 成功 invocation 只各执行一次 candidate preparation、consumer load、log-directory creation 和 bound Run，并把同次 normalized selection flags 与 prepared candidate 交给 consumer。
- 初步 Gate 结果要求 Package Run 的 explicit aggregate 为 passed；definition warning、progress failure 或非-passed aggregate 形成 failed，non-completed 或 malformed result 形成 unavailable。adapter 不遍历 snapshot 重建 aggregate。

## Case AUX-PROJECT-GATE-POST-PROCESSING-001: Project Gate 后处理只产出一个最终结果

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > post-processes one initial Gate result before reporting the final exit`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > fails closed when afterGate throws`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > fails closed when afterGate returns an invalid result`
  Proves:

- `afterGate` 在 bound Run 返回和初步 Gate 结果形成后执行一次，接收冻结的初步结果，以及包含 normalized selection、repository root、prepared candidate、invocation logs、原始 RunResult、Gate started、initial-result timestamp 与 elapsed-to-initial-result 的只读 Gate context；它可用同类型新结果决定唯一终端状态与 exit。
- Hook context 不因当前性能用例退化成 elapsed 参数集合，也不暴露 loader、clock、console writer 或 candidate preparer 等执行依赖。
- Hook 抛错或返回无效结果形成带受控诊断的 unavailable 最终结果，不静默放行，也不对外暴露 base/acceptances/final 并行结果集合。

## Case AUX-PARALLEL-RUNNER-001: Static Task engine 保持通用调度契约

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/project-run/task-scheduler/task-engine.test.ts|static task engine > validates static task identity dependency and scope structure before execution`
- `bun|src/project-run/task-scheduler/task-engine.test.ts|static task engine > uses one root budget for dependency order and named mutex admission`
- `bun|src/project-run/task-scheduler/task-engine.test.ts|static task engine > keeps a scope cap active through terminal settlement and prioritizes its continuation`
- `bun|src/project-run/task-scheduler/task-engine.test.ts|static task engine > uses the minimum active cap and reserves capacity for a newly ready tighter scope`
- `bun|src/project-run/task-scheduler/task-engine.test.ts|static task engine > does not activate a cap for a scope with no activation task`
- `bun|src/project-run/task-scheduler/task-engine.test.ts|static task engine > settles executor failures and blocks only their dependent tasks`
- `bun|src/project-run/task-scheduler/task-engine.test.ts|static task engine > stops new admission after abort while admitted work receives the same signal and drains`
  Proves:

- Engine 在任何 executor work 前验证静态 Task identity、dependency、scope membership、activation/terminal relation 和 cap；它以一个 root budget 处理 dependency、mutex 与 generic scope cap。
- Executor failure 只阻断 dependent Task，unrelated Task 仍可完成。abort 后不再 admission pending Task，已 admitted Task 接收同一 signal 并 drain；engine 的 settlement 是唯一通用 execution accounting。

## Case AUX-SCRIPT-BOUNDARIES-001: Repository 与 process capability 的边界稳定

Owner: `docs/script-tooling.md#process-repository-file-and-narrow-boundary-capabilities`
Entities:

- `bun|scripts/process-execution/process.test.ts|detects failed process results`
- `bun|scripts/repository-files/files.test.ts|walks repository files deterministically and reports unreadable roots`
- `bun|scripts/repository-files/paths.test.ts|normalizes slash paths and identifies contained paths`
  Proves:

- `toSlashPath` 返回确定性 slash-normalized 路径，`isPathWithin` 只接受 resolved parent 的严格后代并拒绝 parent 自身与 sibling。
- repository 文件遍历忽略指定目录并返回稳定排序的相对路径；无法读取根目录时反馈实际目标，不静默返回空集合。
- process failure 对开发脚本 consumer 保持可观察，不被误判为成功。

## Case AUX-WORKSPACE-PROCESS-001: Process execution 保持纯文本捕获边界

Owner: `docs/script-tooling.md#process-repository-file-and-narrow-boundary-capabilities`
Entities:

- `bun|scripts/process-execution/process.test.ts|runs child processes with plain text output environment`
  Proves:

- 开发脚本启动子进程时使用 plain-text / no-color 环境，并返回可判断的 status、stdout 与 stderr。

## Case AUX-WORKSPACE-PROCESS-CANCELLATION-001: Process execution 保留 caller cancellation 事实

Owner: `docs/script-tooling.md#process-repository-file-and-narrow-boundary-capabilities`
Entities:

- `bun|scripts/process-execution/process.test.ts|cancels an already-started child process`
  Proves:

- 已运行 child 收到 caller 的 `cancelSignal` 后终止，并保留 `error`、`SIGTERM` 与 `status: null`，不被误判为成功。

## Case AUX-WORKSPACE-PROCESS-TIMEOUT-001: Process execution 保留 timeout 事实

Owner: `docs/script-tooling.md#process-repository-file-and-narrow-boundary-capabilities`
Entities:

- `bun|scripts/process-execution/process.test.ts|times out an already-started child process`
  Proves:

- 已运行 child 超过显式 timeout 后终止，并保留 `error`、`SIGTERM`、`status: null` 与 `timedOut`，不被误判为普通失败或成功。
