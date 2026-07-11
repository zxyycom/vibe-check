use std::path::{Path, PathBuf};

use super::{CpdFinderDuplicateScanner, DuplicateScannerAdapter};

fn fixture_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/cpd-finder-characterization")
}

// @case WB-DUPLICATE-ADAPTER-001
#[test]
fn adapter_normalizes_and_orders_pair_findings() {
    let files = vec!["pairs/cross_b.rs".to_owned(), "pairs/cross_a.rs".to_owned()];
    let first = CpdFinderDuplicateScanner
        .scan(&fixture_root(), &files)
        .expect("duplicate scan");
    let second = CpdFinderDuplicateScanner
        .scan(&fixture_root(), &files)
        .expect("repeat duplicate scan");

    assert!(!first.findings.is_empty());
    assert_eq!(first, second);
    assert!(first.findings.iter().all(|finding| {
        finding.locations[0] <= finding.locations[1]
            && finding.token_count >= 50
            && !finding.identity.is_empty()
            && finding
                .locations
                .iter()
                .all(|location| !location.file.contains('\\'))
    }));
    assert_eq!(first.findings[0].locations[0].file, "pairs/cross_a.rs");
    assert_eq!(first.findings[0].locations[1].file, "pairs/cross_b.rs");
    assert!(first
        .findings
        .windows(2)
        .all(|pair| pair[0].locations <= pair[1].locations));
}

#[test]
fn partial_preflight_failure_keeps_trustworthy_inputs() {
    let files = vec![
        "formats/example.rs".to_owned(),
        "missing/deleted.rs".to_owned(),
        "pairs".to_owned(),
    ];
    let outcome = CpdFinderDuplicateScanner
        .scan(&fixture_root(), &files)
        .expect("partial duplicate scan");

    assert!(outcome.findings.is_empty());
    assert_eq!(outcome.diagnostics.len(), 2);
    assert_eq!(outcome.diagnostics[0].code, "DUPLICATE_SCAN_PARTIAL");
    assert!(outcome.diagnostics[0]
        .message
        .contains("missing/deleted.rs"));
    assert!(outcome.diagnostics[1].message.contains("pairs"));
    assert!(outcome.diagnostics[1]
        .message
        .contains("not a regular file"));
}

#[test]
fn all_invalid_inputs_are_fatal() {
    let error = CpdFinderDuplicateScanner
        .scan(&fixture_root(), &["missing/deleted.rs".to_owned()])
        .expect_err("all invalid inputs must fail");

    assert!(error.message().contains("no readable inputs"));
}

#[test]
fn zero_supported_inputs_complete_without_diagnostics() {
    let outcome = CpdFinderDuplicateScanner
        .scan(&fixture_root(), &[])
        .expect("empty scope should skip duplicate scanning");

    assert!(outcome.findings.is_empty());
    assert!(outcome.diagnostics.is_empty());
}
