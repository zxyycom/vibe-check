mod go;
mod python;
mod rust;
mod typescript;

use std::any::Any;
use std::fs;
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::path::Path;

use ast_grep_core::tree_sitter::StrDoc;
use ast_grep_core::{AstGrep, Node};
use ast_grep_language::SupportLang;

use super::super::metrics::LanguageId;
use super::{
    normalize_input_path, normalize_metrics, FunctionKind, FunctionMetric, SourceRange,
    StructuralDiagnostic, StructuralInputPath, StructuralScanFailure, StructuralScanOutcome,
    StructuralScannerAdapter,
};

pub(super) type ParsedNode<'tree> = Node<'tree, StrDoc<SupportLang>>;

#[derive(Clone, Copy, Debug, Default)]
pub(crate) struct AstGrepStructuralScanner;

impl StructuralScannerAdapter for AstGrepStructuralScanner {
    fn scan(
        &self,
        project_root: &Path,
        supported_files: &[String],
    ) -> Result<StructuralScanOutcome, StructuralScanFailure> {
        if supported_files.is_empty() {
            return Ok(StructuralScanOutcome::skipped());
        }
        guard_dependency(|| scan_files(project_root, supported_files))
    }
}

fn scan_files(
    project_root: &Path,
    supported_files: &[String],
) -> Result<StructuralScanOutcome, StructuralScanFailure> {
    let mut metrics = Vec::new();
    let mut diagnostics = Vec::new();

    for supported_file in supported_files {
        let input = normalize_input_path(project_root, Path::new(supported_file))?;
        let (parser_language, metric_language) = language_for_input(&input)?;
        let source = match read_source(&input) {
            Ok(source) => source,
            Err(reason) => {
                diagnostics.push(StructuralDiagnostic::new(input.relative, reason));
                continue;
            }
        };
        let parsed =
            AstGrep::<StrDoc<SupportLang>>::try_new(&source, parser_language).map_err(|error| {
                StructuralScanFailure::new(format!(
                    "failed to initialize structural parser for {}: {error}",
                    input.relative
                ))
            })?;
        let root = parsed.root();
        let candidates = match collect_candidates(&root, candidate_kinds(parser_language)) {
            Ok(candidates) => candidates,
            Err(reason) => {
                diagnostics.push(StructuralDiagnostic::new(input.relative, reason));
                continue;
            }
        };
        let mut file_metrics = match parser_language {
            SupportLang::TypeScript => {
                typescript::extract(candidates, &input.relative, metric_language)?
            }
            SupportLang::Go => go::extract(candidates, &input.relative, metric_language)?,
            SupportLang::Rust => rust::extract(candidates, &input.relative, metric_language)?,
            SupportLang::Python => python::extract(candidates, &input.relative, metric_language)?,
            _ => {
                return Err(StructuralScanFailure::new(format!(
                    "structural language mapping produced disabled parser for {}",
                    input.relative
                )))
            }
        };
        metrics.append(&mut file_metrics);
    }

    let metrics = normalize_metrics(metrics)?;
    diagnostics.sort_by(|left, right| {
        left.file
            .cmp(&right.file)
            .then(left.reason.cmp(&right.reason))
    });
    if diagnostics.is_empty() {
        Ok(StructuralScanOutcome::completed(metrics))
    } else {
        Ok(StructuralScanOutcome::partial(metrics, diagnostics))
    }
}

fn language_for_input(
    input: &StructuralInputPath,
) -> Result<(SupportLang, LanguageId), StructuralScanFailure> {
    let extension = Path::new(&input.relative)
        .extension()
        .and_then(|extension| extension.to_str());
    match extension {
        Some(extension) if extension.eq_ignore_ascii_case("ts") => {
            Ok((SupportLang::TypeScript, LanguageId::TypeScript))
        }
        Some(extension) if extension.eq_ignore_ascii_case("go") => {
            Ok((SupportLang::Go, LanguageId::Go))
        }
        Some(extension) if extension.eq_ignore_ascii_case("rs") => {
            Ok((SupportLang::Rust, LanguageId::Rust))
        }
        Some(extension) if extension.eq_ignore_ascii_case("py") => {
            Ok((SupportLang::Python, LanguageId::Python))
        }
        _ => Err(StructuralScanFailure::new(format!(
            "missing structural language mapping for {}",
            input.relative
        ))),
    }
}

