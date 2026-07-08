use std::path::PathBuf;

use crate::core::{
    scanner_report, IgnoreScopeCollector, LocMetricsAdapter, ReportData, ScanRequest,
    ScopeCollector, TokeiLocMetricsAdapter,
};
use crate::error::{AppError, AppResult};

pub(crate) trait VibeCheckRuntime {
    fn current_dir(&self) -> AppResult<PathBuf>;
    fn execute_scan(&self, request: ScanRequest) -> AppResult<ReportData>;
}

#[derive(Clone, Copy, Debug, Default)]
pub(crate) struct ScannerRuntime;

impl VibeCheckRuntime for ScannerRuntime {
    fn current_dir(&self) -> AppResult<PathBuf> {
        std::env::current_dir().map_err(|error| {
            AppError::user_or_config(format!("failed to read current directory: {error}"))
        })
    }

    fn execute_scan(&self, request: ScanRequest) -> AppResult<ReportData> {
        execute_scan_with_collector_and_metrics(
            request,
            &IgnoreScopeCollector,
            &TokeiLocMetricsAdapter,
        )
    }
}

#[cfg(test)]
fn execute_scan_with_collector<C: ScopeCollector>(
    request: ScanRequest,
    collector: &C,
) -> AppResult<ReportData> {
    execute_scan_with_collector_and_metrics(request, collector, &TokeiLocMetricsAdapter)
}

fn execute_scan_with_collector_and_metrics<C, M>(
    request: ScanRequest,
    collector: &C,
    metrics_adapter: &M,
) -> AppResult<ReportData>
where
    C: ScopeCollector,
    M: LocMetricsAdapter,
{
    let scope = collector.collect(&request.project_root).map_err(|error| {
        AppError::scanner_fatal(format!("scan scope collection failed: {}", error.message()))
    })?;
    let supported_files = scope.supported_file_paths();
    let metrics_outcome = metrics_adapter
        .measure(&request.project_root, &supported_files)
        .map_err(|error| {
            AppError::scanner_fatal(format!("metrics collection failed: {}", error.message()))
        })?;
    Ok(scanner_report(&request, scope, metrics_outcome))
}

#[cfg(test)]
#[derive(Clone, Copy, Debug, Default)]
pub(crate) struct FixtureRuntime;

#[cfg(test)]
impl VibeCheckRuntime for FixtureRuntime {
    fn current_dir(&self) -> AppResult<PathBuf> {
        std::env::current_dir().map_err(|error| {
            AppError::user_or_config(format!("failed to read current directory: {error}"))
        })
    }

    fn execute_scan(&self, request: ScanRequest) -> AppResult<ReportData> {
        Ok(crate::core::fixture_report(&request))
    }
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use crate::core::{
        DiagnosticRecord, DiagnosticSeverity, FileMetrics, LanguageId, MetricsFailure,
        MetricsOutcome, ScanScope, ScopeCollectionFailure, ScopeFile,
    };

    use super::{
        execute_scan_with_collector, execute_scan_with_collector_and_metrics, FixtureRuntime,
        VibeCheckRuntime,
    };
    use crate::core::{LocMetricsAdapter, ScopeCollector};

    struct DiagnosticCollector;

    impl ScopeCollector for DiagnosticCollector {
        fn collect(&self, _project_root: &Path) -> Result<ScanScope, ScopeCollectionFailure> {
            Ok(ScanScope::new(
                vec![ScopeFile::supported("src/lib.rs")],
                vec![DiagnosticRecord {
                    severity: DiagnosticSeverity::Warning,
                    code: "SCAN_SCOPE_WALK".to_owned(),
                    message: "failed to walk one path".to_owned(),
                }],
            ))
        }
    }

    struct FatalCollector;

    impl ScopeCollector for FatalCollector {
        fn collect(&self, _project_root: &Path) -> Result<ScanScope, ScopeCollectionFailure> {
            Err(ScopeCollectionFailure::new("collector unavailable"))
        }
    }

    struct RecordingMetricsAdapter {
        files_seen: std::cell::RefCell<Vec<String>>,
    }

    impl RecordingMetricsAdapter {
        fn new() -> Self {
            Self {
                files_seen: std::cell::RefCell::new(Vec::new()),
            }
        }
    }

    fn rust_file_metrics(file: impl Into<String>) -> FileMetrics {
        FileMetrics {
            file: file.into(),
            language: LanguageId::Rust,
            total_lines: 3,
            code_lines: 1,
            comment_lines: 1,
            blank_lines: 1,
        }
    }

    impl LocMetricsAdapter for RecordingMetricsAdapter {
        fn measure(
            &self,
            _project_root: &Path,
            supported_files: &[String],
        ) -> Result<MetricsOutcome, MetricsFailure> {
            self.files_seen
                .borrow_mut()
                .extend_from_slice(supported_files);
            Ok(MetricsOutcome {
                files: supported_files
                    .iter()
                    .map(|file| rust_file_metrics(file.clone()))
                    .collect(),
                diagnostics: Vec::new(),
            })
        }
    }

