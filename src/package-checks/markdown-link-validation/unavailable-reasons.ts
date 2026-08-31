import type {
  MarkdownLocalResolutionReason,
  MarkdownSourceReadFailureReason
} from "./local-resolver.ts";

/** `markdown-link-validation` whole-Check unavailable outcome 的稳定 reason code。 */
export type MarkdownLinkValidationUnavailableReason =
  | "invalid-options"
  | "cancelled"
  | "occurrence-limit-exceeded"
  | "project-root-unavailable"
  | MarkdownLocalResolutionReason
  | MarkdownSourceReadFailureReason;

const UNAVAILABLE_MESSAGES: Readonly<Record<MarkdownLinkValidationUnavailableReason, string>> = {
  "invalid-options":
    "markdownLinkValidation options are invalid; recreate the Check with markdownLinkValidation(options) or restore its complete resolved options.",
  "project-root-unavailable":
    "Markdown link validation could not resolve the project root; check that the path exists and is accessible.",
  "source-unavailable":
    "A selected Markdown source could not be collected, read, decoded, or contained safely; check the file source and permissions.",
  "source-too-large":
    "A selected Markdown source exceeds maxMarkdownBytes; narrow the file selection or raise the bounded limit.",
  "markdown-parse-failed":
    "A selected Markdown source could not be parsed completely; inspect that document's Markdown syntax and encoding.",
  "invalid-local-destination":
    "A local Markdown destination could not be parsed safely; inspect the affected link destination syntax.",
  "target-unavailable":
    "A local Markdown target could not be probed or read safely; check the target path, permissions, size, and encoding.",
  "occurrence-limit-exceeded":
    "Markdown link validation exceeded maxOccurrences; narrow the source selection or raise the bounded limit.",
  "target-read-limit-exceeded":
    "Markdown link validation exceeded maxTargetReads; narrow the source selection or raise the bounded limit.",
  cancelled:
    "Markdown link validation was cancelled before it could form a complete result; inspect the caller's cancellation reason and retry if appropriate."
};

export function markdownLinkUnavailableMessage(
  reason: MarkdownLinkValidationUnavailableReason
): string {
  return UNAVAILABLE_MESSAGES[reason];
}
