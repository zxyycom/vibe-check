use std::collections::BTreeMap;
use std::ffi::OsStr;
use std::path::Path;

use serde::{Serialize, Serializer};

use super::{
    DiagnosticRecord, DiagnosticSeverity, GateResult, GateStatus, MetricsSummary, WarningFinding,
    WarningSeverity,
};

const METRICS_LOC_PARTIAL_CODE: &str = "METRICS_LOC_PARTIAL";
const TOO_MANY_LINES_RULE: &str = "file.too_many_lines";
const MEDIUM_LINE_THRESHOLD: u64 = 400;
const HIGH_LINE_THRESHOLD: u64 = 800;

pub(crate) trait LocMetricsAdapter {
    fn measure(
        &self,
        project_root: &Path,
        supported_files: &[String],
    ) -> Result<MetricsOutcome, MetricsFailure>;
}

#[derive(Clone, Copy, Debug, Default)]
pub(crate) struct TokeiLocMetricsAdapter;

impl LocMetricsAdapter for TokeiLocMetricsAdapter {
    fn measure(
        &self,
        project_root: &Path,
        supported_files: &[String],
    ) -> Result<MetricsOutcome, MetricsFailure> {
        let config = tokei::Config::default();
        let mut files = Vec::new();
        let mut diagnostics = Vec::new();

        for file in supported_files {
            let absolute_path = project_root.join(file);
            let Some(tokei_language) = tokei::LanguageType::from_path(&absolute_path, &config)
            else {
                diagnostics.push(loc_diagnostic(
                    file,
                    "file extension is supported by Vibe Check but not recognized by tokei",
                ));
                continue;
            };
            let Some(language) = LanguageId::from_path(file) else {
                diagnostics.push(loc_diagnostic(
                    file,
                    "file has no Vibe Check language mapping",
                ));
                continue;
            };

            match tokei_language.parse(absolute_path, &config) {
                Ok(report) => {
                    let stats = report.stats.summarise();
                    files.push(FileMetrics {
                        file: file.clone(),
                        language,
                        total_lines: stats.lines() as u64,
                        code_lines: stats.code as u64,
                        comment_lines: stats.comments as u64,
                        blank_lines: stats.blanks as u64,
                    });
                }
                Err((error, _path)) => {
                    diagnostics.push(loc_diagnostic(
                        file,
                        format!("failed to read file: {error}"),
                    ));
                }
            }
        }

        Ok(MetricsOutcome { files, diagnostics })
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct MetricsOutcome {
    pub(crate) files: Vec<FileMetrics>,
    pub(crate) diagnostics: Vec<DiagnosticRecord>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct MetricsFailure {
    message: String,
}

impl MetricsFailure {
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

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct FileMetrics {
    pub(crate) file: String,
    pub(crate) language: LanguageId,
    pub(crate) total_lines: u64,
    pub(crate) code_lines: u64,
    pub(crate) comment_lines: u64,
    pub(crate) blank_lines: u64,
}

impl FileMetrics {
    #[cfg(test)]
    pub(crate) fn new(
        file: impl Into<String>,
        language: LanguageId,
        total_lines: u64,
        code_lines: u64,
        comment_lines: u64,
        blank_lines: u64,
    ) -> Self {
        Self {
            file: file.into(),
            language,
            total_lines,
            code_lines,
            comment_lines,
            blank_lines,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) enum LanguageId {
    Go,
    JavaScript,
    Python,
    Rust,
    TypeScript,
}

impl LanguageId {
    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::Go => "go",
            Self::JavaScript => "javascript",
            Self::Python => "python",
            Self::Rust => "rust",
            Self::TypeScript => "typescript",
        }
    }

    fn from_path(path: impl AsRef<Path>) -> Option<Self> {
        match path.as_ref().extension().and_then(OsStr::to_str) {
            Some(extension) if extension.eq_ignore_ascii_case("go") => Some(Self::Go),
            Some(extension)
                if extension.eq_ignore_ascii_case("js")
                    || extension.eq_ignore_ascii_case("jsx") =>
            {
                Some(Self::JavaScript)
            }
            Some(extension) if extension.eq_ignore_ascii_case("py") => Some(Self::Python),
            Some(extension) if extension.eq_ignore_ascii_case("rs") => Some(Self::Rust),
            Some(extension)
                if extension.eq_ignore_ascii_case("ts")
                    || extension.eq_ignore_ascii_case("tsx") =>
            {
                Some(Self::TypeScript)
            }
            _ => None,
        }
    }
}

impl Serialize for LanguageId {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.as_str())
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub(crate) struct LanguageMetricsSummary {
    pub(crate) language: LanguageId,
    pub(crate) file_count: u64,
    pub(crate) total_lines: u64,
    pub(crate) code_lines: u64,
    pub(crate) comment_lines: u64,
    pub(crate) blank_lines: u64,
}

pub(crate) fn aggregate_metrics(files: &[FileMetrics]) -> MetricsSummary {
    let mut languages = BTreeMap::<LanguageId, LanguageMetricsSummary>::new();
    let mut summary = MetricsSummary {
        supported_scanner_findings: files.len() as u64,
        files_measured: files.len() as u64,
        total_lines: 0,
        code_lines: 0,
        comment_lines: 0,
        blank_lines: 0,
        languages: Vec::new(),
    };

    for file in files {
        summary.total_lines += file.total_lines;
        summary.code_lines += file.code_lines;
        summary.comment_lines += file.comment_lines;
        summary.blank_lines += file.blank_lines;

        let language = languages
            .entry(file.language)
            .or_insert(LanguageMetricsSummary {
                language: file.language,
                file_count: 0,
                total_lines: 0,
                code_lines: 0,
                comment_lines: 0,
                blank_lines: 0,
            });
        language.file_count += 1;
        language.total_lines += file.total_lines;
        language.code_lines += file.code_lines;
        language.comment_lines += file.comment_lines;
        language.blank_lines += file.blank_lines;
    }

    summary.languages = languages.into_values().collect();
    summary
}

pub(crate) fn generate_warnings(files: &[FileMetrics]) -> Vec<WarningFinding> {
    files
        .iter()
        .filter_map(|file| {
            let (severity, threshold, blocking) = if file.total_lines >= HIGH_LINE_THRESHOLD {
                (WarningSeverity::High, HIGH_LINE_THRESHOLD, true)
            } else if file.total_lines >= MEDIUM_LINE_THRESHOLD {
                (WarningSeverity::Medium, MEDIUM_LINE_THRESHOLD, false)
            } else {
                return None;
            };

            Some(WarningFinding {
                file: file.file.clone(),
                location: "file".to_owned(),
                severity,
                rule: TOO_MANY_LINES_RULE.to_owned(),
                message: format!(
                    "File has {} total lines, meeting the {threshold}-line threshold.",
                    file.total_lines
                ),
                accepted: false,
                suppressed: false,
                blocking,
            })
        })
        .collect()
}

pub(crate) fn gate_from_warnings(warnings: &[WarningFinding]) -> GateResult {
    let blocking_warnings = warnings.iter().filter(|warning| warning.blocking).count() as u64;
    GateResult {
        status: if blocking_warnings > 0 {
            GateStatus::Failed
        } else {
            GateStatus::Passed
        },
        blocking_warnings,
    }
}

fn loc_diagnostic(file: &str, message: impl Into<String>) -> DiagnosticRecord {
    DiagnosticRecord {
        severity: DiagnosticSeverity::Warning,
        code: METRICS_LOC_PARTIAL_CODE.to_owned(),
        message: format!("failed to measure LOC for {file}: {}", message.into()),
    }
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::{
        aggregate_metrics, gate_from_warnings, generate_warnings, FileMetrics, LanguageId,
        LocMetricsAdapter, TokeiLocMetricsAdapter,
    };

    fn test_dir(name: &str) -> PathBuf {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time")
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "vibe-check-metrics-{name}-{}-{now}",
            std::process::id()
        ));
        fs::create_dir_all(&path).expect("create temp dir");
        path
    }

    fn write_file(path: &Path, contents: &str) {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).expect("create parent dir");
        }
        fs::write(path, contents).expect("write file");
    }

