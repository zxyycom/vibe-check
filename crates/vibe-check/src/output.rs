use std::io::{self, Write};

use crate::cli::OutputFormat;
use crate::core::{
    DiagnosticRecord, GateResult, GateStatus, MetricsSummary, ReportData, WarningFinding,
};
use crate::error::{AppError, VibeCheckExitCode};

pub(crate) struct CommandOutcome {
    output: CommandOutput,
    exit_code: VibeCheckExitCode,
}

enum CommandOutput {
    PlainText(String),
    ScanReport {
        report: Box<ReportData>,
        format: OutputFormat,
    },
}

impl CommandOutcome {
    pub(crate) fn plain_text(text: impl Into<String>) -> Self {
        Self {
            output: CommandOutput::PlainText(text.into()),
            exit_code: VibeCheckExitCode::Success,
        }
    }

    pub(crate) fn scan_report(report: ReportData, format: OutputFormat) -> Self {
        let exit_code = match report.gate.status {
            GateStatus::Passed => VibeCheckExitCode::Success,
            GateStatus::Failed => VibeCheckExitCode::GateFailure,
        };
        Self {
            output: CommandOutput::ScanReport {
                report: Box::new(report),
                format,
            },
            exit_code,
        }
    }
}

pub(crate) fn write_outcome<W: Write, E: Write>(
    outcome: CommandOutcome,
    stdout: &mut W,
    stderr: &mut E,
) -> i32 {
    let result = match outcome.output {
        CommandOutput::PlainText(text) => write_plain_text(&text, stdout).map_err(AppError::from),
        CommandOutput::ScanReport { report, format } => match format {
            OutputFormat::Human => write_human_report(&report, stdout).map_err(AppError::from),
            OutputFormat::Json => write_json_report(&report, stdout),
        },
    };

    match result {
        Ok(()) => outcome.exit_code.code(),
        Err(error) => write_error(&error, stderr),
    }
}

pub(crate) fn write_error<E: Write>(error: &AppError, stderr: &mut E) -> i32 {
    let _ = writeln!(stderr, "vibe-check: {}", error.message());
    error.exit_code().code()
}

fn write_plain_text<W: Write>(text: &str, stdout: &mut W) -> io::Result<()> {
    writeln!(stdout, "{text}")
}

fn write_json_report<W: Write>(report: &ReportData, stdout: &mut W) -> Result<(), AppError> {
    serde_json::to_writer_pretty(&mut *stdout, report).map_err(|error| {
        AppError::output_failure(format!("failed to write JSON report: {error}"))
    })?;
    writeln!(stdout).map_err(AppError::from)
}

fn write_human_report<W: Write>(report: &ReportData, writer: &mut W) -> io::Result<()> {
    write_report_header(report, writer)?;
    write_metrics(&report.metrics, writer)?;
    write_gate(&report.gate, writer)?;
    write_warnings(&report.warnings, writer)?;
    writeln!(writer)?;
    write_diagnostics(&report.diagnostics, writer)
}

fn write_report_header<W: Write>(report: &ReportData, writer: &mut W) -> io::Result<()> {
    writeln!(writer, "Vibe Check report")?;
    writeln!(writer, "Summary: {}", report.summary.status.as_str())?;
    writeln!(writer, "Project root: {}", report.run.project_root)?;
    if let Some(config_path) = &report.run.config_path {
        writeln!(writer, "Config: {config_path}")?;
    } else {
        writeln!(writer, "Config: default discovery")?;
    }
    writeln!(writer, "Mode: {}", report.run.mode.as_str())?;
    writeln!(writer, "Files in scope: {}", report.scope.file_count)?;
    writeln!(
        writer,
        "Supported files in scope: {}",
        report.scope.supported_file_count
    )?;
    Ok(())
}

fn write_gate<W: Write>(gate: &GateResult, writer: &mut W) -> io::Result<()> {
    writeln!(writer)?;
    writeln!(writer, "Gate: {}", gate.status.as_str())?;
    writeln!(writer, "Blocking warnings: {}", gate.blocking_warnings)?;
    writeln!(writer)
}

fn write_metrics<W: Write>(metrics: &MetricsSummary, writer: &mut W) -> io::Result<()> {
    if metrics.files_measured == 0 {
        return write_empty_metrics(metrics, writer);
    }

    write_metric_totals(metrics, writer)?;
    write_language_metrics(metrics, writer)
}

fn write_empty_metrics<W: Write>(metrics: &MetricsSummary, writer: &mut W) -> io::Result<()> {
    writeln!(writer, "Metrics: no supported files measured")?;
    writeln!(
        writer,
        "Supported scanner findings: {}",
        metrics.supported_scanner_findings
    )
}

