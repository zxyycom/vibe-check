# repository-tooling

## Case AUX-QUALITY-DOGFOOD-001: Repository callers use the bound Project Run

Owner: `docs/script-tooling.md#quality-dogfood`
Entities:

- `bun|scripts/project/quality/project-run.test.ts|repository Project Run binds its definition before another caller supplies controls`
  Proves:
- The repository Run imports the installed public `vibe-check` entry, binds the repository Project Definition, and lets another caller supply only the controls that Run exposes.

## Case AUX-PACKAGE-CANDIDATE-001: Candidate preparation builds one auditable physical package

Owner: `docs/script-tooling.md#package-artifact-与-candidate`
Entities:

- `bun|scripts/package/artifact/artifact.test.ts|package artifact > packages the approved documentation inventory`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > emits documented public declarations`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > emits a readable ESM runtime layout and exact exports`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > declares the audited production dependency set`
- `bun|scripts/package/artifact/acceptance-input.test.ts|accepts provider-owned artifact staging material`
- `bun|scripts/package/artifact/acceptance-input.test.ts|rejects incomplete or unrelated artifact staging material`
- `bun|scripts/package/artifact/esm-module-specifiers.test.ts|emitted ESM module specifiers > rewrites relative module references without changing ordinary path strings`
- `bun|scripts/package/artifact/esm-module-specifiers.test.ts|emitted ESM module specifiers > rejects malformed emitted JavaScript before artifact normalization`
- `bun|scripts/package/artifact/runtime-source-maps.test.ts|runtime source maps > normalizes and verifies one map against its packaged TypeScript source`
- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation > rejects invalid private consumer manifests`
- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation > builds, installs, and reuses a physical candidate`
- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation > keeps staging audit in build acceptance after packed artifact reuse`
- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation > rejects installed documentation drift`
- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation > reinstalls missing dependency without ancestor fallback`
- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation > classifies a malformed preparation receipt for cold rebuild`
- `bun|scripts/package/candidate/acceptance-input.test.ts|accepts an exact Gate candidate artifact input`
- `bun|scripts/package/candidate/acceptance-input.test.ts|rejects incomplete or mismatched Gate candidate artifact input`
- `bun|scripts/package/candidate/isolated-consumer.test.ts|external package consumer acceptance > installs the artifact outside repository ancestry`
- `bun|scripts/package/candidate/isolated-consumer.test.ts|external package consumer acceptance > typechecks public imports and declaration QuickInfo`
- `bun|scripts/package/candidate/isolated-consumer.test.ts|external package consumer acceptance > executes projected package API documentation examples`
- `bun|scripts/package/candidate/isolated-consumer.test.ts|external package consumer acceptance > resolves runtime tooling without ancestry fallback`
- `bun|scripts/package/candidate/isolated-consumer.test.ts|external package consumer acceptance > runs installed package and reports progress`
- `bun|scripts/package/candidate/receipt.test.ts|rejects malformed and stale receipts before artifact reuse`
- `bun|scripts/project/quality/locked-run.test.ts|candidate-backed quality workflow > does not start the repository scan when candidate preparation fails`
  Proves:
- The candidate owner derives one local package with only the approved runtime exports, declared package dependencies (including the Product-owned Ajv 2020-12 and Markdown Link parser runtimes), a physical consumer install, and a resolved installed entry.
- Artifact construction preserves ordinary path strings, rejects malformed emitted JavaScript, and normalizes every relative ESM import, re-export, dynamic import, and side-effect import to a resolvable `.mjs` target.
- Runtime source-map normalization derives each packaged source path from its emitted module path, embeds that exact source, and rejects later source drift.
- Before candidate installation, artifact audit independently verifies the exact root facade, readable `dist/esm/**.mjs` tree, source maps and packaged source correspondence, declarations, documentation inventory, and production dependency manifest.
- Reuse revalidates the packed artifact digest/material and installed consumer that downstream execution actually uses; staging content remains build evidence and is re-audited by artifact acceptance rather than every candidate reuse.
- A matching receipt reuses the existing build/pack/install state; stale and malformed receipts produce an explicit rebuild assessment before mutation. The same rebuild executor is physically proven by cold preparation rather than repeated solely for malformed-receipt routing.
- A missing candidate-owned `jscpd` or Ajv closure is not satisfied by ancestor resolution: preparation reinstalls before returning a repository consumer entry.
- An ancestry-external temporary Bun consumer installs the accepted tarball, typechecks the approved public operations, values, and type roots (including explicit aggregation, a versioned typed provider, non-generic string dependency reads, four-state custom final data with terminal messages, `attention` visibility, two-argument supplemental Record reporting, and final-snapshot `RunResult.checkDurations` / `checkMessages` without new duration or message type roots), then typechecks the specialized `maintenanceReminders` policy constructor and completes an integrated default Run including `duplicateDetection`, `jsonSchemaValidation`, and `markdownLinkValidation` using a `jscpd` manifest and declared bin resolved from that consumer's installation rather than repository sources or dependencies.
- The external consumer needs neither casts, manual read generics, nor ancestry imports to have one changed-files provider execute once, let two direct consumers explicitly parse its settled data, and reuse that same versioned parser for both `RunResult` and the existing v4 machine final-data projection.
- That consumer uses default-enabled Product progress with a real non-TTY stdout capture: lifecycle output contains the Check total, settled completion, an `attention` Check's message, and final execution summary without terminal control bytes; its executed canonical Checks have non-negative finite `checkDurations` entries, observable final data, and structured `checkMessages` readback.
- A preparation failure returns an infrastructure failure before the repository scan starts, so a stale installed candidate is never used as fallback.

## Case AUX-PACKAGE-API-DOCUMENTATION-001: Package API documentation projections stay executable and exact

Owner: `docs/script-tooling.md#documentation-validation-and-package-material`
Entities:

- `bun|scripts/docs/package-api/command.test.ts|package API documentation CLI > writes expected projections and detects stale output through --check`
- `bun|scripts/docs/package-api/render.test.ts|package API documentation renderer > projects every registry region to its declared README and JSDoc targets without changing payload bytes`
- `bun|scripts/docs/package-api/render.test.ts|package API documentation renderer > replaces generated JSDoc tails and rejects malformed source regions`
  Proves:
- The typed registry and read-only renderer project every allowlisted TypeScript region only to its declared README or JSDoc targets without changing payload bytes, replace current registry-managed JSDoc example tails, discover and clear obsolete generated tails after a target leaves the registry, and reject duplicate projection/region/target identities, unsafe JSDoc tails, and malformed or unknown placeholders/regions.
- The CLI writes the renderer's complete expected projections, while check mode writes nothing and fails when a checked-in projection is missing or stale.

## Case AUX-PACKAGE-CHECK-GUIDES-001: Package Check guides close the package-provided ordinary Check inventory

Owner: `docs/script-tooling.md#documentation-validation-and-package-material`
Entities:

- `bun|scripts/docs/package-api/check-guides.test.ts|package Check guides > requires one exact linked guide for every package-provided Check and constructor`
- `bun|scripts/docs/package-api/check-guides.test.ts|package Check guides > rejects a missing guide link and an extra guide page`
  Proves:
- Package documentation has exactly one linked guide for every package-provided Check value and specialized constructor; the README index and guide directory cannot omit a required guide or publish an unregistered extra page.

## Case AUX-DOCS-VALIDATION-CLI-001: Docs validation adapters preserve default and focused selection

Owner: `docs/script-tooling.md#documentation-validation-and-package-material`
Entities:

- `bun|scripts/validation/documentation/workflow.test.ts|docs validation CLI runs every task by default`
- `bun|scripts/validation/documentation/workflow.test.ts|docs validation CLI selects only requested tasks`
- `bun|scripts/validation/workspace.test.ts|root validate CLI runs every docs task by default`
- `bun|scripts/validation/workspace.test.ts|root validate CLI forwards focused docs selections`
  Proves:
- The direct docs adapter and root validation adapter run every declared docs validation family when no focused task is supplied.
- An explicit docs task selects only that validation family, so the CLI boundary does not silently broaden or skip requested work.

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
- Project-private entries 只附加 profile/tag metadata；Test Evidence entity closure、prepared candidate typed provider、按 Product 行为 owner 细分的 test 子 Checks、轻量 package calculation/material Check 与三个 package acceptance Checks 使用独立 assurance identities，Definition 与 explicit aggregation 从同一 entries 投影 eligibility；root 使用三路调度，只有继续 build/install 的 candidate 与 external consumer 共享 named mutex，只读 artifact acceptance 仍保留独立 terminal fact 与 transcript。
- adapter 无参时默认 required，接受合法显式 profile、重复 disabled tag 与受控 `package-tests` enabled tag，并将其规范化为 opaque flags；正式 full 自动选择全部未禁用 Checks。
- Required 默认排除三个 package lifecycle Checks，显式 enable tag 或 full 纳入；excluded Checks 保留稳定 `profile-excluded` / `tag-disabled` / `tag-not-enabled` raw facts，aggregate 只消费同次 selection 的 eligible identities。

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

- `bun|scripts/project/gate/check-execution/process.test.ts|Project Gate process Check > writes one complete transcript and passes only a zero command exit`
- `bun|scripts/project/gate/check-execution/process.test.ts|Project Gate process Check > derives process environment from one typed provider dependency`
- `bun|scripts/project/gate/check-execution/process.test.ts|Project Gate process Check > reports a safe failure Record and command-failed message for nonzero exit without copying child output`
- `bun|scripts/project/gate/check-execution/process.test.ts|Project Gate process Check > avoids starting cancelled work and maps process/log boundaries to unavailable`
- `bun|scripts/project/gate/check-execution/process.test.ts|Project Gate process Check > cancels an already-started process and preserves its transcript`
  Proves:
- eligible command 只有在零退出并写入包含 stdout/stderr 的 per-Check transcript 后才通过。
- Dependency-backed process 只读取声明的 direct provider，要求 upstream passed，经 provider parser 恢复 data 后才派生无冲突 environment；unreadable、failed 或 malformed data 不启动 child process。
- 非零退出产生含 command、exit code、signal 与 log reference 的 Check-local supplemental Record，随后得到 failed final data 和唯一 `error` / `command-failed` message；message 只含 exit code、signal 和 transcript basename，不复制 child output、完整路径、command、credential URL 或 digest。
- The same nonzero Check executed through the installed public Run keeps its failure Record, presents only that approved summary, and returns the corresponding `{ checkId, level, code, message }` item from `RunResult.checkMessages`; transcript-only material remains absent from both surfaces.
- 启动前取消不启动 process；spawn、exit facts 或 transcript 边界失败得到对应 unavailable outcome。
- 已运行 command 被取消时，transcript 保留 signal 与 error summary，outcome 为 `execution-cancelled` unavailable。

## Case AUX-PROJECT-GATE-PREPARED-CANDIDATE-001: Gate 将已准备 candidate 保留为 typed fact

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project/gate/prepared-candidate-check.test.ts|prepared package candidate Check > publishes versioned typed candidate data and rejects malformed dependency facts`
- `bun|scripts/project/gate/prepared-candidate-check.test.ts|prepared package candidate Check > fails closed when the prepared artifact no longer matches its digest`
  Proves:
- Required provider Check 只发布 closed、versioned、绝对路径且 containment 合法的 candidate data，并保留 artifact digest、文件 inventory、installed entry、preparation action/reason 与 reuse fact。
- Provider 在 artifact、staging 或 resolved entry 缺失以及 artifact digest 漂移时 fail closed；artifact 与 external consumer 只能按各自需要解析同一次 typed Gate candidate，不能把未验证路径当作 dependency input。

## Case AUX-PROJECT-GATE-ADAPTER-001: Project Gate 只闭合已准备的完整 invocation

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > does not load or run a candidate consumer after preparation failure`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > rejects an imported entry that differs from the prepared candidate before log/run`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > consumes package aggregation without traversing the raw Check snapshot`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > maps aggregate, definition warning, output and malformed facts to Gate exits`
  Proves:
- preparation failure 或 prepared/imported entry mismatch 均在 consumer execution 前停止；mismatch 也在 invocation log 创建前停止。
- 成功 invocation 只各执行一次 candidate preparation、consumer load、log-directory creation 和 bound Run，并把同次 normalized selection flags 与 prepared candidate 交给 consumer。
- exit `0` 要求 Package Run 的 explicit aggregate 为 passed；definition warning、progress failure 或非-passed aggregate 为 `1`，non-completed 或 malformed result 为 `2`。adapter 不遍历 snapshot 重建质量结论。

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

## Case AUX-WORKSPACE-PROCESS-CANCELLATION-001: Process execution 保留运行中取消事实

Owner: `docs/script-tooling.md#process-repository-file-and-narrow-boundary-capabilities`
Entities:

- `bun|scripts/process-execution/process.test.ts|cancels an already-started child process`
  Proves:
- 已运行 child 收到 caller 的 `cancelSignal` 后终止；其结果保留 `error`、`SIGTERM` 与 `status: null`，不被误判为成功。
