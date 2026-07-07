use crate::cli::MetaCommand;
use crate::error::AppResult;
use crate::output::CommandOutcome;

pub(super) fn execute(command: MetaCommand) -> AppResult<CommandOutcome> {
    match command {
        MetaCommand::Help(text) | MetaCommand::Version(text) => {
            Ok(CommandOutcome::plain_text(text))
        }
    }
}
