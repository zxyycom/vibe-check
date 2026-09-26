# repository-tooling

## Case AUX-PACKAGE-CANDIDATE-001: Candidate lifecycle admits only verified local package state

Owner: `docs/tooling/package-lifecycle.md#local-candidate-lifecycle`
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

Owner: `docs/tooling/package-artifact.md#产物构造与审计`
Entities:

- `bun|scripts/package/artifact/artifact.test.ts|package artifact > packages approved docs and machine materials`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > emits documented public declarations`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > emits a readable ESM runtime layout and exact exports`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > declares the audited production dependency set`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > declares the approved distribution and discovery contract`
- `bun|scripts/package/artifact/manifest.test.ts|checked-in release manifest projects only version and rejects static-source or safety drift`
- `bun|scripts/package/artifact/manifest.test.ts|release manifest reader does not leak the caller's repository root`
- `bun|scripts/package/artifact/manifest.test.ts|release manifest bytes invalidate the candidate fingerprint`
- `bun|scripts/package/legal-materials.test.ts|package legal materials > fails closed in the translated-analyzer audit phase order`
  Proves:

- Artifact construction and audit produce one package with the approved single-README documentation inventory, no package or Check index page, public declarations and root exports, readable ESM layout, and the complete audited production dependency requirements.
- The checked-in release manifest is the stable authoring owner; local/formal builds project only its version from an explicit repository root, while source and projection audits remain closed. The projected manifest uses the user-scoped `@zxyycom/vibe-check` identity and carries the fixed general-purpose quality-gate discovery description and keywords, the complete `MIT AND Apache-2.0 AND BSD-2-Clause` expression, Vibe Check's exact MIT text and `zxyycom` notice, minimum Node engine `>=24.18` without an unverified upper bound, canonical GitHub repository, explicit public npm registry/access, and no `private`, `bin`, lifecycle scripts, Bun engine, or subpath export.
- The byte-level allowlist carries `docs/output.md`, both current v4 schemas, the single definition-backed `mixed-outcomes` artifact set, upstream Lizard/Pygments license and provenance material, and the non-public emitted function-metrics Worker. It has one `licenses` material root with no parallel `third-party-licenses`, excludes historical or analyzer fixture material, and does not publish a root `THIRD_PARTY_NOTICES.md`.
- The scoped `licenses/analyzer-translations-NOTICE.md` is copied from its repository source rather than generated from fixed narrative phrases. Material acceptance compares actual source/staging/tar/installed notice bytes while preserving the independent provenance and three upstream-license identity pins.
- The direct legal-material audit exposes the first reachable material-identity, missing-attribution, inventory, translated-target/header, untracked-header or deferred-body error. It does not require hand-written attribution to restate internal extension counts or installation-audit procedures.

## Case AUX-PACKAGE-COMPILER-CACHE-001: Candidate compiler intermediates cannot bypass exact artifact audit

Owner: `docs/tooling/package-lifecycle.md#local-candidate-lifecycle`
Entities:

- `bun|scripts/package/artifact/compiler-cache.test.ts|candidate compiler cache reuses docs-only emit and rejects changed or corrupt inputs`
  Proves:

- Unchanged Product compiler inputs reuse verified local raw emit when only documentation changes. A changed source graph may retain incremental compiler state, but corrupt cached output/build info or a changed source-file set forces a cold emit. This cache is not the package staging, tarball, installed candidate or a replacement for their full audits.

## Case AUX-TRANSLATED-SOURCE-MAPPING-001: Source mapping maintenance updates only selected derived material

Owner: `docs/tooling/source-mapping.md#translated-source-mapping`
Entities:

- `bun|scripts/package/legal-materials/source-mapping.test.ts|source mapping sync derives only the package provenance pin after reviewing curated mappings`
- `bun|scripts/package/legal-materials/source-mapping.test.ts|source mapping sync leaves curated files untouched when validation rejects a mapping`
- `bun|scripts/package/legal-materials/source-mapping.test.ts|source mapping sync restores a prior file when a later write fails`
  Proves:

- After curated mapping review, synchronization preserves ledger bytes, reports only the identity manifest and package contract as changed, deletes only legacy derived `counts.entries`/`counts.targets`, and replaces only the package provenance SHA-256 from the ledger. A following check reports no changes.
- A rejected identity mapping, malformed provenance, or missing/duplicate package pin leaves all three curated fixture files byte-for-byte unchanged before writing. If the later package-contract write partially fails, every attempted fixture write is restored to its prior contents.
- This Case proves maintenance and recovery boundaries only. Source header/legal-material closure remains `AUX-PACKAGE-ARTIFACT-MATERIAL-001`; source→symbol/host-seam coverage remains `FM-ANALYZER-SOURCE-IDENTITY-001`; neither is analyzer semantic/oracle/parity evidence.

## Case AUX-PACKAGE-RELEASE-001: Formal release binds one clean source to one portable artifact receipt

Owner: `docs/tooling/package-release.md#package-release`
Entities:

- `bun|scripts/package/release/release.test.ts|formal package release > accepts only explicit canonical prestable versions and conservative tags`
- `bun|scripts/package/release/release.test.ts|formal package release > writes a portable sanitized receipt and rejects identity or artifact drift`
- `bun|scripts/package/release/release.test.ts|formal package release > isolates formal staging and receipt state from the default local candidate`
- `bun|scripts/package/release/release.test.ts|formal package release > requires one exact clean Git worktree revision before formal preparation`
- `bun|scripts/package/release/command.test.ts|formal release root commands require closed inputs and bind verification to one complete --all Gate receipt`
  Proves:

- Formal preparation accepts only a positive canonical `0.0.x` and an explicit conservative tag, requires exact clean `HEAD`, and keeps release staging/receipt/compiler state distinct from the fingerprint local candidate while sharing only the versioned artifact root.
- The versioned receipt uses repository-relative canonical paths, records the scoped package identity, and binds commit, input fingerprint, ordered inventory, SHA-256, SHA-512 SRI, manifest/README identities and the complete third-party legal-material inventory, version, and tag. The scoped translation notice digest comes from actual staged bytes; fixed upstream license and provenance identities remain independently pinned. Its writer rejects a foreign receipt path or mismatched artifact SHA-256 before replacing the owned receipt; its closed grammar and verifier reject extra consumer identity, path escape, duplicated inventory, contract drift, and changed artifact bytes without storing credential material.
- The root command grammar requires complete named inputs: prepare forwards one explicit version/tag and reports the receipted artifact identity, while verify constructs one unmodified complete `--all` Project Gate invocation for the explicit receipt and preserves its returned exit status. Missing or duplicated inputs fail instead of selecting an implicit version, tag, or receipt.

## Case AUX-PACKAGE-ESM-NORMALIZATION-001: Artifact-relative ESM references remain resolvable

Owner: `docs/tooling/package-artifact.md#产物构造与审计`
Entities:

- `bun|scripts/package/artifact/esm-module-specifiers.test.ts|emitted ESM module specifiers > rewrites relative module references without changing ordinary path strings`
- `bun|scripts/package/artifact/esm-module-specifiers.test.ts|emitted ESM module specifiers > rejects malformed emitted JavaScript before artifact normalization`
  Proves:

- Artifact normalization rewrites every emitted relative ESM import form to a resolvable `.mjs` target without changing ordinary path strings. It additionally rewrites exactly one emitted `function-metrics` Worker source URL only in `analyzer-worker-port`, rejects zero/multiple compiler-shape matches, and rejects malformed emitted JavaScript before producing trusted output.

## Case AUX-PACKAGE-RUNTIME-SOURCE-MAPS-001: Packaged source maps match their emitted modules

Owner: `docs/tooling/package-artifact.md#产物构造与审计`
Entities:

- `bun|scripts/package/artifact/runtime-source-maps.test.ts|runtime source maps > normalizes and verifies one map against its packaged TypeScript source`
  Proves:

- A packaged runtime source map derives its source path from the emitted module, embeds that exact packaged TypeScript source, and rejects later source drift.

## Case AUX-PACKAGE-ACCEPTANCE-INPUTS-001: Package acceptance consumes closed provider material

Owner: `docs/tooling/project-gate.md#prepared-candidate-data`
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

Owner: `docs/tooling/project-gate.md#prepared-candidate-data`
Entities:

- `bun|scripts/package/candidate/external-consumer/runtime.test.ts|external consumer runtime acceptance`
  Proves:

- The ancestry-external runtime rejects a missing or relative `VIBE_CHECK_NODE_CMD` instead of falling back to ambient Node. With the accepted absolute mise-locked Node 24.18.0 binding, it runs the installed entry, records the observed Node version and null Bun version, and resolves declared candidate tooling rather than repository or ancestor dependencies. The version-boundary checks are host validation, not evidence that every eligible Node version executed this fixture.
- The installed candidate resolves jscpd's manifest, bin, and actual engine version consistently. Its duplicate fixture sources produce one trusted non-blocking `duplicate-detection` Record with passed final data; installed `functionMetrics` executes the shipped Node Worker against the CCN-2 fixture and returns its trusted non-blocking Record. The Run imports all eight final-data parsers and exercises both named and Check-attached parser paths.
- Separate installed Checks execute equivalent nested builder and raw string-leaf AST conditions. This proves both package-root builder imports and the serializable final AST at runtime. The same Run proves an `observes` consumer can read a failed provider, a `dependsOn` consumer receives passed typed data, and a failed prerequisite produces `dependency-not-passed` with null duration without calling its dependent callback.
- Two installed Runs import `createLearnedCriticalPathStrategy` through the public prepared-strategy hook, create then reload caller-owned local history with an explicit identity projection, and keep private inputs out of digest-only state. Public RunResult and machine output do not gain scheduler-history or prediction fields.
- A command Check imported from the installed root composes an enabled, resource-budgeted executable with an ordinary prerequisite and nested child. It preserves zero and nonzero numeric exits as passed/failed final data, maps bounded child output to `command-output-limit-exceeded`, and lets Core settle an admitted long-running command as `execution-cancelled`.
- The installed command transcript is created only through its explicit artifact branch, retains raw child stdout/stderr, and omits executable, argument and environment definition material. Default discard execution keeps executable, argument, environment and child-output canaries out of Run facts and machine publication, including a startup-failure branch.

## Case AUX-PACKAGE-API-DOCUMENTATION-001: Package API documentation projections stay executable and exact

