mod cpd_finder;

use std::path::Path;

use super::DiagnosticRecord;

pub(crate) use cpd_finder::CpdFinderDuplicateScanner;

pub(crate) trait DuplicateScannerAdapter {
    fn scan(
        &self,
        project_root: &Path,
        supported_files: &[String],
    ) -> Result<DuplicateScanOutcome, DuplicateScanFailure>;
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub(crate) struct DuplicateScanOutcome {
    pub(crate) findings: Vec<DuplicateFinding>,
    pub(crate) diagnostics: Vec<DiagnosticRecord>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct DuplicateFinding {
    pub(crate) identity: String,
    pub(crate) locations: [DuplicateLocation; 2],
    pub(crate) token_count: u32,
}

#[derive(Clone, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub(crate) struct DuplicateLocation {
    pub(crate) file: String,
    pub(crate) start_line: u32,
    pub(crate) start_column: u32,
    pub(crate) end_line: u32,
    pub(crate) end_column: u32,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct DuplicateScanFailure {
    message: String,
}

impl DuplicateScanFailure {
    pub(crate) fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }

    pub(crate) fn message(&self) -> &str {
        &self.message
    }
}

#[cfg(test)]
mod tests;
