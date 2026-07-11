use std::collections::BTreeMap;
use std::fs;
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::path::{Component, Path, PathBuf};

use cpd_finder::orchestrate::{run, FinderError, RunConfig, RunResult};

use super::{
    DuplicateFinding, DuplicateLocation, DuplicateScanFailure, DuplicateScanOutcome,
    DuplicateScannerAdapter,
};
use crate::core::{DiagnosticRecord, DiagnosticSeverity};

const DUPLICATE_SCAN_PARTIAL_CODE: &str = "DUPLICATE_SCAN_PARTIAL";
const MIN_TOKENS: usize = 50;
const MIN_LINES: usize = 5;
const SUPPORTED_FORMATS: [&str; 4] = ["typescript", "go", "rust", "python"];

#[derive(Clone, Copy, Debug, Default)]
pub(crate) struct CpdFinderDuplicateScanner;

impl DuplicateScannerAdapter for CpdFinderDuplicateScanner {
    fn scan(
        &self,
        project_root: &Path,
        supported_files: &[String],
    ) -> Result<DuplicateScanOutcome, DuplicateScanFailure> {
        scan_with_runner(project_root, supported_files, run)
    }
}

struct PreparedInputs {
    paths: Vec<PathBuf>,
    source_paths: BTreeMap<String, String>,
    diagnostics: Vec<DiagnosticRecord>,
}

struct RawLocation<'a> {
    source_id: &'a str,
    start_line: u32,
    start_column: u32,
    end_line: u32,
    end_column: u32,
}

fn scan_with_runner<F>(
    project_root: &Path,
    supported_files: &[String],
    runner: F,
) -> Result<DuplicateScanOutcome, DuplicateScanFailure>
where
    F: FnOnce(&RunConfig) -> Result<RunResult, FinderError>,
{
    if supported_files.is_empty() {
        return Ok(DuplicateScanOutcome::default());
    }

    let prepared = preflight(project_root, supported_files)?;
    if prepared.paths.is_empty() {
        return Err(DuplicateScanFailure::new(
            "duplicate scan has no readable inputs after preflight",
        ));
    }

    let config = run_config(prepared.paths);
    let result = catch_unwind(AssertUnwindSafe(|| runner(&config)))
        .map_err(|_| DuplicateScanFailure::new("cpd-finder panicked during duplicate scan"))?
        .map_err(|error| {
            DuplicateScanFailure::new(format!("cpd-finder duplicate scan failed: {error}"))
        })?;
    let findings = normalize_findings(result, &prepared.source_paths)?;

    Ok(DuplicateScanOutcome {
        findings,
        diagnostics: prepared.diagnostics,
    })
}

fn preflight(
    project_root: &Path,
    supported_files: &[String],
) -> Result<PreparedInputs, DuplicateScanFailure> {
    let canonical_root = fs::canonicalize(project_root).map_err(|error| {
        DuplicateScanFailure::new(format!(
            "failed to canonicalize duplicate scan project root {}: {error}",
            project_root.display()
        ))
    })?;
    let mut paths = Vec::with_capacity(supported_files.len());
    let mut source_paths = BTreeMap::new();
    let mut diagnostics = Vec::new();

    for file in supported_files {
        let requested_path = project_root.join(file);
        if let Err(reason) = validate_preflight_file(&requested_path) {
            diagnostics.push(partial_diagnostic(file, reason));
            continue;
        }

        let canonical_path = fs::canonicalize(&requested_path).map_err(|error| {
            DuplicateScanFailure::new(format!(
                "failed to canonicalize duplicate scan input {file}: {error}"
            ))
        })?;
        let relative_path = canonical_path.strip_prefix(&canonical_root).map_err(|_| {
            DuplicateScanFailure::new(format!(
                "duplicate scan input resolves outside project root: {file}"
            ))
        })?;
        let normalized_path = normalize_relative_path(relative_path)?;
        source_paths.insert(
            canonical_path.to_string_lossy().into_owned(),
            normalized_path,
        );
        paths.push(canonical_path);
    }

    Ok(PreparedInputs {
        paths,
        source_paths,
        diagnostics,
    })
}

fn validate_preflight_file(path: &Path) -> Result<(), String> {
    let metadata =
        fs::metadata(path).map_err(|error| format!("failed to read metadata: {error}"))?;
    if !metadata.is_file() {
        return Err("path is not a regular file".to_owned());
    }

    let bytes = fs::read(path).map_err(|error| format!("failed to read file: {error}"))?;
    validate_utf8(&bytes).map_err(str::to_owned)
}

fn validate_utf8(bytes: &[u8]) -> Result<(), &'static str> {
    std::str::from_utf8(bytes)
        .map(|_| ())
        .map_err(|_| "file is not valid UTF-8")
}

