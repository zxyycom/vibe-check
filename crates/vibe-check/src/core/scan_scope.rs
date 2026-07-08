use std::ffi::OsStr;
use std::path::{Component, Path};

use ignore::WalkBuilder;

use super::{DiagnosticRecord, DiagnosticSeverity};

const DEFAULT_EXCLUDED_COMPONENTS: &[&str] = &[
    ".git",
    "target",
    "node_modules",
    ".venv",
    "dist",
    "build",
    "vendor",
    "generated",
    ".cache",
    "cache",
];

const SUPPORTED_EXTENSIONS: &[&str] = &["rs", "ts", "tsx", "js", "jsx", "py", "go"];

pub(crate) trait ScopeCollector {
    fn collect(&self, project_root: &Path) -> Result<ScanScope, ScopeCollectionFailure>;
}

#[derive(Clone, Copy, Debug, Default)]
pub(crate) struct IgnoreScopeCollector;

impl ScopeCollector for IgnoreScopeCollector {
    fn collect(&self, project_root: &Path) -> Result<ScanScope, ScopeCollectionFailure> {
        let mut builder = WalkBuilder::new(project_root);
        builder.parents(false).git_global(false).filter_entry({
            let project_root = project_root.to_path_buf();
            move |entry| !has_default_excluded_component(entry.path(), &project_root)
        });

        let mut files = Vec::new();
        let mut diagnostics = Vec::new();

        for entry in builder.build() {
            let entry = match entry {
                Ok(entry) => entry,
                Err(error) => {
                    diagnostics.push(collection_diagnostic(
                        "SCAN_SCOPE_WALK",
                        format!("failed to walk scan scope: {error}"),
                    ));
                    continue;
                }
            };

            if let Some(error) = entry.error() {
                diagnostics.push(collection_diagnostic(
                    "SCAN_SCOPE_IGNORE",
                    format!(
                        "failed to process ignore rules near {}: {error}",
                        normalize_scope_path(entry.path(), project_root)
                    ),
                ));
            }

            if !entry
                .file_type()
                .is_some_and(|file_type| file_type.is_file())
            {
                continue;
            }

            files.push(ScopeFile::new(
                normalize_scope_path(entry.path(), project_root),
                is_supported_file(entry.path()),
            ));
        }

        files.sort_by(|left, right| left.path.cmp(&right.path));
        Ok(ScanScope::new(files, diagnostics))
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct ScanScope {
    files: Vec<ScopeFile>,
    diagnostics: Vec<DiagnosticRecord>,
}

impl ScanScope {
    pub(crate) fn new(files: Vec<ScopeFile>, diagnostics: Vec<DiagnosticRecord>) -> Self {
        Self { files, diagnostics }
    }

    pub(crate) fn file_count(&self) -> u64 {
        self.files.len() as u64
    }

    pub(crate) fn supported_file_count(&self) -> u64 {
        self.files
            .iter()
            .filter(|file| file.kind == ScopeFileKind::Supported)
            .count() as u64
    }

    pub(crate) fn supported_file_paths(&self) -> Vec<String> {
        self.files
            .iter()
            .filter(|file| file.kind == ScopeFileKind::Supported)
            .map(|file| file.path.clone())
            .collect()
    }

    pub(crate) fn into_diagnostics(self) -> Vec<DiagnosticRecord> {
        self.diagnostics
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct ScopeFile {
    path: String,
    kind: ScopeFileKind,
}

impl ScopeFile {
    #[cfg(test)]
    pub(crate) fn supported(path: impl Into<String>) -> Self {
        Self::new(path.into(), true)
    }

    #[cfg(test)]
    pub(crate) fn unsupported(path: impl Into<String>) -> Self {
        Self::new(path.into(), false)
    }

    fn new(path: String, supported: bool) -> Self {
        let kind = if supported {
            ScopeFileKind::Supported
        } else {
            ScopeFileKind::Unsupported
        };
        Self { path, kind }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum ScopeFileKind {
    Supported,
    Unsupported,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct ScopeCollectionFailure {
    message: String,
}

impl ScopeCollectionFailure {
    #[cfg(test)]
    pub(crate) fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }

    pub(crate) fn message(&self) -> &str {
        &self.message
    }
}

fn collection_diagnostic(code: impl Into<String>, message: impl Into<String>) -> DiagnosticRecord {
    DiagnosticRecord {
        severity: DiagnosticSeverity::Warning,
        code: code.into(),
        message: message.into(),
    }
}

fn has_default_excluded_component(path: &Path, project_root: &Path) -> bool {
    let relative = path.strip_prefix(project_root).unwrap_or(path);
    relative.components().any(|component| match component {
        Component::Normal(part) => DEFAULT_EXCLUDED_COMPONENTS
            .iter()
            .any(|excluded| part == OsStr::new(excluded)),
        _ => false,
    })
}

fn is_supported_file(path: &Path) -> bool {
    path.extension()
        .and_then(OsStr::to_str)
        .is_some_and(|extension| {
            SUPPORTED_EXTENSIONS
                .iter()
                .any(|supported| extension.eq_ignore_ascii_case(supported))
        })
}

fn normalize_scope_path(path: &Path, project_root: &Path) -> String {
    let relative = path.strip_prefix(project_root).unwrap_or(path);
    let parts = relative
        .components()
        .map(|component| component.as_os_str().to_string_lossy())
        .collect::<Vec<_>>();
    if parts.is_empty() {
        ".".to_owned()
    } else {
        parts.join("/")
    }
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::{is_supported_file, ScanScope, ScopeFile};

    // @case WB-SCOPE-CLASSIFY-001
    #[test]
    fn supported_file_classification_covers_mvp_extensions() {
        for path in [
            "lib.rs",
            "app.ts",
            "view.tsx",
            "main.js",
            "component.jsx",
            "script.py",
            "main.go",
        ] {
            assert!(
                is_supported_file(Path::new(path)),
                "{path} should be supported"
            );
        }

        assert!(!is_supported_file(Path::new("README.md")));
    }

    #[test]
    fn scope_counts_supported_and_unsupported_files_separately() {
        let scope = ScanScope::new(
            vec![
                ScopeFile::supported("src/lib.rs"),
                ScopeFile::unsupported("README.md"),
            ],
            Vec::new(),
        );

        assert_eq!(scope.file_count(), 2);
        assert_eq!(scope.supported_file_count(), 1);
        assert_eq!(scope.supported_file_paths(), vec!["src/lib.rs"]);
    }
}