Owner: `docs/tooling/documentation.md#documentation-validation-and-package-material`
Entities:

- `bun|scripts/docs/package-api/command.test.ts|package API documentation CLI > writes expected projections and detects stale output through --check`
- `bun|scripts/docs/package-api/render.test.ts|package API documentation renderer > projects every registry source region to its declared Markdown fence and JSDoc target without changing payload bytes`
- `bun|scripts/docs/package-api/render.test.ts|package API documentation renderer > replaces generated JSDoc tails and rejects malformed source or Markdown example targets`
  Proves:

- The renderer projects each allowlisted TypeScript payload byte-for-byte into the unique TypeScript fence under its declared natural heading path, or into a source JSDoc target. Its explicit published API-document registry keeps README as the sole entry, directly links each registered deeper guide from that entry, and closes those guides without treating arbitrary Markdown as package material. Published Markdown keeps headings, surrounding prose and ordinary links without projection comments.
- The `project-changes` runtime example is registered against the API mechanics guide and demonstrates one Git revision/region, its `changeFlag("source")` protected condition, the callback-visible effective flag set, file-centric successful evidence, and honest unavailable fallback; it does not require the documentation consumer itself to be a Git repository in order to execute.
- The registry and renderer reject duplicate source/region/target identities, unsafe JSDoc tails, malformed heading paths, missing or duplicate heading targets, ambiguous or unclosed example fences, and package example projection markers. Heading paths follow authored ancestry even when heading levels skip; removing a JSDoc target clears its obsolete managed tail.
- Write mode updates only projected Markdown fences and JSDoc tails. Check mode writes nothing and fails when a checked-in projection is stale.

## Case AUX-PACKAGE-DOCUMENT-MAPPING-001: Package document mappings bind source and published paths

Owner: `docs/tooling/documentation.md#documentation-validation-and-package-material`
Entities:

- `bun|scripts/docs/package-documents.test.ts|package document mappings > reads the calling repository mapping and applies distinct source and package paths`
- `bun|scripts/docs/package-documents.test.ts|package document mappings > rejects unknown fields, unsafe paths, and conflicting package targets`
- `bun|scripts/docs/package-documents.test.ts|package document mappings > includes raw mapping bytes in the artifact fingerprint`
  Proves:

- Repository-local JSON maps Markdown, Check guide and machine-material sources to package paths. Distinct source and destination paths remain intact through rendering, raw machine-byte collection and package-local Markdown link validation, including a relocated machine schema; the candidate fingerprint changes for configuration-byte changes.
- The loader rejects unknown fields, non-canonical or out-of-scope source/package paths, duplicate targets and file/ancestor target conflicts with the corresponding diagnostic.

## Case AUX-PACKAGE-API-EXTERNAL-EXECUTION-001: Installed package documentation remains exact and executable

Owner: `docs/tooling/repository-material-validation.md#随包材料验收`
Entities:

- `bun|scripts/package/candidate/external-consumer/documentation.test.ts|external consumer docs acceptance`
  Proves:

- The ancestry-external installation carries the exact checked-in published-path README, every explicitly registered API guide, hand-written Check guides, machine output guide, current v4 schemas, and the mixed-outcomes Definition/output example. One consumer-owned, mise-locked Node runner executes every projected runtime example in deterministic order and then the installed Definition against that exact candidate, retaining source identity on import failure. The change-flags example is deliberately executable in this non-repository consumer: unavailable Git evidence conservatively injects its declared token into the same effective `project.flags` set that selects its Check, while keeping the files branch discriminable. The Definition runs the documented package-provided and custom `observes` workflow, publishes its configured machine output, and forms the documented four outcome states, three RunResult messages and two Records.

## Case AUX-PACKAGE-CHECK-GUIDES-001: Package Check guides close the package-provided ordinary Check inventory

Owner: `docs/tooling/documentation.md#documentation-validation-and-package-material`
Entities:

- `bun|scripts/docs/package-api/check-guides.test.ts|package Check guides > requires one README-linked guide for every package-provided Check function`
- `bun|scripts/docs/package-api/check-guides.test.ts|package Check guides > rejects a missing direct README link and an extra Check guide page`
- `bun|scripts/docs/package-api/check-guides.test.ts|package Check guides > rejects package documentation without exactly one trailing LF`
  Proves:

- Package documentation has exactly one README-linked guide for every package-provided Check function and a direct machine-output guide link; generated and hand-written Markdown use canonical LF text with one trailing LF, while the README and exact guide directory cannot omit a direct link, publish an unregistered extra page, or restore a Check index layer.
- The published Markdown inventory includes the exact checked-in changelog bytes and rejects a missing README link to that document.

## Case AUX-PACKAGE-DEPENDENCY-VERSIONS-001: Candidate dependency requirements validate actual resolutions

Owner: `docs/tooling/package-artifact.md#产物构造与审计`
Entities:

- `bun|scripts/package/dependency-version.test.ts|package dependency versions satisfy only their declared requirement`
  Proves:

- Package tooling distinguishes exact dependency versions from bounded semver ranges, accepts only actual resolutions covered by the declared requirement (including rejection of jscpd `5.1.0` below the `^5.1.1` lower bound), and renders the same requirement in rejection diagnostics.

