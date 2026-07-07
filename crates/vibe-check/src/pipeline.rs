mod meta;
mod scan;

use crate::cli::{CliCommand, MetaCommand, ScanCommand};
use crate::error::AppResult;
use crate::output::CommandOutcome;
use crate::runtime::VibeCheckRuntime;

pub(crate) fn execute<T: VibeCheckRuntime>(
    command: CliCommand,
    runtime: &T,
) -> AppResult<CommandOutcome> {
    PipelineContext::from_runtime(runtime).execute(command)
}

pub(super) struct PipelineContext<'a, T: VibeCheckRuntime> {
    services: PipelineServices<'a, T>,
}

impl<'a, T: VibeCheckRuntime> PipelineContext<'a, T> {
    fn from_runtime(runtime: &'a T) -> Self {
        Self {
            services: PipelineServices { runtime },
        }
    }

    fn execute(&self, command: CliCommand) -> AppResult<CommandOutcome> {
        match CommandFamily::from(command) {
            CommandFamily::Scan(command) => scan::execute(command, self),
            CommandFamily::Meta(command) => meta::execute(command),
        }
    }

    pub(super) fn services(&self) -> &PipelineServices<'a, T> {
        &self.services
    }
}

pub(super) struct PipelineServices<'a, T: VibeCheckRuntime> {
    runtime: &'a T,
}

impl<T: VibeCheckRuntime> PipelineServices<'_, T> {
    pub(super) fn runtime(&self) -> &T {
        self.runtime
    }
}

enum CommandFamily {
    Scan(ScanCommand),
    Meta(MetaCommand),
}

impl From<CliCommand> for CommandFamily {
    fn from(command: CliCommand) -> Self {
        match command {
            CliCommand::Scan(command) => Self::Scan(command),
            CliCommand::Meta(command) => Self::Meta(command),
        }
    }
}
