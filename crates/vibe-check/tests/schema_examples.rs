use serde_json::Value;

const REPORT_SCHEMA: &str = include_str!("../../../docs/schemas/vibe-check-report.schema.json");

const EXAMPLES: &[(&str, &str)] = &[
    (
        "passing-report",
        include_str!("../../../docs/examples/json/passing-report.json"),
    ),
    (
        "gate-failing-report",
        include_str!("../../../docs/examples/json/gate-failing-report.json"),
    ),
    (
        "empty-scope-report",
        include_str!("../../../docs/examples/json/empty-scope-report.json"),
    ),
    (
        "diagnostic-report",
        include_str!("../../../docs/examples/json/diagnostic-report.json"),
    ),
];

// @case WB-SCHEMA-EXAMPLES-001
#[test]
fn report_examples_validate_against_owner_schema() {
    let schema = serde_json::from_str::<Value>(REPORT_SCHEMA).expect("schema parses");
    let validator = jsonschema::draft202012::options()
        .build(&schema)
        .expect("schema compiles");

    for (name, source) in EXAMPLES {
        let example = serde_json::from_str::<Value>(source).expect("example parses");
        let errors = validator
            .iter_errors(&example)
            .map(|error| error.to_string())
            .collect::<Vec<_>>();
        assert!(
            errors.is_empty(),
            "{name} should validate against owner schema, got {errors:?}"
        );
    }
}