## Case AUX-PACKAGE-DEPENDENCY-LICENSES-001: Candidate audits every installed dependency license declaration

Owner: `docs/tooling/package-lifecycle.md#实际安装的依赖`
Entities:

- `bun|scripts/package/candidate/dependency-license-audit.test.ts|installed dependency license audit > covers every package directory and fails closed on unsupported declarations and layouts`
  Proves:

- The installed dependency license audit enumerates top-level, scoped and nested package directories, accepts repeated legacy `licenses[].type` entries only when every value is the same non-empty whitespace-normalized identity, and returns the complete accepted license distribution to its direct caller. It rejects candidate path escape, malformed manifests, package-name mismatch, missing/malformed/unsupported declarations, and symbolic-link package or nested `node_modules` layouts instead of treating a selective set of mirrored texts as dependency coverage.

## Case AUX-DOCS-VALIDATION-CLI-001: Root validation preserves default and focused material selection

Owner: `docs/tooling/repository-material-validation.md#material-task`
Entities:

- `bun|scripts/validation/workspace.test.ts|root validate CLI runs every material task by default`
- `bun|scripts/validation/workspace.test.ts|root validate CLI forwards focused material selections`
- `bun|scripts/validation/workspace.test.ts|root validate CLI rejects the retired docs entrypoint`
  Proves:

- The root validation adapter runs every declared repository-material task by default and forwards an explicit focused selection without silently broadening or skipping it.

## Case AUX-DOCS-VALIDATION-REPORTING-001: In-process material validation keeps output reporter-owned

Owner: `docs/tooling/repository-material-validation.md#material-task`
Entities:

- `bun|scripts/validation/repository-material/workflow.test.ts|material validation library reports success only through an explicit reporter`
- `bun|scripts/validation/repository-material/workflow.test.ts|material validation returns typed expected failures and keeps the Gate path console-silent`
- `bun|scripts/validation/repository-material/workflow.test.ts|material direct validation fails closed while the Gate adapter projects its safe Record subset`
- `bun|scripts/validation/repository-material/links.test.ts|documentation link validation retains every missing local-link occurrence in stable order`
- `bun|scripts/validation/repository-material/schema/strict-json.test.ts|workspace strict JSON validation matches public JSON Check BOM, encoding, and duplicate-key failures`
  Proves:

- The repository-material workflow uses an explicit reporter only for success summaries and returns provider-approved typed expected diagnostics without recovering Gate facts from thrown text. Its direct CLI and workspace caller write each failed diagnostic presentation to stderr and exit nonzero. Without a reporter, the in-process Gate path remains console-silent.
- Empty collections, noncanonical data, duplicate IDs and unsafe one-line presentation fail before direct CLI presentation. The Gate adapter deliberately projects only its safe `{ id, data }` subset, so a direct-CLI-only unsafe presentation cannot suppress the corresponding failed Record or focused command message.
- JSON, schema, examples and links own their task-local ID/data/presentation. The link fixture proves every missing local-link occurrence has canonical repository-relative source/target, line, column and occurrence, in deterministic source-location order.
- Workspace JSON validation creates one independent Product Run with the public `jsonValidation` constructor; BOM, invalid UTF-8 and duplicate-key fixtures prove it does not silently fall back to `JSON.parse` semantics or invoke the Project Gate.

## Case AUX-REPOSITORY-LAYOUT-001: Repository layout preserves module ownership and dependency direction

Owner: `docs/development/coding-style.md#2-owner-与实现归属先行`
Entities:

- `bun|scripts/validation/layout-characterization.test.ts|characterizes repository layout and dependency boundaries`
- `bun|scripts/validation/package-tools-core-closure.test.ts|enforces package-tool public contracts and Core closure`
  Proves:

- Workspace validation keeps the Product owner inventory closed, including the declared Core and non-Core tool owners, and rejects retired source roots, a Gate root other than `definition.ts` / `run.ts` plus their root-contract tests and `checks/**` / `runtime/**`, unapproved `index.ts` files, generic module basenames, unexpected Product owners, forbidden Product/Project/package dependency directions, direct imports of private process-execution implementation files, an environment bootstrap dependency on process-execution, and a package compiler-root contract other than exactly public `src/index.ts` plus the internal function-metrics Worker root (which does not add a public entry).
- It also fail-closes the function-metrics private port boundary: only `analyzer-adapter.ts` may consume `analyzer/port-facade.ts`; port code cannot import Product; `analyzer-worker.ts` and `target-files.ts` must value-import the adapter; a later syntax error still reports its parse diagnostic but cannot create a false missing-adapter-import violation; port-external Product tests cannot deep-import analyzer modules; and public/package entry points cannot leak the façade, adapter, Worker, or deep path.
- Optional package-tool production modules are discovered recursively and may use only named Product symbols whose TypeScript identity and type/value role are genuinely exported by the package root; public aliases, values and callback-shaped contracts remain valid while same-module private symbols, package-root round trips, test material, external modules outside the exact approved `node:crypto`, `node:fs`, and `node:path` production set, unresolved paths, and default/namespace/side-effect/star/dynamic/require/import-type-query loading forms fail closed. The fixed Core roots traverse their production import closure under the current TypeScript resolution options, so relative, absolute workspace and configured-alias edges cannot bypass direct or indirect tool rejection; literal dynamic imports join that closure, while nonliteral loading, `require`, and import-equals forms fail closed, and a separately executable in-memory TypeScript no-emit proof validates it.

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
- `bun|scripts/project/gate/run.test.ts|Project Gate entries, root binding, and controls > keeps the explicit assurance identities and current selection metadata closed`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > projects the central composition manifest into an ordinary Project Definition`
- `bun|scripts/project/gate/checks/repository-quality.test.ts|repository quality Checks > uses the strict repository policy and binds only the mise-provided SCC command`
- `bun|scripts/project/gate/checks/repository-quality.test.ts|repository quality Checks > settles four blocking Checks while retaining advisory Markdown lint Findings`
- `bun|scripts/project/gate/checks/repository-quality.test.ts|repository quality Checks > preserves Product-owned empty and unavailable Markdown lint outcomes`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > settles a blocking normal quality Finding through its owning Check and effective aggregate`
- `bun|scripts/project/gate/checks/repository-quality.test.ts|repository quality Checks > substitutes an unavailable absolute SCC command without a function-metrics command`
  Proves:

- `bun run check` 通过 mise 使用仓库锁定的环境；`scripts/project/gate/run.ts` 是唯一 root process entry。
- `definition.ts` 用一份稳定顺序的 manifest 组合普通 Check；test lane descriptor 和 repository-quality options 分别由 `checks/test-execution/checks.ts` 与 `checks/repository-quality.ts` 拥有。entry validation 校验 `dependsOn` / `observes` 的 exact collection、self 与 missing target；`observes` 还保持 required/preset selection closure。
- Prepared candidate、external-consumer provider、test lanes 和质量 Check 保持独立 identity。Artifact 使用 prepared candidate；external provider 独占 package-lifecycle mutex，三个 consumer 只读 provider material。Project Gate change selection 与其余 tooling、admission workbench、repository layout、package-tools/Core fixture、machine-artifact acceptance 与其余 material validation 分别为独立 test lanes；两组 material tests 与 schema/example validators 共享 repository-materials mutex，JSON grammar 和 Markdown path validators 不持有它。
- Scheduler 的 `maxParallel` 为 `3`，两个逻辑资源的 capacity 均为 `2`：所有 `tests-*` lane 各 claim 一个 Bun runner unit，五项直接仓库质量 Check 各 claim 一个 repository-scan unit。其它 typecheck、lint、format、provider 和 native Check 不声明这两个 claim；mutex 仍独立表达独占关系。
- Duplicate、file、function metrics 与 Markdown Link 的 normal Finding 使用 blocking policy，未豁免 Finding 经 owning Check 和默认 aggregate 阻断 Gate。Function metrics 保留 `50 + 150/below 5 + CC 10 + parameters 5` 限值，只对 `createProjectGateEntries` 当前起始行的 `function-code-density` 使用一项精确 waiver；其它函数与指标继续阻断。
- `markdown-lint` 独立使用八项固定规则、`docs/**/*.md` / `changes/**/*.md` 范围和 non-blocking policy；Gate 显式启用可删除的逐文件 findings 缓存，不缩小检查范围。Finding 仍进入 Records 与 final data，空输入及不可用仍由 Product 结算。
- 三项 metrics 的 `product-source` area 共同排除 `src/package-checks/function-metrics/analyzer/**`；function metrics 额外排除 Product test/test-support，duplicate/file 仍选择这些测试文件。Duplicate detection 不选择 Markdown；duplicate/file metrics 不选择 historical Schemas，但继续选择 current Schemas。两个 Markdown Check 的范围均限于 `docs/**/*.md` 与 `changes/**/*.md`。
- Artifact、external-consumer provider、types consumer、docs consumer 与 runtime consumer 共五个 physical process 都带 30 秒外层 timeout；其它 test lanes 不继承该特定防挂死限制。显式 `package:candidate:integration` 另有 30 秒进程硬限制，但不属于 routine `--test` preset。

## Case AUX-PROJECT-GATE-SELECTION-001: Project Gate 按输入变更选择闭合 Checks

Owner: `docs/tooling/project-gate.md#project-gate`
Entities:

