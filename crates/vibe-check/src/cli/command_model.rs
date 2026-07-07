use std::path::PathBuf;

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct ParsedCli {
    pub(crate) command: CliCommand,
}

impl ParsedCli {
    pub(crate) const fn new(command: CliCommand) -> Self {
        Self { command }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) enum CliCommand {
    Scan(ScanCommand),
    Meta(MetaCommand),
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) enum MetaCommand {
    Help(String),
    Version(String),
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct ScanCommand {
    pub(crate) project_root: Option<PathBuf>,
    pub(crate) format: OutputFormat,
    pub(crate) config_path: Option<PathBuf>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum OutputFormat {
    Human,
    Json,
}

impl OutputFormat {
    pub(crate) const ACCEPTED_VALUES: &'static [&'static str] = &["human", "json"];
}
