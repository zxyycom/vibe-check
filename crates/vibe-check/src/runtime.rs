use std::path::PathBuf;

use crate::core::{fixture_report, ReportData, ScanRequest};
use crate::error::{AppError, AppResult};

pub(crate) trait VibeCheckRuntime {
    fn current_dir(&self) -> AppResult<PathBuf>;
    fn execute_scan(&self, request: ScanRequest) -> AppResult<ReportData>;
}

#[derive(Clone, Copy, Debug, Default)]
pub(crate) struct FixtureRuntime;

impl VibeCheckRuntime for FixtureRuntime {
    fn current_dir(&self) -> AppResult<PathBuf> {
        std::env::current_dir().map_err(|error| {
            AppError::user_or_config(format!("failed to read current directory: {error}"))
        })
    }

    fn execute_scan(&self, request: ScanRequest) -> AppResult<ReportData> {
        Ok(fixture_report(&request))
    }
}
