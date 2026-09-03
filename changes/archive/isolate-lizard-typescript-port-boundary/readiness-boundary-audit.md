# Readiness Boundary Audit (0.2–0.3)

**Change:** `isolate-lizard-typescript-port-boundary` (active Plan)
**Audit scope:** current workspace facts for Tasks 0.2–0.3 only. This record does not select the evidence subtree/mapping (0.4), define quality exceptions (0.5), or change production, test, Decision, or stable-owner content.

> **消费边界：** 这是实施前的 Readiness baseline，用于复核形成时依据，不是当前规则或未完成事项。
> 当前实现结果、唯一调用链和验证任务以 `proposal.md` / `design.md` / `tasks.md` 及其 stable owners 为准；本记录中的
> “current”“must create”“must modify”和 archive-read baseline 都只描述审计时状态。

## Authority and owner map

| Concern | Current stable owner / implementation owner | Audit conclusion |
| --- | --- | --- |
| Product/private boundary and future direction | `docs/decisions/isolate-lizard-port-behind-check-private-interface.md` (active, unaligned) | `analyzer/**` remains a Check-private, source-aligned root. It is not public or a generic parser framework. The Decision requires one façade in that root, one external Product adapter, and path-based fail-closed tests. |
| `functionMetrics` behavior, exact inputs, unavailable semantics | `docs/checks/function-metrics.md`; `docs/scanner-dependencies.md`; `src/package-checks/function-metrics/{execution,measurement,target-files}.ts` | Exact selected paths are admitted/rejected before analysis; admitted text only is sent to a one-shot Worker. Product I/O, byte limits, cancellation, Worker lifecycle and settlement remain outside the port. |
| Package/public surface and artifact layout | `src/index.ts`; `scripts/package/public-api-inventory.ts`; `scripts/package/package-contract.ts`; `scripts/validation/layout-characterization.ts` | The package has only root public exports. No analyzer, adapter, façade, Worker, or `function-metrics` subpath is public. The Worker is a private compiler/artifact root, not an export. |
| Development/Gate/layout tooling | `docs/script-tooling.md`; `scripts/validation/layout-characterization.ts` and its test | Existing layout validation checks general product/script/package directions and the exact compiler roots, but does **not** yet enforce the proposed analyzer/adapter import policy. |
| Native test entities and Cases | `docs/testing.md`; `docs/testing/case-maintenance.md`; `docs/testing/cases/function-metrics-analyzers.md`, `docs/testing/cases/check-owned-scanners.md`, `docs/testing/cases/repository-tooling.md` | Boundary/static-layout and moved tests require Case maintenance and `bun run test-evidence -- check --root .`; existing Cases separately own analyzer fidelity, Worker/admission, and compiler-root/package facts. |
| Legal/provenance inventory | `licenses/lizard-1.23.0-provenance.json`; `scripts/package/legal-materials.ts` | Legal inventory remains in `licenses/**`. Current test evidence is instead read from an archive, so 0.4 must establish the one current evidence owner and its relation to this inventory. |

## Production import and data-flow baseline

### Current production deep imports (complete for `src/**/*.ts`)

The only production modules outside `analyzer/**` importing analyzer internals are:

| Importer | Current import | Current responsibility that must move/remain |
| --- | --- | --- |
| `src/package-checks/function-metrics/analyzer-worker.ts` | `./analyzer/core.ts` (`analyzeSourceCode`), `./analyzer/reader-registry.ts` (`getReaderFor`) | It validates transport, performs reader selection and core analysis, and maps Lizard `FunctionInfo` into Product `FunctionMetric`. Under the Change it must retain transport only and call the Product adapter. |
| `src/package-checks/function-metrics/target-files.ts` | `./analyzer/reader-registry.ts` (`getReaderFor`, `languages`) | It derives public default globs and Product admission from the registry. Under the Change it must call the Product adapter’s suffix capability, not a port internal. |

No other `src/**` module imports `function-metrics/analyzer/**`, `./analyzer/core.ts`, or `./analyzer/reader-registry.ts`.

### Current and required single path

Current executable path is:

```text
functionMetrics execution
  → target-files exact-path classification
  → measurement exact read/decode/resource/cancellation
  → analyzer-worker transport + registry + core + FunctionMetric mapping
```

The implementation target, already required by the Change/Decision, is:

```text
functionMetrics Check/execution
  → measurement (exact I/O, decode, limits, cancellation, one-shot Worker lifecycle)
  → analyzer-worker (message validation and adapter call)
  → src/package-checks/function-metrics/analyzer-adapter.ts (Product support/error + FunctionMetric mapping)
  → one façade under src/package-checks/function-metrics/analyzer/
  → source-aligned core/readers/shared/extensions
```

