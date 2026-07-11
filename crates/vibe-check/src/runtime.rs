use std::path::PathBuf;

#[cfg(test)]
use crate::core::StructuralScanFailure;
use crate::core::{
    scanner_report, AstGrepStructuralScanner, CpdFinderDuplicateScanner, DuplicateScanOutcome,
    DuplicateScannerAdapter, IgnoreScopeCollector, LocMetricsAdapter, ReportData, ScanRequest,
    ScopeCollector, StructuralScanOutcome, StructuralScannerAdapter, TokeiLocMetricsAdapter,
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
        execute_scan_with_collector_and_adapters(
            request,
            &IgnoreScopeCollector,
            &TokeiLocMetricsAdapter,
            &AstGrepStructuralScanner,
            &CpdFinderDuplicateScanner,
        )
    }
}

#[cfg(test)]
struct EmptyDuplicateScanner;

#[cfg(test)]
struct EmptyStructuralScanner;

#[cfg(test)]
impl StructuralScannerAdapter for EmptyStructuralScanner {
    fn scan(
        &self,
        _project_root: &std::path::Path,
        _supported_files: &[String],
    ) -> Result<StructuralScanOutcome, StructuralScanFailure> {
        Ok(StructuralScanOutcome::completed(Vec::new()))
    }
}

#[cfg(test)]
impl DuplicateScannerAdapter for EmptyDuplicateScanner {
    fn scan(
        &self,
        _project_root: &std::path::Path,
        _supported_files: &[String],
    ) -> Result<DuplicateScanOutcome, crate::core::DuplicateScanFailure> {
        Ok(DuplicateScanOutcome::default())
    }
}

#[cfg(test)]
fn execute_scan_with_collector<C: ScopeCollector>(
    request: ScanRequest,
    collector: &C,
) -> AppResult<ReportData> {
    execute_scan_with_collector_and_adapters(
        request,
        collector,
        &TokeiLocMetricsAdapter,
        &EmptyStructuralScanner,
        &EmptyDuplicateScanner,
    )
}

#[cfg(test)]
fn execute_scan_with_collector_and_metrics<C, M>(
    request: ScanRequest,
    collector: &C,
    metrics_adapter: &M,
) -> AppResult<ReportData>
where
    C: ScopeCollector,
    M: LocMetricsAdapter,
{
    execute_scan_with_collector_and_adapters(
        request,
        collector,
        metrics_adapter,
        &EmptyStructuralScanner,
        &EmptyDuplicateScanner,
    )
}

fn execute_scan_with_collector_and_adapters<C, M, S, D>(
    request: ScanRequest,
    collector: &C,
    metrics_adapter: &M,
    structural_adapter: &S,
    duplicate_adapter: &D,
) -> AppResult<ReportData>
where
    C: ScopeCollector,
    M: LocMetricsAdapter,
    S: StructuralScannerAdapter,
    D: DuplicateScannerAdapter,
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
    let structural_outcome = if supported_files.is_empty() {
        StructuralScanOutcome::skipped()
    } else {
        structural_adapter
            .scan(&request.project_root, &supported_files)
            .map_err(|error| {
                AppError::scanner_fatal(format!("structural scan failed: {}", error.message()))
            })?
    };
    let duplicate_outcome = if supported_files.is_empty() {
        DuplicateScanOutcome::default()
    } else {
        duplicate_adapter
            .scan(&request.project_root, &supported_files)
            .map_err(|error| {
                AppError::scanner_fatal(format!("duplicate scan failed: {}", error.message()))
            })?
    };
    Ok(scanner_report(
        &request,
        scope,
        metrics_outcome,
        structural_outcome,
        duplicate_outcome,
    ))
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
mod tests;
