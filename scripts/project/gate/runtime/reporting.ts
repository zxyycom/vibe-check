import type { ProjectGateCandidateInput } from "./invocation.ts";
import { projectGateSelectionSummary, type ProjectGateSelection } from "./controls.ts";
import type { ProjectGateMessage } from "./result.ts";
import type { ProjectGateTranscript } from "./transcript.ts";

/** Owns the distinct transcript and terminal presentation rules of the Gate adapter. */
export function reportGateInvocationStarted(
  transcript: ProjectGateTranscript,
  input: Readonly<{
    readonly candidateSource: ProjectGateCandidateInput["kind"];
    readonly candidateVersion: string;
    readonly selection: ProjectGateSelection;
  }>
): void {
  const selection = projectGateSelectionSummary(input.selection);
  transcript.writeGateMessage({
    level: "info",
    text: `project gate candidate: ${input.candidateVersion}`
  });
  transcript.writeGateMessage({
    level: "info",
    text: `project gate candidate source: ${input.candidateSource}`
  });
  transcript.writeGateMessage({ level: "info", text: `project gate selection: ${selection}` });
  transcript.writeGateMessage({
    level: "info",
    text: "project gate aggregation: mode=all over effective Check statuses; failed/not-applicable/empty => aggregate failed; unavailable => aggregate unavailable; findings, messages, and Records are reported by their owning Checks but are not aggregation inputs"
  });
  console.log(
    `project gate start: candidate=${input.candidateVersion}; source=${input.candidateSource}; ${selection}`
  );
}

/** Persists all post-processing messages while reserving the terminal for attention states. */
export function reportProjectGateMessages(
  messages: readonly ProjectGateMessage[],
  transcript: ProjectGateTranscript
): void {
  for (const message of messages) {
    const text = `project gate ${message.level} [${message.code}]: ${message.message}`;
    transcript.writeGateMessage({ level: message.level, text });
    if (message.level === "error") console.error(text);
    if (message.level === "warning") console.warn(text);
  }
}

/** Reports a Gate-adapter failure to both Gate-owned evidence and the terminal. */
export function reportGateAdapterMessage(
  transcript: ProjectGateTranscript,
  level: Extract<ProjectGateMessage["level"], "error" | "warning">,
  text: string
): void {
  transcript.writeGateMessage({ level, text });
  if (level === "error") return console.error(text);
  console.warn(text);
}
