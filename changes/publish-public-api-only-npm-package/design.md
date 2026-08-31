# Design

本设计把正式 npm release 表达为一条单向、digest-bound 状态链；未来执行者必须先恢复当前 owner 和 receipt，再按授权 checkpoint 推进，不能把本地验证、registry 状态与外部写入合并成一步。

## Context

### AI consumption contract

本 Plan 面向恢复并实施 npm release 的后续 agent。它实际获得的权威输入是本 Change、所链接的 current docs/Decisions、当前源码/tests、`release-evidence.md` 和当次生成的 release receipt；归档 Change、旧 Gate log、旧 tarball 或口头状态都不能替代这些输入。预期操作是补齐 release tooling/materials、形成并验证一个 formal tarball、在每个外部 checkpoint 前请求授权、发布该 exact tarball 并完成 registry consumer acceptance。可观察出口是 proposal 的全部 Success Criteria 与 `tasks.md` 状态均有直接证据。

恢复执行时按以下顺序取证，后一步不能反向替代前一步：

1. 先读 `.change-plan.json` 和 `tasks.md`，恢复 lifecycle、已完成任务、下一 checkpoint 与当前授权边界。
2. 对 `tasks.md` 声称已完成的 registry、artifact、Gate 或 publish 步骤，再读 `release-evidence.md`；对应 evidence 缺失时，把该步骤视为尚未证明。
3. 再按 `Affected Owners` 读取 current owner、源码和测试，确认 Plan 中的实现描述仍与当前工作树一致。
4. 只有 `build/releases/zxyycom-vibe-check-<version>.release.json` 存在时，才按当前 release verifier 重验 receipt；文件名、旧日志或任务勾选不能证明 formal artifact 仍有效。

### Authority and evidence layers

| Layer | Owner | It proves | It does not prove |
| --- | --- | --- | --- |
| 当前产品与 package 事实 | `src/index.ts`、`scripts/package/**`、`README.md`、tests、当次 build | public entry、artifact bytes、declarations/docs、local install 与当前实现 | registry authority、版本可用性、publish 权限或 registry bytes |
| 长期方向 | active Decision records | package identity、MIT、Bun-only、`0.0.x`、API-only、full-Gate/repository-quality 要求 | 当前实现已对齐、任务完成或外部授权 |
| 本次范围与流程规则 | `proposal.md` 与本设计 | release 的 Outcome、范围、owner、状态链、授权规则和验收结构 | 当前任务进度、当次 registry/artifact 事实或外部授权 |
| 当前进度与恢复动作 | `.change-plan.json` 与 `tasks.md` | lifecycle、已完成任务、下一 checkpoint 和当前授权边界 | 任务所引用的 artifact、Gate、registry 或 publish 结果本身 |
| 当次 release evidence | `release-evidence.md`、formal receipt、same-artifact Gate result 与 authorized registry result | 对应时点的 selection、artifact identity/digest、Gate、registry 与 consumer 结果 | 后续时点状态、其它版本、credential 或未明确取得的授权 |

### Terms used by this Plan

| Term | Exact meaning in this Change | It never implies |
| --- | --- | --- |
| `local candidate` | 默认 package lifecycle 生成的 `0.0.0-local.<fingerprint>` staging、tarball 与安装结果 | 正式版本、registry 可用性或发布授权 |
| `formal artifact` / `formal tarball` | explicit `0.0.<patch>`、由 formal preparation 从 clean commit 新建的同一个 `.tgz` | 把 local candidate 改名、重新打包目录或尚未 receipted 的 bytes |
| `release receipt` | closed JSON，绑定 source、version/tag、owned paths、inventory 与两种 digest，并可由 current verifier 重验 | Gate 已通过、npm 已发布或 registry bytes 一致 |
| `same-artifact full Gate` | full Project Gate 显式消费该 release receipt 指向的 tarball，不调用 local preparer | publish、post-publish install 或任何外部授权 |
| `registry preflight` | 获单独只读授权后，对 publisher/name/version/tag/mechanism 的当次核验 | credential 读取、配置写入、publish 或永久版本可用性 |
| `release evidence` | receipt、同一 artifact 的 Gate 结果和脱敏外部结果之间的可追溯记录 | token、OTP、`.npmrc`、临时 consumer identity 或仅凭日志路径得出的结论 |

2026-08-31 的 Plan baseline 位于 Git commit `7615379e3468dd96b7923dfbe9b60b777845c2b2`：`package:status` 报告 current local candidate `0.0.0-local.6caf6d959ed1`；其 manifest 只有 local version、root export、file allowlist 与 dependencies，没有 Vibe Check own `LICENSE`、`license`、Bun engine、repository 或 publish configuration。该快照只解释本 Plan 的起点，实施前必须按当前 HEAD 复核。

