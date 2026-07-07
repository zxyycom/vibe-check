use std::path::{Path, PathBuf};

use crate::cli::ScanCommand;
use crate::core::ScanRequest;
use crate::error::{AppError, AppResult};
use crate::output::CommandOutcome;
use crate::runtime::VibeCheckRuntime;

use super::PipelineContext;

pub(super) fn execute<T: VibeCheckRuntime>(
    command: ScanCommand,
    pipeline: &PipelineContext<'_, T>,
) -> AppResult<CommandOutcome> {
    let context = ScanPipelineContext::from_command(command, pipeline.services().runtime())?;
    let report = pipeline
        .services()
        .runtime()
        .execute_scan(context.request)?;
    Ok(CommandOutcome::scan_report(report, context.format))
}

struct ScanPipelineContext {
    request: ScanRequest,
    format: crate::cli::OutputFormat,
}

impl ScanPipelineContext {
    fn from_command<T: VibeCheckRuntime>(command: ScanCommand, runtime: &T) -> AppResult<Self> {
        let cwd = runtime.current_dir()?;
        let project_root = normalize_project_root(command.project_root.as_deref(), &cwd)?;
        let config_path = normalize_config_path(command.config_path.as_deref(), &cwd)?;

        Ok(Self {
            request: ScanRequest {
                project_root,
                config_path,
            },
            format: command.format,
        })
    }
}

fn normalize_project_root(path: Option<&Path>, cwd: &Path) -> AppResult<PathBuf> {
    let path = path.unwrap_or(cwd);
    let candidate = absolutize(path, cwd);
    let normalized = candidate.canonicalize().map_err(|error| {
        AppError::user_or_config(format!(
            "invalid project root {}: {error}",
            candidate.display()
        ))
    })?;
    if !normalized.is_dir() {
        return Err(AppError::user_or_config(format!(
            "invalid project root {}: not a directory",
            normalized.display()
        )));
    }
    Ok(normalized)
}

fn normalize_config_path(path: Option<&Path>, cwd: &Path) -> AppResult<Option<PathBuf>> {
    let Some(path) = path else {
        return Ok(None);
    };
    let candidate = absolutize(path, cwd);
    let normalized = candidate.canonicalize().map_err(|error| {
        AppError::user_or_config(format!(
            "invalid config path {}: {error}",
            candidate.display()
        ))
    })?;
    if !normalized.is_file() {
        return Err(AppError::user_or_config(format!(
            "invalid config path {}: not a file",
            normalized.display()
        )));
    }
    Ok(Some(normalized))
}

fn absolutize(path: &Path, cwd: &Path) -> PathBuf {
    if path.is_absolute() {
        path.to_path_buf()
    } else {
        cwd.join(path)
    }
}
