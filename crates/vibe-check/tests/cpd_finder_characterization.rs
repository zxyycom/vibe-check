use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

use cpd_finder::orchestrate::{run, RunConfig};

fn fixture_path(relative: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/cpd-finder-characterization")
        .join(relative)
}

fn default_config(paths: Vec<PathBuf>) -> RunConfig {
    RunConfig {
        paths,
        formats: vec![
            "typescript".to_string(),
            "go".to_string(),
            "rust".to_string(),
            "python".to_string(),
        ],
        no_gitignore: true,
        ..Default::default()
    }
}

fn canonical_id(path: &Path) -> String {
    path.canonicalize()
        .expect("characterization fixture should canonicalize")
        .to_string_lossy()
        .into_owned()
}

// @case WB-DUPLICATE-DEPENDENCY-001
#[test]
fn exact_file_paths_produce_cross_file_and_same_file_pairs() {
    let cross_a = fixture_path("pairs/cross_a.rs");
    let cross_b = fixture_path("pairs/cross_b.rs");
    let cross_result = run(&default_config(vec![cross_a.clone(), cross_b.clone()]))
        .expect("cpd-finder should scan exact cross-file paths");

    assert!(
        cross_result
            .clones
            .iter()
            .any(|clone| clone.fragment_a.source_id != clone.fragment_b.source_id),
        "expected at least one cross-file pair"
    );

    let expected_source_ids = BTreeSet::from([canonical_id(&cross_a), canonical_id(&cross_b)]);
    let actual_source_ids = cross_result
        .sources
        .iter()
        .map(|source| source.id.clone())
        .collect::<BTreeSet<_>>();
    assert_eq!(actual_source_ids, expected_source_ids);
    assert!(cross_result.clones.iter().all(|clone| {
        expected_source_ids.contains(&clone.fragment_a.source_id)
            && expected_source_ids.contains(&clone.fragment_b.source_id)
    }));

    let same_file = fixture_path("pairs/same_file.rs");
    let same_result =
        run(&default_config(vec![same_file])).expect("cpd-finder should scan one exact file path");
    assert!(
        same_result
            .clones
            .iter()
            .any(|clone| clone.fragment_a.source_id == clone.fragment_b.source_id),
        "expected at least one same-file pair"
    );
}

#[test]
fn supported_extensions_map_to_the_audited_formats() {
    let paths = [
        "formats/example.ts",
        "formats/example.go",
        "formats/example.rs",
        "formats/example.py",
    ]
    .map(fixture_path)
    .to_vec();
    let mut config = default_config(paths);
    config.min_tokens = 1;
    config.min_lines = 0;

    let result = run(&config).expect("cpd-finder should recognize supported fixture formats");
    let formats = result
        .sources
        .iter()
        .map(|source| source.format.as_str())
        .collect::<BTreeSet<_>>();

    assert_eq!(
        formats,
        BTreeSet::from(["go", "python", "rust", "typescript"])
    );
}

#[test]
fn default_profile_enforces_token_and_line_span_thresholds() {
    let above_paths = vec![
        fixture_path("threshold/above_a.rs"),
        fixture_path("threshold/above_b.rs"),
    ];
    let above =
        run(&default_config(above_paths)).expect("cpd-finder should scan above-threshold fixtures");
    assert!(above.clones.iter().any(|clone| {
        clone.token_count >= 50 && clone.fragment_a.end.line - clone.fragment_a.start.line >= 5
    }));

    let below_token_paths = vec![
        fixture_path("threshold/below_token_a.rs"),
        fixture_path("threshold/below_token_b.rs"),
    ];
    let below_token = run(&default_config(below_token_paths))
        .expect("below-token fixtures should be a normal empty result");
    assert!(below_token.clones.is_empty());

    let below_line_paths = vec![
        fixture_path("threshold/below_line_a.rs"),
        fixture_path("threshold/below_line_b.rs"),
    ];
    let below_line = run(&default_config(below_line_paths.clone()))
        .expect("below-line-span fixtures should be a normal empty result");
    assert!(below_line.clones.is_empty());

    let mut without_line_filter = default_config(below_line_paths);
    without_line_filter.min_lines = 0;
    let without_line_filter = run(&without_line_filter)
        .expect("the same fixtures should be detectable without the line-span filter");
    assert!(!without_line_filter.clones.is_empty());
}

#[test]
fn no_gitignore_preserves_vibe_check_owned_exact_paths() {
    let paths = vec![
        fixture_path("gitignored/ignored_a.rs"),
        fixture_path("gitignored/ignored_b.rs"),
    ];
    let result = run(&default_config(paths))
        .expect("cpd-finder should scan exact paths accepted by Vibe Check");

    assert!(!result.clones.is_empty());
}
