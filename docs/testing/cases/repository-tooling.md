# repository-tooling

## Case AUX-PACKAGE-CANDIDATE-001: Candidate lifecycle admits only verified local package state

Owner: `docs/script-tooling.md#local-candidate-lifecycle`
Entities:

- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation contracts > rejects overlapping package build and cache roots`
- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation contracts > rejects invalid private consumer manifests`
- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation contracts > keeps the explicit cold integration target outside routine discovery with hard timeout`
- `bun|scripts/package/candidate/receipt.test.ts|rejects malformed and stale receipts before artifact reuse`
- `bun|scripts/package/command.test.ts|package root commands distinguish stale status from a completed rebuild and bind verification to complete --all acceptance`
  Proves:

- Candidate preparation rejects overlapping build/cache roots and accepts only a valid private consumer manifest. Receipt contracts reject malformed or stale package state before reuse, while root preparation derives the actual build, artifact, installation and resolved entry used by every Project Gate invocation.
- Routine test discovery keeps only fast decision/input contracts. The separately named `package:candidate:integration` target has a 30-second process boundary and exercises physical cold build/install/reuse plus drift/fallback decisions without becoming a second complete package lifecycle inside the Gate. Build-only staging material remains owned by artifact acceptance.
- Root package status is read-only and reports `current` or `stale` separately from the required repair action; after build, its current state is reported separately from the performed preparation action. Root verify delegates to the complete package acceptance owner rather than accepting stale material or inventing another acceptance path.

## Case AUX-PACKAGE-ARTIFACT-MATERIAL-001: Artifact audit closes the physical package material

Owner: `docs/script-tooling.md#package-artifact-与-candidate`
Entities:

- `bun|scripts/package/artifact/artifact.test.ts|package artifact > packages approved docs and machine materials`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > emits documented public declarations`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > emits a readable ESM runtime layout and exact exports`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > declares the audited production dependency set`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > declares the approved SPDX, Bun host, repository, and public registry contract`
- `bun|scripts/package/artifact/manifest.test.ts|generated package manifest rejects legal, host, publish, executable, and export drift`
  Proves:

- Artifact construction and audit produce one package with the approved single-README documentation inventory, no package or Check index page, public declarations and root exports, readable ESM layout, and the complete audited production dependency requirements.
- The closed generated manifest uses the user-scoped `@zxyycom/vibe-check` identity and carries the complete `MIT AND Apache-2.0 AND BSD-2-Clause` expression, Vibe Check's exact MIT text and `zxyycom` notice, Bun `>=1.3.14`, canonical GitHub repository, explicit public npm registry/access, and no `private`, `bin`, lifecycle scripts, or subpath export.
- The same byte-level allowlist carries `docs/output.md`, both current v4 schemas, all four complete current artifact examples, exact Lizard/Pygments notice, license and provenance material, and the non-public emitted function-metrics Worker through staging and tar audit; it includes exact zero-byte NDJSON files and excludes historical or analyzer fixture material.

## Case AUX-PACKAGE-RELEASE-001: Formal release binds one clean source to one portable artifact receipt

Owner: `docs/script-tooling.md#formal-release-preparation-and-receipt`
Entities:

- `bun|scripts/package/release/release.test.ts|formal package release > accepts only explicit canonical prestable versions and conservative tags`
- `bun|scripts/package/release/release.test.ts|formal package release > writes a portable sanitized receipt and rejects identity or artifact drift`
- `bun|scripts/package/release/release.test.ts|formal package release > isolates formal staging and receipt state from the default local candidate`
- `bun|scripts/package/release/release.test.ts|formal package release > requires one exact clean Git worktree revision before formal preparation`
- `bun|scripts/package/release/command.test.ts|formal release root commands require closed inputs and bind verification to one complete --all Gate receipt`
  Proves:

- Formal preparation accepts only a positive canonical `0.0.x` and an explicit conservative tag, requires exact clean `HEAD`, and keeps release staging/receipt/compiler state distinct from the fingerprint local candidate while sharing only the versioned artifact root.
- The versioned receipt uses repository-relative canonical paths, records the scoped package identity, and binds commit, input fingerprint, ordered inventory, SHA-256, SHA-512 SRI, manifest/README identities and the complete third-party legal-material inventory, version, and tag. Its writer rejects a foreign receipt path or mismatched artifact SHA-256 before replacing the owned receipt; its closed grammar and verifier reject extra consumer identity, path escape, duplicated inventory, contract drift, and changed artifact bytes without storing credential material.
- The root command grammar requires complete named inputs: prepare forwards one explicit version/tag and reports the receipted artifact identity, while verify constructs one unmodified complete `--all` Project Gate invocation for the explicit receipt and preserves its returned exit status. Missing or duplicated inputs fail instead of selecting an implicit version, tag, or receipt.

