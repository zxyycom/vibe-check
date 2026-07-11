use std::collections::BTreeSet;
use std::fs;
use std::path::{Path, PathBuf};

use ast_grep_core::tree_sitter::StrDoc;
use ast_grep_core::{AstGrep, Language, Node};
use ast_grep_language::SupportLang;

type ParsedSource = AstGrep<StrDoc<SupportLang>>;
type ParsedNode<'tree> = Node<'tree, StrDoc<SupportLang>>;

fn fixture_path(relative: &str) -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/fixtures/ast-grep-characterization")
        .join(relative)
}

fn parse_fixture(relative: &str) -> ParsedSource {
    let path = fixture_path(relative);
    let language = SupportLang::from_path(&path).expect("fixture should map to a language");
    let source = fs::read_to_string(&path).expect("characterization fixture should be UTF-8");
    AstGrep::<StrDoc<SupportLang>>::try_new(&source, language)
        .expect("audited language should initialize and return a tree")
}

fn nodes_by_kind<'tree>(parsed: &'tree ParsedSource, kind: &str) -> Vec<ParsedNode<'tree>> {
    let root = parsed.root();
    root.dfs()
        .filter(|node| node.kind().as_ref() == kind)
        .collect()
}

fn named_node<'tree>(parsed: &'tree ParsedSource, kind: &str, name: &str) -> ParsedNode<'tree> {
    nodes_by_kind(parsed, kind)
        .into_iter()
        .find(|node| {
            node.field("name")
                .is_some_and(|field| field.text().as_ref() == name)
        })
        .unwrap_or_else(|| panic!("expected {kind} named {name}"))
}

fn has_parse_problem(parsed: &ParsedSource) -> bool {
    let root = parsed.root();
    let has_problem = root.dfs().any(|node| node.is_error() || node.is_missing());
    has_problem
}

fn inclusive_range(node: &ParsedNode<'_>) -> (usize, usize, usize, usize) {
    let start = node.start_pos();
    let end = node.end_pos();
    (
        start.line() + 1,
        start.column(node) + 1,
        end.line() + 1,
        end.column(node),
    )
}

fn typescript_parameter_count(function: &ParsedNode<'_>) -> usize {
    if function.kind().as_ref() == "arrow_function" && function.field("parameter").is_some() {
        return 1;
    }
    function
        .field("parameters")
        .expect("function-like node should have parameters")
        .children()
        .filter(Node::is_named)
        .map(|parameter| match parameter.kind().as_ref() {
            "comment" => 0,
            "required_parameter" | "optional_parameter" => usize::from(
                parameter
                    .field("pattern")
                    .is_none_or(|pattern| pattern.kind().as_ref() != "this"),
            ),
            other => panic!("unexpected TypeScript parameter node {other}"),
        })
        .sum()
}

fn go_parameter_count(function: &ParsedNode<'_>) -> usize {
    function
        .field("parameters")
        .expect("Go function should have parameters")
        .children()
        .filter(|parameter| parameter.is_named())
        .map(|parameter| match parameter.kind().as_ref() {
            "parameter_declaration" => {
                let names = parameter.field_children("name").count();
                names.max(1)
            }
            "variadic_parameter_declaration" => 1,
            "comment" => 0,
            other => panic!("unexpected Go parameter node {other}"),
        })
        .sum()
}

fn rust_parameter_count(function: &ParsedNode<'_>) -> usize {
    function
        .field("parameters")
        .expect("Rust function should have parameters")
        .children()
        .filter(|parameter| parameter.is_named())
        .filter(|parameter| match parameter.kind().as_ref() {
            "self_parameter" | "attribute_item" => false,
            "parameter" => parameter
                .field("pattern")
                .is_none_or(|pattern| pattern.kind().as_ref() != "self"),
            "variadic_parameter" => true,
            _ => false,
        })
        .count()
}

fn python_slot_nodes<'tree>(function: &ParsedNode<'tree>) -> Vec<ParsedNode<'tree>> {
    function
        .field("parameters")
        .expect("Python function should have parameters")
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
        .collect()
}

fn is_direct_python_class_method(function: &ParsedNode<'_>) -> bool {
    let Some(mut parent) = function.parent() else {
        return false;
    };
    if parent.kind().as_ref() == "decorated_definition" {
        let Some(grandparent) = parent.parent() else {
            return false;
        };
        parent = grandparent;
    }
    if parent.kind().as_ref() != "block" {
        return false;
    }
    parent
        .parent()
        .is_some_and(|container| container.kind().as_ref() == "class_definition")
}

