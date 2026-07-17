## MODIFIED Requirements

### Requirement: Real project file collection
Core scan pipeline SHALL 从 normalized project root 下的 pinned product config include paths 构造 scan scope。Collection MUST 先运行 `git ls-files --cached --others --exclude-standard` 取得候选 paths；该命令失败时 SHALL 保持现有提示并使用 pinned fallback walker。Collection result SHALL 继续交给现有 config exclude、generated-file 与 code-area rules，而不得为源码上移新增 output-mode 或 Rust report-counter semantics。

#### Scenario: Git-first collection uses configured include paths
- **WHEN** project root 可由 Git collection 读取且 configured include paths 包含 ordinary project files
- **THEN** core 从 `git ls-files --cached --others --exclude-standard` 返回的候选 paths 构造 scope
- **AND** 只保留符合 pinned product config scope rules 的 paths

#### Scenario: Git failure uses the existing fallback
- **WHEN** Git collection command 失败
- **THEN** core 保持 pinned consumer 的 fallback 提示并使用现有 fallback walker
- **AND** fallback 不被重新分类为 Rust scanner-fatal outcome

### Requirement: Default exclusion baseline
Scan scope collection SHALL 在构造 scanner exact inputs 前应用 pinned product config 的 exclude directories、generated-file globs 和 code-area boundaries。源码上移 MUST 保持这些配置值与 precedence，不得从 Rust scope counters 推导或增加另一套默认排除。

#### Scenario: Configured exclusions do not reach scanner inputs
- **WHEN** candidate path 匹配 pinned product config 的 excluded directory 或 generated-file rule
- **THEN** 该 path 不进入 normalized scanner exact inputs
- **AND** collection 不需要生成 Rust `scope.file_count` 或 `scope.supported_file_count`

### Requirement: Ignore file handling
Scan scope 的 primary Git collection SHALL 通过 `--exclude-standard` 保持 VCS ignore behavior。Git collection 不可用时，core SHALL 保持 pinned fallback walker 的现有 semantics，而 MUST NOT 为源码上移发明 VCS-ignore parity、ignore-parse diagnostic 或 partial-report contract。

#### Scenario: Primary Git collection respects ignored paths
- **WHEN** primary Git collection 可用且 VCS ignore rules 排除一个 path
- **THEN** 该 path 不出现在 Git collection 返回的 normalized candidates 中

#### Scenario: Fallback keeps its existing boundary
- **WHEN** primary Git collection 失败并启用 fallback walker
- **THEN** core 使用 pinned fallback semantics
- **AND** 不产生 Rust normalized ignore diagnostic 或 partial report

## REMOVED Requirements

### Requirement: Supported file classification
**Reason**: Rust requirement 定义全局 `.ts` / `.go` / `.rs` / `.py` supported set 和 scope counters；pinned TypeScript product 使用 config-driven collection 与 scanner-specific selectors。

**Migration**: Python/Lizard selector 由 `structural-scanning` delta 维护，jscpd code-area selector 由 `duplicate-scanning` delta 维护；不创建全局四语言 classification。

### Requirement: Recoverable collection diagnostics
**Reason**: Rust normalized diagnostic、`partial` status 与 diagnostic counter 不存在于 pinned TypeScript Git-first/fallback collection contract。

**Migration**: 保持上方 Git failure notice 与 pinned fallback behavior；不新增 normalized collection diagnostic。

### Requirement: Fatal collection failures
**Reason**: 该 requirement 将 collector initialization failure 绑定到 Rust scanner-fatal exit 和 human/JSON stdout suppression，不是 pinned TypeScript collection/error mapping。

**Migration**: 保持 pinned TypeScript top-level error、console、artifact 和 status behavior；不移植 Rust fatal classification。