## Case AUX-PACKAGE-ESM-NORMALIZATION-001: Artifact-relative ESM references remain resolvable

Owner: `docs/script-tooling.md#package-artifact-与-candidate`
Entities:

- `bun|scripts/package/artifact/esm-module-specifiers.test.ts|emitted ESM module specifiers > rewrites relative module references without changing ordinary path strings`
- `bun|scripts/package/artifact/esm-module-specifiers.test.ts|emitted ESM module specifiers > rejects malformed emitted JavaScript before artifact normalization`
  Proves:

- Artifact normalization rewrites every emitted relative ESM import form to a resolvable `.mjs` target without changing ordinary path strings. It additionally rewrites exactly one emitted `function-metrics` Worker source URL only in its measurement module, rejects zero/multiple compiler-shape matches, and rejects malformed emitted JavaScript before producing trusted output.

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
- `bun|scripts/package/candidate/external-consumer/input.test.ts|external consumer provider input is closed and fail-closed`
- `bun|scripts/project/gate/checks/external-consumer-material.test.ts|external consumer provider binds typed output to invocation provenance`
  Proves:

- Artifact, candidate, and external-consumer acceptance each consume only their closed provider-owned path, digest, containment, inventory, and exact candidate-version material; incomplete, unrelated, mismatched, or malformed material fails before acceptance work begins. Artifact staging uses that version to audit the same manifest identity as the prepared tarball.
- The external-consumer provider additionally binds its typed output to the prepared artifact path and digest plus its invocation-owned lease root and consumer paths; a same-digest foreign artifact or escaped consumer provenance fails closed.

## Case AUX-PACKAGE-EXTERNAL-CONSUMER-001: An external consumer runs the installed candidate without ancestry fallback

Owner: `docs/script-tooling.md#prepared-candidate-data`
Entities:

- `bun|scripts/package/candidate/external-consumer/runtime.test.ts|external consumer runtime acceptance`
  Proves:

- An ancestry-external consumer resolves the installed candidate's declared runtime tooling rather than repository or ancestor dependencies, proves that its resolved jscpd manifest, contained bin and actual engine version agree, and completes the supported package Run with the installed entry. This is release acceptance evidence for the installed candidate, not a claim that every Product Run requires the exact 5.1.1 engine. Its two duplicate fixture sources are the complete duplicate-detection exact scope and produce one trusted non-blocking `duplicate-detection` Record with passed final data containing one finding; it also imports all eight named final-data parsers and exercises both named and Check-attached parser paths. The same isolated Run imports and actually executes installed `functionMetrics` against a CCN `2` source under a maximum `1`, proving the one emitted Worker URL resolves to the shipped Worker and returns a trusted non-blocking Record without expanding public exports. The installed public cache computes once, then returns a parser-backed digest-keyed hit without changing either Check execution settlement. The same installed Run proves that an `observes` consumer reads a failed provider outcome, a separate `dependsOn` consumer receives passed typed data, and a failed prerequisite produces `dependency-not-passed` with null duration without calling its dependent callback. Two installed learned-critical-path Runs create then reload caller-managed project-root-relative local history; digest-only state excludes fixture private inputs, while public RunResult and machine output do not gain scheduler-history or prediction fields.

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

- `bun|scripts/package/candidate/external-consumer/documentation.test.ts|external consumer docs acceptance`
  Proves:

- The ancestry-external installation carries the exact checked-in published-path README, API mechanics guide, hand-written Check guides, machine output guide, current v4 schemas, and the mixed-outcomes Definition/output example. One consumer-owned Bun runner executes every projected runtime example in deterministic order and then the installed Definition against that exact candidate, retaining source identity on import failure. The Definition runs the documented package-provided and custom `observes` workflow, publishes its configured machine output, and forms the documented four outcome states, three RunResult messages and two Records.

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

- Package tooling distinguishes exact dependency versions from bounded semver ranges, accepts only actual resolutions covered by the declared requirement (including rejection of jscpd `5.1.0` below the `^5.1.1` lower bound), and renders the same requirement in rejection diagnostics.

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

