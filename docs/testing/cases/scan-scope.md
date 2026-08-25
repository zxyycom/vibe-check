# scan-scope

## Case AUX-QUALITY-FINGERPRINT-001: Quality input fingerprint 稳定

Owner: `docs/scan-scope.md#resolved-scope`
Entities:

- `bun|src/checks/input/files.test.ts|quality input fingerprints > uses stable SHA-256 fingerprints for sorted file content`
  Proves:
- quality input fingerprint 使用排序后的文件内容生成稳定 SHA-256。
- 文件内容变化会改变 fingerprint，文件顺序变化不会改变 fingerprint。

## Case WB-SCOPE-GIT-CANDIDATES-001: Git candidate identity 与 config glob 语义稳定

Owner: `docs/scan-scope.md#resolved-scope`
Entities:

- `bun|src/checks/input/files.test.ts|quality input file collection > preserves NUL-delimited Git candidate paths containing newlines`
- `bun|src/checks/input/files.test.ts|quality input file collection > uses minimatch include semantics for Git and fallback candidates`
  Proves:
- Git 只以 NUL-delimited protocol 枚举 ignore-aware candidate paths，换行不会改变文件身份。
- Product include 只由 config glob contract 解释；brace、globstar 等 minimatch default semantics 在 current Git 与 Git-failure fallback 中一致。

## Case WB-SCOPE-FILE-COLLECTION-001: Product current collection fallback 稳定

Owner: `docs/scan-scope.md#resolved-scope`
Entities:

- `bun|src/checks/input/files.test.ts|quality submodule input > includes initialized current submodule worktree files`
- `bun|src/checks/input/files.test.ts|quality submodule input > does not re-enter parent from a replaced HEAD gitlink`
- `bun|src/checks/input/files.test.ts|quality input file collection > does not add built-in exclusions to the selected fallback config`
- `bun|src/checks/input/files.test.ts|quality input file collection > treats successful empty Git results as authoritative`
- `bun|src/checks/input/files.test.ts|quality input file collection > uses config-only fallback when Git fails`
  Proves:
- Current Git command 成功时直接使用 normalized result，包括成功的空集合。
- Current worktree 包含允许的 committed、working 与 untracked submodule files，并只从独立初始化的 child Git worktree 继续 HEAD gitlink traversal；被普通目录替换的 gitlink 不会回到 parent worktree。
- Git command 失败时，current collection 进入 config-only fallback；匹配 product include 且未命中 exclude/generated rule 的 VCS-ignored path 仍可进入候选集合。fallback root 或 directory 无法读取时报告包含该目录的读取错误，而非静默返回 empty candidates。
- Config include、exclude directories 与 generated-file rules 在 fallback 中继续生效。
- Selected config 未排除的 built-in-default directory 不会被 fallback 隐式排除。

## Case ADD-JSON-VALIDATION-SCOPE-001: JSON eligibility is an exact subset of global scan scope

Owner: `docs/scan-scope.md#check-exact-inputs`
Entities:

- `bun|src/checks/json-validation/json-validation.test.ts|JSON validation default Check > filters only lower-case .json paths from global scope and returns exact final counts`
- `bun|src/checks/json-validation/json-validation.test.ts|JSON validation default Check > uses only the included global JSON paths without re-adding excluded or generated files`
- `bun|src/checks/json-validation/json-validation.test.ts|JSON validation default Check > is not applicable when global scope has no lower-case JSON input`

Proves:

- JSON validation filters only the existing global candidates with case-sensitive `.json` suffix matching; `.JSON`, non-JSON, excluded-directory, and generated paths are not eligible and no eligible path is rediscovered outside the resolved scope.

## Case ADD-JSON-SCHEMA-VALIDATION-SCOPE-001: Registered Schema inputs remain an exact declared subset

Owner: `docs/scan-scope.md#check-exact-inputs`
Entities:

- `bun|src/checks/json-schema-validation/json-schema-validation.test.ts|JSON Schema validation default Check > reports scope/document failures, blocks dependent bindings, and leaves zero bindings not applicable`

Proves:

- JSON Schema validation reads only declared schema/instance paths that belong to the current resolved global scope; an absent or excluded declaration becomes a safe `out-of-scope` issue without a discovery/read escape, while no bindings creates no document work.

## Case AUX-MARKDOWN-LINK-PARSER-001: Markdown Link parser produces closed source facts

Owner: `docs/scan-scope.md#markdown-link-source-occurrences`
Entities:

- `bun|src/checks/markdown-link-validation/markdown-parser.test.ts|Markdown link parser > collects GFM inline, image, reference, and autolink occurrences`
- `bun|src/checks/markdown-link-validation/markdown-parser.test.ts|Markdown link parser > generates fresh GitHub-compatible slugs for ATX and Setext headings`
- `bun|src/checks/markdown-link-validation/markdown-parser.test.ts|Markdown link parser > reports decoded UTF-16 source ranges with 1-based, end-exclusive positions`
- `bun|src/checks/markdown-link-validation/markdown-parser.test.ts|Markdown link parser > returns immutable facts and a controlled failure for malformed decoded text`
  Proves:
- Each eligible Markdown source yields only the documented Link occurrence grammar and heading facts; excluded Markdown forms and undefined references do not become target work.
- A fresh GitHub-priority heading slugger and decoded UTF-16 navigation range make anchor facts source-local and reproducible.
- Parser facts are immutable and malformed decoded input becomes a controlled failure rather than a partial source fact set.

## Case AUX-MARKDOWN-LINK-TARGET-001: Markdown Link resolves only bounded direct local targets

Owner: `docs/scan-scope.md#markdown-link-direct-targets`
Entities:

- `bun|src/checks/markdown-link-validation/local-resolver.test.ts|Markdown local resolver > reads only root-contained sources and returns their Link parser facts`
- `bun|src/checks/markdown-link-validation/local-resolver.test.ts|Markdown local resolver > resolves direct local files, directories, and same or cross-document anchors`
- `bun|src/checks/markdown-link-validation/local-resolver.test.ts|Markdown local resolver > gates lexical and symlink escapes before external work and accepts only strict file URIs`
- `bun|src/checks/markdown-link-validation/local-resolver.test.ts|Markdown local resolver > allows explicit validate mode and enforces the per-invocation direct target limit`
  Proves:
- Link reads only a contained source and then evaluates its direct file, directory, and anchor endpoint without recursively discovering target links.
- Root-external lexical paths, escaping symlinks, and accepted host-native `file:///` targets honor `ignore`, `report`, and explicit bounded `validate`; unsupported remote/path forms and malformed local components do not become external work.
- Same-document anchor facts do not consume target work, while direct endpoint validation is bounded once per occurrence and limit exhaustion remains a controlled failure.
