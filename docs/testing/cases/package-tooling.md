# package-tooling

## Case AUX-PACKAGE-CANDIDATE-001: Candidate lifecycle admits only verified local package state

Owner: `docs/tooling/package-lifecycle.md#local-candidate-lifecycle`
Entities:

- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation contracts > rejects overlapping package build and cache roots`
- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation contracts > rejects invalid private consumer manifests`
- `bun|scripts/package/candidate/candidate.test.ts|package candidate preparation contracts > keeps the explicit cold integration target outside routine discovery with hard timeout`
- `bun|scripts/package/candidate/receipt.test.ts|rejects malformed and stale receipts before artifact reuse`
- `bun|scripts/package/command.test.ts|package root commands distinguish stale status from a completed rebuild and bind verification to complete --all acceptance`
  Proves:

- Candidate path contract rejects identical or either-direction parent/child build/cache roots and accepts adjacent non-overlapping roots without preparing a candidate. Installation accepts only a valid private consumer manifest. Receipt contracts reject malformed or stale package state before reuse, while root preparation derives the actual build, artifact, installation and resolved entry used by every Project Gate invocation.
- Routine test discovery keeps only fast decision/input contracts. The separately named `package:candidate:integration` target has a 30-second process boundary and exercises physical cold build/install/reuse plus drift/fallback decisions without becoming a second complete package lifecycle inside the Gate. Build-only staging material remains owned by artifact acceptance.
- Root package status is read-only and reports `current` or `stale` separately from the required repair action; after build, its current state is reported separately from the performed preparation action. Root verify delegates to the complete package acceptance owner rather than accepting stale material or inventing another acceptance path.

## Case AUX-PACKAGE-OFFLINE-INSTALLATION-001: 离线安装与显式联网准备保持分离

Owner: `docs/tooling/package-lifecycle.md#严格离线安装与显式缓存准备`
Entities:

- `bun|scripts/package/installation.test.ts|offline installs require prepared cache and isolate files`
- `bun|scripts/package/cache-command.test.ts|explicit package cache command validates arguments before online preparation and propagates failure`
  Proves:

- 冷缓存面对可用 registry 仍明确失败、给出准备命令且发出零请求；显式准备从 release manifest 获取完整传递依赖后，关闭 registry 仍可在两个全新 consumer 中安装同一真实 tarball 并执行其导出。
- 修改首份 consumer 的依赖许可不污染缓存或第二份安装；安装不执行 lifecycle scripts，不修改 consumer manifest 或保存 lock；失败消息不泄漏原始安装材料。
- 显式准备入口先拒绝未知参数再调用准备；合法调用不启动 candidate build 或验收，准备失败不伪装为成功。

## Case AUX-PACKAGE-ARTIFACT-MATERIAL-001: Artifact audit closes the physical package material

Owner: `docs/tooling/package-artifact.md#产物构造与审计`
Entities:

- `bun|scripts/package/artifact/artifact.test.ts|package artifact > packages approved docs and machine materials`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > emits documented public declarations`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > indexes adjacent Chinese JSDoc for each exported declaration`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > emits a readable ESM runtime layout and exact exports`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > rejects missing or malformed private Markdown Link Worker material`
- `bun|scripts/package/artifact/artifact.test.ts|package artifact > packages approved legal materials and excludes analyzer fixtures`
- `bun|scripts/package/artifact/documentation-input.test.ts|Gate acceptance rejects entirely missing documentation input instead of rebuilding expectations`
- `bun|scripts/package/artifact/documentation-input.test.ts|invocation documentation preserves independent source expectations and binds candidate identity`
- `bun|scripts/package/artifact/documentation-input.test.ts|invocation documentation distinguishes direct absence from invalid supplied input`
- `bun|scripts/package/artifact/manifest.test.ts|checked-in release manifest projects only version and rejects static-source or safety drift`
- `bun|scripts/package/artifact/manifest.test.ts|release manifest reader does not leak the caller's repository root`
- `bun|scripts/package/artifact/manifest.test.ts|release manifest bytes invalidate the candidate fingerprint`
- `bun|scripts/package/legal-materials.test.ts|package legal materials > fails closed in the translated-analyzer audit phase order`

  Proves:

