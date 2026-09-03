# Readiness 0.4 — current evidence / package / legal audit

**Audit status:** complete as Readiness 0.4 evidence. This document is not a stable-rule owner. Its archive-read tables and
future-tense implementation steps record the pre-implementation baseline only; current facts belong to the Change synthesis,
stable owners, and `analyzer/fixtures/lizard-1.23.0/evidence/README.md`. It was prepared with archive inputs read-only. The
archive remains historical material; none of the proposed work edits it.

## Scope and authoritative inputs

This audit recovers the active Plan and its two directly applicable Decisions:

- [`proposal.md`](proposal.md), [`design.md`](design.md), and [`tasks.md`](tasks.md) define the present Change and make 0.4 a hard prerequisite for implementation.
- [`docs/decisions/isolate-lizard-port-behind-check-private-interface.md`](../../docs/decisions/isolate-lizard-port-behind-check-private-interface.md) is active + unaligned: continuous identity/oracle/boundary evidence must have a current owner, while `licenses/**` remains the shipped legal inventory.
- [`docs/decisions/preserve-applicable-upstream-licenses-for-translated-analyzers.md`](../../docs/decisions/preserve-applicable-upstream-licenses-for-translated-analyzers.md) is active + aligned: the source/range ledger, headers, notices, license texts and package checks close the legal obligation.
- [`licenses/lizard-1.23.0-provenance.json`](../../licenses/lizard-1.23.0-provenance.json), [`scripts/package/legal-materials.ts`](../../scripts/package/legal-materials.ts), [`scripts/package/artifact/build.ts`](../../scripts/package/artifact/build.ts), [`scripts/package/artifact/staging-audit.ts`](../../scripts/package/artifact/staging-audit.ts), and [`scripts/package/artifact/packed-tar-audit.ts`](../../scripts/package/artifact/packed-tar-audit.ts) establish the current legal/package facts.

The historical inputs were read only from [`changes/archive/replace-lizard-with-typescript-function-analyzers/evidence/`](../archive/replace-lizard-with-typescript-function-analyzers/evidence/). The other two Lizard-named archived Changes contain only their Plan artifacts; they are not current evidence inputs.

## Current archive-read baseline

There are **no production `src/**` reads** of `changes/archive/**`. Five continuous test inputs remain, all from the `replace-lizard-with-typescript-function-analyzers` archive:

| Consumer | Archive input | What it proves today |
| --- | --- | --- |
| `src/package-checks/function-metrics/analyzer-adapter.test.ts` | `lizard-1.23-oracle-observations.json` | 55 normal fixtures / extensions through the exact-input Worker and Product mapping. |
| `src/package-checks/function-metrics/analyzer/readers/malformed-source.test.ts` | `lizard-1.23-malformed-reader-observations.json` | One deterministic malformed/incomplete observation for each of 27 source-order readers. |
| same malformed-source test | `lizard-1.23-reader-extension-mapping.json` | 27-reader order and 55 case-insensitive extension identities. |
| `src/package-checks/function-metrics/analyzer/source-identity.test.ts` | `lizard-1.23-reader-source-identity.json` | AST-level reader/shared identity mapping. |
| same source-identity test | `lizard-1.23-provenance-ledger.json` | The mapping's source range/hash/target relation. |

The only other archive references are Change/history links in docs or active Change text; they are not runtime or test data inputs. The active archive provenance ledger is byte-identical to the current `licenses/lizard-1.23.0-provenance.json` (SHA-256 `6ca298bfc00241c0c651c06f6207c4bdf1be6898452c171769879c18d4debae8`), so the fifth input is an avoidable duplicate current read.

## Evidence classification and coverage gap

### Evidence that must become current

The historical subtree contains these continuously useful materials:

| Historical material | Size / closure observed | Required current role |
| --- | --- | --- |
| `lizard-1.23-oracle-observations.json` | 82 fixtures | Product adapter differential oracle. |
| `lizard-1.23-malformed-reader-observations.json` | 27 fixtures | Reader malformed-source differential oracle. |
| `lizard-1.23-reader-extension-mapping.json` | 27 readers, 55 extensions | Registry order/suffix identity used by the malformed test. |
| `lizard-1.23-reader-source-identity.json` | 33 entries, 72 classes, 687 symbols | Static source-to-TypeScript identity evidence. |
| `source-alignment-deviations.md` | explicit Product boundary/deviation ledger | Human-readable justification and upstream-sync review input. |

The existing fixture corpus at `src/package-checks/function-metrics/analyzer/fixtures/lizard-1.23.0/` is already current checked-in test input (110 files). It does not need a second move.

### Historical-only material that must not be promoted or duplicated

- `lizard-1.23-provenance-ledger.json` must **not** be copied: `licenses/lizard-1.23.0-provenance.json` is the exact current, shipped ledger.
- `lizard-1.23-legal-inventory-input.json` is formation-time upstream/legal input. Current legal facts are the root notice, the three license texts, and the provenance inventory under `licenses/**`, enforced by package tooling.
- `README.md`, `readiness-boundaries.json`, resource/cancellation baselines and prose, spikes, and Python generator/verifier tools explain the archived migration/reproduction. They are not current test inputs and are not needed to establish the private-port boundary. A new current README may link to their archive history but must not make archive a live prerequisite.

### Identity gap

The legal provenance ledger closes **43 translated source entries** (42 Lizard plus one Pygments supplemental) onto **37 translated TypeScript targets**, with 21 deferred and 16 excluded source entries. It is already the path/range/SPDX/target mapping for all translated code.

The current AST identity manifest only covers 33 targets under `lizard_languages/**` (readers, registry, shared modules). It omits the following translated targets from AST-level source identity evidence:

1. `src/package-checks/function-metrics/analyzer/core.ts`
2. `src/package-checks/function-metrics/analyzer/extensions/extension-base.ts`
3. `src/package-checks/function-metrics/analyzer/extensions/protocol.ts`
4. `src/package-checks/function-metrics/analyzer/extensions/registry.ts`

Their unit/protocol tests and provenance targets exist, but that is not the requested current identity/deviation closure for all translated core, extensions, readers, and shared ranges. The current narrow file name (`reader-source-identity`) should not be retained as the name of a manifest expanded to this scope.

## One minimal migration closure

**Recommended current evidence subtree:**

```text
src/package-checks/function-metrics/analyzer/fixtures/lizard-1.23.0/evidence/
```

This is the unique smallest placement that is adjacent to the existing oracle fixtures and current analyzer tests **and** is excluded from package source collection by the existing `fixtures/` rule. Do not create a package-visible `src/**/evidence/` tree, a new `docs/` stable owner, or a second legal ledger.

**Authoritative mapping and owner relation:**

```text
current analyzer test evidence
  ├─ oracle observations / malformed observations / reader-extension mapping
  ├─ lizard-1.23-source-identity.json (all 37 translated targets)
  └─ source-alignment-deviations.md
              │ references sourcePath + range + sha256 + targetPath
              ▼
licenses/lizard-1.23.0-provenance.json  [sole source/range/SPDX/target mapping]
  ├─ THIRD_PARTY_NOTICES.md
  └─ licenses/{Lizard-1.23.0-MIT.txt, Lizard-1.23.0-lizard.py-Apache-2.0.txt,
              Pygments-2.18.0-BSD-2-Clause.txt}  [shipped legal inventory]
```

`licenses/lizard-1.23.0-provenance.json` is the sole machine-readable source/range/legal mapping. Current evidence may validate and reference its fields; it must not re-copy range hashes, SPDX inventory, or target closure as an independent ledger. The evidence subtree is **current checkout test/fidelity evidence, not Product runtime input and not shipped legal inventory**. The archive remains an immutable formation-time snapshot and is explicitly non-authoritative after consumer reads move.

### Exact implementation checklist

