use std::collections::BTreeMap;
use std::ffi::OsStr;
use std::path::Path;

use serde::{Serialize, Serializer};

use super::{
    DiagnosticRecord, DiagnosticSeverity, DuplicateFinding, GateResult, GateStatus, MetricsSummary,
    WarningFinding, WarningSeverity,
};

const METRICS_LOC_PARTIAL_CODE: &str = "METRICS_LOC_PARTIAL";
const DUPLICATE_CODE_RULE: &str = "duplicate.code_fragment";
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

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) enum LanguageId {
    Go,
    Python,
    Rust,
    TypeScript,
}

impl LanguageId {
    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::Go => "go",
            Self::Python => "python",
            Self::Rust => "rust",
            Self::TypeScript => "typescript",
        }
    }

    fn from_path(path: impl AsRef<Path>) -> Option<Self> {
        match path.as_ref().extension().and_then(OsStr::to_str) {
            Some(extension) if extension.eq_ignore_ascii_case("go") => Some(Self::Go),
            Some(extension) if extension.eq_ignore_ascii_case("py") => Some(Self::Python),
            Some(extension) if extension.eq_ignore_ascii_case("rs") => Some(Self::Rust),
            Some(extension) if extension.eq_ignore_ascii_case("ts") => Some(Self::TypeScript),
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

pub(crate) fn generate_warnings(
    files: &[FileMetrics],
    duplicate_findings: &[DuplicateFinding],
) -> Vec<WarningFinding> {
    let mut warnings = files
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
        .collect::<Vec<_>>();

    warnings.extend(duplicate_findings.iter().map(|finding| {
        let primary = &finding.locations[0];
        let secondary = &finding.locations[1];
        WarningFinding {
            file: primary.file.clone(),
            location: format!("lines {}-{}", primary.start_line, primary.end_line),
            severity: WarningSeverity::Medium,
            rule: DUPLICATE_CODE_RULE.to_owned(),
            message: format!(
                "Duplicate fragment has {} tokens; also appears at {}:{}-{}.",
                finding.token_count, secondary.file, secondary.start_line, secondary.end_line
            ),
            accepted: false,
            suppressed: false,
            blocking: false,
        }
    }));
    warnings.sort_by(|left, right| {
        left.file
            .cmp(&right.file)
            .then(left.location.cmp(&right.location))
            .then(left.rule.cmp(&right.rule))
            .then(left.message.cmp(&right.message))
    });
    warnings
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
mod tests;
