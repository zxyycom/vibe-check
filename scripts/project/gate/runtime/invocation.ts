import {
  isCompleteProjectGateSelection,
  parseProjectGateArguments,
  type ProjectGateSelection
} from "./controls.ts";

export type ProjectGateCandidateInput =
  | Readonly<{ readonly kind: "local" }>
  | Readonly<{ readonly kind: "release-receipt"; readonly receiptPath: string }>;

export type ProjectGateInvocationParseResult =
  | Readonly<{ readonly ok: true; readonly action: "help" }>
  | Readonly<{
      readonly ok: true;
      readonly action: "run";
      readonly candidateInput: ProjectGateCandidateInput;
      readonly selection: ProjectGateSelection;
    }>
  | Readonly<{ readonly ok: false; readonly error: string }>;

/** Separates Gate selection from the explicit local/formal candidate source. */
export function parseProjectGateInvocationArguments(
  arguments_: readonly string[]
): ProjectGateInvocationParseResult {
  const help = parseInvocationHelp(arguments_);
  if (help !== undefined) return help;
  const extracted = extractCandidateInput(arguments_);
  if (!extracted.ok) return extracted;
  const parsed = parseProjectGateArguments(extracted.selectionArguments);
  if (!parsed.ok) return parsed;
  if (parsed.action === "help") return Object.freeze({ ok: true, action: "help" });
  return invocationForSelection(parsed.value, extracted.releaseReceiptPath);
}

function parseInvocationHelp(
  arguments_: readonly string[]
): ProjectGateInvocationParseResult | undefined {
  if (!arguments_.includes("--help") && !arguments_.includes("-h")) return undefined;
  const parsed = parseProjectGateArguments(arguments_);
  if (!parsed.ok) return invocationFailure(parsed.error);
  if (parsed.action !== "help") return invocationFailure("invalid help invocation");
  return Object.freeze({ ok: true, action: "help" });
}

function extractCandidateInput(arguments_: readonly string[]):
  | Readonly<{
      readonly ok: true;
      readonly releaseReceiptPath: string | undefined;
      readonly selectionArguments: readonly string[];
    }>
  | Readonly<{ readonly ok: false; readonly error: string }> {
  let releaseReceiptPath: string | undefined;
  const selectionArguments: string[] = [];
  for (let index = 0; index < arguments_.length; index += 1) {
    const token = arguments_[index];
    if (token !== "--release-receipt") {
      selectionArguments.push(token);
      continue;
    }
    const value = arguments_[index + 1];
    if (!isValidReceiptArgument(value, releaseReceiptPath)) {
      return invocationFailure("--release-receipt requires one explicit receipt path");
    }
    releaseReceiptPath = value;
    index += 1;
  }
  return Object.freeze({
    ok: true,
    releaseReceiptPath,
    selectionArguments: Object.freeze(selectionArguments)
  });
}

function isValidReceiptArgument(
  value: string | undefined,
  previousValue: string | undefined
): value is string {
  return (
    previousValue === undefined &&
    value !== undefined &&
    value.length > 0 &&
    !value.startsWith("--")
  );
}

function invocationForSelection(
  selection: ProjectGateSelection,
  releaseReceiptPath: string | undefined
): ProjectGateInvocationParseResult {
  if (releaseReceiptPath === undefined) {
    return Object.freeze({
      ok: true,
      action: "run",
      candidateInput: Object.freeze({ kind: "local" }),
      selection
    });
  }
  if (!isCompleteProjectGateSelection(selection)) {
    return invocationFailure("--release-receipt requires the complete --all selection");
  }
  return Object.freeze({
    ok: true,
    action: "run",
    candidateInput: Object.freeze({ kind: "release-receipt", receiptPath: releaseReceiptPath }),
    selection
  });
}

function invocationFailure(
  error: string
): Readonly<{ readonly ok: false; readonly error: string }> {
  return Object.freeze({ ok: false, error });
}
