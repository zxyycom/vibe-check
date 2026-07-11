use std::path::{Path, PathBuf};

use super::{
    ast_grep::{decode_source, guard_dependency},
    normalize_input_path, normalize_metrics, AstGrepStructuralScanner, FunctionKind,
    FunctionMetric, SourceRange, StructuralDiagnostic, StructuralScanOutcome, StructuralScanState,
    StructuralScannerAdapter,
};
use crate::core::LanguageId;

fn metric(file: &str, line: u32, name: &str, parameter_count: u32) -> FunctionMetric {
    FunctionMetric {
        file: file.to_owned(),
        language: LanguageId::Rust,
        kind: FunctionKind::Function,
        display_name: name.to_owned(),
        range: SourceRange::new(line, 1, line + 1, 1).expect("valid test range"),
        parameter_count,
    }
}

fn fixture_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/ast-grep-characterization")
}

#[test]
fn source_range_rejects_zero_and_reversed_coordinates() {
    assert!(SourceRange::new(1, 1, 2, 1).is_ok());
    assert!(SourceRange::new(1, 1, 1, 1).is_ok());
    assert!(SourceRange::new(0, 1, 2, 1).is_err());
    assert!(SourceRange::new(1, 0, 2, 1).is_err());
    assert!(SourceRange::new(2, 1, 1, 1).is_err());
    assert!(SourceRange::new(1, 2, 1, 1).is_err());
}

#[test]
fn input_path_normalization_is_relative_stable_and_project_bounded() {
    let project_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let input = Path::new("src").join("core").join("lib.rs");

    let normalized = normalize_input_path(&project_root, &input).expect("normalized input");

    assert_eq!(normalized.relative, "src/core/lib.rs");
    assert_eq!(normalized.absolute, project_root.join(input));
    assert!(normalize_input_path(&project_root, Path::new("../outside.rs")).is_err());
    assert!(normalize_input_path(&project_root, &project_root.join("src/lib.rs")).is_err());
}

#[test]
fn metrics_are_sorted_by_owned_identity_and_duplicates_are_fatal() {
    let sorted = normalize_metrics(vec![
        metric("src/b.rs", 2, "beta", 4),
        metric("src/a.rs", 5, "omega", 4),
        metric("src/a.rs", 1, "alpha", 5),
    ])
    .expect("unique metrics");

    assert_eq!(
        sorted
            .iter()
            .map(|metric| (metric.file.as_str(), metric.display_name.as_str()))
            .collect::<Vec<_>>(),
        vec![
            ("src/a.rs", "alpha"),
            ("src/a.rs", "omega"),
            ("src/b.rs", "beta"),
        ]
    );

    let duplicate = normalize_metrics(vec![
        metric("src/lib.rs", 1, "same", 4),
        metric("src/lib.rs", 1, "same", 5),
    ])
    .expect_err("duplicate source identity must be fatal");
    assert!(duplicate.message().contains("duplicate function identity"));
}

#[test]
fn outcome_state_distinguishes_skip_clean_partial_and_fatal_result() {
    let skipped = StructuralScanOutcome::skipped();
    assert_eq!(skipped.state, StructuralScanState::SkippedNoSupportedInput);
    assert!(skipped.metrics.is_empty());
    assert!(skipped.diagnostics.is_empty());

    let completed = StructuralScanOutcome::completed(Vec::new());
    assert_eq!(completed.state, StructuralScanState::Completed);
    assert!(completed.metrics.is_empty());

    let partial = StructuralScanOutcome::partial(
        Vec::new(),
        vec![StructuralDiagnostic::new(
            "src/broken.rs",
            "syntax tree contains an error node",
        )],
    );
    assert_eq!(partial.state, StructuralScanState::Partial);
    assert_eq!(partial.diagnostics.len(), 1);
    let record = partial.diagnostics[0].to_record();
    assert_eq!(record.code, "STRUCTURAL_SCAN_PARTIAL");
    assert!(record.message.contains("src/broken.rs"));
}