- Workspace validation keeps the Product owner inventory closed, including the standalone `cache` owner, and rejects retired source roots, a Gate root other than `definition.ts` / `run.ts` plus their root-contract tests and `checks/**` / `runtime/**`, unapproved `index.ts` files, generic module basenames, unexpected Product owners, forbidden Product/Project/package dependency directions, direct imports of private process-execution implementation files, an environment bootstrap dependency on process-execution, and a package compiler-root contract other than exactly public `src/index.ts` plus the internal function-metrics Worker root (which does not add a public entry).
- It also fail-closes the function-metrics private port boundary: only `analyzer-adapter.ts` may consume `analyzer/port-facade.ts`; port code cannot import Product; Worker and target-files must value-import the adapter; port-external Product tests cannot deep-import analyzer modules; and public/package entry points cannot leak the façade, adapter, Worker, or deep path.

## Case AUX-DEVELOPMENT-QUALITY-TARGETS-001: Development quality commands exclude only generated analyzer oracle fixtures

Owner: `docs/script-tooling.md#development-tooling`
Entities:

- `bun|scripts/development/quality-targets.test.ts|development quality target boundaries > excludes only generated function-analyzer oracle fixtures from product lint and format`
  Proves:
- Product lint and workspace format retain every normal `src` target while excluding only the checked-in generated function-analyzer oracle fixture directory; no translated-only lint or format exception is allowed. Typecheck likewise has no translated-only exception.

## Case AUX-PROJECT-GATE-CATALOG-001: Project Gate 的 catalog、root binding 与 controls 闭合

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project/gate/run.test.ts|Project Gate entries, root binding, and controls > binds the sole project check command to the mise-backed Gate root`
- `bun|scripts/project/gate/run.test.ts|Project Gate entries, root binding, and controls > keeps the explicit assurance identities and current selection metadata closed`
- `bun|scripts/project/gate/run.test.ts|Project Gate entries, root binding, and controls > defaults to required and normalizes combinable focused presets into opaque flags`
- `bun|scripts/project/gate/run.test.ts|Project Gate entries, root binding, and controls > requires the complete all selection for one explicit formal release receipt`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > projects the central composition manifest into an ordinary Project Definition`
- `bun|scripts/project/gate/checks/repository-quality.test.ts|repository quality Checks > uses the retained repository policy and binds only the mise-provided SCC command`
- `bun|scripts/project/gate/checks/repository-quality.test.ts|repository quality Checks > substitutes an unavailable absolute SCC command without a function-metrics command`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > derives required, all, and focused aggregates from the same preset manifest`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > executes only Product flag-selected Checks and aggregates the same identities`
  Proves:

- 唯一正式根命令 `bun run check` 通过 mise 进入锁定 scanner 环境；两个 Codex environment 配置直接调用该命令，旧 `verify:vibe-check-workspace`、`:required` 与 `:full` 已删除。
- 根级 `definition.ts` 是单一 Gate 组合入口：稳定 manifest 展示完整 entries、required/preset membership、run-level scheduler/outputs/aggregate 与唯一 `afterGate`；test lane-to-Check descriptor 和 repository-quality options 分别由 `checks/test-execution/checks.ts` 与 `checks/repository-quality.ts` 拥有，再以普通对象组进入同一个 Project Definition。Gate entry validation 对 `dependsOn` 与 `observes` 一视同仁地检查 exact collection、self/missing target 与 required/preset selection closure，并拒绝覆盖 Check 自带的 `enabledByFlags`。Test Evidence entity closure、prepared candidate typed provider、按 Product 行为 owner 细分的 test 子 Checks、包含快速 candidate contracts 的轻量 package-supporting Check、artifact、external-consumer provider，以及 types/docs/runtime consumer Checks 都使用独立 assurance identities；detached cold integration 不进入 routine test preset。直接的 duplicate/file/function/Markdown repository-quality Checks 由 quality preset 选择；每个 eligible Check 的 terminal status 与其它 eligible identity 一同进入 explicit `all` aggregate（不是 `--all` selection），findings/messages/Records/final data 不参与 aggregate，也不启动 nested repository Run。Definition 同时把 package `Markdown link validation` 与 docs path task `Documentation path existence validation` 显示为不同 Check，避免把 source validation 与文档 acceptance 混为同一能力。Definition 与 explicit aggregation从同一 entry metadata 投影 eligibility；artifact 直接消费 root prepared candidate，external provider 独占 named lifecycle mutex，三个 consumer 只读 provider material；`tests-scripts-validation` 与只会因 temporary generated-material drift 而改变结果的 docs schema/example validators 共享独立 documentation-materials mutex。JSON grammar 和 Markdown path validators 不持有该 mutex，保持可并行。Gate 当前保留 root `maxParallel: 3` 和 default admission priority；任何非零值仍须先用成对测量证明不会伤害 required 与 complete workload 的 median，且只排序 ready admission，不能凌驾于这些 dependency、mutex 或 cap 边界。
- Gate 自有 quality 构造显式保留 repository-specific files 与 duplicate thresholds、file-metrics `300 + 500/10`、function-metrics `50 + 150/below 5 + CC 10 + parameters 5` 和 non-blocking findings，不继承更宽松的 package consumer defaults。duplicate/file/function 三项的 `product-source` area 共同排除 `src/package-checks/function-metrics/analyzer/**`；配置测试证明 port-root 内 translated source、façade、tests 与 development harness 均未被这些 metrics 选择，而目录外 implementation 继续被选择。Function metrics 另外排除 Product test/test-support，duplicate/file 仍选择代表性测试文件以保留重复与文件长度证据。该 selection 不从 provenance ledger 动态生成，也不替代 analyzer 或测试的 lint、format、typecheck、source identity、oracle、provenance、import-boundary 或行为测试。CPD 不选择 Markdown，duplicate/file metrics 不选择 historical Schemas 且不再需要历史 waiver；current Schemas 仍被选择。Markdown Link selection 只包含 `docs/**/*.md` 与 `changes/**/*.md`，不会用 TypeScript scope 制造 input-rejection noise。
- adapter 无参时默认 required；`--typecheck`、`--lint`、`--test`、`--docs` 与 `--quality` 可重复、可组合并替换默认选择，规范化后成为 Product opaque flags；`--all` 独占 preset 并选择完整 Gate。独立 `--help` 在任何 candidate/log 工作前返回完整 preset 与示例说明。
- Product Run integration 证明同一 entry metadata 既控制原生 `enabledByFlags`，也控制 explicit aggregate：未选择 Check 不执行并保留 `not-applicable / flag-condition-not-matched`，selected aggregate 只消费实际选择的 identity。
- `--release-receipt` 是 selection 之外的显式 candidate source，只接受一个非空 path，并要求完整 `--all`；其它调用仍使用 local candidate source。
- Required 默认不选择 artifact、external-consumer provider 与 types/docs/runtime consumer Checks；prepared candidate typed provider 和快速 package-supporting contracts 仍在 required 中。只有 `--all` 纳入 package acceptance；未选择 Check 保留 Product 的 `flag-condition-not-matched` fact，aggregate 只消费同次 selection 的 eligible identities。启动 summary 明确 required、focused 或 all 及 package acceptance 是否选择。
- Artifact、external-consumer provider、types consumer、docs consumer 与 runtime consumer 共五个 physical process 都带 30 秒外层 timeout；其它 test lanes 不继承该特定防挂死限制。显式 `package:candidate:integration` 另有 30 秒进程硬限制，但不属于 routine `--test` preset。