fn is_staticmethod(function: &ParsedNode<'_>) -> bool {
    function.parent().is_some_and(|parent| {
        parent.kind().as_ref() == "decorated_definition"
            && parent.children().any(|child| {
                child.kind().as_ref() == "decorator"
                    && matches!(
                        child.text().trim(),
                        "@staticmethod" | "@builtins.staticmethod"
                    )
            })
    })
}

fn python_parameter_count(function: &ParsedNode<'_>) -> usize {
    let slots = python_slot_nodes(function).len();
    if is_direct_python_class_method(function) && !is_staticmethod(function) {
        slots - 1
    } else {
        slots
    }
}

fn assert_send_sync<T: Send + Sync>() {}

// @case WB-STRUCTURAL-DEPENDENCY-001
#[test]
fn exact_supported_files_parse_with_the_audited_languages() {
    assert_send_sync::<SupportLang>();
    assert_send_sync::<ParsedSource>();

    let cases = [
        ("functions.ts", SupportLang::TypeScript, "program"),
        ("functions.go", SupportLang::Go, "source_file"),
        ("functions.rs", SupportLang::Rust, "source_file"),
        ("functions.py", SupportLang::Python, "module"),
    ];

    for (relative, expected_language, expected_root_kind) in cases {
        let path = fixture_path(relative);
        assert_eq!(SupportLang::from_path(&path), Some(expected_language));
        let parsed = parse_fixture(relative);
        assert_eq!(parsed.root().kind().as_ref(), expected_root_kind);
        assert!(!has_parse_problem(&parsed), "{relative}");
    }

    assert_eq!(
        SupportLang::from_path(fixture_path("declarations.d.ts")),
        Some(SupportLang::TypeScript)
    );
}

#[test]
fn typescript_nodes_distinguish_executable_stable_forms_and_parameter_slots() {
    let parsed = parse_fixture("functions.ts");

    let named = named_node(&parsed, "function_declaration", "named");
    assert_eq!(inclusive_range(&named), (3, 8, 5, 1));
    assert_eq!(typescript_parameter_count(&named), 4);
    assert!(named.field("body").is_some());

    let nested = named_node(&parsed, "function_declaration", "nested");
    assert_eq!(typescript_parameter_count(&nested), 5);

    let constructor = named_node(&parsed, "method_definition", "constructor");
    assert_eq!(typescript_parameter_count(&constructor), 5);
    let method = named_node(&parsed, "method_definition", "run");
    let method_parameter_kinds = method
        .field("parameters")
        .expect("method parameters")
        .children()
        .filter(Node::is_named)
        .map(|parameter| parameter.kind().into_owned())
        .collect::<Vec<_>>();
    assert!(method_parameter_kinds.iter().any(|kind| kind == "comment"));
    assert_eq!(typescript_parameter_count(&method), 4);

    let bound_arrow = named_node(&parsed, "variable_declarator", "boundArrow");
    let bound_arrow = bound_arrow.field("value").expect("bound arrow value");
    assert_eq!(bound_arrow.kind().as_ref(), "arrow_function");
    assert_eq!(typescript_parameter_count(&bound_arrow), 4);

    let bound_function = named_node(&parsed, "variable_declarator", "boundFunction");
    let bound_function = bound_function.field("value").expect("bound function value");
    assert_eq!(bound_function.kind().as_ref(), "function_expression");
    assert_eq!(typescript_parameter_count(&bound_function), 5);

    let direct_bound_names = nodes_by_kind(&parsed, "variable_declarator")
        .into_iter()
        .filter_map(|declarator| {
            let value = declarator.field("value")?;
            if matches!(
                value.kind().as_ref(),
                "arrow_function" | "function_expression"
            ) {
                declarator
                    .field("name")
                    .map(|name| name.text().into_owned())
            } else {
                None
            }
        })
        .collect::<BTreeSet<_>>();
    assert_eq!(
        direct_bound_names,
        BTreeSet::from([
            "alpha".to_owned(),
            "boundArrow".to_owned(),
            "boundFunction".to_owned(),
            "omega".to_owned(),
        ])
    );
    assert!(nodes_by_kind(&parsed, "arrow_function")
        .into_iter()
        .any(|arrow| arrow
            .parent()
            .is_none_or(|parent| parent.kind().as_ref() != "variable_declarator")));

    let alpha = named_node(&parsed, "variable_declarator", "alpha")
        .field("value")
        .expect("alpha value");
    let omega = named_node(&parsed, "variable_declarator", "omega")
        .field("value")
        .expect("omega value");
    assert_eq!(alpha.start_pos().line(), omega.start_pos().line());
    assert!(alpha.range().end < omega.range().start);

    let declarations = parse_fixture("declarations.d.ts");
    assert!(!nodes_by_kind(&declarations, "function_signature").is_empty());
    assert!(!nodes_by_kind(&declarations, "abstract_method_signature").is_empty());
    assert!(!nodes_by_kind(&declarations, "method_signature").is_empty());
    assert!(nodes_by_kind(&declarations, "function_declaration").is_empty());
    assert!(nodes_by_kind(&declarations, "method_definition").is_empty());
}

