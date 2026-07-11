use ast_grep_core::Node;

use super::super::{FunctionKind, FunctionMetric, StructuralScanFailure};
use super::{build_metric, LanguageId, ParsedNode};

pub(super) fn extract(
    candidates: Vec<ParsedNode<'_>>,
    file: &str,
    language: LanguageId,
) -> Result<Vec<FunctionMetric>, StructuralScanFailure> {
    let mut metrics = Vec::new();
    for candidate in candidates {
        let metric = match candidate.kind().as_ref() {
            "function_declaration" => declaration_metric(&candidate, file, language)?,
            "method_definition" => method_metric(&candidate, file, language)?,
            "variable_declarator" => bound_metric(&candidate, file, language)?,
            _ => None,
        };
        if let Some(metric) = metric {
            metrics.push(metric);
        }
    }
    Ok(metrics)
}

fn declaration_metric(
    node: &ParsedNode<'_>,
    file: &str,
    language: LanguageId,
) -> Result<Option<FunctionMetric>, StructuralScanFailure> {
    if node.field("body").is_none() {
        return Ok(None);
    }
    let Some(name) = stable_name(node.field("name")) else {
        return Ok(None);
    };
    build_metric(
        node,
        file,
        language,
        FunctionKind::Function,
        name,
        parameter_count(node)?,
    )
    .map(Some)
}

fn method_metric(
    node: &ParsedNode<'_>,
    file: &str,
    language: LanguageId,
) -> Result<Option<FunctionMetric>, StructuralScanFailure> {
    if node.field("body").is_none() {
        return Ok(None);
    }
    let Some(name) = stable_name(node.field("name")) else {
        return Ok(None);
    };
    let kind = if name == "constructor" {
        FunctionKind::Constructor
    } else {
        FunctionKind::Method
    };
    build_metric(node, file, language, kind, name, parameter_count(node)?).map(Some)
}

fn bound_metric(
    declarator: &ParsedNode<'_>,
    file: &str,
    language: LanguageId,
) -> Result<Option<FunctionMetric>, StructuralScanFailure> {
    let Some(name_node) = declarator.field("name") else {
        return Ok(None);
    };
    if name_node.kind().as_ref() != "identifier" {
        return Ok(None);
    }
    let Some(value) = declarator.field("value") else {
        return Ok(None);
    };
    if !matches!(
        value.kind().as_ref(),
        "arrow_function" | "function_expression"
    ) || value.field("body").is_none()
    {
        return Ok(None);
    }
    build_metric(
        &value,
        file,
        language,
        FunctionKind::Function,
        name_node.text().into_owned(),
        parameter_count(&value)?,
    )
    .map(Some)
}

fn stable_name(node: Option<ParsedNode<'_>>) -> Option<String> {
    let node = node?;
    matches!(
        node.kind().as_ref(),
        "identifier" | "property_identifier" | "private_property_identifier" | "string" | "number"
    )
    .then(|| node.text().into_owned())
}

fn parameter_count(node: &ParsedNode<'_>) -> Result<usize, StructuralScanFailure> {
    if node.kind().as_ref() == "arrow_function" && node.field("parameter").is_some() {
        return Ok(1);
    }
    let parameters = node.field("parameters").ok_or_else(|| {
        StructuralScanFailure::new("TypeScript function node has no parameters field")
    })?;
    Ok(parameters
        .children()
        .filter(Node::is_named)
        .filter(|parameter| {
            parameter
                .field("pattern")
                .is_none_or(|pattern| pattern.kind().as_ref() != "this")
        })
        .count())
}
