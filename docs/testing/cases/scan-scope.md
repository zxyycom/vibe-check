# scan-scope

## Case AUX-QUALITY-FINGERPRINT-001: Quality input fingerprint 稳定

Owner: `docs/scan-scope.md#exact-input-fingerprint`
Entities:

- `bun|src/package-checks/project-files/file-fingerprint.test.ts|quality input fingerprints > uses stable SHA-256 fingerprints for sorted file content`
  Proves:
- quality input fingerprint 使用排序后的文件内容生成稳定 SHA-256。
- 文件内容变化会改变 fingerprint，文件顺序变化不会改变 fingerprint。

## Case WB-SCOPE-GIT-CANDIDATES-001: Git worktree candidate identity 与 config glob 语义稳定

Owner: `docs/scan-scope.md#file-collection-mechanism`
Entities:

- `bun|src/package-checks/project-files/collection.test.ts|quality input file collection > preserves NUL-delimited Git candidate paths containing newlines`
- `bun|src/package-checks/project-files/collection.test.ts|quality input file collection > uses the same minimatch semantics for Git and filesystem candidates`
- `bun|src/package-checks/project-files/collection.test.ts|quality input file collection > treats successful empty Git results as authoritative`
- `bun|src/package-checks/project-files/collection.test.ts|quality submodule input > includes initialized current submodule worktree files`
- `bun|src/package-checks/project-files/collection.test.ts|quality submodule input > does not re-enter parent from a replaced HEAD gitlink`
  Proves:
- Git 只以 NUL-delimited protocol 枚举 ignore-aware candidate paths，换行不会改变文件身份。
- include/exclude 只由同一个 config glob contract 解释；brace、globstar 与 dot-path semantics 不因 explicit source 改变。
- Git 成功空输出是合法空候选；已初始化的子 worktree 文件可下沉。
- gitlink 目录本身不成为文件候选；被普通目录替换的 gitlink 也不会回到父 worktree。

## Case WB-SCOPE-FILE-COLLECTION-001: Product explicit file sources 与 named selections 稳定

Owner: `docs/scan-scope.md#file-collection-mechanism`
Entities:

- `bun|src/package-checks/project-files/collection.test.ts|quality input file collection > enumerates the filesystem independently of Git ignore rules`
- `bun|src/package-checks/project-files/collection.test.ts|quality input file collection > fails closed when the selected Git source is unavailable`
- `bun|src/package-checks/project-files/collection.test.ts|quality input file collection > does not add exclusions outside the selected filesystem config`
- `bun|src/package-checks/project-files/collection.test.ts|quality input file collection > resolves multiple filesystem sets from one named selection call`
- `bun|src/package-checks/project-files/collection.test.ts|quality input file collection > applies explicit default exclusions while retaining other dot files`
- `bun|src/package-checks/project-files/input-eligibility.test.ts|project file eligibility partition > assigns every selected path once while preserving accepted and rejected order`
  Proves:
- Filesystem source 不解释 `.gitignore`，只应用 selection 自己的 include/exclude；公开、深冻结的默认 selection 明确移除 common VCS/Product state、dependency、build/generated、cache、coverage、log、temporary 与 virtual-environment paths，同时其它 dot files 仍可选择。
- 每个明确选择的来源都在失败时停止，不会在 Git 与 filesystem 之间自动切换；目录读取或 Git 来源失败与合法空集合不同。
- 一个 named-selection 调用可从同一 source snapshot 形成多个稳定 file sets，且不会增加 config 之外的 hidden exclusions。
- Check-owned eligibility partition 按 selected 顺序只评估每个 path 一次，并把它恰好保留在 accepted 或 rejected 一侧；结果与两侧数组均冻结。

## Case ADD-FUNCTION-METRICS-LIZARD-SCOPE-001: Function metrics selects exactly Lizard-supported source inputs

Owner: `docs/scan-scope.md#package-provided-check-exact-inputs`
Entities:

- `bun|src/package-checks/function-metrics/target-files.test.ts|Lizard target files > selects every Lizard 1.23-supported extension case-insensitively and excludes fallback inputs`
- `bun|src/package-checks/function-metrics/constructor.input-rejection.test.ts|functionMetrics area findings > reports every rejected selected path once and sends only accepted paths to Lizard`
- `bun|src/package-checks/function-metrics/constructor.input-rejection.test.ts|functionMetrics area findings > does not start Lizard when every selected path is rejected`

Proves:

- function-metrics derives precise default globs and runtime acceptance from every extension supported by Lizard 1.23.0's official language readers, using the same case-insensitive semantics.
- Explicitly selected unsupported Markdown, JSON, YAML or extensionless inputs each produce one area-aware rejection Record instead of reaching Lizard's C-like fallback; all-rejected input completes without starting Lizard.

## Case ADD-JSON-VALIDATION-SCOPE-001: JSON eligibility is an exact subset of its Check-owned file selection

Owner: `docs/scan-scope.md#package-provided-check-exact-inputs`
Entities:

- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > reports selected non-JSON paths and returns exact mixed final counts`
- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > uses only its included JSON paths without re-adding excluded paths`
- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > settles all rejected selected inputs as non-blocking findings`
- `bun|src/package-checks/json-validation/json-validation.test.ts|JSON validation default Check > is not applicable only when its file selection is empty`

Proves:

- JSON validation defaults to a precise lower-case `.json` include and classifies only its own selected candidates with the same case-sensitive suffix rule; excluded or out-of-selection paths are never rediscovered.
- Every selected `.JSON` or other unsupported path becomes a non-blocking rejection fact, including all-rejected input; only a genuinely empty selected set is not applicable.

## Case ADD-JSON-SCHEMA-VALIDATION-SCOPE-001: Registered Schema inputs remain an exact declared subset

Owner: `docs/scan-scope.md#package-provided-check-exact-inputs`
Entities:

- `bun|src/package-checks/json-schema-validation/json-schema-validation.identity-and-scope.test.ts|JSON Schema validation default Check > reports scope/document failures, blocks dependent bindings, and leaves zero bindings not applicable`

Proves:

- JSON Schema validation reads only declared schema/instance paths that belong to the current Check-owned file selection; an absent or excluded declaration becomes a safe `out-of-scope` issue without a discovery/read escape, while no bindings creates no document work.

## Case AUX-MARKDOWN-LINK-PARSER-001: Markdown Link parser produces closed source facts

Owner: `docs/scan-scope.md#markdown-link-source-occurrences`
Entities:

- `bun|src/package-checks/markdown-link-validation/markdown-parser.test.ts|Markdown link parser > collects GFM inline, image, reference, and autolink occurrences`
- `bun|src/package-checks/markdown-link-validation/markdown-parser.test.ts|Markdown link parser > generates fresh GitHub-compatible slugs for ATX and Setext headings`
- `bun|src/package-checks/markdown-link-validation/markdown-parser.test.ts|Markdown link parser > reports decoded UTF-16 source ranges with 1-based, end-exclusive positions`
- `bun|src/package-checks/markdown-link-validation/markdown-parser.test.ts|Markdown link parser > returns immutable facts and a controlled failure for malformed decoded text`
- `bun|src/package-checks/markdown-link-validation/parse-facts-cache.test.ts|Markdown Link parse-facts cache > restores only closed immutable parser facts`
- `bun|src/package-checks/markdown-link-validation/parse-facts-cache.test.ts|Markdown Link parse-facts cache > invalidates entries written for a different parser-contract version`
- `bun|src/package-checks/markdown-link-validation/parse-facts-cache.test.ts|Markdown Link parse-facts cache > awaits the append once publication has started despite later cancellation`
- `bun|src/package-checks/markdown-link-validation/parse-facts-cache.test.ts|Markdown Link parse-facts cache > ignores malformed, unknown, and unterminated lines while last valid identity wins`
- `bun|src/package-checks/markdown-link-validation/parse-facts-cache.test.ts|Markdown Link parse-facts cache > rejects cached facts when the exact source bytes are not valid UTF-8`
  Proves:
- Each eligible Markdown source yields only the documented Link occurrence grammar and heading facts; excluded Markdown forms and undefined references do not become target work.
- A fresh GitHub-priority heading slugger and decoded UTF-16 navigation range make anchor facts source-local and reproducible.
- Parser facts are immutable and malformed decoded input becomes a controlled failure rather than a partial source fact set. Link-private JSONL state accepts only bounded, closed immutable current-version envelopes; malformed, unknown, and unterminated lines are ignored, duplicate valid identities use the final valid facts, repeated fresh identities reuse the invocation-local dirty facts before one publication, publication already committed to append completes despite later cancellation, and a forged exact-byte cache hit cannot bypass the fatal UTF-8 boundary.

## Case AUX-MARKDOWN-LINK-TARGET-001: Markdown Link resolves only bounded direct local targets

Owner: `docs/scan-scope.md#markdown-link-direct-targets`
Entities:

- `bun|src/package-checks/markdown-link-validation/local-resolver.test.ts|Markdown local resolver > reads only root-contained sources and returns their Link parser facts`
- `bun|src/package-checks/markdown-link-validation/local-resolver.test.ts|Markdown local resolver > resolves direct local files, directories, and same or cross-document anchors`
- `bun|src/package-checks/markdown-link-validation/local-resolver.test.ts|Markdown local resolver > gates lexical and symlink escapes before external work and accepts only strict file URIs`
- `bun|src/package-checks/markdown-link-validation/local-resolver.test.ts|Markdown local resolver > allows explicit validate mode and enforces the per-invocation direct target limit`
- `bun|src/package-checks/markdown-link-validation/local-resolver.test.ts|Markdown local resolver > memoizes successful canonical Markdown targets without changing logical target limits`
- `bun|src/package-checks/markdown-link-validation/local-resolver.test.ts|Markdown local resolver > does not retain an unavailable Markdown target parse for a later occurrence`
  Proves:
- Link reads only a contained source and then evaluates its direct file, directory, and anchor endpoint without recursively discovering target links.
- Root-external lexical paths, escaping symlinks, and accepted host-native `file:///` targets honor `ignore`, `report`, and explicit bounded `validate`; unsupported remote/path forms and malformed local components do not become external work.
- Same-document anchor facts do not consume target work. A per-invocation memo can reuse only a successful canonical cross-document Markdown target snapshot, while every occurrence still independently consumes target work and limit exhaustion remains a controlled failure; unavailable targets are not retained.