    struct DiagnosticMetricsAdapter;

    impl LocMetricsAdapter for DiagnosticMetricsAdapter {
        fn measure(
            &self,
            _project_root: &Path,
            _supported_files: &[String],
        ) -> Result<MetricsOutcome, MetricsFailure> {
            Ok(MetricsOutcome {
                files: vec![rust_file_metrics("src/lib.rs")],
                diagnostics: vec![DiagnosticRecord {
                    severity: DiagnosticSeverity::Warning,
                    code: "METRICS_LOC_PARTIAL".to_owned(),
                    message: "failed to measure LOC for src/missing.rs".to_owned(),
                }],
            })
        }
    }

    struct FatalMetricsAdapter;

    impl LocMetricsAdapter for FatalMetricsAdapter {
        fn measure(
            &self,
            _project_root: &Path,
            _supported_files: &[String],
        ) -> Result<MetricsOutcome, MetricsFailure> {
            Err(MetricsFailure::new("tokei unavailable"))
        }
    }

    // @case WB-RUNTIME-PIPELINE-001
    #[test]
    fn recoverable_collection_diagnostic_produces_partial_report() {
        let request = crate::core::ScanRequest {
            project_root: Path::new(".").to_path_buf(),
            config_path: None,
        };

        let report =
            execute_scan_with_collector(request, &DiagnosticCollector).expect("partial report");

        assert_eq!(report.summary.status, crate::core::ReportStatus::Partial);
        assert_eq!(report.summary.diagnostic_count, 1);
        assert_eq!(report.diagnostics[0].code, "SCAN_SCOPE_WALK");
        assert_eq!(report.scope.file_count, 1);
        assert_eq!(report.scope.supported_file_count, 1);
    }

    #[test]
    fn metrics_adapter_receives_only_supported_files() {
        struct MixedCollector;

        impl ScopeCollector for MixedCollector {
            fn collect(&self, _project_root: &Path) -> Result<ScanScope, ScopeCollectionFailure> {
                Ok(ScanScope::new(
                    vec![
                        ScopeFile::supported("src/lib.rs"),
                        ScopeFile::unsupported("README.md"),
                    ],
                    Vec::new(),
                ))
            }
        }

        let request = crate::core::ScanRequest {
            project_root: Path::new(".").to_path_buf(),
            config_path: None,
        };
        let metrics_adapter = RecordingMetricsAdapter::new();

        let report =
            execute_scan_with_collector_and_metrics(request, &MixedCollector, &metrics_adapter)
                .expect("metrics report");

        assert_eq!(
            metrics_adapter.files_seen.into_inner(),
            vec!["src/lib.rs".to_owned()]
        );
        assert_eq!(report.scope.file_count, 2);
        assert_eq!(report.scope.supported_file_count, 1);
        assert_eq!(report.metrics.files_measured, 1);
    }

    #[test]
    fn recoverable_metrics_diagnostic_produces_partial_report() {
        let request = crate::core::ScanRequest {
            project_root: Path::new(".").to_path_buf(),
            config_path: None,
        };

        let report = execute_scan_with_collector_and_metrics(
            request,
            &DiagnosticCollector,
            &DiagnosticMetricsAdapter,
        )
        .expect("partial report");

        assert_eq!(report.summary.status, crate::core::ReportStatus::Partial);
        assert_eq!(report.summary.diagnostic_count, 2);
        assert_eq!(report.metrics.files_measured, 1);
        assert_eq!(report.gate.status, crate::core::GateStatus::Passed);
        assert_eq!(report.gate.blocking_warnings, 0);
    }

    #[test]
    fn fatal_metrics_failure_maps_to_scanner_fatal_error() {
        let request = crate::core::ScanRequest {
            project_root: Path::new(".").to_path_buf(),
            config_path: None,
        };

        let error = execute_scan_with_collector_and_metrics(
            request,
            &DiagnosticCollector,
            &FatalMetricsAdapter,
        )
        .expect_err("fatal error");

        assert_eq!(error.exit_code().code(), 3);
        assert!(error.message().contains("tokei unavailable"));
    }

    #[test]
    fn fatal_collection_failure_maps_to_scanner_fatal_error() {
        let request = crate::core::ScanRequest {
            project_root: Path::new(".").to_path_buf(),
            config_path: None,
        };

        let error = execute_scan_with_collector(request, &FatalCollector).expect_err("fatal error");

        assert_eq!(error.exit_code().code(), 3);
        assert!(error.message().contains("collector unavailable"));
    }

    #[test]
    fn fixture_runtime_remains_available_for_output_contract_tests() {
        let request = crate::core::ScanRequest {
            project_root: Path::new(".").to_path_buf(),
            config_path: None,
        };

        let report = FixtureRuntime
            .execute_scan(request)
            .expect("fixture report");

        assert_eq!(report.run.mode, crate::core::RunMode::Fixture);
        assert_eq!(report.scope.file_count, 0);
        assert_eq!(report.scope.supported_file_count, 0);
    }
}