## Case AUX-PROJECT-GATE-DIAGNOSTIC-LOGGING-001: Project Gate co-locates the Product diagnostic log

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project/gate/runtime/bound-run.test.ts|binds the Product diagnostic log and standard machine facts to the Gate invocation directory`
  Proves:

- Gate output overrides colocate Product diagnostic logging and standard machine publication in one deterministic, test-owned invocation directory. The isolated fixture runs one synthetic Check rather than scanning the current repository; it proves exactly one core log plus paired `run.json` and `records.ndjson`, then removes only its own `.log/project-gate-tests/output-override-*` directory. It does not inspect, clean, or infer facts from pre-existing `.log/project-run` inventory, create a quality-only report, or establish a Gate performance budget.

## Case AUX-PROJECT-GATE-TRANSCRIPT-001: Project Gate 保存并闭合外层运行过程

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project/gate/runtime/transcript.test.ts|Project Gate transcript > tees tagged plain output, records final Gate facts, and restores process and console writers`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > reports the invocation directory when Gate transcript setup fails`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > post-processes one initial Gate result before reporting the final exit`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > fails closed when the Gate transcript cannot be completed`
  Proves:

- invocation-local `gate.log` 将 console 与 direct process stdout/stderr 原内容继续送到原 terminal writers，并以 `[STDOUT]` / `[STDERR]` 保存去除 TTY controls 的 plain lines；关闭时写入 `[GATE]` 标记的 invocation directory、最终 result 与 exit status，随后恢复被接管的 console/stream writers，重复关闭不会伪装成功。
- transcript 消费 afterGate 处理后的唯一 result 及其 exit mapping，而不是初步结果或另一套聚合；directory 已创建但 transcript 无法建立时不启动 Product Run 并显示该 directory，已开始的 transcript 无法完整关闭时 fail closed 为 unavailable，只在终端报告 unavailable result 并保留 directory 供检查。

## Case AUX-PROJECT-GATE-AUTHORING-001: Project Gate 区分 native 与真实 process evidence

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > keeps native Check outcomes transcript-free`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > preserves two-step ast-grep process evidence and failures`
  Proves:

- Native operations 直接形成 passed/failed/unavailable Check facts；validation failure 保留安全的 diagnostic code/count Record，并用 terminal message 指向对应 focused root command，不暴露 raw diagnostics，也不会在 `process/` 创建空 transcript。
- Test Evidence rule validation 向真实 ast-grep 步骤传递 cancellation，在 `process/test-evidence-rule-tests.log` 保留已发生的 version/rule-test process evidence，并区分 nonzero、version mismatch 和 unavailable 结果。

## Case AUX-PROJECT-GATE-PROCESS-001: Project Gate 保留命令与 transcript 事实

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project/gate/checks/process/process.test.ts|Project Gate process Check > publishes closed success data only after a settled transcript`
- `bun|scripts/project/gate/checks/process/process.test.ts|Project Gate process Check > writes one complete transcript and passes only a zero command exit`
- `bun|scripts/project/gate/checks/process/process.test.ts|Project Gate process Check > writes a running transcript before process start and replaces it after settlement`
- `bun|scripts/project/gate/checks/process/process.test.ts|Project Gate process Check > derives process environment from one typed provider dependency`
- `bun|scripts/project/gate/checks/process/process.test.ts|Project Gate process Check > reports a safe failure Record and command-failed message for nonzero exit without copying child output`
- `bun|scripts/project/gate/checks/process/process.test.ts|Project Gate process Check > requires an explicit timeout before reporting safe timeout evidence`
- `bun|scripts/project/gate/checks/process/process.test.ts|Project Gate process Check > avoids starting cancelled work and maps process/log boundaries to unavailable`
- `bun|scripts/project/gate/checks/process/process.test.ts|Project Gate process Check > maps a settled cancellation fact to transcript evidence and unavailable`
  Proves:

- eligible command 只有在零退出并写入包含 stdout/stderr 的 `process/<check-id>.log` 后才通过。普通单进程 Check 在启动 child 前先写同路径 running transcript，包含 command 与 timeout；结算后将其替换为完整结果，startup 写入失败则不启动 child。失败 message 与 Record 使用同一 invocation-relative `process/<check-id>.log` reference，而不暴露 invocation absolute path。
- Dependency-backed process 只读取声明的 direct provider，要求 upstream passed，经 provider parser 恢复 data 后才派生无冲突 environment；unreadable、failed 或 malformed data 不启动 child process。
- A typed-success process publishes its typed final data only after a zero exit and a successfully written settled transcript. It then closed-parses stdout and validates it against its typed dependency; malformed stdout or invalid parsed/provenance data settles `unavailable / process-output-invalid`, never a passed result.
- 非零退出产生含 command、exit code、signal 与 log reference 的 Check-local supplemental Record，随后得到 failed final data 和唯一 `error` / `command-failed` message；message 只含 exit code、signal 和 invocation-relative transcript reference，不复制 child output、完整路径、command、credential URL 或 digest。
- The same nonzero Check executed through the installed public Run keeps its failure Record, presents only that approved summary, and returns the corresponding `{ checkId, level, code, message }` item from `RunResult.checkMessages`; transcript-only material remains absent from both surfaces.
- 启动前取消不启动 process；spawn、exit facts 或 transcript 边界失败得到对应 unavailable outcome。settled transcript replacement 失败时不把缺失最终日志误报为 command 结果；running evidence 只保证存在到 replacement 开始前。
- Process descriptor 把显式 timeout 交给 process facade；只有 descriptor 声明该时限时，timeout fact 才结算为带安全 `command-timeout` message 的 `process-timeout` unavailable，否则 fail closed 为普通 process unavailable。timeout transcript 保留 `timed-out: yes`。
- 已运行 command 被取消时，transcript 保留 signal 与 error summary，outcome 为 `execution-cancelled` unavailable。

