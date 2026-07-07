use std::path::PathBuf;

use crate::core::{scanner_report, IgnoreScopeCollector, ReportData, ScanRequest, ScopeCollector};
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
        execute_scan_with_collector(request, &IgnoreScopeCollector)
    }
}

fn execute_scan_with_collector<C: ScopeCollector>(
    request: ScanRequest,
    collector: &C,
) -> AppResult<ReportData> {
    let scope = collector.collect(&request.project_root).map_err(|error| {
        AppError::scanner_fatal(format!("scan scope collection failed: {}", error.message()))
    })?;
    Ok(scanner_report(&request, scope))
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
        DiagnosticRecord, DiagnosticSeverity, ScanScope, ScopeCollectionFailure, ScopeFile,
    };

    use super::{execute_scan_with_collector, FixtureRuntime, VibeCheckRuntime};
    use crate::core::ScopeCollector;

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