直接约束本 Plan 的 aligned directions 包括 [`require-complete-project-gate-evidence-before-public-release`](../../docs/decisions/require-complete-project-gate-evidence-before-public-release.md)、[`keep-first-release-check-set-to-four-without-markdown-structure`](../../docs/decisions/keep-first-release-check-set-to-four-without-markdown-structure.md)、[`use-programmatic-api-as-product-entry`](../../docs/decisions/use-programmatic-api-as-product-entry.md)、[`make-package-build-evidence-discoverable`](../../docs/decisions/make-package-build-evidence-discoverable.md) 与 [`publish-readable-esm-package-layout`](../../docs/decisions/publish-readable-esm-package-layout.md)。本 Plan 同时实施 active/unaligned 的 npm unit、user-scoped identity、MIT、Bun host、`0.0.x` 和 repository-quality directions；[`publish-user-scoped-vibe-check-publicly`](../../docs/decisions/publish-user-scoped-vibe-check-publicly.md) 已替代被 npm 拒绝的 unscoped direction。Unaligned 是待当前事实完整落地的方向，不是未确认建议，也不产生实施或发布授权。

### Release state chain

```text
local release tooling + verified legal/host inputs
  -> authorized registry/auth preflight
  -> freeze exact version + tag + publish mechanism
  -> build and receipt one formal tarball from a clean commit
  -> full Project Gate consumes that same tarball
  -> final authorization names the exact tarball and digest
  -> npm publishes that tarball once
  -> authorized registry metadata + npm exact-version install + Bun runtime acceptance
  -> synchronize current owners, Decision alignment and Change evidence
```

Any byte-affecting change before publish returns to “build and receipt”; any ambiguous publish result returns to an authorized exact-version registry read, never directly to retry. A successful publish followed by failed acceptance is a release incident, not permission to unpublish, deprecate, retag or publish a replacement.

### Authorization checkpoints

| Checkpoint | Allowed only after | Exact scope to record |
| --- | --- | --- |
| Local edits, tests, build and Gate | implementation is explicitly requested | repository/commit, formal version input and local output paths; no registry or credential access |
| Registry/authentication preflight | fresh user authorization for reads | registry, package name, publisher identity check, candidate version set, tag and publish mechanism |
| Trusted Publishing/staged-publish/access configuration | separate external-write authorization | account/package, provider/workflow or stage, access change and recovery path |
| Publish | fresh authorization after same-artifact full Gate | registry, public access, exact version, tag, absolute tarball path, SHA-256/SHA-512, mechanism and any provenance mode |
| Post-publication metadata/install | fresh authorization after publish result is known | exact version, registry metadata fields, temporary consumer and acceptance commands |