- Artifact construction and audit produce one package with the approved single-README documentation inventory, no package or Check index page, public declarations and root exports, readable ESM layout, and the complete audited production dependency requirements. Static manifest approvals are observed directly at source-to-projection/audit; real artifact tests retain legal bytes, file exclusions and the pack/audit path. Assertions on `artifact.files` observe the staging-derived inventory, not a second independent tarball readback.
- 同次 candidate preparation 的 source-derived Markdown、JSDoc 示例与原始机器材料预期通过 invocation-local 文件供 staging/installed docs 验收复用；文件摘要、candidate artifact 路径/摘要、source input fingerprint 与 repository root 必须匹配。缺项、篡改、错误 candidate/root/fingerprint、非法路径或材料形状失败封闭；预期正文不进入 Check data 或 stdout。
- Artifact 与 installed-documentation 调用方共用各自真实选择入口；Gate documentation input 全缺失时在 renderer、artifact audit 或 direct build 之前失败，不以重建预期补偿接线错误。该负向证明不启动 child，真实 artifact/installed documentation 正向验收仍独立保留。
- Every name in the public declaration inventory has an exported declaration with adjacent Chinese JSDoc. Documentation from an earlier declaration, a non-JSDoc comment, an English-only comment or an unclosed comment cannot supply that adjacency.
- The checked-in release manifest is the stable authoring owner; local/formal builds project only its version from an explicit repository root, while source and projection audits remain closed. The projected manifest uses the user-scoped `@zxyycom/vibe-check` identity and carries the fixed general-purpose quality-gate discovery description and keywords, the complete `MIT AND Apache-2.0 AND BSD-2-Clause` expression, Vibe Check's exact MIT text and `zxyycom` notice, minimum Node engine `>=24.18` without an unverified upper bound, canonical GitHub repository, explicit public npm registry/access, and no `private`, `bin`, lifecycle scripts, Bun engine, or subpath export.
- The byte-level allowlist carries `docs/output.md`, both current v4 schemas, the single definition-backed `mixed-outcomes` artifact set, upstream Lizard/Pygments license and provenance material, and both non-public emitted function-metrics/Markdown Link Workers. It has one `licenses` material root with no parallel `third-party-licenses`, excludes historical or analyzer fixture material, and does not publish a root `THIRD_PARTY_NOTICES.md`.
- Markdown Link Worker 缺失、parent URL 越界或重复会使 runtime layout 审计失败；负向矩阵在最小独立 source/map/Worker/tree 与 tarball fixture 上经过生产审计入口，不临时破坏真实候选。真实 staging 正向和 installed private Worker material 逐字节匹配 exact tarball 的验收仍保留，不能用 fixture/source 成功替代。
- The scoped `licenses/analyzer-translations-NOTICE.md` is copied from its repository source rather than generated from fixed narrative phrases. Material acceptance compares actual source/staging/tar/installed notice bytes while preserving the independent provenance and three upstream-license identity pins.
- The direct legal-material audit exposes the first reachable material-identity, missing-attribution, inventory, translated-target/header, untracked-header or deferred-body error. It does not require hand-written attribution to restate internal extension counts or installation-audit procedures.
- A synthetic repository independently enumerates the exact fixed/source/package-script/documentation/legal input classes; the real fingerprint collector and hash bind each input's bytes and toolchain identity. Fixture copies rediscover newly added source paths under otherwise scratch-like basenames while excluding non-input maintenance directories, retain the source fingerprint and isolate subsequent writes; no complete checkout copy is needed for these input variants.

## Case AUX-PACKAGE-COMPILER-CACHE-001: Candidate compiler intermediates cannot bypass exact artifact audit

Owner: `docs/tooling/package-lifecycle.md#local-candidate-lifecycle`
Entities:

- `bun|scripts/package/artifact/compiler-cache.test.ts|candidate compiler cache reuses docs-only emit and rejects changed or corrupt inputs`
  Proves:

- Unchanged Product compiler inputs reuse verified local raw emit when only documentation changes. A changed source graph may retain incremental compiler state, but corrupt cached output/build info, a changed source-file set, dependency lock, compiler resolver, dependency patch bytes or toolchain identity forces a cold emit. The branch matrix substitutes compiler emit and toolchain identity only, retaining real input/output hashing, state decisions and staging copies; installed toolchain qualification remains its own Case. This cache is not the package staging, tarball, installed candidate or a replacement for their full audits.

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

- Formal preparation accepts only a positive canonical `0.0.x` and an explicit conservative tag, requires the exact repository root and clean `HEAD`, and rejects tracked unstaged changes, staged-only changes and untracked files. Release staging/receipt/compiler state remains distinct from the fingerprint local candidate while sharing only the versioned artifact root.
- The versioned receipt uses repository-relative canonical paths, records the scoped package identity, and binds commit, input fingerprint, ordered inventory, SHA-256, SHA-512 SRI, manifest/README identities and the complete third-party legal-material inventory, version, and tag. The scoped translation notice digest comes from actual staged bytes; fixed upstream license and provenance identities remain independently pinned. Its writer rejects a foreign receipt path or mismatched artifact SHA-256 before replacing the owned receipt; its closed grammar and verifier reject extra consumer identity, path escape, duplicated inventory, contract drift, and changed artifact bytes without storing credential material.
- The root command grammar requires complete named inputs: prepare forwards one explicit version/tag and reports the receipted artifact identity, while verify constructs one complete `--all --release-receipt` Project Gate invocation for the explicit receipt and preserves its returned exit status. Missing or duplicated inputs fail instead of selecting an implicit version, tag, or receipt.

## Case AUX-PACKAGE-ESM-NORMALIZATION-001: Artifact-relative ESM references remain resolvable

Owner: `docs/tooling/package-artifact.md#产物构造与审计`
Entities:

- `bun|scripts/package/artifact/esm-module-specifiers.test.ts|emitted ESM module specifiers > rewrites relative module references without changing ordinary path strings`
- `bun|scripts/package/artifact/esm-module-specifiers.test.ts|emitted ESM module specifiers > rejects malformed emitted JavaScript before artifact normalization`
- `bun|scripts/package/artifact/esm-module-specifiers.test.ts|emitted ESM module specifiers > normalizes only the exact private Markdown Link Worker URL and rejects shape drift`
  Proves:

- Artifact normalization rewrites every emitted relative ESM import form to a resolvable `.mjs` target without changing ordinary path strings. It additionally rewrites each owner’s exact Worker source URL (`function-metrics/analyzer-worker-port` and `markdown-link-validation/io-session`) exactly once, preserves ordinary URL strings, rejects zero/multiple or malformed compiler-shape matches, and rejects malformed emitted JavaScript before producing trusted output.

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
- Importing candidate acceptance input, or resolving valid/invalid explicit Gate input, does not load local preparation. Only an absent Gate input loads that direct-target fallback and returns its prepared artifact.

## Case AUX-PACKAGE-EXTERNAL-CONSUMER-001: An external consumer runs the installed candidate without ancestry fallback

Owner: `docs/tooling/project-gate.md#prepared-candidate-data`
Entities:

- `bun|scripts/package/candidate/external-consumer/runtime.test.ts|external consumer runtime acceptance`
  Proves:

- The ancestry-external runtime rejects a missing or relative `VIBE_CHECK_NODE_CMD` instead of falling back to ambient Node. With the accepted absolute mise-locked Node 24.18.0 binding, it runs the installed entry, records the observed Node version and null Bun version, and resolves declared candidate tooling rather than repository or ancestor dependencies. The version-boundary checks are host validation, not evidence that every eligible Node version executed this fixture.
- The installed candidate resolves jscpd's manifest, bin, and actual engine version consistently. Its duplicate fixture sources produce one trusted non-blocking `duplicate-detection` Record with passed final data; installed `functionMetrics` executes the shipped Node Worker against the Rust match CCN-3 fixture with its real arm contributors and returns its trusted non-blocking Record. The Run imports all eight final-data parsers and exercises both named and Check-attached parser paths.
- installed Node Markdown Link 的成功与取消 Runs 各启动自己的真实包内 `.mjs` Worker；成功形成 passed final data，取消不发布普通 Records，两者均在 exit code 0 已被观察后返回。
- Separate installed Checks execute equivalent nested builder and raw string-leaf AST conditions. This proves both package-root builder imports and the serializable final AST at runtime. The same Run proves an `observes` consumer can read a failed provider, a `dependsOn` consumer receives passed typed data, and a failed prerequisite produces `dependency-not-passed` with null duration without calling its dependent callback.
- Two installed Runs import `createLearnedCriticalPathStrategy` through the public prepared-strategy hook, create then reload caller-owned local history with an explicit identity projection, and keep private inputs out of digest-only state. Public RunResult and machine output do not gain scheduler-history or prediction fields.
- A command Check imported from the installed root composes an enabled, resource-budgeted executable with an ordinary prerequisite and nested child. It preserves zero and nonzero numeric exits as passed/failed final data, maps bounded child output to `command-output-limit-exceeded`, and lets Core settle an admitted long-running command as `execution-cancelled`.
- The installed command transcript is created only through its explicit artifact branch, retains raw child stdout/stderr, and omits executable, argument and environment definition material. Default discard execution keeps executable, argument, environment and child-output canaries out of Run facts and machine publication, including a startup-failure branch.
- Installed Node Markdown lint produces a real cold-cache Finding and applies a waiver using identity copied from its public Record data. Applied evidence preserves the original ID and fields, adds only the waiver reason and emits no error; three-field final data remains parseable, and published `records.ndjson` matches snapshot Records.
- A fresh installed dependency graph, without the repository's micromark override, reports one blocking `reference-links-images` Finding for an undefined full reference; the dependency upgrade cannot silently disable MD052 while ordinary ATX lint still works.
- Installed Node imports `reconcileFindingWaivers` from the public package root and performs a normal call with omitted waivers, keeping the original Finding reference actionable and returning empty audits. Default-value and invalid-input matrices are proved by the direct reconciliation tests.

## Case AUX-PACKAGE-API-DOCUMENTATION-001: Package API documentation projections stay executable and exact

Owner: `docs/tooling/documentation.md#documentation-validation-and-package-material`
Entities:

- `bun|scripts/docs/package-api/command.test.ts|package API documentation CLI > writes expected projections and detects stale output through --check`
- `bun|scripts/docs/package-api/render.test.ts|package API documentation renderer > projects every registry source region to its declared Markdown fence and JSDoc target without changing payload bytes`
- `bun|scripts/docs/package-api/render.test.ts|package API documentation renderer > replaces generated JSDoc tails and rejects malformed source or Markdown example targets`
  Proves:

- The renderer projects each allowlisted TypeScript payload byte-for-byte into the unique TypeScript fence under its declared natural heading path, or into a source JSDoc target. Its explicit published API-document registry keeps README as the sole entry, directly links each registered deeper guide from that entry, and closes those guides without treating arbitrary Markdown as package material. Published Markdown keeps headings, surrounding prose and ordinary links without projection comments; many disjoint targets preserve all surrounding bytes, and a payload's longest backtick run determines a safe enclosing fence.
- The `project-changes` runtime example is registered against the Git change selection guide and demonstrates one Git revision/region, its `changeFlag("source")` protected condition, the callback-visible effective flag set, file-centric successful evidence, and honest unavailable fallback; it does not require the documentation consumer itself to be a Git repository in order to execute.
- The Gate-building guide owns ten independently projected runtime regions, including separate text and JSON diagnostic adapters; its managed payloads exclude acceptance setup and assertions, and do not combine the scenarios into one Definition.
- The registry and renderer reject duplicate source/region/target identities, unsafe JSDoc tails, malformed heading paths, missing or duplicate heading targets, ambiguous or unclosed example fences, and package example projection markers. Heading paths follow authored ancestry even when heading levels skip; removing a JSDoc target clears its obsolete managed tail.
- Write mode updates only projected Markdown fences and JSDoc tails. Check mode writes nothing and fails when a checked-in projection is stale.

## Case AUX-PACKAGE-DOCUMENT-MAPPING-001: Package document mappings bind source and published paths

