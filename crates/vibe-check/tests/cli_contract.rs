use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Output};
use std::time::{SystemTime, UNIX_EPOCH};

use serde_json::Value;

const REPORT_SCHEMA: &str = include_str!("../../../docs/schemas/vibe-check-report.schema.json");

fn run(args: &[&str]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_vibe-check"))
        .args(args)
        .output()
        .expect("run vibe-check")
}

fn run_in(args: &[&str], cwd: &Path) -> Output {
    Command::new(env!("CARGO_BIN_EXE_vibe-check"))
        .args(args)
        .current_dir(cwd)
        .output()
        .expect("run vibe-check")
}

fn test_dir(name: &str) -> PathBuf {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("system time")
        .as_nanos();
    let path = std::env::temp_dir().join(format!("vibe-check-{name}-{}-{now}", std::process::id()));
    fs::create_dir_all(&path).expect("create temp dir");
    path
}

fn stdout(output: &Output) -> String {
    String::from_utf8(output.stdout.clone()).expect("stdout utf8")
}

fn stderr(output: &Output) -> String {
    String::from_utf8(output.stderr.clone()).expect("stderr utf8")
}

fn assert_report_schema_valid(value: &Value) {
    let schema = serde_json::from_str::<Value>(REPORT_SCHEMA).expect("schema parses");
    let validator = jsonschema::draft202012::options()
        .build(&schema)
        .expect("schema compiles");
    let errors = validator
        .iter_errors(value)
        .map(|error| error.to_string())
        .collect::<Vec<_>>();
    assert!(
        errors.is_empty(),
        "JSON output should validate against owner schema, got {errors:?}"
    );
}

#[test]
fn scan_omitted_project_root_uses_current_dir_with_human_output() {
    let project = test_dir("cwd-human");

    let output = run_in(&["scan"], &project);

    assert_eq!(output.status.code(), Some(0));
    assert!(stderr(&output).is_empty());
    let stdout = stdout(&output);
    assert!(stdout.contains("Vibe Check report"));
    assert!(stdout.contains("Mode: fixture"));
    assert!(stdout.contains("Files in scope: 0"));
    assert!(stdout.contains("Warnings: none"));
    assert!(stdout.contains(&format!(
        "Project root: {}",
        project.canonicalize().unwrap().display()
    )));
}

#[test]
fn scan_json_uses_explicit_project_root_and_config_path() {
    let project = test_dir("json-config");
    let config = project.join("vibe-check.toml");
    fs::write(&config, "profile = \"test\"\n").expect("write config");

    let output = run(&[
        "scan",
        project.to_str().unwrap(),
        "--format",
        "json",
        "--config",
        config.to_str().unwrap(),
    ]);

    assert_eq!(output.status.code(), Some(0));
    assert!(stderr(&output).is_empty());
    let value: Value = serde_json::from_slice(&output.stdout).expect("json report");
    assert_report_schema_valid(&value);
    assert_eq!(value["schema_version"], "vibe-check.report.v1");
    assert_eq!(value["tool"]["name"], "vibe-check");
    assert_eq!(value["run"]["mode"], "fixture");
    assert_eq!(
        value["run"]["project_root"],
        project.canonicalize().unwrap().display().to_string()
    );
    assert_eq!(
        value["run"]["config_path"],
        config.canonicalize().unwrap().display().to_string()
    );
    assert_eq!(value["scope"]["file_count"], 0);
    assert_eq!(value["metrics"]["supported_scanner_findings"], 0);
    assert_eq!(value["warnings"].as_array().unwrap().len(), 0);
    assert_eq!(value["diagnostics"].as_array().unwrap().len(), 0);
    assert_eq!(value["gate"]["status"], "passed");
}

#[test]
fn terminator_allows_leading_dash_project_root() {
    let parent = test_dir("dash-root-parent");
    let project = parent.join("--format=xml");
    fs::create_dir_all(&project).expect("create leading dash project root");

    let output = run_in(&["scan", "--", "--format=xml"], &parent);

    assert_eq!(output.status.code(), Some(0));
    assert!(stderr(&output).is_empty());
    assert!(stdout(&output).contains(&format!(
        "Project root: {}",
        project.canonicalize().unwrap().display()
    )));
}

#[test]
fn invalid_format_exits_two_without_stdout_report() {
    let project = test_dir("invalid-format");

    let output = run(&["scan", project.to_str().unwrap(), "--format", "xml"]);

    assert_eq!(output.status.code(), Some(2));
    assert!(stdout(&output).is_empty());
    let stderr = stderr(&output);
    assert!(stderr.contains("xml"));
    assert!(stderr.contains("human"));
    assert!(stderr.contains("json"));
}

#[test]
fn invalid_project_root_exits_two_without_stdout_report() {
    let project = test_dir("missing-root").join("missing");

    let output = run(&["scan", project.to_str().unwrap()]);

    assert_eq!(output.status.code(), Some(2));
    assert!(stdout(&output).is_empty());
    assert!(stderr(&output).contains("invalid project root"));
}

#[test]
fn explicit_config_path_must_be_file() {
    let project = test_dir("config-dir");

    let output = run(&[
        "scan",
        project.to_str().unwrap(),
        "--config",
        project.to_str().unwrap(),
    ]);

    assert_eq!(output.status.code(), Some(2));
    assert!(stdout(&output).is_empty());
    assert!(stderr(&output).contains("invalid config path"));
}

#[test]
fn help_and_version_do_not_run_scan() {
    let root_help = run(&["--help"]);
    assert_eq!(root_help.status.code(), Some(0));
    let root_help = stdout(&root_help);
    assert!(root_help.contains("Usage:"));
    assert!(root_help.contains("scan"));
    assert!(!root_help.contains("Vibe Check report"));

    let scan_help = run(&["scan", "--help"]);
    assert_eq!(scan_help.status.code(), Some(0));
    let scan_help = stdout(&scan_help);
    assert!(scan_help.contains("--format"));
    assert!(scan_help.contains("--config"));
    assert!(!scan_help.contains("Vibe Check report"));

    let version = run(&["--version"]);
    assert_eq!(version.status.code(), Some(0));
    assert!(stdout(&version).contains("vibe-check"));
}
