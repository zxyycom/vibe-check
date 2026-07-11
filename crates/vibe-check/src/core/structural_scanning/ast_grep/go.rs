use ast_grep_core::Node;

use super::super::{FunctionKind, FunctionMetric, StructuralScanFailure};
use super::{build_metric, LanguageId, ParsedNode};

pub(super) fn extract(
    candidates: Vec<ParsedNode<'_>>,
    file: &str,
    language: LanguageId,
) -> Result<Vec<FunctionMetric>, StructuralScanFailure> {
    let mut metrics = Vec::new();
    for node in candidates {
        if node.field("body").is_none() {
            continue;
        }
        let Some(name) = node.field("name") else {
            continue;
        };
        let kind = match node.kind().as_ref() {
            "function_declaration" => FunctionKind::Function,
            "method_declaration" => FunctionKind::Method,
            _ => continue,
        };
        metrics.push(build_metric(
            &node,
            file,
            language,
            kind,
            name.text().into_owned(),
            parameter_count(&node)?,
        )?);
    }
    Ok(metrics)
}

fn parameter_count(node: &ParsedNode<'_>) -> Result<usize, StructuralScanFailure> {
    let parameters = node
        .field("parameters")
        .ok_or_else(|| StructuralScanFailure::new("Go function node has no parameters field"))?;
    let count =
        parameters
            .children()
            .filter(Node::is_named)
            .try_fold(0usize, |count, parameter| {
                let slots = match parameter.kind().as_ref() {
                    "parameter_declaration" => parameter.field_children("name").count().max(1),
                    "variadic_parameter_declaration" => 1,
                    other => {
                        return Err(StructuralScanFailure::new(format!(
                            "unexpected Go parameter node {other}"
                        )))
                    }
                };
                count
                    .checked_add(slots)
                    .ok_or_else(|| StructuralScanFailure::new("Go parameter count overflow"))
            });
    count
}
