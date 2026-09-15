/** Markdown lint complete Check 的稳定 unavailable 原因。 */
export type MarkdownLintUnavailableReason =
  | "backend-failed"
  | "backend-protocol-invalid"
  | "cancelled"
  | "finding-limit-exceeded"
  | "invalid-options"
  | "project-root-unavailable"
  | "source-too-large"
  | "source-unavailable";

const MESSAGES: Readonly<Record<MarkdownLintUnavailableReason, string>> = {
  "backend-failed":
    "Markdown lint could not complete its private backend operation; retry after checking the installed package.",
  "backend-protocol-invalid":
    "Markdown lint received an invalid private backend response and did not publish partial findings.",
  cancelled:
    "Markdown lint was cancelled before it could form a complete result; retry after cancellation is resolved.",
  "finding-limit-exceeded":
    "Markdown lint exceeded maxFindings; narrow the file selection or raise the bounded limit.",
  "invalid-options":
    "markdownLint options are invalid; recreate the Check with markdownLint(options) or restore its complete resolved options.",
  "project-root-unavailable":
    "Markdown lint could not resolve the project root; check that the path exists and is accessible.",
  "source-too-large":
    "A selected Markdown source exceeds maxMarkdownBytes; narrow the file selection or raise the bounded limit.",
  "source-unavailable":
    "A selected Markdown source could not be read, decoded, or contained safely; check the file source and permissions."
};

export function markdownLintUnavailableMessage(reason: MarkdownLintUnavailableReason): string {
  return MESSAGES[reason];
}