## Case AUX-PROJECT-GATE-PREPARED-CANDIDATE-001: Gate 将已准备 candidate 保留为 typed fact

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project/gate/checks/prepared-candidate.test.ts|prepared package candidate Check > publishes versioned typed candidate data and rejects malformed dependency facts`
- `bun|scripts/project/gate/checks/prepared-candidate.test.ts|prepared package candidate Check > fails closed when the prepared artifact no longer matches its digest`
  Proves:

- Required provider Check 只发布 closed、versioned、绝对路径且 containment 合法的 candidate data，并保留 artifact digest、文件 inventory、installed entry、preparation action/reason 与 reuse fact；schema 明确区分 local rebuild/reinstall/reuse 与 formal `release / release-receipt`。
- Provider 在 artifact、staging 或 resolved entry 缺失以及 artifact digest 漂移时 fail closed；artifact acceptance 与 external-consumer provider 只能按各自需要解析同一次 typed Gate candidate，不能把未验证路径当作 dependency input。

## Case AUX-PROJECT-GATE-ADAPTER-001: Project Gate 只闭合已准备的完整 invocation

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > returns help before candidate or log work`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > does not load or run a candidate consumer after preparation failure`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > loads no Definition or package runtime before candidate preparation`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > uses explicit formal receipt preparation without invoking local candidate preparation`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > rejects an imported entry that differs from the prepared candidate before run or afterGate`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > consumes package aggregation without traversing the raw Check snapshot`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > maps aggregate, definition warning, output and malformed facts to Gate exits`
  Proves:

- 隔离 child process 在没有 candidate package 的 project root 中加载真实 root adapter，并以会 throw 的本地 Definition 替身取代 Definition；它证明 candidate preparation 前不会直接或间接加载 package public runtime 或 Definition。`--help`、preparation failure 或 prepared/imported entry mismatch 均在 consumer execution 与 definition-owned `afterGate` 前停止；help 与 mismatch 也在 invocation log 创建前停止，help 还不会准备或导入 candidate。
- 成功 invocation 只各执行一次 candidate preparation、consumer load、log-directory creation 和 bound Run，并把同次 normalized selection flags 与 prepared candidate 交给 consumer。Formal mode 只调用 receipt preparer 并把其 exact installed artifact 交给 Run，不调用或回退到 local fingerprint preparer。
- 初步 Gate 结果要求 Package Run 的 explicit aggregate 为 passed；definition warning、progress failure 或非-passed aggregate 形成 failed，non-completed 或 malformed result 形成 unavailable。adapter 不遍历 snapshot 重建 aggregate。

## Case AUX-PROJECT-GATE-POST-PROCESSING-001: Project Gate 后处理只产出一个最终结果

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project/gate/runtime/bound-run.test.ts|projects the central afterGate configuration with candidate-bound run`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > post-processes one initial Gate result before reporting the final exit`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > fails closed when afterGate throws`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > fails closed when afterGate returns an invalid result`
  Proves:

- candidate-bound module 从中央 `definition.ts` 投影唯一 `afterGate` 与 Product `run`；entry identity 验证后，Hook 在 bound Run 返回并形成初步 Gate 结果后执行一次。它可以同步或异步接收冻结的初步结果，以及包含 normalized selection、repository root、prepared candidate、invocation logs、原始 RunResult、Gate started、initial-result timestamp、总 `elapsed-to-initial-result` 与 candidate preparation / adapter-setup / Product Run 三个连续 phase 的只读 Gate context，并以同类型新结果决定唯一终端状态与 exit。
- Hook context 不因当前性能用例退化成 elapsed 参数集合，也不暴露 loader、clock、console writer 或 candidate preparer 等执行依赖；invalid 或 non-monotonic phase timing 只能形成不可比较 observation，不能被归一化为 0ms 后进入 baseline comparison。
- Hook 抛错或返回无效结果形成带受控诊断的 unavailable 最终结果，不静默放行，也不对外暴露 base/acceptances/final 并行结果集合。

## Case AUX-PROJECT-GATE-PERFORMANCE-001: Project Gate 性能观察保持 advisory

Owner: `docs/script-tooling.md#project-gate`
Entities:

- `bun|scripts/project/gate/runtime/performance-observation.test.ts|Project Gate performance observation > emits elapsed observations and preserves Gate status across comparable advisory outcomes`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > uses the default performance observer and keeps advisory warnings non-blocking`
  Proves:

- Gate-owned observer 每次形成单条 `elapsed-to-initial-result` observation，并显示 candidate preparation、adapter/setup 与 Product Run phase：没有同一标准 workload baseline、使用 focused preset、初步非 passed 或不完整 Run timing 时明确为 not-comparable；它不读取 diagnostics log 或将并行 Check duration 相加为 Gate wall time。
- 可比较的标准 workload 以总 `elapsed-to-initial-result` 在 threshold 内形成 info，超界只形成一条含总值、三段 phase、threshold 和至多三个最慢 Check 的 warning；两种 observation 都保留初步 Gate status、既有消息和 process exit，不能成为第二个硬性能预算。
- `definition.ts` 的默认 `afterGate` 实际调用 observer；adapter 测试可通过 loader seam 提供 fixture Hook，但该 seam 不构成配置入口。正式 baseline 已记录标准 required/all selection 的开发机样本，仍仅用于匹配 workload 的 advisory comparison，不能被测试 fixture、custom hook 或单次执行改写为性能 budget。

## Case AUX-PARALLEL-RUNNER-001: Static Task engine 保持通用调度契约

Owner: `docs/architecture.md#execution-boundary`
Entities:

- `bun|src/project-run/task-scheduler/task-engine.static-validation.test.ts|static task engine > validates static task identity dependency and scope structure before execution`
- `bun|src/project-run/check-execution/plan.test.ts|Check execution plan > projects normalized admission priority into the static task graph`
- `bun|src/project-run/task-scheduler/task-engine.admission.test.ts|static task engine > respects one root budget for dependency order and named mutex execution`
- `bun|src/project-run/task-scheduler/task-engine.admission.test.ts|static task engine > distinguishes full graph identities with identical Task IDs but different scheduler semantics`
- `bun|src/project-run/task-scheduler/task-engine.admission.test.ts|static task engine > reuses one stable graph identity across scheduler decision evidence`
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
- `bun|src/project-run/task-scheduler/task-engine.admission-policy-failures.test.ts|task engine admission policy > preserves the caller closure across overlapping custom Runs without a Scheduler callback lock`
- `bun|src/project-run/task-scheduler/task-engine.admission-policy-measurement.test.ts|task engine admission policy > shares one frozen graph while exposing only decision-boundary measurement scalars`
- `bun|src/project-run/task-scheduler/task-engine.admission-policy-measurement.test.ts|task engine admission policy > commits a settled running-cohort interval before the next custom policy callback`
- `bun|src/project-run/task-scheduler/task-engine.admission-policy-measurement.test.ts|task engine admission policy > retains custom action effects while unavailable clocks omit interval contributions`
- `bun|src/project-run/task-scheduler/task-engine.admission-policy-failures.test.ts|task engine admission policy > fails custom policy faults without fallback, cancels pending work, and drains admitted work`
- `bun|src/project-run/task-scheduler/task-engine.admission-policy-failures.test.ts|task engine admission policy > drains an admitted public Check before returning an admission policy fault`
- `bun|src/project-run/task-scheduler/task-engine.admission-policy-failures.test.ts|task engine admission policy > classifies every bounded custom fault without exposing callback values`
- `bun|src/project-run/task-scheduler/task-engine.admission-policy-failures.test.ts|task engine admission policy > returns the dedicated execution result for a custom callback failure`
  Proves:

- Engine 在任何 executor work 前验证静态 Task identity、`dependsOn` / `observes` union、scope membership、activation/terminal relation、cap 和 signed admission priority；它以一个 root budget 处理 relation readiness、mutex 与 generic scope cap。
- Executor failure、executor 返回的 prerequisite-unsatisfied signal，或 Product 在 admission 前已真实形成的 terminal Task result，都只阻断 `dependsOn` dependent Task；pre-admission Task 不会再次 admission，terminal observers 与 unrelated Task 仍可完成。abort 后不再 admission pending Task，已 admitted Task 接收同一 signal 并 drain；engine 的 settlement 是唯一通用 execution accounting，且不读取 Check status、reason 或 data。
- 纯 `SchedulerDecision` 从 immutable scheduler snapshot 与 trigger 选择下一项 generic Task action：每轮依完整图、relation/mutex candidate、capacity 与 runtime facts 重算 exact `select(taskId)` 或 `wait`；priority 只来自 Task metadata，不能越过 dependency、mutex、capacity 或 lifecycle hard guard。命令式 shell 记录无状态 decision evidence，再执行 admission、wait/drain、blocked settlement、cancellation 或 completion；它不保存或解释 reservation、sticky、reason、公平或饥饿 state，也不取得 Check owner 身份。
- custom adapter 仅在每次**实际** callback 前交接 detached、ordinary、deep-frozen 的完整 graph 和最小动态 DTO；同一 Run 共享一次冻结 graph，callback 不获得 private Scheduler objects、`Set`/`Map`、priority side input 或 Task capability。measurement 只交接已 flush 的 cumulative scalar/peak/discrete facts与 captured-prefix append-only frozen action observation；`measurementCount` 截止旧 context 可读 prefix，synchronous `measurementAt` 不返回 live array 或 per-round slice，且不复制 terminal per-Task measurement table。每条 observation 从 accepted `select`/`wait` 的 post-state 到下一实际 callback 前，记录 state interval 与期间 admitted/settled effects，不归因给 action；interval 以 closed union 区分 available contribution 与 unavailable reason，clock throw/non-finite/backward 时离散 action effects 保留但没有伪造数值。Scheduler 对 malformed/thenable/throw、non-candidate、capacity/lifecycle-invalid select 和 undrainable wait 以有界 admission-policy fault 停止 admission、取消 pending 并 drain running，不 fallback；public Run 直到已 admitted Check settlement 才以专用 `admission-policy-failed` execution result 返回，且不暴露 policy console、checkMessages 或 timing artifact。diagnostic 不泄漏 caller value。

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