    #[test]
    fn aggregation_counts_files_totals_and_languages() {
        let metrics = aggregate_metrics(&[
            FileMetrics::new("src/lib.rs", LanguageId::Rust, 3, 1, 1, 1),
            FileMetrics::new("tools/main.py", LanguageId::Python, 5, 3, 1, 1),
            FileMetrics::new("src/bin.rs", LanguageId::Rust, 2, 2, 0, 0),
        ]);

        assert_eq!(metrics.supported_scanner_findings, 3);
        assert_eq!(metrics.files_measured, 3);
        assert_eq!(metrics.total_lines, 10);
        assert_eq!(metrics.code_lines, 6);
        assert_eq!(metrics.comment_lines, 2);
        assert_eq!(metrics.blank_lines, 2);
        assert_eq!(
            metrics
                .languages
                .iter()
                .map(|language| language.language.as_str())
                .collect::<Vec<_>>(),
            vec!["python", "rust"]
        );
        assert_eq!(metrics.languages[0].file_count, 1);
        assert_eq!(metrics.languages[1].file_count, 2);
    }

    #[test]
    fn file_size_warnings_cover_small_medium_and_blocking_files() {
        let warnings = generate_warnings(&[
            FileMetrics::new("small.rs", LanguageId::Rust, 399, 399, 0, 0),
            FileMetrics::new("medium.rs", LanguageId::Rust, 400, 400, 0, 0),
            FileMetrics::new("large.rs", LanguageId::Rust, 800, 800, 0, 0),
        ]);

        assert_eq!(warnings.len(), 2);
        assert_eq!(warnings[0].file, "medium.rs");
        assert_eq!(warnings[0].location, "file");
        assert_eq!(warnings[0].severity.as_str(), "medium");
        assert_eq!(warnings[0].rule, "file.too_many_lines");
        assert!(!warnings[0].blocking);
        assert!(warnings[0].message.contains("400 total lines"));
        assert!(warnings[0].message.contains("400-line threshold"));

        assert_eq!(warnings[1].file, "large.rs");
        assert_eq!(warnings[1].severity.as_str(), "high");
        assert!(warnings[1].blocking);
        assert!(warnings[1].message.contains("800 total lines"));
        assert!(warnings[1].message.contains("800-line threshold"));
    }