`measurement.ts` currently constructs `new Worker(new URL("./analyzer-worker.ts", import.meta.url).href)`, reads only `approvedExactPaths`, bounds one file at 8 MiB and the aggregate at 64 MiB, terminates the Worker on every settlement, and rejects unapproved response paths. These are Product boundary responsibilities and are not port work.

`execution.ts` owns selection, rejected-path Records, whole-Check unavailable mapping and final Record/finding settlement. It must continue to call `target-files.ts`, not the port.

## Façade, adapter, Worker and public facts

- **Confirmed Product adapter path:** create `src/package-checks/function-metrics/analyzer-adapter.ts`. The Change artifacts and Decision explicitly name this file; it is the only production façade consumer and owns Product support/error interpretation plus `FunctionMetric` mapping.
- **Façade root requirement found by this audit; leaf selected by Readiness synthesis:** this audit established that the façade must be a new production module directly under `src/package-checks/function-metrics/analyzer/` and the only directory-external production entry; it did not find a pre-existing source-owner leaf name. The subsequent Readiness synthesis selects `port-facade.ts` as the minimal implementation decision. It is not a current-source fact, does not rename/reorganize translated internals, and avoids a non-root `index.ts`, which repository layout rejects. The static allowlist must use this exact path when implemented.
- **Current registry alias to retire from Product use:** `getReaderFor` in `src/package-checks/function-metrics/analyzer/reader-registry.ts` is explicitly documented as an “Existing Product-facing host spelling”; its source-aligned `get_reader_for` is the internal spelling. The adapter/façade transition must remove all external consumers of the alias, not necessarily the internal source spelling.
- **Worker compiler root is fixed:** `scripts/package/package-contract.ts` declares exactly `src/index.ts` and `src/package-checks/function-metrics/analyzer-worker.ts` in `PACKAGE_RUNTIME_COMPILER_SOURCE_PATHS`; `scripts/validation/layout-characterization.ts` characterizes the same exact pair. Keep the Worker path and compiler-root count unchanged. The emitted Worker (`dist/esm/package-checks/function-metrics/analyzer-worker.mjs`) is package-private; package staging/audit rewrites and proves its one URL from `measurement`.
- **Public surface baseline:** `package.json` declares only `"."` export; `src/index.ts` and `scripts/package/public-api-inventory.ts` expose `functionMetrics`, its documented types and parser only. They expose no analyzer, façade, adapter, Worker, or subpath. No public export/declaration/package-export modification is required or permitted for this boundary Change.

## Test path classification and fail-closed allowlist

The policy to implement is path-based; any path not listed below is rejected rather than inferred from import spelling.

| Path class | Current members / required future members | Allowed import boundary |
| --- | --- | --- |
| Port-root fidelity/unit test | every `*.test.ts` under `src/package-checks/function-metrics/analyzer/**`, currently: `core.test.ts`, `reader-registry.test.ts`, `source-identity.test.ts`, all `extensions/*.test.ts`, `readers/*.test.ts`, and `shared/*.test.ts` | May deep-import analyzer internals in the same `analyzer/**` root. |
| Façade-boundary test | New test placed under `src/package-checks/function-metrics/analyzer/` | May import the façade and, when necessary for fidelity assertions, port internals. It must not become a Product adapter test located outside that root. |
| Product adapter / Worker / measurement / execution test | `src/package-checks/function-metrics/{analyzer-adapter,analyzer-worker,measurement.*,target-files,constructor.*,finding-waivers}.test.ts` | Must import Product-facing modules only. After implementation they may import `analyzer-adapter.ts`; they must not import the façade or core/registry/readers/extensions. |
| Repository/package/layout test | `scripts/validation/layout-characterization.test.ts`, `scripts/package/artifact/**`, Gate configuration tests | May inspect declared source/artifact paths only through their owner’s existing static/package contracts; no analyzer runtime deep import. |

**Current test violation to correct:** `src/package-checks/function-metrics/target-files.test.ts` directly imports `languages` from `./analyzer/reader-registry.ts`; it is outside `analyzer/**` and must instead assert the adapter-facing Product behavior. `analyzer-adapter.test.ts` currently imports `measurement.ts`, not analyzer internals; it will need to be re-scoped to the new adapter contract rather than continue to be an archive-backed measurement/oracle test.

No fail-closed analyzer-boundary validator currently exists. The implementation must add it to the repository layout/static validation owner and characterize both allowed and rejected paths, including type-only and value imports if the policy applies to both.

## Archive-read baseline and evidence consumers

Exactly three current test files consume `changes/archive/replace-lizard-with-typescript-function-analyzers/evidence/**`:

| Consumer | Archive inputs |
| --- | --- |
| `src/package-checks/function-metrics/analyzer-adapter.test.ts` | `lizard-1.23-oracle-observations.json` |
| `src/package-checks/function-metrics/analyzer/source-identity.test.ts` | `lizard-1.23-reader-source-identity.json`; `lizard-1.23-provenance-ledger.json` |
| `src/package-checks/function-metrics/analyzer/readers/malformed-source.test.ts` | `lizard-1.23-malformed-reader-observations.json`; `lizard-1.23-reader-extension-mapping.json` |

This is a current-read baseline, not a migration plan. It proves Success Criterion “no current archive reads” is presently unmet. `licenses/lizard-1.23.0-provenance.json` is independently consumed by package legal-material tooling; it is the shipped legal inventory, not a substitute current oracle/identity evidence owner. Task 0.4 must name the destination subtree and authoritative mapping before any test paths are changed; archives remain immutable historical inputs.

## Implementation file set derived from this audit

### Must create

- `src/package-checks/function-metrics/analyzer-adapter.ts`
- `src/package-checks/function-metrics/analyzer/port-facade.ts` (the Readiness-synthesis-selected façade leaf)
- façade-boundary test(s) under `src/package-checks/function-metrics/analyzer/`

### Must modify

- `src/package-checks/function-metrics/analyzer-worker.ts`
- `src/package-checks/function-metrics/target-files.ts`
- `src/package-checks/function-metrics/target-files.test.ts`
- `src/package-checks/function-metrics/analyzer-adapter.test.ts`
- `src/package-checks/function-metrics/analyzer-worker.test.ts` and narrow Worker/measurement tests as required to prove adapter-only data flow
- `src/package-checks/function-metrics/analyzer/reader-registry.ts` only as needed to remove the Product-facing alias/use while preserving source-aligned internals
- `scripts/validation/layout-characterization.ts` and `scripts/validation/layout-characterization.test.ts`
- the three archive-reading tests above after 0.4 supplies the current evidence location
- affected Case records under `docs/testing/cases/` (at least `check-owned-scanners.md`, `function-metrics-analyzers.md`, and `repository-tooling.md` where their native entities/claims change)
- stable docs named in the Change (`docs/scanner-dependencies.md`, `docs/checks/function-metrics.md`, `docs/script-tooling.md`) only after implementation makes the stated facts current

### Confirmed not to modify for this boundary alone

- `src/index.ts`, `package.json`, package public-export inventory, public declarations, or package subpath exports
- `scripts/package/package-contract.ts` Worker compiler-root pair, unless a separate authorized packaging fact makes that necessary
- translated reader/core/shared/extension structure merely to rename or reorganize it
- `changes/archive/**`

## Risks and implementation considerations

1. **Façade leaf path is selected.** The audit established the root requirement, and Readiness synthesis selected `analyzer/port-facade.ts` as the minimal implementation path. Implement the static allowlist against that exact path; do not infer a public or non-root `index.ts` (repository layout rejects non-root `index.ts`).
2. **Evidence destination is selected.** Readiness 0.4 selected `analyzer/fixtures/lizard-1.23.0/evidence/` as the current test/fidelity subtree and `licenses/lizard-1.23.0-provenance.json` as the sole authoritative machine-readable mapping. Implementation must follow `readiness-evidence-audit.md`: migrate the three archive consumers/five inputs without copying a competing ledger or modifying archive history.
3. **Static validator scope needs explicit import parsing coverage.** Existing `layout-characterization.ts` parses static import/export/dynamic specifiers for other boundaries, but contains no function-metrics rule. The new rule must fail closed across production and tests and distinguish the port-root allowlist from the adapter-only Product test policy.
4. **Current adapter-named test is not yet an adapter test.** It validates end-to-end `measurement → Worker` behavior using archive oracle data. Re-scoping it must preserve the independent exact-input/whole-request evidence now in `measurement.resource.test.ts`, `measurement.encoding.test.ts`, and `analyzer-worker.test.ts`.

## Command evidence

Read/audit commands run in this workspace:

```bash
bun run change-plan -- list changes
bun run decisions -- list
rg -n --glob '*.ts' 'from ["].*(analyzer|reader-registry|core|readers|extensions)' src --glob '!src/package-checks/function-metrics/analyzer/**'
rg -l 'changes/archive/' --glob '*.{ts,json,md}' --glob '!changes/archive/**' .
rg -n 'compilerRoot|worker|analyzer-worker|new Worker|workers?' src scripts package.json tsconfig*.json
```

The `rg` import audit produced exactly the two production importers listed above; the archive audit produced exactly the three test consumers listed above after excluding Change artifacts and archive contents. No production code or tests were executed or changed during this facts-only audit.

## Direct verification after this record

```bash
bun run change-plan -- check changes/isolate-lizard-typescript-port-boundary
bun run validate -- docs
```
