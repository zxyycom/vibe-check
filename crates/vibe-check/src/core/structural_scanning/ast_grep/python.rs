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
        let display_name = name.text().into_owned();
        let direct_method = is_direct_class_method(&node);
        let kind = if direct_method && display_name == "__init__" {
            FunctionKind::Constructor
        } else if direct_method {
            FunctionKind::Method
        } else {
            FunctionKind::Function
        };
        let mut parameter_count = parameter_count(&node)?;
        if direct_method && !is_staticmethod(&node) {
            parameter_count = parameter_count.saturating_sub(1);
        }
        metrics.push(build_metric(
            &node,
            file,
            language,
            FunctionDescriptor::new(kind, display_name, parameter_count),
        )?);
    }
    Ok(metrics)
}

fn parameter_count(node: &ParsedNode<'_>) -> Result<usize, StructuralScanFailure> {
    let parameters = node.field("parameters").ok_or_else(|| {
        StructuralScanFailure::new("Python function node has no parameters field")
    })?;
    let count = parameters
        .children()
        .filter(|parameter| {
            matches!(
                parameter.kind().as_ref(),
                "identifier"
                    | "default_parameter"
                    | "typed_default_parameter"
                    | "typed_parameter"
                    | "list_splat_pattern"
                    | "dictionary_splat_pattern"
            )
        })
        .count();
    Ok(count)
}

fn is_direct_class_method(node: &ParsedNode<'_>) -> bool {
    let Some(mut parent) = node.parent() else {
        return false;
    };
    if parent.kind().as_ref() == "decorated_definition" {
        let Some(grandparent) = parent.parent() else {
            return false;
        };
        parent = grandparent;
    }
    parent.kind().as_ref() == "block"
        && parent
            .parent()
            .is_some_and(|owner| owner.kind().as_ref() == "class_definition")
}

fn is_staticmethod(node: &ParsedNode<'_>) -> bool {
    node.parent().is_some_and(|parent| {
        parent.kind().as_ref() == "decorated_definition"
            && parent.children().any(|child| {
                if child.kind().as_ref() != "decorator" {
                    return false;
                }
                let text = child.text();
                let decorator = text.trim().trim_start_matches('@');
                decorator == "staticmethod" || decorator.ends_with(".staticmethod")
            })
    })
}