fn candidate_kinds(language: SupportLang) -> &'static [&'static str] {
    match language {
        SupportLang::TypeScript => &[
            "function_declaration",
            "method_definition",
            "variable_declarator",
        ],
        SupportLang::Go => &["function_declaration", "method_declaration"],
        SupportLang::Rust => &["function_item"],
        SupportLang::Python => &["function_definition"],
        _ => &[],
    }
}

fn collect_candidates<'tree>(
    root: &ParsedNode<'tree>,
    candidate_kinds: &[&str],
) -> Result<Vec<ParsedNode<'tree>>, &'static str> {
    let mut candidates = Vec::new();
    let mut has_error = false;
    let mut has_missing = false;
    for node in root.dfs() {
        has_error |= node.is_error();
        has_missing |= node.is_missing();
        if candidate_kinds.contains(&node.kind().as_ref()) {
            candidates.push(node);
        }
    }
    match (has_error, has_missing) {
        (true, true) => Err("syntax tree contains error and missing nodes"),
        (true, false) => Err("syntax tree contains an error node"),
        (false, true) => Err("syntax tree contains a missing node"),
        (false, false) => Ok(candidates),
    }
}

fn read_source(input: &StructuralInputPath) -> Result<String, String> {
    let metadata = fs::metadata(&input.absolute)
        .map_err(|error| format!("failed to inspect file: {error}"))?;
    if !metadata.is_file() {
        return Err("path is not a regular file".to_owned());
    }
    let bytes =
        fs::read(&input.absolute).map_err(|error| format!("failed to read file: {error}"))?;
    decode_source(bytes).map_err(str::to_owned)
}

pub(super) fn decode_source(bytes: Vec<u8>) -> Result<String, &'static str> {
    String::from_utf8(bytes).map_err(|_| "file is not valid UTF-8")
}

pub(super) fn guard_dependency<T>(
    operation: impl FnOnce() -> Result<T, StructuralScanFailure>,
) -> Result<T, StructuralScanFailure> {
    catch_unwind(AssertUnwindSafe(operation)).map_err(|panic| {
        StructuralScanFailure::new(format!(
            "structural scanner dependency panicked: {}",
            panic_message(panic.as_ref())
        ))
    })?
}

fn panic_message(panic: &(dyn Any + Send)) -> &str {
    if let Some(message) = panic.downcast_ref::<&str>() {
        message
    } else if let Some(message) = panic.downcast_ref::<String>() {
        message.as_str()
    } else {
        "unknown panic payload"
    }
}

pub(super) fn build_metric(
    node: &ParsedNode<'_>,
    file: &str,
    language: LanguageId,
    kind: FunctionKind,
    display_name: String,
    parameter_count: usize,
) -> Result<FunctionMetric, StructuralScanFailure> {
    if node.range().is_empty() {
        return Err(StructuralScanFailure::new(format!(
            "function node has an empty source range in {file}"
        )));
    }
    let start = node.start_pos();
    let end = node.end_pos();
    let range = SourceRange::new(
        one_based_u32(start.line(), "start line", file)?,
        one_based_u32(start.column(node), "start column", file)?,
        one_based_u32(end.line(), "end line", file)?,
        u32_value(end.column(node), "end column", file)?,
    )?;
    let parameter_count = u32_value(parameter_count, "parameter count", file)?;
    if display_name.trim().is_empty() {
        return Err(StructuralScanFailure::new(format!(
            "function display name is empty in {file}"
        )));
    }
    Ok(FunctionMetric {
        file: file.to_owned(),
        language,
        kind,
        display_name,
        range,
        parameter_count,
    })
}

fn one_based_u32(value: usize, field: &str, file: &str) -> Result<u32, StructuralScanFailure> {
    let value = value.checked_add(1).ok_or_else(|| {
        StructuralScanFailure::new(format!("{field} overflow in structural result for {file}"))
    })?;
    u32_value(value, field, file)
}

fn u32_value(value: usize, field: &str, file: &str) -> Result<u32, StructuralScanFailure> {
    u32::try_from(value).map_err(|_| {
        StructuralScanFailure::new(format!("{field} overflow in structural result for {file}"))
    })
}
