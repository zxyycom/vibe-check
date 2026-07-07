mod scan_scope;

use std::path::PathBuf;

use serde::Serialize;

pub(crate) use scan_scope::{IgnoreScopeCollector, ScanScope, ScopeCollector};
#[cfg(test)]
pub(crate) use scan_scope::{ScopeCollectionFailure, ScopeFile};

pub(crate) const REPORT_SCHEMA_VERSION: &str = "vibe-check.report.v1";
pub(crate) const TOOL_NAME: &str = "vibe-check";

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct ScanRequest {
    pub(crate) project_root: PathBuf,
    pub(crate) config_path: Option<PathBuf>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub(crate) struct ReportData {
    pub(crate) schema_version: &'static str,
    pub(crate) tool: ToolInfo,
    pub(crate) run: RunInfo,
    pub(crate) scope: ScopeSummary,
    pub(crate) summary: ReportSummary,
    pub(crate) metrics: MetricsSummary,
    pub(crate) warnings: Vec<WarningFinding>,
    pub(crate) gate: GateResult,
    pub(crate) diagnostics: Vec<DiagnosticRecord>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub(crate) struct ToolInfo {
    pub(crate) name: &'static str,
    pub(crate) version: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub(crate) struct RunInfo {
    pub(crate) mode: RunMode,
    pub(crate) project_root: String,
    pub(crate) config_path: Option<String>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum RunMode {
    #[allow(dead_code)]
    Fixture,
    Scanner,
}

impl RunMode {
    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::Fixture => "fixture",
            Self::Scanner => "scanner",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub(crate) struct ScopeSummary {
    pub(crate) file_count: u64,
    pub(crate) supported_file_count: u64,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub(crate) struct ReportSummary {
    pub(crate) status: ReportStatus,
    pub(crate) warning_count: u64,
    pub(crate) blocking_warning_count: u64,
    pub(crate) diagnostic_count: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum ReportStatus {
    Completed,
    Partial,
}

impl ReportStatus {
    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::Completed => "completed",
            Self::Partial => "partial",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub(crate) struct MetricsSummary {
    pub(crate) supported_scanner_findings: u64,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub(crate) struct WarningFinding {
    pub(crate) file: String,
    pub(crate) location: String,
    pub(crate) severity: WarningSeverity,
    pub(crate) rule: String,
    pub(crate) message: String,
    pub(crate) accepted: bool,
    pub(crate) suppressed: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum WarningSeverity {
    #[allow(dead_code)]
    Info,
    #[allow(dead_code)]
    Low,
    #[allow(dead_code)]
    Medium,
    #[allow(dead_code)]
    High,
    #[allow(dead_code)]
    Critical,
}

impl WarningSeverity {
    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::Info => "info",
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
            Self::Critical => "critical",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub(crate) struct GateResult {
    pub(crate) status: GateStatus,
    pub(crate) blocking_warnings: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum GateStatus {
    Passed,
    #[allow(dead_code)]
    Failed,
}

impl GateStatus {
    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::Passed => "passed",
            Self::Failed => "failed",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub(crate) struct DiagnosticRecord {
    pub(crate) severity: DiagnosticSeverity,
    pub(crate) code: String,
    pub(crate) message: String,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum DiagnosticSeverity {
    #[allow(dead_code)]
    Info,
    #[allow(dead_code)]
    Warning,
    #[allow(dead_code)]
    Error,
}

impl DiagnosticSeverity {
    pub(crate) const fn as_str(self) -> &'static str {
        match self {
            Self::Info => "info",
            Self::Warning => "warning",
            Self::Error => "error",
        }
    }
}

pub(crate) fn scanner_report(request: &ScanRequest, scope: ScanScope) -> ReportData {
    let file_count = scope.file_count();
    let supported_file_count = scope.supported_file_count();
    let diagnostics = scope.into_diagnostics();
    let diagnostic_count = diagnostics.len() as u64;
    let status = if diagnostics.is_empty() {
        ReportStatus::Completed
    } else {
        ReportStatus::Partial
    };

    report_from_parts(
        request,
        RunMode::Scanner,
        ScopeSummary {
            file_count,
            supported_file_count,
        },
        ReportSummary {
            status,
            warning_count: 0,
            blocking_warning_count: 0,
            diagnostic_count,
        },
        diagnostics,
    )
}

#[cfg(test)]
pub(crate) fn fixture_report(request: &ScanRequest) -> ReportData {
    report_from_parts(
        request,
        RunMode::Fixture,
        ScopeSummary {
            file_count: 0,
            supported_file_count: 0,
        },
        ReportSummary {
            status: ReportStatus::Completed,
            warning_count: 0,
            blocking_warning_count: 0,
            diagnostic_count: 0,
        },
        Vec::new(),
    )
}

fn report_from_parts(
    request: &ScanRequest,
    mode: RunMode,
    scope: ScopeSummary,
    summary: ReportSummary,
    diagnostics: Vec<DiagnosticRecord>,
) -> ReportData {
    ReportData {
        schema_version: REPORT_SCHEMA_VERSION,
        tool: ToolInfo {
            name: TOOL_NAME,
            version: env!("CARGO_PKG_VERSION").to_owned(),
        },
        run: RunInfo {
            mode,
            project_root: request.project_root.display().to_string(),
            config_path: request
                .config_path
                .as_ref()
                .map(|path| path.display().to_string()),
        },
        scope,
        summary,
        metrics: MetricsSummary {
            supported_scanner_findings: 0,
        },
        warnings: Vec::new(),
        gate: GateResult {
            status: GateStatus::Passed,
            blocking_warnings: 0,
        },
        diagnostics,
    }
}