## Case AUX-LIZARD-UPSTREAM-ADVISORY-001: Lizard upstream 查询保持显式、受限且非阻断

Owner: `docs/maintenance-lizard-upstream-advisory.md#transport-and-result`
Entities:

- `bun|scripts/maintenance/lizard-upstream-advisory.test.ts|Lizard upstream advisory reports the pinned 1.24 baseline as current without ambient credentials`
- `bun|scripts/maintenance/lizard-upstream-advisory.test.ts|Lizard upstream advisory reports a stable newer release without changing anything`
- `bun|scripts/maintenance/lizard-upstream-advisory.test.ts|Lizard upstream advisory keeps HTTP, malformed, and oversized responses advisory`
- `bun|scripts/maintenance/lizard-upstream-advisory.test.ts|Lizard upstream advisory maps timeout and network failures to stable advisory results`
  Proves:

- 显式 maintenance lookup 只请求固定的 Lizard GitHub HTTPS release endpoint，禁用 credentials 与 redirects，并以 Lizard `1.24.0` 为 baseline；current release 产生 `no-update`，较高 stable release 只产生 `update-available`，不会修改 repository state。
- HTTP、malformed、oversized、timeout、network 和 caller cancellation 都结算为稳定的 `unavailable` advisory code；它们不伪造“无更新”、不泄漏 transport error，也不形成默认 Gate 的阻断结论。

## Case AUX-LIZARD-PERFORMANCE-EVIDENCE-001: Opt-in Lizard comparison keeps equality and statistical interpretation explicit

Owner: `docs/script-tooling.md#development-tooling`
Entities:

- `bun|scripts/development/lizard-performance/command.test.ts|Lizard TypeScript developer performance evidence > requires an explicit bounded developer invocation`
- `bun|scripts/development/lizard-performance/command.test.ts|Lizard TypeScript developer performance evidence > locates invalid child and manifest fields at the evidence boundary`
- `bun|scripts/development/lizard-performance/command.test.ts|Lizard TypeScript developer performance evidence > canonicalizes metric ordering before output equality`
- `bun|scripts/development/lizard-performance/command.test.ts|Lizard TypeScript developer performance evidence > uses every ABBA block in deterministic bootstrap classification and only marks IQR outliers`
- `bun|scripts/development/lizard-performance/command.test.ts|Lizard TypeScript developer performance evidence > selects counted-operation wall only for warmed statistics and gives both B sides one warmup flag`
- `bun|scripts/development/lizard-performance/command.test.ts|Lizard TypeScript developer performance evidence > blocks statistical sampling on counted output drift and refuses non-Linux supervisor semantics`
- `bun|scripts/development/lizard-performance/command.test.ts|labels Linux wait4 resource scope without relabeling max RSS as tree aggregate`
Proves:

- Developer comparison selection is explicit, bounded and developer-only; fixed Lizard executable/source inputs require host-absolute paths while the output path may remain caller-relative. It cannot silently select an ambient language condition or Gate path, become Product/package surface, or authorize a performance optimization. Child result and workload-manifest failures identify the invalid metric index or manifest field without accepting a partial evidence shape.
- Fixed-Lizard analyzer comparison canonicalizes the Product-consumed metric fields before equality and retains stable path/order semantics.
- ABBA paired ratios, deterministic bootstrap confidence intervals, practical-equivalence classification and IQR marking preserve all samples; resource scope can independently make a resource comparison non-comparable.
- Warm statistics select the target-internal counted operation rather than whole-target startup/warm-up wall; drift after preflight and unsupported collector platforms stop comparability.
- Linux parent/child collector evidence names CPU plus reaped-descendant semantics and a single-process maximum RSS boundary, never falsely labeling it process-tree aggregate RSS.
