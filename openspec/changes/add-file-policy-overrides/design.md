This design defines the single config-v2 owner and deterministic per-file policy resolver; it is a temporary change artifact and cannot be implemented before the blocking audit.

## Context

Current Product Config owns one closed, complete semantic config and supplies the same resolved value to current, baseline, and fallback work. Scan scope creates one normalized inventory, while capability behavior currently reads project-wide check settings. See `proposal.md` for the need to vary those settings by file.

This change follows `standardize-quality-capability-contract`: capability descriptors select exact inputs, findings have explicit variants, and cache projections belong to the producing capability. It must preserve the global inventory boundary and the existing separation between public policy and operational scanner configuration.

## Goals / Non-Goals

**Goals:**

- Make every accepted override structurally typed from the same schema source as base `checks`.
- Produce deterministic, immutable per-file policy before capability execution.
- Preserve identical path matching and policy values across current, baseline, and fallback work.
- Let users inspect resolution without running quality checks or mutating scan state.
- Give capability caches only the resolved policy leaves that can affect their results.

**Non-Goals:**

- Adding Markdown, JSON, schema, path, secret, or network check settings.
- Allowing overrides to alter global collection, code-area, acceptance, report, artifact, cache-root, or dependency policy.
- Supporting generic JSON merge-patch semantics, config inheritance, remote config, or runtime plugins.
- Reading both semantic config v1 and v2 in the same product revision.

## Decisions

### Decision 1: Upgrade once to a single active semantic config v2

The common schema source gains required `overrides`, and the neutral core template uses `[]`. The complete neutral default is the deterministic composition of that core template plus each registered feature's complete neutral section; file-backed documents never inherit those fragments. The runtime type, composed authoring schema, generated editor schema, initializer, canonical examples, and repository dogfood config all derive from that source.

V1 is rejected with a targeted migration diagnostic instead of being silently upgraded. This follows the fixed-version decision already active in the repository and prevents two long-lived parsing and normalization paths. A dual reader was rejected because every later capability would otherwise need compatibility behavior for two different check trees.

### Decision 2: Derive a closed partial schema rather than hand-maintain one

The config schema representation must distinguish object branches from leaf values. It keeps the three existing core sections required, then deterministically composes optional feature sections contributed by the Product descriptor registry. Each feature fragment owns a unique config path, a complete closed base schema, a neutral-default contribution, stable semantic check IDs, profile/request semantics, and metadata marking each leaf overrideable or base-only. Missing optional section is a semantic state—unconfigured and `skipped`—not an invitation to fill defaults.

A schema transformation derives an override patch by making overrideable object children optional while preserving each declared leaf's validator and description. Object patches remain closed; arrays remain typed leaves and replace in full. Post-validation enforces at least one leaf, unique non-empty names, non-empty file glob lists, safe project-relative patterns, and the rule that patches cannot construct a feature section absent from the selected base.

Maintaining an independent override interface/schema was rejected because each new content capability could update the base tree without updating patches. Making every newly registered section required was rejected because parallel feature delivery would invalidate all existing v2 documents and force a version bump per feature. A generic untyped deep merge was rejected because it cannot establish allowed keys, array behavior, or deletion semantics.

### Decision 3: Resolve normalized paths through one pure ordered merge

After config selection and CLI field overrides, Config builds an invocation-owned resolver around the detached v2 value. Given a normalized project-relative path, the resolver:

1. starts from the required core sections and optional feature sections actually declared by the selected base;
2. matches override globs using the same project-relative matcher semantics as scan scope;
3. applies matches in document order;
4. recursively replaces only declared object leaves and replaces arrays wholesale; and
5. returns a deeply immutable `ResolvedFilePolicy` with ordered provenance.

The resolver can memoize by normalized project-relative path for one invocation. It never receives a baseline checkout path, so temporary worktree placement cannot change matching. Precomputing expanded policies in the config document was rejected because inventory is invocation-specific and would blur Config and Scope ownership.

An override cannot add an absent optional feature section. Requiring the base section first ensures a partial patch is always applied to a complete typed policy and keeps “feature not configured” distinguishable from a neutral or disabled policy.

### Decision 4: Scope owns inventory; descriptors own capability eligibility

Scope first forms the global normalized inventory exactly as before. It attaches the resolved file policy to each inventory entry. Capability descriptors then project exact inputs using only the entry and their owned policy subtree. An override cannot create inventory entries.

This ordering makes “include for one capability” an explicit descriptor decision without creating a second file collector. Letting each adapter reinterpret globs was rejected because current/baseline behavior and cache identity would drift.

### Decision 5: Cache the semantic result, not config syntax

Each capability cache key receives its exact input identities plus the normalized projection of resolved leaves it actually consumes. Override names, comments, raw order that does not change a winning value, and settings owned only by other capabilities are omitted. Policy projection functions live with capability descriptors so adding a field requires the same owner to state whether it affects results.

Hashing the entire config is simpler but was rejected: it would invalidate unrelated capabilities and make harmless authoring changes operationally observable.

### Decision 6: Reuse the resolver in a read-only explain operation

`explain-config` uses normal root/config selection and validation, then calls the same path normalizer, glob matcher, and resolver. It renders selected-source provenance, ordered matches, declared leaves, winning leaves, and the complete resolved checks. It can explain a non-existent candidate path, so its output explicitly does not prove filesystem or VCS inventory membership.

The command has no machine-output contract in this change. Adding JSON output now was rejected because that would create another public serialized schema before an identified consumer exists.

## Risks / Trade-offs

- **[Schema transformation mishandles nested required fields]** → Add source-level schema projection tests covering nested objects, arrays, enums, unknown fields, and future capability sections; validate generated editor material against runtime fixtures.
- **[Document order makes reordering behaviorally significant]** → State later-wins semantics in schema descriptions, docs, examples, and explain output; preserve array order during parsing.
- **[Path matching differs between scope and override resolution]** → Share one normalized project-relative matcher boundary and test current/baseline/temp-root equivalence.
- **[Per-file resolution increases large-repository cost]** → Memoize immutable results by normalized path and project only relevant leaves into each capability cache key; measure before adding broader optimization.
- **[Hard-cut v2 interrupts existing users]** → Ship precise diagnostics and migration documentation, update all owned examples/configs atomically, and never rewrite a user file implicitly.
- **[Future capability adds settings that are unsafe to override]** → Require schema-source metadata to distinguish overrideable capability leaves; default a new leaf to non-overrideable until its owning change specifies semantics.

## Migration Plan

1. Complete the blocking dependency and compatibility audit in `tasks.md`; do not implement if the foundation or concurrent feature contracts disagree.
2. Add the v2 schema projection and resolver behind tests, then migrate neutral/default/editor materials and all repository-owned configs in one change.
3. Wire resolved policies into inventory descriptors, current/baseline work, cache projections, and `explain-config`.
4. Run focused config/scope/cache/CLI tests, generated-material drift validation, and the required workspace verification.
5. Rollback by reverting the complete change, including owned v2 configs; do not attempt to run v2 documents on a v1 binary or preserve a partial dual-version state.

## Open Questions

No unanswered questions remain; the blocking audit must still verify every dependent change before implementation.
