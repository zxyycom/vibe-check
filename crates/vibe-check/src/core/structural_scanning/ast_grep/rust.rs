use ast_grep_core::Node;

use super::super::{FunctionKind, FunctionMetric, StructuralScanFailure};
use super::{build_metric, FunctionDescriptor, LanguageId, ParsedNode};

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
        if name.kind().as_ref() != "identifier" {
            continue;
        }
        metrics.push(build_metric(
            &node,
            file,
            language,
            FunctionDescriptor::new(
                function_kind(&node),
                name.text().into_owned(),
                parameter_count(&node)?,
            ),
        )?);
    }
    Ok(metrics)
}

fn function_kind(node: &ParsedNode<'_>) -> FunctionKind {
    let owner = node
        .parent()
        .filter(|parent| parent.kind().as_ref() == "declaration_list")
        .and_then(|parent| parent.parent());
    if owner.is_some_and(|owner| matches!(owner.kind().as_ref(), "impl_item" | "trait_item")) {
        FunctionKind::Method
    } else {
        FunctionKind::Function
    }
}

fn parameter_count(node: &ParsedNode<'_>) -> Result<usize, StructuralScanFailure> {
    let parameters = node
        .field("parameters")
        .ok_or_else(|| StructuralScanFailure::new("Rust function node has no parameters field"))?;
    Ok(parameters
        .children()
        .filter(Node::is_named)
        .filter(|parameter| match parameter.kind().as_ref() {
            "self_parameter" | "attribute_item" => false,
            "parameter" => parameter
                .field("pattern")
                .is_none_or(|pattern| pattern.kind().as_ref() != "self"),
            "variadic_parameter" => true,
            _ => false,
        })
        .count())
}
