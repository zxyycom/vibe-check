use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use super::{
    aggregate_metrics, gate_from_warnings, generate_warnings, FileMetrics, LanguageId,
    LocMetricsAdapter, TokeiLocMetricsAdapter,
};
use crate::core::{DuplicateFinding, DuplicateLocation};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct LineCounts {
    total: u64,
    code: u64,
    comments: u64,
    blanks: u64,
}

const fn lines(total: u64, code: u64, comments: u64, blanks: u64) -> LineCounts {
    LineCounts {
        total,
        code,
        comments,
        blanks,
    }
}

fn file_metrics(file: impl Into<String>, language: LanguageId, lines: LineCounts) -> FileMetrics {
    FileMetrics {
        file: file.into(),
        language,
        total_lines: lines.total,
        code_lines: lines.code,
        comment_lines: lines.comments,
        blank_lines: lines.blanks,
    }
}

fn rust_file(file: impl Into<String>, total_lines: u64) -> FileMetrics {
    file_metrics(
        file,
        LanguageId::Rust,
        lines(total_lines, total_lines, 0, 0),
    )
}

fn duplicate_finding(primary: &str, secondary: &str, token_count: u32) -> DuplicateFinding {
    let locations = [
        DuplicateLocation {
            file: primary.to_owned(),
            start_line: 10,
            start_column: 1,
            end_line: 18,
            end_column: 2,
        },
        DuplicateLocation {
            file: secondary.to_owned(),
            start_line: 30,
            start_column: 3,
            end_line: 38,
            end_column: 4,
        },
    ];
    DuplicateFinding {
        identity: format!("{primary}|{secondary}|{token_count}"),
        locations,
        token_count,
    }
}

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

// @case WB-METRICS-AGGREGATE-001
#[test]
fn aggregation_counts_files_totals_and_languages() {
    let metrics = aggregate_metrics(&[
        file_metrics("src/lib.rs", LanguageId::Rust, lines(3, 1, 1, 1)),
        file_metrics("tools/main.py", LanguageId::Python, lines(5, 3, 1, 1)),
        file_metrics("src/bin.rs", LanguageId::Rust, lines(2, 2, 0, 0)),
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
    let warnings = generate_warnings(
        &[
            rust_file("small.rs", 399),
            rust_file("medium.rs", 400),
            rust_file("large.rs", 800),
        ],
        &[],
    );

    assert_eq!(warnings.len(), 2);
    assert_eq!(
        warnings
            .iter()
            .map(|warning| warning.file.as_str())
            .collect::<Vec<_>>(),
        vec!["large.rs", "medium.rs"]
    );

    let large = &warnings[0];
    assert_eq!(large.severity.as_str(), "high");
    assert!(large.blocking);
    assert!(large.message.contains("800 total lines"));
    assert!(large.message.contains("800-line threshold"));

    let medium = &warnings[1];
    assert_eq!(medium.location, "file");
    assert_eq!(medium.severity.as_str(), "medium");
    assert_eq!(medium.rule, "file.too_many_lines");
    assert!(!medium.blocking);
    assert!(medium.message.contains("400 total lines"));
    assert!(medium.message.contains("400-line threshold"));
}

#[test]
fn gate_uses_only_blocking_warnings() {
    let non_blocking = generate_warnings(&[rust_file("medium.rs", 400)], &[]);
    let passing_gate = gate_from_warnings(&non_blocking);
    assert_eq!(passing_gate.status.as_str(), "passed");
    assert_eq!(passing_gate.blocking_warnings, 0);

    let blocking = generate_warnings(&[rust_file("large.rs", 800)], &[]);
    let failing_gate = gate_from_warnings(&blocking);
    assert_eq!(failing_gate.status.as_str(), "failed");
    assert_eq!(failing_gate.blocking_warnings, 1);
}

#[test]
fn duplicate_warnings_are_locatable_sorted_and_non_blocking() {
    let warnings = generate_warnings(
        &[rust_file("z-large.rs", 800)],
        &[
            duplicate_finding("b.rs", "c.rs", 75),
            duplicate_finding("a.rs", "d.rs", 50),
        ],
    );

    assert_eq!(warnings.len(), 3);
    assert_eq!(
        warnings
            .iter()
            .map(|warning| warning.file.as_str())
            .collect::<Vec<_>>(),
        vec!["a.rs", "b.rs", "z-large.rs"]
    );

    let duplicate = &warnings[0];
    assert_eq!(duplicate.location, "lines 10-18");
    assert_eq!(duplicate.severity.as_str(), "medium");
    assert_eq!(duplicate.rule, "duplicate.code_fragment");
    assert!(duplicate.message.contains("50 tokens"));
    assert!(duplicate.message.contains("d.rs:30-38"));
    assert!(!duplicate.accepted);
    assert!(!duplicate.suppressed);
    assert!(!duplicate.blocking);

    let gate = gate_from_warnings(&warnings);
    assert_eq!(gate.status.as_str(), "failed");
    assert_eq!(gate.blocking_warnings, 1);
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
            "src/types.d.ts",
            "// comment\n\nexport type Value = string;\n",
            LanguageId::TypeScript,
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
