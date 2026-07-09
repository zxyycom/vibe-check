## MODIFIED Requirements

### Requirement: Supported file classification
Scan scope collection SHALL classify collected ordinary files into supported and unsupported files. MVP supported files MUST include only TypeScript, Go, Rust, and Python source files identified by final `.ts`, `.go`, `.rs`, and `.py` extensions. TypeScript JSX, JavaScript, JSX, and other non-MVP language files, including `.tsx`, `.js`, and `.jsx`, SHALL count toward `scope.file_count` when collected but SHALL NOT count toward `scope.supported_file_count`.

#### Scenario: Supported languages are counted separately
- **WHEN** a project root contains `src/app.ts`, `main.go`, `src/lib.rs`, `src/main.py`, `src/view.tsx`, `src/main.js`, `src/component.jsx`, and `README.md`
- **THEN** `scope.file_count` includes all collected ordinary files that are not ignored or excluded
- **AND** `scope.supported_file_count` includes only `.ts`, `.go`, `.rs`, and `.py` source files

#### Scenario: TypeScript declaration files follow extension classification
- **WHEN** a project root contains collected ordinary file `src/types.d.ts`
- **THEN** scan scope classifies `src/types.d.ts` as a TypeScript supported file because its final extension is `.ts`

#### Scenario: Unsupported files are not diagnostics
- **WHEN** a project root contains unsupported ordinary files that are otherwise readable
- **THEN** scan completes without adding diagnostics solely because those files are unsupported