- `bun|scripts/project/gate/run.test.ts|Project Gate entries, root binding, and controls > defaults to required and normalizes combinable focused presets into opaque flags`
- `bun|scripts/project/gate/run.test.ts|Project Gate entries, root binding, and controls > requires the complete all selection for one explicit formal release receipt`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > keeps required, all, and focused membership golden while aggregation uses Product selection`
- `bun|scripts/project/gate/runtime/eligibility.test.ts|Project Gate change regions > selects independent script test lanes from their changed inputs`
- `bun|scripts/project/gate/runtime/eligibility.test.ts|Project Gate change regions > keeps quality and material regions specific to their inputs`
- `bun|scripts/project/gate/runtime/eligibility.test.ts|Project Gate change regions > keeps the product-runtime region complete for the lane resolver`
- `bun|scripts/project/gate/runtime/eligibility.test.ts|Project Gate change regions > selects package and Case checks only for their documented source boundaries`
- `bun|scripts/project/gate/runtime/eligibility.test.ts|Project Gate change regions > covers every registered package source and current Case owner`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > executes only Product flag-selected Checks and aggregates the same identities`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > starts a downstream-only Gate Check with its prerequisite and aggregates Product selection`
  Proves:

- 无 selection 参数时采用 required；focused preset 可重复、组合并替换默认选择，`--all` 独占并选择完整 Gate。显式 release receipt 只与 `--all` 同用；启动摘要反映实际选择。
- required 通过 Gate 的 region 数据与 Product 所用的 `minimatch` 选项选择各 Check 的输入：Product 源码、已登记随包材料、schema/example、当前 Case Owner 和规则变化各触发对应检查，调查或决策文档不唤起无关 package/Case test lane。所有已登记 package source 与当前 Case Owner 均受 region 覆盖。Product 的真实 Git 快照测试单独证明 changed path 与不可用回退；Gate 不重复构造 Git/Run 矩阵。Product runtime lane 的 region 覆盖其完整 test 分区及相关源码。
- JSON、Schema、publication、machine example、Markdown、质量扫描和规则测试保持各自的输入边界；schema source 变化会选择 publication validator，独立材料测试证明发布漂移被拒绝。Markdown links 因反向目标依赖仍检查完整 corpus，focused preset 与 `--all` 提供不依赖变更的强制路径。
- Product effective selection 决定 Check 执行、prerequisite 和 aggregate；未选中 Check 保留 not-applicable fact。required 保留 prepared candidate provider，但高成本 package acceptance 只由 `--all` 选择。

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

- `bun|scripts/project/gate/checks/process/native-operation.test.ts|Project Gate native operation > keeps native Check outcomes transcript-free`
- `bun|scripts/project/gate/checks/materials-validation.test.ts|Project Gate repository material native diagnostics > publishes complete material native diagnostic Records while terminal progress stays bounded`
- `bun|scripts/project/gate/checks/native-projections.test.ts|Project Gate owner-safe native projections > publishes only owner-approved Decision and Test Evidence diagnostics`
- `bun|scripts/project/gate/definition.test.ts|Project Gate Definition > preserves two-step ast-grep process evidence and failures`
- `bun|scripts/project/gate/checks/entry-factories.test.ts|wires one plain command through Product execution and Gate failure evidence`
- `bun|scripts/project/gate/checks/entry-factories.test.ts|resolves a direct dependency environment and rejects unavailable providers before spawn`
- `bun|scripts/project/gate/checks/entry-factories.test.ts|projects a complete nonzero command through the Gate-owned failure projector`
- `bun|scripts/project/gate/checks/entry-factories.test.ts|rejects mixed dependency and failure projection adapters at runtime`
  Proves:

- Native operation 将 owner-approved safe diagnostics 逐项发布为完整 Check-local Records；它不创建 native `process.log`，也不再承载 diagnostic presentation。repository-material fixture 的 12 条 diagnostics 全部进入 Run snapshot 和 published `records.ndjson`；Product terminal 与 progress tee 用 generic Record preview 只显示五条、将每条 terminal-control-escaped text 限制为 240 Unicode code points，并说明另有七条 omitted。preview 不改变 failed status、final data、accepted focused-command message 或 effective aggregate。
- 空、重复或不安全 diagnostics，以及 operation throw，均 fail closed 为 unavailable；不会创建 synthetic failed Record 或 native transcript。
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

- **Migrated Product command Checks：**所有单一无 shell Gate command（包括 development checks、test lanes、`lint-product` 与 `prepared-external-package-consumer`）使用 `commandCheck` 的 Product `process.log` format 和 `command-transcript-unavailable` boundary。Gate 只绑定 explicit inherit/plain-text environment、120 秒默认 timeout（package acceptance 与 lint-product 保留 30 秒）、64 MiB output limit、direct dependency resolver 和安全完成投影；Product 必须在 `afterCommand` 前写完 transcript。
- **保留的多步骤 workflow：**`test-evidence-rule-tests` 仍由 owner-specific Check 运行 ast-grep version 与 rule-tests 两步，并复用 Gate multi-step transcript/failure helper；它不是单一 command，不能压缩为一个 `commandCheck`。
- **Consumer-owned settlement：**`lint-product` 以 Gate oxlint projector 形成 safe Records，或回退一个 generic failure。external consumer 从 prepared-candidate dependency 派生 environment；仅 zero exit 解析并验证 stdout、physical material 和 provenance 后发布 typed data。nonzero exit 为 `unavailable / external-consumer-provider-failed`；解析或验证失败为 `unavailable / process-output-invalid`，不发布 typed data。这些 reason 与 projection 不属于 Product `commandCheck` contract。
- command entry 的 direct-execute evidence 覆盖 Product transcript、generic failure Record/message、dependency environment 成功与 provider fail-closed；`lint-product` 及 oxlint/oxfmt projector tests 覆盖 owner-specific structured Records 与 generic fallback。Product commandCheck 自身的 timeout、output limit、signal、取消和 transcript capability tests 是这些边界的唯一生命周期证据，Gate 不复制一套 runner。

## Case AUX-PROJECT-GATE-PREPARED-CANDIDATE-001: Gate 将已准备 candidate 保留为 typed fact

Owner: `docs/tooling/project-gate.md#project-gate`
Entities:

- `bun|scripts/project/gate/checks/prepared-candidate.test.ts|prepared package candidate Check > publishes versioned typed candidate data and rejects malformed dependency facts`
- `bun|scripts/project/gate/checks/prepared-candidate.test.ts|prepared package candidate Check > fails closed when the prepared artifact no longer matches its digest`
  Proves:

- Required provider Check 只发布 closed、versioned、绝对路径且 containment 合法的 candidate data，并保留 artifact digest、文件 inventory、installed entry、preparation action/reason 与 reuse fact；schema 明确区分 local rebuild/reinstall/reuse 与 formal `release / release-receipt`。
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
- 成功 invocation 只各执行一次 candidate preparation、consumer load、log-directory creation 和 bound Run，并把同次 normalized selection flags 与 prepared candidate 交给 consumer。Formal mode 只调用 receipt preparer 并把其 exact installed artifact 交给 Run，不调用或回退到 local fingerprint preparer。
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

## Case AUX-PROJECT-GATE-PERFORMANCE-001: Project Gate 本机硬阈值阻断超时或缺失基线

Owner: `docs/tooling/project-gate.md#project-gate`
Entities:

- `bun|scripts/project/gate/runtime/performance-observation.test.ts|Project Gate performance limit > blocks missing, invalid, or exceeded standard-workload limits and preserves initial facts`
- `bun|scripts/project/gate/runtime/performance-observation.test.ts|Project Gate performance limit > enforces profile and runtime budgets independently of fingerprint metadata without rewriting them`
- `bun|scripts/project/gate/runtime/performance-observation.test.ts|Project Gate performance limit > loads only an explicit regular local JSON file with fixed, unique limits`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > enforces the local performance limit without revising Product Check facts`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > fails before candidate preparation without a local standard-workload baseline`
- `bun|scripts/project/gate/run.test.ts|Project Gate adapter closure > leaves focused selections outside the total-time budget`
  Proves:

- required / all 的本机 JSON 基线缺失、无效或没有当前 profile/runtime 时，在 candidate preparation 前失败；预算按 profile/runtime 唯一，不同指纹不能区分重复预算。既有合法指纹字段可保留，也可省略；baseline 只读，不从运行学习或自动提高。
- `elapsed-to-initial-result` 包括 candidate preparation、adapter/setup 与 Product Run；等于阈值通过，超过阈值以单条包含阶段和最慢三个 Check 的 error 阻断，不将并行 Check duration 相加成墙钟耗时。无效 timing 或不完整 Run facts 也阻断初步 passed；初步非 passed 不改写已有结论；focused preset 不适用总耗时预算。
- required/all 的声明指纹与本机元数据不一致时，仍正常评估原预算：未超限通过、超限失败，均输出三段 timing，不报缺失基线、不改写预算。adapter 将未超限的诊断写入 transcript、在终端报告 passed 并退出成功；无效 timing 不输出伪测量。
- `definition.ts` 的默认 `resultContributor` 实际调用 observer；adapter 只可将初步 passed 降为 failed，不改写 Product Check facts 或 aggregate。loader seam 仅用于测试，不构成配置入口。

## Case AUX-PARALLEL-RUNNER-001: Static Task engine 保持通用调度契约

Owner: `docs/development/scheduler.md#admission-state-与-real-shell`
Entities:

- `bun|src/project-run/task-scheduler/task-engine.static-validation.test.ts|static task engine > validates static task identity dependency and scope structure before execution`
- `bun|src/project-run/check-execution/plan.test.ts|Check execution plan > projects normalized admission priority into the static task graph`
- `bun|src/project-run/task-scheduler/task-engine.admission.test.ts|static task engine > respects one root budget for dependency order and named mutex execution`
- `bun|src/project-run/task-scheduler/task-engine.admission.test.ts|static task engine > distinguishes full graph identities with identical Task IDs but different scheduler semantics`
- `bun|src/project-run/task-scheduler/task-engine.admission.test.ts|static task engine > records one graph and references its fingerprint from every scheduler decision`
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

