# scan-scope Specification

## Purpose
Define how Vibe Check constructs scan scope before metric and scanner adapters run, including file collection ownership, default exclusions, supported file classification, ignore rule handling, recoverable diagnostics, and fatal collection failures.

## Requirements
### Requirement: Scan scope owner documentation
Scan scope behavior SHALL have a long-term owner document under `docs/` that records file collection ownership, default exclusions, supported file classification, ignore rule handling, generated/vendor/cache path boundaries, recoverable diagnostics, fatal collection failures, and verification expectations. `docs/navigation.md` MUST reference this owner document.

#### Scenario: Navigation points to scan scope owner
- **WHEN** reviewer uses `docs/navigation.md` to locate file collection and scan scope rules
- **THEN** the navigation document points to the scan scope owner document

### Requirement: Real project file collection
Core scan pipeline SHALL collect ordinary files under the normalized project root before invoking metric or scanner adapters. The collected scope MUST be independent of output format, and MUST produce the same report data for human and JSON projection.

#### Scenario: Scan counts ordinary project files
- **WHEN** a project root contains ordinary source files that are not ignored or excluded
- **THEN** `vibe-check scan --format json` reports `run.mode` as `scanner` and `scope.file_count` as the number of collected ordinary files

#### Scenario: Output format does not change scope
- **WHEN** the same project root is scanned with `--format human` and `--format json`
- **THEN** both outputs are projected from report data with the same scan scope counts

### Requirement: Default exclusion baseline
Scan scope collection SHALL apply Vibe Check default exclusions for VCS, dependency, build, virtual environment, generated, vendor and cache directories before counting files. The default baseline MUST exclude at least `.git`, `target`, `node_modules`, `.venv`, `dist`, `build`, `vendor`, `generated`, `.cache`, and `cache` path components.

#### Scenario: Default excluded directories are not counted
- **WHEN** a project root contains files only under `.git`, `target`, `node_modules`, `.venv`, `dist`, `build`, `vendor`, `generated`, `.cache`, or `cache`
- **THEN** those files are not included in `scope.file_count` or `scope.supported_file_count`

### Requirement: Ignore file handling
Scan scope collection SHALL respect supported VCS ignore rules for files under the project root. Files ignored by those rules MUST NOT be included in `scope.file_count` or `scope.supported_file_count`.

#### Scenario: Gitignore excludes matching files
- **WHEN** a project root contains a `.gitignore` rule that ignores `generated.js`
- **THEN** `generated.js` is not included in the scan scope counts

### Requirement: Supported file classification
Scan scope collection SHALL classify collected ordinary files into supported and unsupported files. MVP supported files MUST include Rust, TypeScript, JavaScript, Python and Go source files identified by `.rs`, `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, and `.go` extensions. Unsupported files SHALL count toward `scope.file_count` but SHALL NOT count toward `scope.supported_file_count`.

#### Scenario: Supported languages are counted separately
- **WHEN** a project root contains `src/lib.rs`, `src/app.ts`, `src/view.tsx`, `src/main.py`, `main.go`, and `README.md`
- **THEN** `scope.file_count` includes all six collected ordinary files
- **AND** `scope.supported_file_count` includes only the supported source files

#### Scenario: Unsupported files are not diagnostics
- **WHEN** a project root contains unsupported ordinary files that are otherwise readable
- **THEN** scan completes without adding diagnostics solely because those files are unsupported

### Requirement: Recoverable collection diagnostics
Scan scope collection SHALL map recoverable file collection problems, including walk errors and ignore parsing problems, into normalized diagnostics when report data can still be produced. Reports with recoverable collection diagnostics MUST set summary status to `partial` and increment `summary.diagnostic_count`.

#### Scenario: Recoverable walk error produces partial report
- **WHEN** scan scope collection encounters a recoverable walk error after collecting other files
- **THEN** scan completes with a JSON report containing a diagnostic
- **AND** `summary.status` is `partial`

### Requirement: Fatal collection failures
After CLI has normalized and accepted the project root, scan scope collection SHALL report a scanner fatal error when the collector cannot initialize or collection fails before report data can be produced. Fatal collection failures MUST NOT write a scan report to stdout.

#### Scenario: Collection cannot produce report
- **WHEN** scan scope collection receives a normalized project root but cannot initialize or cannot produce report data
- **THEN** CLI exits with the scanner fatal exit code
- **AND** stdout does not contain a human or JSON scan report
