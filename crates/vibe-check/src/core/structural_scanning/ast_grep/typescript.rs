use super::super::{FunctionKind, FunctionMetric, StructuralScanFailure};
use super::{build_metric, FunctionDescriptor, LanguageId, ParsedNode};

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
        FunctionDescriptor::new(FunctionKind::Function, name, parameter_count(node)?),
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
    build_metric(
        node,
        file,
        language,
        FunctionDescriptor::new(kind, name, parameter_count(node)?),
    )
    .map(Some)
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
        FunctionDescriptor::new(
            FunctionKind::Function,
            name_node.text().into_owned(),
            parameter_count(&value)?,
        ),
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
    let count = parameters.children().try_fold(0usize, |count, parameter| {
        if !parameter.is_named() || parameter.kind().as_ref() == "comment" {
            return Ok(count);
        }
        if !matches!(
            parameter.kind().as_ref(),
            "required_parameter" | "optional_parameter"
        ) {
            return Err(StructuralScanFailure::new(format!(
                "unexpected TypeScript parameter node {}",
                parameter.kind()
            )));
        }
        let is_this = parameter
            .field("pattern")
            .is_some_and(|pattern| pattern.kind().as_ref() == "this");
        Ok(count + usize::from(!is_this))
    });
    count
}