- Engine 在任何 executor work 前验证静态 Task identity、`dependsOn` / `observes` union、scope membership、activation/terminal relation、root/scoped cap、named-resource capacities/claims 和 signed admission priority；Check plan 将规范化 claims 与 root capacities 投影到该图。它以一个 root budget 处理 relation readiness、mutex、generic scope cap 与原子 named-resource occupancy。
- Executor failure、executor 返回的 prerequisite-unsatisfied signal，或 Product 在 admission 前已真实形成的 terminal Task result，都只阻断 `dependsOn` dependent Task；pre-admission Task 不会再次 admission，terminal observers 与 unrelated Task 仍可完成。abort 后不再 admission pending Task，已 admitted Task 接收同一 signal 并 drain；engine 的 settlement 是唯一通用 execution accounting，且不读取 Check status、reason 或 data。
- 纯 `SchedulerDecision` 从 immutable scheduler snapshot 与 trigger 选择下一项 generic Task action：每轮依完整图、relation/mutex candidate、root/scoped/named-resource capacity 与 runtime facts 重算 exact `select(taskId)` 或 `wait`；static ordinary selection 不让一个 resource-blocked candidate 排斥其它 admissible work。priority 只来自 Task metadata，不能越过 dependency、mutex、capacity 或 lifecycle hard guard。命令式 shell 记录无状态 decision evidence，再执行 admission、wait/drain、blocked settlement、cancellation 或 completion；它不保存或解释 reservation、sticky、reason、公平或饥饿 state，也不取得 Check owner 身份。
- custom adapter 仅在每次**实际** callback 前交接 detached、ordinary、deep-frozen 的完整 graph 和最小动态 DTO；同一 Run 共享一次冻结 graph，包含 canonical capacities/claims，inspection 只暴露冻结的 resource occupancy。callback 不获得 private Scheduler objects、`Set`/`Map`、priority side input、resource handle 或 Task capability。measurement 只交接已 flush 的 cumulative scalar/peak/discrete facts与 captured-prefix append-only frozen action observation；`measurementCount` 截止旧 context 可读 prefix，synchronous `measurementAt` 不返回 live array 或 per-round slice，且不复制 terminal per-Task measurement table。每条 observation 从 accepted `select`/`wait` 的 post-state 到下一实际 callback 前，记录 state interval 与期间 admitted/settled effects，不归因给 action；interval 以 closed union 区分 available contribution 与 unavailable reason，clock throw/non-finite/backward 时离散 action effects 保留但没有伪造数值。Scheduler 对 malformed/thenable/throw、non-candidate、capacity/lifecycle-invalid select 和 undrainable wait 以有界 admission-policy fault 停止 admission、取消 pending 并 drain running，不 fallback；public Run 直到已 admitted Check settlement 才以专用 `admission-policy-failed` execution result 返回，且不暴露 policy console、checkMessages 或 timing artifact。diagnostic 不泄漏 caller value。

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

- 显式 maintenance lookup 只请求固定的 Lizard GitHub HTTPS release endpoint，禁用 credentials 与 redirects，并以 Lizard `1.24.0` 为 baseline；current release 产生 `no-update`，较高 stable release 只产生 `update-available`，不会修改 repository state。
- HTTP、malformed、oversized、timeout、network 和 caller cancellation 都结算为稳定的 `unavailable` advisory code；它们不伪造“无更新”、不泄漏 transport error，也不形成默认 Gate 的阻断结论。

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

Owner: `docs/tooling/workspace.md#virtual-admission-workbench`
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
- 错误 evidence 保留已经发生的 boundary、virtual time、action-observation 和 trace prefix，并保留可可靠解析的 scenario/profile/policy/candidate identity；正式 policy context 只含 public graph/state、候选、capacity/runtime 与已关闭 action-observation prefix，不暴露 sampled/remaining work、PRNG 或完整 trace。
- static 是版本化的简单合法 baseline；learned prepared adapter 为每个 replicate 复制同一固定 history snapshot 到独占 absolute state directory，记录 projection/model/fallback identity，不调用 `complete`，且 history/setup 或非预期 prediction fallback 使比较失败。
- makespan 与 slot·time、逐 named-resource unit·time 分开；四个调查 proxy profile 保留精确 median 与倍率且不冒充完整 Gate baseline，三档 contention/5.5x 长尾与 claimed-only Gate resource shape 都明确是合成或静态输入，virtual milliseconds 不等于 Gate timing。
- CLI 成功 JSON 只写 stdout 或独占新建的显式文件；输入、已有目标、符号链接与 public graph failure 返回非零结构 evidence。运行 workbench 不调用 Gate entry、真实 Check 或 private Scheduler source。

## Case AUX-ADMISSION-WORKBENCH-SHARED-CLOSURE-001: Public shared closure distinguishes cancellation from virtual settlement

Owner: `docs/tooling/workspace.md#root-commands`
Entities:

- `bun|scripts/project/admission-workbench/shared-closure.test.ts|admission workbench shared closure > drains an admitted real Check while cancellation closes pending work before it starts`
- `bun|scripts/project/admission-workbench/shared-closure.test.ts|admission workbench shared closure > keeps virtual unsatisfied settlement separate from real cancellation`
  Proves:

- The public installed-package Run drains an admitted Check after cancellation while a pending Check never begins: both are unavailable with `execution-cancelled`, the pending duration is null, and the admitted Check has a duration. Separately, public AdmissionGraph `settle(..., "unsatisfied")` blocks `dependsOn`, releases `observes`, and does not introduce a cancellation transition.

## Case AUX-LEARNED-HEURISTIC-REPLAY-001: Dual-artifact replay rejects regressions without hiding boundary failures

Owner: `docs/tooling/workspace.md#learned-admission-heuristic-对照记录`
Entities:

- `bun|scripts/project/admission-workbench/learned-heuristic-evaluation.test.ts|learned heuristic replay rejects a 204 to 300 makespan regression even when its cost guard passes`
- `bun|scripts/project/admission-workbench/learned-heuristic-evaluation.test.ts|learned heuristic replay keeps a sticky fallback failure outside direct prepared decide replay`
  Proves:

- Frozen dual-artifact comparison treats a per-replicate/tail makespan regression as rejection even when the independent 1.25× host-cost guard passes. The bounded timing path calls the raw public prepared `decide` only; public context capture and sticky fallback validation remain outside that interval, and a later fallback invalidates the replay rather than being scored as a candidate benefit.
