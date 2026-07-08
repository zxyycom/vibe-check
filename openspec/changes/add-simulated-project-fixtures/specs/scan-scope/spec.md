## MODIFIED Requirements

### Requirement: Supported file classification
Scan scope collection SHALL classify collected ordinary files into supported and unsupported files. MVP supported files MUST include only Rust, TypeScript, Python, and Go source files identified by `.rs`, `.ts`, `.py`, and `.go` extensions. TypeScript JSX, JavaScript, JSX, and other non-MVP language files, including `.tsx`, `.js`, and `.jsx`, SHALL count toward `scope.file_count` when collected but SHALL NOT count toward `scope.supported_file_count`.

#### Scenario: Supported languages are counted separately
- **WHEN** a project root contains `src/lib.rs`, `src/app.ts`, `src/main.py`, `main.go`, `src/view.tsx`, `src/main.js`, `src/component.jsx`, and `README.md`
- **THEN** `scope.file_count` includes all collected ordinary files
- **AND** `scope.supported_file_count` includes only `.rs`, `.ts`, `.py`, and `.go` source files

#### Scenario: Unsupported files are not diagnostics
- **WHEN** a project root contains unsupported ordinary files that are otherwise readable
- **THEN** scan completes without adding diagnostics solely because those files are unsupported