fn normalize_relative_path(path: &Path) -> Result<String, DuplicateScanFailure> {
    let mut parts = Vec::new();
    for component in path.components() {
        match component {
            Component::CurDir => {}
            Component::Normal(part) => parts.push(part.to_str().ok_or_else(|| {
                DuplicateScanFailure::new("duplicate scan path is not valid UTF-8")
            })?),
            _ => {
                return Err(DuplicateScanFailure::new(
                    "duplicate scan path is not project-root-relative",
                ));
            }
        }
    }
    if parts.is_empty() {
        return Err(DuplicateScanFailure::new(
            "duplicate scan path does not identify a file",
        ));
    }
    Ok(parts.join("/"))
}

fn run_config(paths: Vec<PathBuf>) -> RunConfig {
    RunConfig {
        paths,
        min_tokens: MIN_TOKENS,
        min_lines: MIN_LINES,
        max_lines: None,
        formats: SUPPORTED_FORMATS.into_iter().map(str::to_owned).collect(),
        ignore: Vec::new(),
        code_ignore_patterns: Vec::new(),
        max_size: None,
        no_gitignore: true,
        follow_symlinks: false,
        skip_local: false,
        blame: false,
        workers: None,
        ignore_case: false,
        formats_exts: Default::default(),
        formats_names: Default::default(),
        pattern: None,
        ..Default::default()
    }
}

fn normalize_findings(
    result: RunResult,
    source_paths: &BTreeMap<String, String>,
) -> Result<Vec<DuplicateFinding>, DuplicateScanFailure> {
    let mut findings = Vec::with_capacity(result.clones.len());

    for clone in result.clones {
        findings.push(normalize_pair(
            source_paths,
            clone.token_count,
            RawLocation {
                source_id: &clone.fragment_a.source_id,
                start_line: clone.fragment_a.start.line,
                start_column: clone.fragment_a.start.column,
                end_line: clone.fragment_a.end.line,
                end_column: clone.fragment_a.end.column,
            },
            RawLocation {
                source_id: &clone.fragment_b.source_id,
                start_line: clone.fragment_b.start.line,
                start_column: clone.fragment_b.start.column,
                end_line: clone.fragment_b.end.line,
                end_column: clone.fragment_b.end.column,
            },
        )?);
    }

    findings.sort_by(|left, right| {
        left.locations
            .cmp(&right.locations)
            .then(left.token_count.cmp(&right.token_count))
            .then(left.identity.cmp(&right.identity))
    });
    Ok(findings)
}

fn normalize_pair(
    source_paths: &BTreeMap<String, String>,
    token_count: u32,
    first: RawLocation<'_>,
    second: RawLocation<'_>,
) -> Result<DuplicateFinding, DuplicateScanFailure> {
    if token_count < MIN_TOKENS as u32 {
        return Err(DuplicateScanFailure::new(format!(
            "cpd-finder returned a clone below the {MIN_TOKENS}-token profile"
        )));
    }

    let mut locations = [
        normalize_location(source_paths, first)?,
        normalize_location(source_paths, second)?,
    ];
    locations.sort();
    if locations[0] == locations[1] {
        return Err(DuplicateScanFailure::new(
            "cpd-finder returned a clone with identical locations",
        ));
    }

    Ok(DuplicateFinding {
        identity: pair_identity(&locations, token_count),
        locations,
        token_count,
    })
}

fn normalize_location(
    source_paths: &BTreeMap<String, String>,
    raw: RawLocation<'_>,
) -> Result<DuplicateLocation, DuplicateScanFailure> {
    let file = source_paths.get(raw.source_id).ok_or_else(|| {
        DuplicateScanFailure::new(format!(
            "cpd-finder returned an unknown or out-of-scope source id: {}",
            raw.source_id
        ))
    })?;
    if raw.start_line == 0
        || raw.end_line < raw.start_line
        || (raw.end_line == raw.start_line && raw.end_column < raw.start_column)
    {
        return Err(DuplicateScanFailure::new(format!(
            "cpd-finder returned an invalid location for {file}"
        )));
    }

    Ok(DuplicateLocation {
        file: file.clone(),
        start_line: raw.start_line,
        start_column: raw.start_column,
        end_line: raw.end_line,
        end_column: raw.end_column,
    })
}

fn pair_identity(locations: &[DuplicateLocation; 2], token_count: u32) -> String {
    let first = &locations[0];
    let second = &locations[1];
    format!(
        "{}#{}:{}:{}:{}:{}|{}#{}:{}:{}:{}:{}|{token_count}",
        first.file.len(),
        first.file,
        first.start_line,
        first.start_column,
        first.end_line,
        first.end_column,
        second.file.len(),
        second.file,
        second.start_line,
        second.start_column,
        second.end_line,
        second.end_column,
    )
}

fn partial_diagnostic(file: &str, reason: impl AsRef<str>) -> DiagnosticRecord {
    DiagnosticRecord {
        severity: DiagnosticSeverity::Warning,
        code: DUPLICATE_SCAN_PARTIAL_CODE.to_owned(),
        message: format!(
            "duplicate scan skipped {file} during preflight: {}",
            reason.as_ref()
        ),
    }
}

#[cfg(test)]
mod tests;