当前已完成步骤、下一 checkpoint 和实际授权范围只由 [`tasks.md`](tasks.md#current-checkpoint) 承接；[`release-evidence.md`](release-evidence.md#reading-contract) 只记录对应操作的脱敏结果。执行者不得从本设计的 checkpoint 规则、历史授权或工具可访问性推断当前仍有外部操作权限。

## Goals / Non-Goals

**Goals**

- Establish one formal `@zxyycom/vibe-check@0.0.<patch>` artifact identity from source inputs through full Gate, npm publication and registry consumer acceptance.
- Make legal, Bun host, dependency, public inventory, documentation, repository-quality and authorization requirements explicit and independently checkable.
- Keep external writes narrow, reviewable and recoverable without exposing credentials or using implicit npm defaults.
- Leave enough owner paths, task outputs and failure rules for a future agent to implement the release without consulting archived Changes.

**Non-Goals**

- Change Check/Run/Core semantics, expand the four first-release Check set, or implement any active post-release direction.
- Add a Product CLI/`bin`, Node.js or dual-runtime support, CJS/browser build, plugin API, subpath export or compatibility alias.
- Publish the root workspace, turn the root `package.json` into the public manifest, or maintain a hand-written second runtime/declaration tree.
- Query current `@zxyycom/vibe-check` registry state without fresh authorization, inspect credentials, configure Trusted Publishing/staged publishing, publish, install from registry, create a GitHub release or modify dist-tags/access during Plan formation.
- Treat npm provenance as mandatory when the selected authorized mechanism cannot produce it; artifact digests and registry integrity remain mandatory in every mode.

## Decisions

### Intended Change

#### 1. Build a formal artifact; never transform an accepted local candidate

The existing fingerprint version remains the default development candidate. Formal preparation accepts an explicit positive canonical `0.0.<patch>` only after registry preflight, feeds that version into the same authoritative artifact builder, and emits isolated `build/release-package/` staging, `build/artifacts/zxyycom-vibe-check-<version>.tgz` and `build/releases/zxyycom-vibe-check-<version>.release.json`. The filesystem-safe `zxyycom-vibe-check` stem is the Bun pack filename for manifest name `@zxyycom/vibe-check`; it is not another package identity. Preparation does not rename, edit or repack `0.0.0-local.*`, overwrite `build/package/`, or share local receipt/compiler state. Changing package name, version, README, legal text, manifest, dependencies, source, docs or toolchain invalidates the receipt and requires a new build and full Gate.

The root workspace manifest remains `private: true` and Node-oriented for repository tooling. Formal publication only accepts the absolute path of the receipted `.tgz`; `npm publish .`, a workspace, `build/package/`, a registry package spec or an unreceipted tarball is invalid.

#### 2. Give local preparation and same-artifact verification explicit owners

`scripts/package/release/**` owns formal version/tag validation, clean-source checks, release receipt parsing/writing and non-network preparation. Root commands `package:release:prepare` and `package:release:verify` expose local preparation and verification but contain no publish action. `scripts/package/artifact/**` continues to own the shared bytes; `scripts/package/candidate/**` continues to own the default local candidate/install lifecycle.

Release verification passes closed receipt data into `scripts/project/gate/run.ts`; the Gate revalidates path containment, version, input fingerprint, inventory and digests before using the artifact. The release mode must not invoke default local candidate preparation and then claim equivalence. The normal `package:build`, `package:verify` and default Project Gate behavior remain unchanged for development.

#### 3. Complete the manifest, legal and host contract before version freeze

The generated formal manifest owns, and packed audits enforce, at least:

- user-scoped name `@zxyycom/vibe-check`, selected `0.0.<patch>`, ESM type, one root export, approved files and complete production dependencies;
- SPDX `MIT`, a packed own `LICENSE` with the user-verified `Copyright (c) 2026 zxyycom` notice, and continued exact audit of any third-party text copied into the artifact;
- `engines.bun: ">=1.3.14"`, whose lower bound matches the pinned Bun used by current local consumer acceptance, plus README platform/prerequisite wording that does not imply Node.js support; the same version must still pass formal consumer and post-registry acceptance;
- canonical `git+https://github.com/zxyycom/vibe-check.git` repository metadata and explicit `https://registry.npmjs.org/` / `public` publish configuration for the authorized target;
- no `private`, `bin`, lifecycle publish script, CJS/browser entry or subpath export.

The dependency/license review covers direct requirements, resolved versions/ranges, licenses and install/runtime prerequisites. Dependencies installed separately keep their own legal materials; only bytes copied into `@zxyycom/vibe-check` are part of this tarball's file allowlist.

#### 4. Bind all local evidence to one closed receipt

The release receipt records schema version, clean Git commit, package input fingerprint, exact version/tag, repository-relative artifact path, ordered file inventory, SHA-256 and SRI-compatible SHA-512, and the manifest/legal/documentation identities required to re-audit the tarball. It contains no token, OTP, `.npmrc` content, raw credential, publisher secret or temporary consumer path as a durable identity.

Full Gate re-audits the receipt and artifact, then its invocation ID/result and repository-quality disposition enter a separate non-secret `release-evidence.md` attached to this Change. A Gate log path alone is not portable evidence, and a receipt alone does not prove Gate success.

#### 5. Use an explicit, approval-matched npm publish protocol

After authorized preflight, select the unique unused increasing `0.0.<patch>`, explicit tag (normally `latest`, but never inferred), public access and authentication mechanism. Immediately before publish, revalidate the approved tarball digest and version absence within the authorized scope. The direct-publish form is conceptually:

```text
npm publish <absolute-receipted-tarball> \
  --registry=https://registry.npmjs.org/ \
  --access=public \
  --tag=<authorized-tag>
```

Actual flags must match the installed npm CLI and final authorization. Trusted Publishing, staged publish, 2FA/OTP and provenance are mechanism variants, not assumptions: configuring them is a separate external write. Credential material stays in the operator/npm authentication boundary and is never echoed or stored in repository evidence.

For the current first release only, the mechanism decision is local direct publish with interactive 2FA. [`release-evidence.md`](release-evidence.md#current-scoped-selection) owns the exact package/version/tag/access selection and the time-scoped registry/account observations that support it. Trusted Publishing and staged publish are not part of this release mechanism, and the mechanism is not a default for later releases.

If version availability changes or the publish response is ambiguous, stop. First obtain authorization to read the exact registry version; only an absent version may return to version selection and a complete rebuild/reverification. A published name/version is never reused, including after unpublish.

#### 6. Treat registry installation as the final product proof

After publish and new read/install authorization, compare `dist.integrity` with the local SHA-512 receipt and verify exact name/version/tag/access. If provenance was intentionally produced, verify its repository/source-commit binding; otherwise record “not produced” rather than infer it.

Create an ancestry-external temporary consumer and explicitly run `npm install @zxyycom/vibe-check@<exact-version>` against the authorized registry, then run the same separate types, documentation and Bun runtime acceptance categories used for the local artifact. This release-verification command deliberately pins the selected artifact even though the consumer README recommends the conventional unversioned install command. npm is the registry installer; Bun remains the supported product host. No local tarball, workspace link, ancestor `node_modules` or cache fallback may satisfy this check. Always clean the temporary consumer; preserve only sanitized evidence.

#### 7. Synchronize facts only after their evidence exists

Before the artifact build, README/package docs may adopt consumer-facing installation guidance so those bytes enter Gate. The README recommends the conventional `npm install @zxyycom/vibe-check` command and does not carry time-scoped preflight, Gate or publication status; those facts stay in release evidence and delivery owners. After registry acceptance, current delivery navigation and release notes record the exact public version and evidence boundary.

Only then review the npm unit/name/MIT/Bun/`0.0.x`/release-quality Decisions for alignment. Change completion does not automatically align them, and Plan completion does not authorize archive.

### Resulting Impacts

- Package tooling gains one formal-release variant but retains one authoritative artifact builder, public inventory, documentation projection and audit surface; local candidate and formal release identities cannot share a receipt or be treated as interchangeable.
- Root scripts, Gate input validation, package tests and Test Evidence must prove the distinction between default local preparation and explicit formal receipt consumption, including rejection of drifted version/path/digest/inventory.
- README/legal/manifest changes invalidate the current local fingerprint and require a fresh formal tarball; full Gate must run after the last byte-affecting edit and before publish authorization.
- Repository-quality Checks may remain non-blocking for development, but release evidence must enumerate their current Records/final data and show every known finding is fixed or covered by a separately authorized, Decision-backed disposition.
- External operations produce time-scoped facts. Evidence records commands, timestamps, registry/name/version/tag/access, non-secret identity, digest and outcome, but never converts a one-time registry result into a permanent availability or authorization claim.

## Risks / Trade-offs

- **Irreversible public identity:** explicit version/tag/access and no-blind-retry rules add steps but prevent publishing or overwriting the wrong unit.
- **Artifact drift:** package identity、consumer-facing README/legal bytes and the selected manifest version are formal inputs, so registry preflight precedes the final build; a race can still consume the version, in which case the complete build/Gate cycle repeats for a new version.
- **Scoped consumer specifier:** consumers must install and import the complete `@zxyycom/vibe-check` name. This is more explicit than the rejected unscoped name and avoids global-name similarity conflicts, while leaving the product display name and repository unchanged.
- **Credential exposure:** manual/CI authentication is outside repository state. This limits automation but prevents the Plan or evidence from becoming a credential owner.
- **First-release provenance:** The selected local direct mechanism does not produce OIDC provenance. This release instead requires receipt digests and registry integrity; configuring Trusted Publishing after the package exists is a separately authorized follow-up, not an implicit part of `0.0.1`.
- **Host compatibility:** declaring the lowest directly tested Bun version is narrower than assuming all future Bun versions, but it keeps the promise evidence-based and leaves broader compatibility to later releases.
- **Post-publish failure:** registry acceptance can expose a defect after an irreversible write. The workflow stops and reports an incident; it never silently unpublishes, retags or publishes a replacement.

## Open Questions

无设计开放问题。Copyright holder/year、repository metadata、scoped identity 与拟验证的 Bun lower bound 已由当前方向闭合；formal consumer acceptance 仍须证明该 Bun bound。尚未完成的当次 selection、preflight、formal artifact、Gate 与授权状态不属于设计问题，统一从 [`tasks.md`](tasks.md#current-checkpoint) 和 [`release-evidence.md`](release-evidence.md#reading-contract) 恢复。

## External Reference Boundary

- npm publish 的 tarball input、explicit tag/access、name/version non-reuse 与 registry integrity 行为，以执行时安装版本对应的 [npm publish 官方文档](https://docs.npmjs.com/cli/v11/commands/npm-publish/)重新核对。
- Trusted Publishing、staged publish 与 automatic provenance 只在实际选择该 mechanism 时，按 [npm Trusted Publishing 官方文档](https://docs.npmjs.com/trusted-publishers/)重新核对并另行授权；外部文档不替代本仓库的 artifact 与 approval contract。