1. Create the proposed current subtree and a short `README.md` that identifies it as the current test/fidelity owner, names the root provenance file as the sole mapping, states that production code does not load it, and gives the no-network local tests. Do not copy the archived regeneration instructions as a current build prerequisite.
2. Establish current copies (archive is immutable) of only these data/prose inputs: `lizard-1.23-oracle-observations.json`, `lizard-1.23-malformed-reader-observations.json`, `lizard-1.23-reader-extension-mapping.json`, and `source-alignment-deviations.md`. Mark the new root as authoritative for continuous tests; leave archive bytes unedited as history rather than a competing owner.
3. Replace the narrow historical identity manifest with one current `lizard-1.23-source-identity.json`. Start from the 33 existing reader/shared entries and add AST-verifiable entries for `core.ts` and the three `extensions/**` targets. The resulting test must assert its source entries against the root provenance ledger and must close all 37 translated target paths; it must retain explicit named host seams rather than treating them as direct translations.
4. Reroute `analyzer-adapter.test.ts` and `readers/malformed-source.test.ts` to the current subtree. Reroute `source-identity.test.ts` to `lizard-1.23-source-identity.json` and to `licenses/lizard-1.23.0-provenance.json`; delete its archive evidence root constant.
5. Add a narrow fail-closed test or extend `source-identity.test.ts` so every translated `targetPath`/`additionalTargetPaths` in the root provenance inventory is represented by the current identity/deviation closure. This is the proof that the four currently omitted core/extension targets cannot silently fall out.
6. Add a static current-read guard that rejects `changes/archive/` from `src/**` test and production inputs (archive links in historical/docs material remain allowed). Do not modify any archived file.

## Package staging and manifest impact

The recommended evidence root has **zero package payload impact**: `collectRuntimeSourceFilePaths()` copies only non-test `.ts` source and excludes any `fixtures/` path, and the artifact test already asserts that `analyzer/fixtures/lizard-1.23.0/` is absent. The JSON/Markdown evidence therefore is not staged, packed, exported, declared, or a Worker input. No package manifest or public export change is necessary for this relocation.

The legal inventory remains package-visible and unchanged in role:

- `PACKAGE_MANIFEST_FILES` includes `licenses/`; build explicitly copies `THIRD_PARTY_NOTICES.md`, the root provenance JSON, and all three translated-analyzer license texts.
- staging, packed-tar, and installed-material checks all call `assertTranslatedAnalyzerLegalMaterials()`, which enforces exact legal bytes, the 79+1 provenance inventory shape, translated headers, deferred-source absence, notice facts, and the 37-target closure.
- Consequently, changing a legal filename, provenance byte, target path, header, notice, or SPDX relation is a package/legal change requiring the existing constants and package checks to be deliberately updated. Moving non-shipped test evidence under `fixtures/**` is not.

## Verification commands for the implementation phase

Run after the closure is implemented; this audit did not run them because it does not change Product/test/package code.

```sh
# current evidence consumers and the new archive-read guard
bun test \
  src/package-checks/function-metrics/analyzer-adapter.test.ts \
  src/package-checks/function-metrics/analyzer/source-identity.test.ts \
  src/package-checks/function-metrics/analyzer/readers/malformed-source.test.ts
rg -n 'changes/archive/' src --glob '*.ts'  # expected: no matches

# affected analyzer fidelity/protocol and package closure
bun test src/package-checks/function-metrics/analyzer/core.test.ts \
  src/package-checks/function-metrics/analyzer/extensions/extension-protocol.test.ts \
  scripts/package/artifact/artifact.test.ts \
  scripts/package/artifact/manifest.test.ts
bun run package:build

# Change/documentation gates after the Change artifacts and current owner docs are synchronized
bun run validate
bun run change-plan -- check changes/isolate-lizard-typescript-port-boundary
bun run decisions -- check
bun run verify:vibe-check-workspace:required
```

## Readiness conclusion and remaining blocker

Readiness 0.4 has a single implementable closure: place current test/fidelity evidence under the existing analyzer fixture root; use the root `licenses/lizard-1.23.0-provenance.json` as the only source/range/legal mapping; preserve the archive as read-only history; and expand static identity proof from 33 to all 37 translated targets. The only remaining implementation blocker is completing those edits and tests. No owner, legal-policy, manifest, public-surface, or archive-write decision remains open.