// @case WB-STRUCTURAL-ADAPTER-001
#[test]
fn ast_grep_adapter_normalizes_four_language_inventory_and_ordering() {
    let files = [
        "functions.py",
        "functions.rs",
        "functions.go",
        "functions.ts",
        "declarations.d.ts",
    ]
    .map(str::to_owned);

    let first = AstGrepStructuralScanner
        .scan(&fixture_root(), &files)
        .expect("structural scan");
    let second = AstGrepStructuralScanner
        .scan(&fixture_root(), &files)
        .expect("repeat structural scan");

    assert_eq!(first, second);
    assert_eq!(first.state, StructuralScanState::Completed);
    assert!(first.diagnostics.is_empty());
    assert_eq!(first.metrics.len(), 28);
    assert!(first.metrics.windows(2).all(|pair| {
        let normalized = normalize_metrics(pair.to_vec()).expect("ordered unique pair");
        normalized == pair
    }));
    assert!(first.metrics.iter().all(|metric| {
        !metric.file.contains('\\')
            && metric.range.start_line > 0
            && metric.range.start_column > 0
            && metric.range.end_line > 0
            && metric.range.end_column > 0
    }));

    let expected = [
        ("functions.ts", "nested", FunctionKind::Function, 5),
        ("functions.ts", "constructor", FunctionKind::Constructor, 5),
        ("functions.ts", "run", FunctionKind::Method, 4),
        ("functions.ts", "boundArrow", FunctionKind::Function, 4),
        ("functions.ts", "boundFunction", FunctionKind::Function, 5),
        ("functions.go", "Build", FunctionKind::Function, 4),
        ("functions.go", "Threshold", FunctionKind::Function, 5),
        ("functions.go", "Run", FunctionKind::Method, 4),
        ("functions.rs", "nested", FunctionKind::Function, 5),
        ("functions.rs", "method", FunctionKind::Method, 4),
        ("functions.rs", "typed_receiver", FunctionKind::Method, 4),
        ("functions.rs", "provided", FunctionKind::Method, 5),
        ("functions.py", "nested", FunctionKind::Function, 5),
        ("functions.py", "__init__", FunctionKind::Constructor, 5),
        ("functions.py", "method", FunctionKind::Method, 4),
        ("functions.py", "make", FunctionKind::Method, 4),
        ("functions.py", "static", FunctionKind::Method, 5),
        ("functions.py", "compound", FunctionKind::Method, 4),
    ];
    for (file, name, kind, parameter_count) in expected {
        let metric = first
            .metrics
            .iter()
            .find(|metric| metric.file == file && metric.display_name == name)
            .unwrap_or_else(|| panic!("missing metric {file}:{name}"));
        assert_eq!(metric.kind, kind, "{file}:{name}");
        assert_eq!(metric.parameter_count, parameter_count, "{file}:{name}");
    }
    assert!(first
        .metrics
        .iter()
        .all(|metric| metric.file != "declarations.d.ts"));
}

#[test]
fn ast_grep_adapter_maps_file_problems_to_partial_even_when_all_inputs_fail() {
    let partial = AstGrepStructuralScanner
        .scan(
            &fixture_root(),
            &[
                "functions.go".to_owned(),
                "syntax-error.ts".to_owned(),
                "error-node.ts".to_owned(),
                "missing.py".to_owned(),
                "directory.ts".to_owned(),
            ],
        )
        .expect("recoverable file failures");
    assert_eq!(partial.state, StructuralScanState::Partial);
    assert_eq!(partial.diagnostics.len(), 4);
    assert_eq!(partial.metrics.len(), 3);
    let records = partial
        .diagnostics
        .iter()
        .map(StructuralDiagnostic::to_record)
        .collect::<Vec<_>>();
    assert!(records
        .iter()
        .all(|record| record.code == "STRUCTURAL_SCAN_PARTIAL"));
    assert!(records
        .iter()
        .any(|record| record.message.contains("missing.py")));
    assert!(records
        .iter()
        .any(|record| record.message.contains("not a regular file")));

    let all_partial = AstGrepStructuralScanner
        .scan(
            &fixture_root(),
            &["missing.ts".to_owned(), "missing.py".to_owned()],
        )
        .expect("all file failures remain partial");
    assert_eq!(all_partial.state, StructuralScanState::Partial);
    assert!(all_partial.metrics.is_empty());
    assert_eq!(all_partial.diagnostics.len(), 2);
}

#[test]
fn ast_grep_adapter_skips_empty_input_and_maps_invariants_or_panics_to_fatal() {
    let skipped = AstGrepStructuralScanner
        .scan(&fixture_root(), &[])
        .expect("zero input");
    assert_eq!(skipped.state, StructuralScanState::SkippedNoSupportedInput);

    let language_error = AstGrepStructuralScanner
        .scan(&fixture_root(), &["unknown.xyz".to_owned()])
        .expect_err("missing supported language mapping");
    assert!(language_error.message().contains("language mapping"));

    let path_error = AstGrepStructuralScanner
        .scan(&fixture_root(), &["../outside.rs".to_owned()])
        .expect_err("outside project path");
    assert!(path_error.message().contains("outside project root"));

    assert_eq!(decode_source(vec![0xff]), Err("file is not valid UTF-8"));
    let panic_error = guard_dependency::<()>(|| panic!("forced dependency panic"))
        .expect_err("panic should be fatal");
    assert!(panic_error.message().contains("panicked"));
}
