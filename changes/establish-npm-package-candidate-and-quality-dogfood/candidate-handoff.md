# Candidate handoff

This handoff records local candidate evidence from the active Change worktree. It proves a Bun-only local package
closure; it is not release, registry, or legal-completeness evidence.

## Accepted artifact

| Fact | Measured value |
| --- | --- |
| Candidate version | `0.0.0-local.5501632dd93c` |
| Artifact | `/workspace/vibe-check/.cache/vibe-check/package-candidate/artifacts/vibe-check-0.0.0-local.5501632dd93c.tgz` |
| SHA-256 | `6c32793c8919f833aeeead0b20062353369654d12bab56952429d287d5512972` |
| Input fingerprint | `5501632dd93c7b25fc389781b104013b8d4c465be43aeb4f1ed57e3c1dbee358` |
| Repository HEAD observed | `01cf9bfda543d6764d904306533e7ad2cd5284a4` |
| Bun | `1.3.14` at `/home/dev/.local/share/mise/installs/bun/latest/bin/bun` |
| Host | `linux/x64` (Bun Node-compatibility version `v24.3.0`) |

The artifact was built from the active Change worktree at that HEAD; its implementation files were uncommitted. The
receipt resolved the repository consumer entry to
`/workspace/vibe-check/scripts/quality/node_modules/vibe-check/index.mjs` (entry SHA-256
`79bb7fc31b5436e22cd1d99e2e77d8e0d49791da2917bb7c3d891ca3cc67fbec`).

## Package inventory and audit

`mise exec -- bun scripts/package-candidate/prepare.ts` builds derived staging, emits declarations, invokes
`bun pm pack`, audits the tarball, and installs that exact tarball into the private repository consumer.

The accepted manifest has only the root `import` and `types` exports, no `bin`, and these exact direct production
dependencies:

- `jscpd@5.0.11`
- `neverthrow@8.2.0`
- `typebox@1.3.9`

The audited runtime inventory, derived from the current public-contract owner, is exactly `defineCheck`,
`defineConfig`, `inherit`, `run`, `duplicateDetection`, `fileMetrics`, and `functionMetrics`. The declaration root
exports these named type roots: `Check`, `CheckExecution`, `CheckExecutionContext`, `CheckOutcome`, `CheckResult`,
`CheckUnavailableReason`, `DecisionPolicy`, `DuplicateDetectionOptions`, `FileMetricsOptions`,
`FunctionMetricsOptions`, `InheritableCheckCollection`, `ProjectEffects`, `ProjectDefinition`,
`ProjectQualityConfiguration`, `QualityRecordCandidate`, `RecordTypeDefinition`, `RunControls`, `RunResult`, and
`SchedulerPolicy`.

The accepted tarball contains 143 files: `package/package.json`, `package/index.mjs`, and 141 generated `.d.ts` files
beneath `package/types/`. The audit requires the tar listing to match staged inventory exactly, rejects materials
outside those runtime/declaration paths, rejects a wildcard public declaration export, and checks manifest identity,
root exports, direct dependencies, and artifact digest. The declaration closure contains internal relative declaration
files only to satisfy public type references; the manifest exposes no internal or wildcard subpath.

## Repository consumer evidence

From `/workspace/vibe-check`, direct scripts typecheck was run after removing only the candidate state directory and
private consumer install:

```text
mise exec -- bun scripts/development/typecheck.ts scripts
```

It exited 0 and automatically prepared `0.0.0-local.5501632dd93c` without a manual pre-step. A direct unchanged
preparation then reported `reused`; the target Project Run test, test-evidence check, `bun run quality`, and workspace
verifier consume the same preparation owner. The
repository consumer resolved `jscpd@5.0.11` at
`/workspace/vibe-check/scripts/quality/node_modules/jscpd/package.json`; its declared bin resolves to
`/workspace/vibe-check/scripts/quality/node_modules/jscpd/run-jscpd.js`.

The focused lifecycle and isolated acceptance tests prove build, matching reuse, corrupt-receipt rebuild, missing-
`jscpd` repair, and an external consumer from current source. Preparation resolves `jscpd/package.json` from the
installed candidate and rejects a receipt unless that dependency, its exact version, and its declared existing bin
remain inside the private consumer install. On a mismatch it verifies `package.json.private === true`, replaces that
dedicated consumer's `node_modules`, and installs again so an ancestor dependency cannot satisfy the closure. The
preparation-failure test covers the remaining no-fallback path.

## Isolated consumer evidence

```text
bun test scripts/package-candidate/isolated-consumer.test.ts
```

This exited 0. The test creates its consumer with `mkdtempSync(join(tmpdir(),
"vibe-check-isolated-consumer-"))`, uses that temporary directory as the explicit cwd for every child process, and
removes it in `finally`:

```text
bun install --no-save --ignore-scripts <accepted-artifact-path>
bun /workspace/vibe-check/node_modules/@typescript/native-preview/bin/tsgo.js --project tsconfig.json
bun run-fixture.mjs <temporary-consumer-directory>
```

The first command installs the exact accepted tarball outside the repository. The typecheck imports every approved
runtime operation, ordinary Check value, and named type root. The fixture writes two duplicate TypeScript files, runs a
minimal `defineConfig`/`run` containing `duplicateDetection`, and observes `RunResult.kind === "completed"` plus a
completed duplicate Check outcome; it deliberately does not require a particular finding count or verdict.

For provenance, the test resolves `jscpd/package.json` from the isolated installed `vibe-check` entry, then checks its
manifest and declared bin target remain under the temporary consumer and outside `/workspace/vibe-check`. It observed
`jscpd@5.0.11`. The completed duplicate Check proves the package runtime resolved and invoked that consumer-installed
scanner rather than repository source, a repository devDependency, or an ancestor-directory fallback.

## Diagnostic timings

These are single local samples captured during this Change before the final coding-style cleanup. They are not a
performance gate or SLO; final clean-state preparation and correctness gates were rerun separately. The samples are
only useful for spotting an obvious follow-up regression.

| Path | Command | Elapsed |
| --- | --- | --- |
| Source-backed baseline | `bun run quality` in a detached `01cf9bf` worktree | 1.175 s |
| Fresh preparation plus scripts typecheck | `mise exec -- bun scripts/development/typecheck.ts scripts` after removing only candidate state and the private consumer install | 2.451 s |
| Candidate-backed unchanged quality | `bun run quality` with a matching receipt | 1.876 s |
| Candidate-backed rebuild plus quality | `bun run quality` after a controlled fingerprinted-input change | 3.229 s |
| Unchanged preparation reuse | `mise exec -- bun scripts/package-candidate/prepare.ts` | 0.220 s |

The controlled input was restored exactly. The final artifact facts above are from the subsequent clean-state
preparation after coding-style cleanup.

## Boundaries and revalidation

- No `npm publish`, `vibe-check` registry lookup, authentication, credential operation, or registry-install
  verification was part of this candidate evidence.
- This evidence does not prove legal/release completeness, public version assignment, reproducible gzip bytes,
  package-manager network/credential behavior, Node or dual-runtime support, or a complete repository-quality scan
  from an isolated consumer.
- The isolated proof covers candidate-owned `jscpd` only. Repository `quality` still relies on the existing
  mise-pinned external `scc`, `lizard`, and Python toolchain; those are repository scanner boundaries, not candidate
  production dependencies.
- Re-run `mise exec -- bun scripts/package-candidate/prepare.ts` and
  `bun test scripts/package-candidate/isolated-consumer.test.ts` after any candidate input, Bun version,
  package-manager, public-surface, or scanner-resolution change. Re-record artifact facts when the fingerprint or
  digest changes.