#[test]
fn go_and_rust_nodes_expose_receivers_separately_from_call_site_slots() {
    let go = parse_fixture("functions.go");
    let build = named_node(&go, "function_declaration", "Build");
    let threshold = named_node(&go, "function_declaration", "Threshold");
    let run = named_node(&go, "method_declaration", "Run");
    let run_parameter_kinds = run
        .field("parameters")
        .expect("method parameters")
        .children()
        .filter(Node::is_named)
        .map(|parameter| parameter.kind().into_owned())
        .collect::<Vec<_>>();
    assert!(run_parameter_kinds.iter().any(|kind| kind == "comment"));
    assert_eq!(go_parameter_count(&build), 4);
    assert_eq!(go_parameter_count(&threshold), 5);
    assert_eq!(go_parameter_count(&run), 4);
    assert_eq!(
        run.field("receiver").unwrap().kind().as_ref(),
        "parameter_list"
    );
    assert!(run.field("body").is_some());

    let rust = parse_fixture("functions.rs");
    let free = named_node(&rust, "function_item", "free");
    let nested = named_node(&rust, "function_item", "nested");
    let method = named_node(&rust, "function_item", "method");
    let typed_receiver = named_node(&rust, "function_item", "typed_receiver");
    let provided = named_node(&rust, "function_item", "provided");
    assert_eq!(rust_parameter_count(&free), 4);
    assert_eq!(rust_parameter_count(&nested), 5);
    assert_eq!(rust_parameter_count(&method), 4);
    assert_eq!(rust_parameter_count(&typed_receiver), 4);
    assert_eq!(rust_parameter_count(&provided), 5);
    assert!(method
        .ancestors()
        .any(|node| node.kind().as_ref() == "impl_item"));
    assert!(provided
        .ancestors()
        .any(|node| node.kind().as_ref() == "trait_item"));
    assert!(!nodes_by_kind(&rust, "function_signature_item").is_empty());
    assert!(!nodes_by_kind(&rust, "closure_expression").is_empty());
}

#[test]
fn python_nodes_distinguish_direct_class_receivers_staticmethods_and_nested_functions() {
    let parsed = parse_fixture("functions.py");
    let free = named_node(&parsed, "function_definition", "free");
    let async_free = named_node(&parsed, "function_definition", "async_free");
    let nested = named_node(&parsed, "function_definition", "nested");
    let constructor = named_node(&parsed, "function_definition", "__init__");
    let method = named_node(&parsed, "function_definition", "method");
    let classmethod = named_node(&parsed, "function_definition", "make");
    let staticmethod = named_node(&parsed, "function_definition", "static");
    let compound = named_node(&parsed, "function_definition", "compound");

    assert_eq!(python_parameter_count(&free), 4);
    assert_eq!(python_parameter_count(&async_free), 5);
    assert_eq!(python_parameter_count(&nested), 5);
    assert!(!is_direct_python_class_method(&nested));
    assert_eq!(python_parameter_count(&constructor), 5);
    assert_eq!(python_parameter_count(&method), 4);
    assert_eq!(python_parameter_count(&classmethod), 4);
    assert_eq!(python_parameter_count(&staticmethod), 5);
    assert!(is_staticmethod(&staticmethod));
    assert_eq!(python_parameter_count(&compound), 4);
    assert_eq!(
        python_slot_nodes(&compound)
            .into_iter()
            .map(|node| node.kind().into_owned())
            .collect::<Vec<_>>(),
        vec![
            "identifier",
            "default_parameter",
            "typed_default_parameter",
            "list_splat_pattern",
            "dictionary_splat_pattern",
        ]
    );
    assert!(!nodes_by_kind(&parsed, "lambda").is_empty());
}

#[test]
fn parser_problems_utf8_and_inclusive_positions_are_observable() {
    let missing = parse_fixture("syntax-error.ts");
    let root = missing.root();
    assert!(root.dfs().any(|node| node.is_missing()));

    let error = parse_fixture("error-node.ts");
    let root = error.root();
    assert!(root.dfs().any(|node| node.is_error()));

    let utf8_path = fixture_path("utf8-路径/函数.py");
    assert!(utf8_path.is_file());
    let utf8 = parse_fixture("utf8-路径/函数.py");
    assert!(!has_parse_problem(&utf8));
    let function = named_node(&utf8, "function_definition", "café");
    assert_eq!(python_parameter_count(&function), 5);
    assert_eq!(inclusive_range(&function), (1, 1, 2, 28));
}