fn write_metric_totals<W: Write>(metrics: &MetricsSummary, writer: &mut W) -> io::Result<()> {
    writeln!(writer, "Metrics:")?;
    writeln!(
        writer,
        "Measured supported files: {}",
        metrics.files_measured
    )?;
    writeln!(
        writer,
        "Lines: total={} code={} comments={} blanks={}",
        metrics.total_lines, metrics.code_lines, metrics.comment_lines, metrics.blank_lines
    )?;
    writeln!(
        writer,
        "Supported scanner findings: {}",
        metrics.supported_scanner_findings
    )?;
    writeln!(writer, "Languages:")
}

fn write_language_metrics<W: Write>(metrics: &MetricsSummary, writer: &mut W) -> io::Result<()> {
    for language in &metrics.languages {
        writeln!(
            writer,
            "- {} files={} total={} code={} comments={} blanks={}",
            language.language.as_str(),
            language.file_count,
            language.total_lines,
            language.code_lines,
            language.comment_lines,
            language.blank_lines
        )?;
    }
    Ok(())
}

fn write_warnings<W: Write>(warnings: &[WarningFinding], writer: &mut W) -> io::Result<()> {
    if warnings.is_empty() {
        writeln!(writer, "Warnings: none")?;
        return Ok(());
    }

    writeln!(writer, "Warnings:")?;
    write_warning_entries(warnings, writer)?;
    write_warning_totals(warnings, writer)
}

fn write_warning_entries<W: Write>(warnings: &[WarningFinding], writer: &mut W) -> io::Result<()> {
    for warning in warnings {
        writeln!(
            writer,
            "- {}{} {} {} {}: {}",
            warning.severity.as_str(),
            blocking_label(warning),
            warning.file,
            warning.location,
            warning.rule,
            warning.message
        )?;
    }
    Ok(())
}

fn blocking_label(warning: &WarningFinding) -> &'static str {
    if warning.blocking {
        " [blocking]"
    } else {
        ""
    }
}

fn write_warning_totals<W: Write>(warnings: &[WarningFinding], writer: &mut W) -> io::Result<()> {
    let accepted = warnings.iter().filter(|warning| warning.accepted).count();
    let suppressed = warnings.iter().filter(|warning| warning.suppressed).count();

    write_positive_count("Accepted warnings", accepted, writer)?;
    write_positive_count("Suppressed warnings", suppressed, writer)
}

fn write_positive_count<W: Write>(label: &str, count: usize, writer: &mut W) -> io::Result<()> {
    if count > 0 {
        writeln!(writer, "{label}: {count}")?;
    }
    Ok(())
}

fn write_diagnostics<W: Write>(diagnostics: &[DiagnosticRecord], writer: &mut W) -> io::Result<()> {
    if diagnostics.is_empty() {
        writeln!(writer, "Scanner diagnostics: none")?;
        return Ok(());
    }

    writeln!(writer, "Scanner diagnostics:")?;
    for diagnostic in diagnostics {
        writeln!(
            writer,
            "- {} {}: {}",
            diagnostic.severity.as_str(),
            diagnostic.code,
            diagnostic.message
        )?;
    }
    Ok(())
}

impl From<io::Error> for AppError {
    fn from(error: io::Error) -> Self {
        AppError::output_failure(format!("failed to write output: {error}"))
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use crate::cli::OutputFormat;
    use crate::core::{fixture_report, GateStatus, ScanRequest, WarningFinding, WarningSeverity};

    use super::{write_outcome, CommandOutcome};

    #[test]
    fn failed_gate_report_exits_one_after_successful_output() {
        let request = ScanRequest {
            project_root: PathBuf::from("."),
            config_path: None,
        };
        let mut report = fixture_report(&request);
        report.gate.status = GateStatus::Failed;
        report.gate.blocking_warnings = 1;
        report.summary.blocking_warning_count = 1;
        report.summary.warning_count = 1;
        report.warnings.push(WarningFinding {
            file: "src/main.rs".to_owned(),
            location: "file".to_owned(),
            severity: WarningSeverity::High,
            rule: "file.too_many_lines".to_owned(),
            message: "File has 800 total lines, meeting the 800-line threshold.".to_owned(),
            accepted: false,
            suppressed: false,
            blocking: true,
        });

        let mut stdout = Vec::new();
        let mut stderr = Vec::new();
        let exit = write_outcome(
            CommandOutcome::scan_report(report, OutputFormat::Human),
            &mut stdout,
            &mut stderr,
        );

        assert_eq!(exit, 1);
        assert!(stderr.is_empty());
        let stdout = String::from_utf8(stdout).expect("stdout utf8");
        assert!(stdout.contains("Gate: failed"));
        assert!(stdout.contains("Blocking warnings: 1"));
        assert!(stdout.contains("Metrics: no supported files measured"));
        assert!(stdout.contains("- high [blocking] src/main.rs file file.too_many_lines"));
    }
}