Owner: `docs/tooling/documentation.md#documentation-validation-and-package-material`
Entities:

- `bun|scripts/docs/package-documents.test.ts|package document mappings > reads the calling repository mapping and applies distinct source and package paths`
- `bun|scripts/docs/package-documents.test.ts|package document mappings > rejects unknown fields, unsafe paths, and conflicting package targets`
  Proves:

- Repository-local JSON maps Markdown, Check guide and machine-material sources to package paths. Distinct source and destination paths remain intact through rendering, raw machine-byte collection and package-local Markdown link validation, including a relocated machine schema.
- The loader rejects unknown fields, non-canonical or out-of-scope source/package paths, duplicate targets and file/ancestor target conflicts with the corresponding diagnostic. Both ancestor insertion orders reject the first conflicting input, while sibling paths sharing only a textual prefix remain legal.

## Case AUX-PACKAGE-API-EXTERNAL-EXECUTION-001: Installed package documentation remains exact and executable

Owner: `docs/tooling/repository-material-validation.md#随包材料验收`
Entities:

- `bun|scripts/package/candidate/external-consumer/documentation.test.ts|external consumer docs acceptance`
- `bun|scripts/package/candidate/external-consumer/documentation.test.ts|external consumer documentation fixture carries its registered acceptance support`
  Proves:

- The ancestry-external installation carries the exact checked-in published-path README, every explicitly registered API guide, hand-written Check guides, machine output guide, current v4 schemas, and the mixed-outcomes Definition/output example. One consumer-owned, mise-locked Node runner executes every projected runtime example in deterministic order and then the installed Definition against that exact candidate, retaining source identity on import failure. The change-flags example is deliberately executable in this non-repository consumer: unavailable Git evidence conservatively injects its declared token into the same effective `project.flags` set that selects its Check, while keeping the files branch discriminable. The Definition runs the documented package-provided and custom `observes` workflow, publishes its configured machine output, and forms the documented four outcome states, three RunResult messages and two Records.
- The independent Gate-building sources assert caller exit handling, ordinary command pass/fail/timeout, one shared preparation with independent consumer outcomes, success dependency blocking versus terminal observation, and preset selection. A source-owned temporary Git repository verifies configuration, schema, excluded scratch, deleted link target and shared-entry changes, plus zero-match, force and unavailable-evidence selection. Gzip acceptance distinguishes cold computation from warm reuse and applies a stricter current threshold to the cached measurement; resource acceptance observes two runner claims overlapping with unclaimed metadata. Both diagnostic adapters map valid tool output to the same bounded Record fields, discard private fields, and retain failure while rejecting an entire mixed valid/unsupported or outside-path group without publishing its first item.
- The isolated documentation fixture carries the exact registered acceptance-support bytes at their source-relative import paths. Support code shares Run-reading and diagnostic acceptance assertions only; it is neither an additional runtime entry nor published teaching material.

## Case AUX-PACKAGE-CHECK-GUIDES-001: Package Check guides close the package-provided ordinary Check inventory

Owner: `docs/tooling/documentation.md#documentation-validation-and-package-material`
Entities:

- `bun|scripts/docs/package-markdown.test.ts|package Markdown > closes fixture documentation inventory and rejects missing links or extra guide pages`
- `bun|scripts/docs/package-markdown.test.ts|package Markdown > rejects package documentation without exactly one trailing LF`
- `bun|scripts/docs/package-markdown.test.ts|package Markdown > rejects package example projection markers in hand-written and machine Markdown`
  Proves:

- 独立 fixture 的文档 collector 证明 registry、README 直链、changelog bytes 与 guide 集合的闭合；实际仓库材料由 candidate source audit 与真实 artifact/installed 验收负责，不在 collector 自测重跑一轮真仓库正向。
- Package documentation has exactly one README-linked guide for every package-provided Check function and a direct machine-output guide link. The README and exact guide directory cannot omit a direct link, publish an unregistered extra page, or restore a Check index layer.
- The collector accepts rendered Markdown input with canonical LF text and one trailing LF. Hand-written Check guides and machine Markdown reject both opening and closing package example projection markers before package construction; renderer execution and its marker checks are proved separately.
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
