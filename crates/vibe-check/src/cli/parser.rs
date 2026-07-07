use std::path::PathBuf;

use clap::builder::NonEmptyStringValueParser;
use clap::{Arg, Command};

use crate::error::{AppError, AppResult};

use super::command_model::{CliCommand, MetaCommand, OutputFormat, ParsedCli, ScanCommand};

pub(crate) fn parse<I, S>(args: I) -> AppResult<ParsedCli>
where
    I: IntoIterator<Item = S>,
    S: Into<String>,
{
    let args: Vec<String> = args.into_iter().map(Into::into).collect();

    if let Some(text) = help_text(&args) {
        return Ok(ParsedCli::new(CliCommand::Meta(MetaCommand::Help(text))));
    }

    if is_version_request(&args) {
        return Ok(ParsedCli::new(CliCommand::Meta(MetaCommand::Version(
            version_text(),
        ))));
    }
    validate_explicit_format(&args)?;

    let matches = cli_command()
        .try_get_matches_from(clap_argv(&args))
        .map_err(|error| AppError::user_or_config(error.to_string()))?;

    match matches.subcommand() {
        Some(("scan", matches)) => Ok(ParsedCli::new(CliCommand::Scan(scan_command(matches)?))),
        _ => Err(AppError::user_or_config("missing command")),
    }
}

fn help_text(args: &[String]) -> Option<String> {
    if args.len() == 1 && is_help_flag(&args[0]) {
        return Some(cli_command().render_long_help().to_string());
    }
    if args.first().is_some_and(|arg| arg == "scan")
        && args.iter().skip(1).any(|arg| is_help_flag(arg))
    {
        return Some(scan_clap_command().render_long_help().to_string());
    }
    None
}

fn is_version_request(args: &[String]) -> bool {
    args.len() == 1 && args[0] == "--version"
}

fn version_text() -> String {
    format!("vibe-check {}", env!("CARGO_PKG_VERSION"))
}

fn clap_argv(args: &[String]) -> Vec<String> {
    std::iter::once("vibe-check".to_owned())
        .chain(args.iter().cloned())
        .collect()
}

fn cli_command() -> Command {
    Command::new("vibe-check")
        .about("Code quality scanning CLI")
        .disable_help_subcommand(true)
        .subcommand_required(true)
        .subcommand(scan_clap_command())
}

fn scan_clap_command() -> Command {
    Command::new("scan")
        .about("Run a quality scan")
        .arg(project_root_arg())
        .arg(format_arg())
        .arg(config_arg())
}

fn project_root_arg() -> Arg {
    Arg::new("project-root")
        .value_name("project-root")
        .required(false)
        .value_parser(NonEmptyStringValueParser::new())
}

fn format_arg() -> Arg {
    Arg::new("format")
        .long("format")
        .value_name("format")
        .default_value("human")
        .value_parser(["human", "json"])
}

fn config_arg() -> Arg {
    Arg::new("config")
        .long("config")
        .value_name("path")
        .num_args(1)
        .value_parser(NonEmptyStringValueParser::new())
}

fn scan_command(matches: &clap::ArgMatches) -> AppResult<ScanCommand> {
    let format = match matches
        .get_one::<String>("format")
        .map(String::as_str)
        .unwrap_or("human")
    {
        "human" => OutputFormat::Human,
        "json" => OutputFormat::Json,
        value => {
            return Err(AppError::user_or_config(format!(
                "invalid --format value {value:?}"
            )))
        }
    };

    Ok(ScanCommand {
        project_root: matches.get_one::<String>("project-root").map(PathBuf::from),
        format,
        config_path: matches.get_one::<String>("config").map(PathBuf::from),
    })
}

fn validate_explicit_format(args: &[String]) -> AppResult<()> {
    if args.first().is_none_or(|arg| arg != "scan") {
        return Ok(());
    }

    let mut index = 1;
    while index < args.len() {
        let token = &args[index];
        if token == "--" {
            break;
        }
        if token == "--format" {
            let Some(value) = args.get(index + 1) else {
                return Err(AppError::user_or_config("missing value for --format"));
            };
            validate_format_value(value)?;
            index += 2;
            continue;
        }
        if let Some(value) = token.strip_prefix("--format=") {
            validate_format_value(value)?;
        }
        index += 1;
    }
    Ok(())
}

fn validate_format_value(value: &str) -> AppResult<()> {
    if OutputFormat::ACCEPTED_VALUES.contains(&value) {
        return Ok(());
    }
    Err(AppError::user_or_config(format!(
        "invalid --format value {value:?}; accepted values: {}",
        OutputFormat::ACCEPTED_VALUES.join(", ")
    )))
}

fn is_help_flag(arg: &str) -> bool {
    arg == "--help" || arg == "-h"
}
