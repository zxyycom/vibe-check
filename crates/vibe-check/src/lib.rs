mod cli;
mod core;
mod error;
mod output;
mod pipeline;
mod runtime;

use std::io::Write;

use runtime::{FixtureRuntime, VibeCheckRuntime};

pub fn run<I, S, W, E>(args: I, stdout: W, stderr: E) -> i32
where
    I: IntoIterator<Item = S>,
    S: Into<String>,
    W: Write,
    E: Write,
{
    run_with_runtime(args, stdout, stderr, &FixtureRuntime)
}

fn run_with_runtime<I, S, W, E, T>(args: I, mut stdout: W, mut stderr: E, runtime: &T) -> i32
where
    I: IntoIterator<Item = S>,
    S: Into<String>,
    W: Write,
    E: Write,
    T: VibeCheckRuntime,
{
    let parsed = match cli::parse(args) {
        Ok(parsed) => parsed,
        Err(error) => return output::write_error(&error, &mut stderr),
    };

    let outcome = match pipeline::execute(parsed.command, runtime) {
        Ok(outcome) => outcome,
        Err(error) => return output::write_error(&error, &mut stderr),
    };

    output::write_outcome(outcome, &mut stdout, &mut stderr)
}

#[cfg(test)]
mod tests {
    use std::io::{self, Write};
    use std::path::PathBuf;

    use crate::core::{ReportData, ScanRequest};
    use crate::error::{AppError, AppResult};
    use crate::runtime::VibeCheckRuntime;

    use super::{run, run_with_runtime};

    struct FatalRuntime;

    impl VibeCheckRuntime for FatalRuntime {
        fn current_dir(&self) -> AppResult<PathBuf> {
            Ok(std::env::temp_dir())
        }

        fn execute_scan(&self, _request: ScanRequest) -> AppResult<ReportData> {
            Err(AppError::scanner_fatal("scanner failed before report"))
        }
    }

    struct FailingWriter;

    impl Write for FailingWriter {
        fn write(&mut self, _buf: &[u8]) -> io::Result<usize> {
            Err(io::Error::new(io::ErrorKind::BrokenPipe, "writer failed"))
        }

        fn flush(&mut self) -> io::Result<()> {
            Ok(())
        }
    }

    #[test]
    fn scanner_fatal_before_report_exits_three() {
        let mut stdout = Vec::new();
        let mut stderr = Vec::new();

        let exit = run_with_runtime(["scan"], &mut stdout, &mut stderr, &FatalRuntime);

        assert_eq!(exit, 3);
        assert!(stdout.is_empty());
        let stderr = String::from_utf8(stderr).expect("stderr utf8");
        assert!(stderr.contains("scanner failed before report"));
    }

    #[test]
    fn output_write_failure_after_report_exits_four() {
        let mut stderr = Vec::new();

        let exit = run(["scan"], FailingWriter, &mut stderr);

        assert_eq!(exit, 4);
        let stderr = String::from_utf8(stderr).expect("stderr utf8");
        assert!(stderr.contains("failed to write output"));
        assert!(stderr.contains("writer failed"));
    }
}
