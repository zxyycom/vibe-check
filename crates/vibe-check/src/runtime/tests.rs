use std::path::Path;

use crate::core::{
    DiagnosticRecord, DiagnosticSeverity, DuplicateFinding, DuplicateLocation,
    DuplicateScanFailure, DuplicateScanOutcome, DuplicateScannerAdapter, FileMetrics, FunctionKind,
    FunctionMetric, LanguageId, LocMetricsAdapter, MetricsFailure, MetricsOutcome, ScanRequest,
    ScanScope, ScopeCollectionFailure, ScopeCollector, ScopeFile, SourceRange,
    StructuralDiagnostic, StructuralScanFailure, StructuralScanOutcome, StructuralScannerAdapter,
};

use super::{
    execute_scan_with_collector, execute_scan_with_collector_and_adapters,
    execute_scan_with_collector_and_metrics, EmptyStructuralScanner, FixtureRuntime,
    VibeCheckRuntime,
};

fn request() -> ScanRequest {
    ScanRequest {
        project_root: Path::new(".").to_path_buf(),
        config_path: None,
    }
}

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

struct MixedCollector(&'static str);

impl ScopeCollector for MixedCollector {
    fn collect(&self, _project_root: &Path) -> Result<ScanScope, ScopeCollectionFailure> {
        Ok(ScanScope::new(
            vec![
                ScopeFile::supported(self.0),
                ScopeFile::unsupported("README.md"),
            ],
            Vec::new(),
        ))
    }
}

struct UnsupportedCollector;

impl ScopeCollector for UnsupportedCollector {
    fn collect(&self, _project_root: &Path) -> Result<ScanScope, ScopeCollectionFailure> {
        Ok(ScanScope::new(
            vec![ScopeFile::unsupported("README.md")],
            Vec::new(),
        ))
    }
}

struct FatalCollector;

impl ScopeCollector for FatalCollector {
    fn collect(&self, _project_root: &Path) -> Result<ScanScope, ScopeCollectionFailure> {
        Err(ScopeCollectionFailure::new("collector unavailable"))
    }
}

#[derive(Default)]
struct RecordingMetricsAdapter {
    files_seen: std::cell::RefCell<Vec<String>>,
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

struct RecordingDuplicateAdapter {
    files_seen: std::cell::RefCell<Vec<String>>,
    outcome: DuplicateScanOutcome,
}

impl RecordingDuplicateAdapter {
    fn new(outcome: DuplicateScanOutcome) -> Self {
        Self {
            files_seen: std::cell::RefCell::new(Vec::new()),
            outcome,
        }
    }
}

impl DuplicateScannerAdapter for RecordingDuplicateAdapter {
    fn scan(
        &self,
        _project_root: &Path,
        supported_files: &[String],
    ) -> Result<DuplicateScanOutcome, DuplicateScanFailure> {
        self.files_seen
            .borrow_mut()
            .extend_from_slice(supported_files);
        Ok(self.outcome.clone())
    }
}

struct FatalDuplicateAdapter;

impl DuplicateScannerAdapter for FatalDuplicateAdapter {
    fn scan(
        &self,
        _project_root: &Path,
        _supported_files: &[String],
    ) -> Result<DuplicateScanOutcome, DuplicateScanFailure> {
        Err(DuplicateScanFailure::new("cpd-finder unavailable"))
    }
}

struct UnexpectedDuplicateAdapter;

impl DuplicateScannerAdapter for UnexpectedDuplicateAdapter {
    fn scan(
        &self,
        _project_root: &Path,
        _supported_files: &[String],
    ) -> Result<DuplicateScanOutcome, DuplicateScanFailure> {
        panic!("duplicate adapter should be skipped")
    }
}

struct RecordingStructuralAdapter {
    files_seen: std::cell::RefCell<Vec<String>>,
    outcome: StructuralScanOutcome,
}

impl RecordingStructuralAdapter {
    fn new(outcome: StructuralScanOutcome) -> Self {
        Self {
            files_seen: std::cell::RefCell::new(Vec::new()),
            outcome,
        }
    }
}

impl StructuralScannerAdapter for RecordingStructuralAdapter {
    fn scan(
        &self,
        _project_root: &Path,
        supported_files: &[String],
    ) -> Result<StructuralScanOutcome, StructuralScanFailure> {
        self.files_seen
            .borrow_mut()
            .extend_from_slice(supported_files);
        Ok(self.outcome.clone())
    }
}

struct FatalStructuralAdapter;

impl StructuralScannerAdapter for FatalStructuralAdapter {
    fn scan(
        &self,
        _project_root: &Path,
        _supported_files: &[String],
    ) -> Result<StructuralScanOutcome, StructuralScanFailure> {
        Err(StructuralScanFailure::new("structural invariant failed"))
    }
}

struct UnexpectedStructuralAdapter;

impl StructuralScannerAdapter for UnexpectedStructuralAdapter {
    fn scan(
        &self,
        _project_root: &Path,
        _supported_files: &[String],
    ) -> Result<StructuralScanOutcome, StructuralScanFailure> {
        panic!("structural adapter should be skipped")
    }
}

fn duplicate_finding() -> DuplicateFinding {
    DuplicateFinding {
        identity: "src/a.rs|src/b.rs|50".to_owned(),
        locations: [
            DuplicateLocation {
                file: "src/a.rs".to_owned(),
                start_line: 10,
                start_column: 1,
                end_line: 20,
                end_column: 2,
            },
            DuplicateLocation {
                file: "src/b.rs".to_owned(),
                start_line: 30,
                start_column: 1,
                end_line: 40,
                end_column: 2,
            },
        ],
        token_count: 50,
    }
}

fn function_metric(file: &str, parameter_count: u32) -> FunctionMetric {
    FunctionMetric {
        file: file.to_owned(),
        language: LanguageId::Rust,
        kind: FunctionKind::Function,
        display_name: "build".to_owned(),
        range: SourceRange::new(3, 1, 8, 2).expect("valid function range"),
        parameter_count,
    }
}

// @case WB-RUNTIME-PIPELINE-001
#[test]
fn recoverable_collection_diagnostic_produces_partial_report() {
    let report =
        execute_scan_with_collector(request(), &DiagnosticCollector).expect("partial report");

    assert_eq!(report.summary.status, crate::core::ReportStatus::Partial);
    assert_eq!(report.summary.diagnostic_count, 1);
    assert_eq!(report.diagnostics[0].code, "SCAN_SCOPE_WALK");
    assert_eq!(report.scope.file_count, 1);
    assert_eq!(report.scope.supported_file_count, 1);
}

#[test]
fn metrics_adapter_receives_only_supported_files() {
    let metrics_adapter = RecordingMetricsAdapter::default();
    let report = execute_scan_with_collector_and_metrics(
        request(),
        &MixedCollector("src/lib.rs"),
        &metrics_adapter,
    )
    .expect("metrics report");

    assert_eq!(metrics_adapter.files_seen.into_inner(), vec!["src/lib.rs"]);
    assert_eq!(report.scope.file_count, 2);
    assert_eq!(report.scope.supported_file_count, 1);
    assert_eq!(report.metrics.files_measured, 1);
}

#[test]
fn recoverable_metrics_diagnostic_produces_partial_report() {
    let report = execute_scan_with_collector_and_metrics(
        request(),
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
    let error = execute_scan_with_collector_and_metrics(
        request(),
        &DiagnosticCollector,
        &FatalMetricsAdapter,
    )
    .expect_err("fatal error");

    assert_eq!(error.exit_code().code(), 3);
    assert!(error.message().contains("tokei unavailable"));
}

#[test]
fn duplicate_adapter_receives_supported_files_before_gate_calculation() {
    let metrics = RecordingMetricsAdapter::default();
    let duplicates = RecordingDuplicateAdapter::new(DuplicateScanOutcome {
        findings: vec![duplicate_finding()],
        diagnostics: Vec::new(),
    });

    let report = execute_scan_with_collector_and_adapters(
        request(),
        &MixedCollector("src/a.rs"),
        &metrics,
        &EmptyStructuralScanner,
        &duplicates,
    )
    .expect("duplicate report");

    assert_eq!(duplicates.files_seen.into_inner(), vec!["src/a.rs"]);
    assert_eq!(report.warnings.len(), 1);
    assert_eq!(report.warnings[0].rule, "duplicate.code_fragment");
    assert_eq!(report.summary.warning_count, 1);
    assert_eq!(report.summary.blocking_warning_count, 0);
    assert_eq!(report.gate.status, crate::core::GateStatus::Passed);
    assert_eq!(report.metrics.supported_scanner_findings, 1);
    assert_eq!(report.metrics.files_measured, 1);
}

#[test]
fn zero_supported_inputs_skip_duplicate_adapter() {
    let report = execute_scan_with_collector_and_adapters(
        request(),
        &UnsupportedCollector,
        &RecordingMetricsAdapter::default(),
        &UnexpectedStructuralAdapter,
        &UnexpectedDuplicateAdapter,
    )
    .expect("empty duplicate scan");

    assert!(report.warnings.is_empty());
    assert!(report.diagnostics.is_empty());
}

#[test]
fn duplicate_diagnostic_is_partial_and_failure_is_fatal() {
    let diagnostic_adapter = RecordingDuplicateAdapter::new(DuplicateScanOutcome {
        findings: Vec::new(),
        diagnostics: vec![DiagnosticRecord {
            severity: DiagnosticSeverity::Warning,
            code: "DUPLICATE_SCAN_PARTIAL".to_owned(),
            message: "duplicate scan skipped src/missing.rs".to_owned(),
        }],
    });
    let partial = execute_scan_with_collector_and_adapters(
        request(),
        &DiagnosticCollector,
        &RecordingMetricsAdapter::default(),
        &EmptyStructuralScanner,
        &diagnostic_adapter,
    )
    .expect("partial duplicate report");
    assert_eq!(partial.summary.status, crate::core::ReportStatus::Partial);
    assert_eq!(partial.summary.diagnostic_count, 2);

    let error = execute_scan_with_collector_and_adapters(
        request(),
        &DiagnosticCollector,
        &RecordingMetricsAdapter::default(),
        &EmptyStructuralScanner,
        &FatalDuplicateAdapter,
    )
    .expect_err("fatal duplicate scan");
    assert_eq!(error.exit_code().code(), 3);
    assert!(error.message().contains("cpd-finder unavailable"));
}

#[test]
fn structural_adapter_receives_only_supported_files_and_feeds_warning_policy() {
    let structural =
        RecordingStructuralAdapter::new(StructuralScanOutcome::completed(vec![function_metric(
            "src/lib.rs",
            5,
        )]));

    let report = execute_scan_with_collector_and_adapters(
        request(),
        &MixedCollector("src/lib.rs"),
        &RecordingMetricsAdapter::default(),
        &structural,
        &RecordingDuplicateAdapter::new(DuplicateScanOutcome::default()),
    )
    .expect("structural report");

    assert_eq!(structural.files_seen.into_inner(), vec!["src/lib.rs"]);
    assert_eq!(report.warnings.len(), 1);
    assert_eq!(report.warnings[0].rule, "function.too_many_parameters");
    assert_eq!(report.summary.warning_count, 1);
    assert_eq!(report.gate.status, crate::core::GateStatus::Passed);
    assert_eq!(report.metrics.files_measured, 1);
}

#[test]
fn structural_partial_is_reportable_and_structural_failure_is_fatal() {
    let structural = RecordingStructuralAdapter::new(StructuralScanOutcome::partial(
        Vec::new(),
        vec![StructuralDiagnostic::new(
            "src/broken.rs",
            "syntax tree contains an error node",
        )],
    ));
    let partial = execute_scan_with_collector_and_adapters(
        request(),
        &MixedCollector("src/broken.rs"),
        &RecordingMetricsAdapter::default(),
        &structural,
        &RecordingDuplicateAdapter::new(DuplicateScanOutcome::default()),
    )
    .expect("partial structural report");
    assert_eq!(partial.summary.status, crate::core::ReportStatus::Partial);
    assert_eq!(partial.summary.diagnostic_count, 1);
    assert_eq!(partial.diagnostics[0].code, "STRUCTURAL_SCAN_PARTIAL");
    assert!(partial.warnings.is_empty());

    let error = execute_scan_with_collector_and_adapters(
        request(),
        &MixedCollector("src/lib.rs"),
        &RecordingMetricsAdapter::default(),
        &FatalStructuralAdapter,
        &RecordingDuplicateAdapter::new(DuplicateScanOutcome::default()),
    )
    .expect_err("fatal structural scan");
    assert_eq!(error.exit_code().code(), 3);
    assert!(error.message().contains("structural invariant failed"));
}

#[test]
fn fatal_collection_failure_maps_to_scanner_fatal_error() {
    let error = execute_scan_with_collector(request(), &FatalCollector).expect_err("fatal error");

    assert_eq!(error.exit_code().code(), 3);
    assert!(error.message().contains("collector unavailable"));
}

#[test]
fn fixture_runtime_remains_available_for_output_contract_tests() {
    let report = FixtureRuntime
        .execute_scan(request())
        .expect("fixture report");

    assert_eq!(report.run.mode, crate::core::RunMode::Fixture);
    assert_eq!(report.scope.file_count, 0);
    assert_eq!(report.scope.supported_file_count, 0);
}
