use std::path::{Path, PathBuf};

use cpd_finder::orchestrate::{run, FinderError};

use super::{scan_with_runner, validate_utf8};

fn fixture_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/cpd-finder-characterization")
}

fn pair_files() -> Vec<String> {
    vec!["pairs/cross_a.rs".to_owned(), "pairs/cross_b.rs".to_owned()]
}

#[test]
fn invalid_utf8_is_rejected_before_scanning() {
    assert_eq!(validate_utf8(&[0xff]), Err("file is not valid UTF-8"));
}

#[test]
fn finder_error_and_panic_are_fatal() {
    let finder_error = scan_with_runner(&fixture_root(), &pair_files(), |_| {
        Err(FinderError::Other("forced finder failure".to_owned()))
    })
    .expect_err("finder error");
    assert!(finder_error.message().contains("forced finder failure"));

    let panic_error = scan_with_runner(&fixture_root(), &pair_files(), |_| panic!("forced panic"))
        .expect_err("panic should be caught");
    assert!(panic_error.message().contains("panicked"));
}

#[test]
fn unknown_source_id_and_invalid_location_are_fatal() {
    let source_error = scan_with_runner(&fixture_root(), &pair_files(), |config| {
        let mut result = run(config)?;
        result.clones[0].fragment_a.source_id = "outside-project.rs".to_owned();
        Ok(result)
    })
    .expect_err("unknown source id");
    assert!(source_error.message().contains("source id"));

    let location_error = scan_with_runner(&fixture_root(), &pair_files(), |config| {
        let mut result = run(config)?;
        result.clones[0].fragment_a.start.line = 0;
        Ok(result)
    })
    .expect_err("invalid location");
    assert!(location_error.message().contains("invalid location"));
}