    #[test]
    fn gate_uses_only_blocking_warnings() {
        let non_blocking = generate_warnings(&[FileMetrics::new(
            "medium.rs",
            LanguageId::Rust,
            400,
            400,
            0,
            0,
        )]);
        let passing_gate = gate_from_warnings(&non_blocking);
        assert_eq!(passing_gate.status.as_str(), "passed");
        assert_eq!(passing_gate.blocking_warnings, 0);

        let blocking = generate_warnings(&[FileMetrics::new(
            "large.rs",
            LanguageId::Rust,
            800,
            800,
            0,
            0,
        )]);
        let failing_gate = gate_from_warnings(&blocking);
        assert_eq!(failing_gate.status.as_str(), "failed");
        assert_eq!(failing_gate.blocking_warnings, 1);
    }

    #[test]
    fn tokei_adapter_measures_supported_language_fixtures() {
        let project = test_dir("tokei-fixtures");
        let fixtures = [
            (
                "src/lib.rs",
                "// comment\n\nfn main() {}\n",
                LanguageId::Rust,
            ),
            (
                "src/app.ts",
                "// comment\n\nexport const value = 1;\n",
                LanguageId::TypeScript,
            ),
            (
                "src/main.js",
                "// comment\n\nconsole.log('hello');\n",
                LanguageId::JavaScript,
            ),
            (
                "tools/script.py",
                "# comment\n\nprint('hello')\n",
                LanguageId::Python,
            ),
            ("main.go", "// comment\n\npackage main\n", LanguageId::Go),
        ];
        for (path, contents, _) in fixtures {
            write_file(&project.join(path), contents);
        }
        let supported_files = fixtures
            .iter()
            .map(|(path, _, _)| (*path).to_owned())
            .collect::<Vec<_>>();

        let outcome = TokeiLocMetricsAdapter
            .measure(&project, &supported_files)
            .expect("metrics outcome");

        assert!(outcome.diagnostics.is_empty());
        assert_eq!(outcome.files.len(), fixtures.len());
        for (path, _, language) in fixtures {
            let file = outcome
                .files
                .iter()
                .find(|metrics| metrics.file == path)
                .expect("file metrics");
            assert_eq!(file.language, language);
            assert_eq!(file.total_lines, 3);
            assert_eq!(file.code_lines, 1);
            assert_eq!(file.comment_lines, 1);
            assert_eq!(file.blank_lines, 1);
        }
    }
}
