#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum VibeCheckExitCode {
    Success = 0,
    GateFailure = 1,
    UserOrConfigError = 2,
    ScannerFatal = 3,
    OutputFailure = 4,
}

impl VibeCheckExitCode {
    pub(crate) const fn code(self) -> i32 {
        self as i32
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum AppErrorKind {
    UserOrConfig,
    ScannerFatal,
    OutputFailure,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct AppError {
    kind: AppErrorKind,
    message: String,
}

pub(crate) type AppResult<T> = Result<T, AppError>;

impl AppError {
    pub(crate) fn user_or_config(message: impl Into<String>) -> Self {
        Self {
            kind: AppErrorKind::UserOrConfig,
            message: message.into(),
        }
    }

    pub(crate) fn scanner_fatal(message: impl Into<String>) -> Self {
        Self {
            kind: AppErrorKind::ScannerFatal,
            message: message.into(),
        }
    }

    pub(crate) fn output_failure(message: impl Into<String>) -> Self {
        Self {
            kind: AppErrorKind::OutputFailure,
            message: message.into(),
        }
    }

    pub(crate) fn message(&self) -> &str {
        &self.message
    }

    pub(crate) fn exit_code(&self) -> VibeCheckExitCode {
        match self.kind {
            AppErrorKind::UserOrConfig => VibeCheckExitCode::UserOrConfigError,
            AppErrorKind::ScannerFatal => VibeCheckExitCode::ScannerFatal,
            AppErrorKind::OutputFailure => VibeCheckExitCode::OutputFailure,
        }
    }
}
