# scan-scope

## Case AUX-QUALITY-FINGERPRINT-001: Quality input fingerprint 稳定
Owner: `docs/scan-scope.md#resolved-scope`
Entities:
- `bun|src/product/quality-core/src/input/files.test.ts|quality input fingerprints > uses stable SHA-256 fingerprints for sorted file content`
Proves:
- quality input fingerprint 使用排序后的文件内容生成稳定 SHA-256。
- 文件内容变化会改变 fingerprint，文件顺序变化不会改变 fingerprint。

## Case WB-SCOPE-GIT-CANDIDATES-001: Git candidate identity 与 config glob 语义稳定
Owner: `docs/scan-scope.md#resolved-scope`
Entities:
- `bun|src/product/quality-core/src/input/files.test.ts|quality input file collection > preserves NUL-delimited Git candidate paths containing newlines`
- `bun|src/product/quality-core/src/input/files.test.ts|quality input file collection > uses minimatch include semantics for Git and fallback candidates`
Proves:
- Git 只以 NUL-delimited protocol 枚举 ignore-aware candidate paths，换行不会改变文件身份。
- Product include 只由 config glob contract 解释；brace、globstar 等 minimatch default semantics 在 current、baseline 与 Git-failure fallback 中一致。

## Case WB-SCOPE-FILE-COLLECTION-001: Product current/baseline collection fallback 稳定
Owner: `docs/scan-scope.md#resolved-scope`
Entities:
- `bun|src/product/quality-core/src/input/files.test.ts|quality input file collection > does not add built-in exclusions to the selected fallback config`
- `bun|src/product/quality-core/src/input/files.test.ts|quality input file collection > treats successful empty Git results as authoritative for current and baseline`
- `bun|src/product/quality-core/src/input/files.test.ts|quality input file collection > uses config-only fallback for current and baseline when Git fails`
Proves:
- Current 与 baseline Git command 成功时直接使用 normalized result，包括成功的空集合。
- Git command 失败时，current 与 baseline 都进入 config-only fallback；匹配 product include 且未命中 exclude/generated rule 的 VCS-ignored path 仍可进入候选集合。
- Config include、exclude directories 与 generated-file rules 在 fallback 中继续生效。
- Selected config 未排除的 built-in-default directory 不会被 fallback 隐式排除。

## Case BB-SCOPE-CONFIG-EQUIVALENCE-001: Neutral configuration scope equivalence 稳定
Owner: `docs/scan-scope.md#resolved-scope`
Entities:
- `bun|src/product/config-default-workflow-acceptance.test.ts|formal CLI project configuration workflow > materializes the neutral default and discovers equivalent runtime inputs without trusting sibling schema`
Proves:
- 在同一 clean project 与 operational inputs 下，in-memory neutral default 与 `init` 后 fixed-path discovered document 具有等价 semantic settings，并产生相同 normalized scope、full file inventory / fingerprints、active file/function exact inputs 与 config-owned report settings；两者的 `default` / `discovered` provenance 可以不同。
