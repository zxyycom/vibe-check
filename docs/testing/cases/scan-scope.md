# scan-scope

## Case AUX-QUALITY-FINGERPRINT-001: Quality input fingerprint 稳定
Owner: `docs/scan-scope.md#职责边界`
Entities:
- `bun|src/product/quality-core/src/input/files.test.ts|quality input fingerprints > uses stable SHA-256 fingerprints for sorted file content`
Proves:
- quality input fingerprint 使用排序后的文件内容生成稳定 SHA-256。
- 文件内容变化会改变 fingerprint，文件顺序变化不会改变 fingerprint。

## Case AUX-QUALITY-GIT-PATHSPEC-001: Quality git pathspec 参数稳定
Owner: `docs/scan-scope.md#ignore-与-changed-file-scope`
Entities:
- `bun|src/product/quality-core/src/input/files.test.ts|quality input git pathspecs > builds explicit git pathspec arguments and can omit empty pathspecs`
Proves:
- quality input git pathspec 参数使用显式 `--` 分隔并保留 glob pathspec magic。
- 空 pathspec 可按调用方需要保留 `--` 或完全省略。

## Case WB-SCOPE-FILE-COLLECTION-001: Product current/baseline collection fallback 稳定
Owner: `docs/scan-scope.md#ignore-与-changed-file-scope`
Entities:
- `bun|src/product/quality-core/src/input/files.test.ts|quality input file collection > does not add built-in exclusions to the selected fallback config`
- `bun|src/product/quality-core/src/input/files.test.ts|quality input file collection > treats successful empty Git results as authoritative for current and baseline`
- `bun|src/product/quality-core/src/input/files.test.ts|quality input file collection > uses config-only fallback for current and baseline when Git fails`
Proves:
- Current 与 baseline Git command 成功时直接使用 normalized result，包括成功的空集合。
- Git command 失败时，current 与 baseline 都进入 config-only fallback；匹配 product include 且未命中 exclude/generated rule 的 VCS-ignored path 仍可进入候选集合。
- Config include、exclude directories 与 generated-file rules 在 fallback 中继续生效。
- Selected config 未排除的 built-in-default directory 不会被 fallback 隐式排除。
