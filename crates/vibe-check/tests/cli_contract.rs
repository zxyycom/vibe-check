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

fn write_file(path: &Path, contents: &str) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).expect("create parent dir");
    }
    fs::write(path, contents).expect("write file");
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

// @case BB-CLI-SCAN-001
#[test]
fn scan_omitted_project_root_uses_current_dir_with_human_output() {
    let project = test_dir("cwd-human");

    let output = run_in(&["scan"], &project);

    assert_eq!(output.status.code(), Some(0));
    assert!(stderr(&output).is_empty());
    let stdout = stdout(&output);
    assert!(stdout.contains("Vibe Check report"));
    assert!(stdout.contains("Mode: scanner"));
    assert!(stdout.contains("Files in scope: 0"));
    assert!(stdout.contains("Supported files in scope: 0"));
    assert!(stdout.contains("Metrics: no supported files measured"));
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
    write_file(&config, "profile = \"test\"\n");

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
    assert_eq!(value["run"]["mode"], "scanner");
    assert_eq!(
        value["run"]["project_root"],
        project.canonicalize().unwrap().display().to_string()
    );
    assert_eq!(
        value["run"]["config_path"],
        config.canonicalize().unwrap().display().to_string()
    );
    assert_eq!(value["scope"]["file_count"], 1);
    assert_eq!(value["scope"]["supported_file_count"], 0);
    assert_eq!(value["metrics"]["supported_scanner_findings"], 0);
    assert_eq!(value["metrics"]["files_measured"], 0);
    assert_eq!(value["metrics"]["total_lines"], 0);
    assert_eq!(value["metrics"]["code_lines"], 0);
    assert_eq!(value["metrics"]["comment_lines"], 0);
    assert_eq!(value["metrics"]["blank_lines"], 0);
    assert_eq!(value["metrics"]["languages"].as_array().unwrap().len(), 0);
    assert_eq!(value["warnings"].as_array().unwrap().len(), 0);
    assert_eq!(value["diagnostics"].as_array().unwrap().len(), 0);
    assert_eq!(value["gate"]["status"], "passed");
}

// @case BB-SCOPE-SCAN-001
#[test]
fn scan_scope_counts_supported_files_and_respects_exclusions() {
    let project = test_dir("scan-scope");
    write_file(&project.join("src/lib.rs"), "fn main() {}\n");
    write_file(&project.join("src/app.ts"), "export const value = 1;\n");
    write_file(
        &project.join("src/view.tsx"),
        "export const View = () => null;\n",
    );
    write_file(&project.join("src/main.js"), "console.log('hello');\n");
    write_file(
        &project.join("src/component.jsx"),
        "export const C = () => null;\n",
    );
    write_file(&project.join("tools/script.py"), "print('hello')\n");
    write_file(&project.join("main.go"), "package main\n");
    write_file(&project.join("README.md"), "# Project\n");
    write_file(&project.join(".gitignore"), "ignored-by-gitignore.js\n");
    write_file(
        &project.join("ignored-by-gitignore.js"),
        "console.log('ignored');\n",
    );

    for component in [
        ".git",
        "target",
        "node_modules",
        ".venv",
        "dist",
        "build",
        "vendor",
        "generated",
        ".cache",
        "cache",
    ] {
        write_file(
            &project.join(component).join("ignored.rs"),
            "fn ignored() {}\n",
        );
    }

    let json = run(&["scan", project.to_str().unwrap(), "--format", "json"]);
    assert_eq!(json.status.code(), Some(0));
    assert!(stderr(&json).is_empty());
    let value: Value = serde_json::from_slice(&json.stdout).expect("json report");
    assert_report_schema_valid(&value);
    assert_eq!(value["run"]["mode"], "scanner");
    assert_eq!(value["scope"]["file_count"], 8);
    assert_eq!(value["scope"]["supported_file_count"], 7);
    assert_eq!(value["metrics"]["supported_scanner_findings"], 7);
    assert_eq!(value["metrics"]["files_measured"], 7);
    assert_eq!(
        value["metrics"]["languages"]
            .as_array()
            .unwrap()
            .iter()
            .map(|language| language["language"].as_str().unwrap())
            .collect::<Vec<_>>(),
        vec!["go", "javascript", "python", "rust", "typescript"]
    );
    assert_eq!(value["summary"]["status"], "completed");
    assert_eq!(value["summary"]["diagnostic_count"], 0);
    assert_eq!(value["diagnostics"].as_array().unwrap().len(), 0);

    let human = run(&["scan", project.to_str().unwrap(), "--format", "human"]);
    assert_eq!(human.status.code(), Some(0));
    assert!(stderr(&human).is_empty());
    let human = stdout(&human);
    assert!(human.contains("Mode: scanner"));
    assert!(human.contains("Files in scope: 8"));
    assert!(human.contains("Supported files in scope: 7"));
    assert!(human.contains("Measured supported files: 7"));
    assert!(human.contains("Languages:"));
}

// @case BB-METRICS-GATE-001
#[test]
fn blocking_file_size_warning_fails_gate_but_writes_json_report() {
    let project = test_dir("gate-failure");
    let mut contents = String::new();
    for index in 0..800 {
        contents.push_str(&format!("fn generated_{index}() {{}}\n"));
    }
    write_file(&project.join("src/main.rs"), &contents);

    let output = run(&["scan", project.to_str().unwrap(), "--format", "json"]);

    assert_eq!(output.status.code(), Some(1));
    assert!(stderr(&output).is_empty());
    let value: Value = serde_json::from_slice(&output.stdout).expect("json report");
    assert_report_schema_valid(&value);
    assert_eq!(value["summary"]["warning_count"], 1);
    assert_eq!(value["summary"]["blocking_warning_count"], 1);
    assert_eq!(value["gate"]["status"], "failed");
    assert_eq!(value["gate"]["blocking_warnings"], 1);
    assert_eq!(value["metrics"]["files_measured"], 1);
    assert_eq!(value["warnings"][0]["file"], "src/main.rs");
    assert_eq!(value["warnings"][0]["location"], "file");
    assert_eq!(value["warnings"][0]["severity"], "high");
    assert_eq!(value["warnings"][0]["rule"], "file.too_many_lines");
    assert_eq!(value["warnings"][0]["blocking"], true);
}

// @case BB-CLI-INPUT-001
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
