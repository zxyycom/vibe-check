mod ast_grep;

use std::cmp::Ordering;
use std::path::{Component, Path, PathBuf};

use super::metrics::LanguageId;
use super::{DiagnosticRecord, DiagnosticSeverity};

pub(crate) use ast_grep::AstGrepStructuralScanner;

const STRUCTURAL_SCAN_PARTIAL_CODE: &str = "STRUCTURAL_SCAN_PARTIAL";

pub(crate) trait StructuralScannerAdapter {
    fn scan(
        &self,
        project_root: &Path,
        supported_files: &[String],
    ) -> Result<StructuralScanOutcome, StructuralScanFailure>;
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum FunctionKind {
    Function,
    Method,
    Constructor,
}

impl FunctionKind {
    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::Function => "function",
            Self::Method => "method",
            Self::Constructor => "constructor",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) struct SourceRange {
    pub(crate) start_line: u32,
    pub(crate) start_column: u32,
    pub(crate) end_line: u32,
    pub(crate) end_column: u32,
}

impl SourceRange {
    pub(crate) fn new(
        start_line: u32,
        start_column: u32,
        end_line: u32,
        end_column: u32,
    ) -> Result<Self, StructuralScanFailure> {
        let starts_at_valid_coordinate = start_line > 0 && start_column > 0;
        let ends_at_valid_coordinate = end_line > 0 && end_column > 0;
        let has_forward_extent =
            end_line > start_line || (end_line == start_line && end_column >= start_column);
        if !starts_at_valid_coordinate || !ends_at_valid_coordinate || !has_forward_extent {
            return Err(StructuralScanFailure::new(format!(
                "invalid source range {start_line}:{start_column}-{end_line}:{end_column}"
            )));
        }
        Ok(Self {
            start_line,
            start_column,
            end_line,
            end_column,
        })
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct FunctionMetric {
    pub(crate) file: String,
    pub(crate) language: LanguageId,
    pub(crate) kind: FunctionKind,
    pub(crate) display_name: String,
    pub(crate) range: SourceRange,
    pub(crate) parameter_count: u32,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum StructuralScanState {
    SkippedNoSupportedInput,
    Completed,
    Partial,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct StructuralScanOutcome {
    pub(crate) state: StructuralScanState,
    pub(crate) metrics: Vec<FunctionMetric>,
    pub(crate) diagnostics: Vec<StructuralDiagnostic>,
}

impl StructuralScanOutcome {
    pub(crate) fn skipped() -> Self {
        Self {
            state: StructuralScanState::SkippedNoSupportedInput,
            metrics: Vec::new(),
            diagnostics: Vec::new(),
        }
    }

    pub(crate) fn completed(metrics: Vec<FunctionMetric>) -> Self {
        Self {
            state: StructuralScanState::Completed,
            metrics,
            diagnostics: Vec::new(),
        }
    }

    pub(crate) fn partial(
        metrics: Vec<FunctionMetric>,
        diagnostics: Vec<StructuralDiagnostic>,
    ) -> Self {
        debug_assert!(!diagnostics.is_empty());
        Self {
            state: StructuralScanState::Partial,
            metrics,
            diagnostics,
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct StructuralDiagnostic {
    file: String,
    reason: String,
}

impl StructuralDiagnostic {
    pub(crate) fn new(file: impl Into<String>, reason: impl Into<String>) -> Self {
        Self {
            file: file.into(),
            reason: reason.into(),
        }
    }

    pub(crate) fn to_record(&self) -> DiagnosticRecord {
        DiagnosticRecord {
            severity: DiagnosticSeverity::Warning,
            code: STRUCTURAL_SCAN_PARTIAL_CODE.to_owned(),
            message: format!("structural scan skipped {}: {}", self.file, self.reason),
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct StructuralScanFailure {
    message: String,
}

impl StructuralScanFailure {
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
struct StructuralInputPath {
    absolute: PathBuf,
    relative: String,
}

fn normalize_input_path(
    project_root: &Path,
    input: &Path,
) -> Result<StructuralInputPath, StructuralScanFailure> {
    if !project_root.is_absolute() {
        return Err(StructuralScanFailure::new(format!(
            "project root is not absolute: {}",
            project_root.display()
        )));
    }
    if input.is_absolute() {
        return Err(StructuralScanFailure::new(format!(
            "structural input must be project-relative: {}",
            input.display()
        )));
    }

    let mut relative_parts = Vec::new();
    for component in input.components() {
        match component {
            Component::Normal(part) => {
                let part = part.to_str().ok_or_else(|| {
                    StructuralScanFailure::new(format!(
                        "structural input is not valid UTF-8: {}",
                        input.display()
                    ))
                })?;
                relative_parts.push(part);
            }
            Component::CurDir => {}
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err(StructuralScanFailure::new(format!(
                    "structural input is outside project root: {}",
                    input.display()
                )));
            }
        }
    }
    if relative_parts.is_empty() {
        return Err(StructuralScanFailure::new("structural input path is empty"));
    }

    let relative = relative_parts.join("/");
    Ok(StructuralInputPath {
        absolute: project_root.join(&relative),
        relative,
    })
}

fn normalize_metrics(
    mut metrics: Vec<FunctionMetric>,
) -> Result<Vec<FunctionMetric>, StructuralScanFailure> {
    for metric in &metrics {
        if metric.file.is_empty() || metric.file.contains('\\') {
            return Err(StructuralScanFailure::new(format!(
                "invalid normalized function path: {}",
                metric.file
            )));
        }
        if metric.display_name.trim().is_empty() {
            return Err(StructuralScanFailure::new(format!(
                "function display name is empty in {}",
                metric.file
            )));
        }
    }

    metrics.sort_by(compare_metrics);
    if let Some(duplicate) = metrics
        .windows(2)
        .find(|pair| compare_metrics(&pair[0], &pair[1]) == Ordering::Equal)
    {
        let metric = &duplicate[0];
        return Err(StructuralScanFailure::new(format!(
            "duplicate function identity in {} at {}:{} for {} {}",
            metric.file,
            metric.range.start_line,
            metric.range.start_column,
            metric.kind.as_str(),
            metric.display_name
        )));
    }
    Ok(metrics)
}

fn compare_metrics(left: &FunctionMetric, right: &FunctionMetric) -> Ordering {
    left.file
        .cmp(&right.file)
        .then(left.range.cmp(&right.range))
        .then(left.kind.as_str().cmp(right.kind.as_str()))
        .then(left.display_name.cmp(&right.display_name))
}

#[cfg(test)]
mod tests;
