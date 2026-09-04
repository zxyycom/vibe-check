import { PROJECT_GATE_PRESETS, PROJECT_GATE_SELECTION, type ProjectGatePreset } from "./catalog.ts";

export const PROJECT_GATE_ALL_FLAG = "project-gate:all";
export const PROJECT_GATE_REQUIRED_FLAG = "project-gate:required";
const PROJECT_GATE_PRESET_FLAG_PREFIX = "project-gate:preset=";

export type ProjectGateSelection =
  | Readonly<{ readonly kind: "all" }>
  | Readonly<{ readonly kind: "focused"; readonly presets: readonly ProjectGatePreset[] }>
  | Readonly<{ readonly kind: "required" }>;

export type ProjectGateArgumentParseResult =
  | Readonly<{ readonly ok: true; readonly action: "help" }>
  | Readonly<{
      readonly ok: true;
      readonly action: "run";
      readonly value: ProjectGateSelection;
    }>
  | Readonly<{ readonly ok: false; readonly error: string }>;

type ProjectGateArgumentFailure = Readonly<{ readonly ok: false; readonly error: string }>;

/** Parses the adapter's deliberately small public preset grammar. */
export function parseProjectGateArguments(
  arguments_: readonly string[]
): ProjectGateArgumentParseResult {
  if (arguments_.includes("--help") || arguments_.includes("-h")) {
    return arguments_.length === 1
      ? Object.freeze({ ok: true, action: "help" })
      : parseFailure("--help and -h must be used without other arguments");
  }
  if (arguments_.length === 0)
    return runSelection(Object.freeze({ kind: PROJECT_GATE_SELECTION.default }));
  if (arguments_.includes(`--${PROJECT_GATE_SELECTION.complete}`)) {
    return arguments_.length === 1
      ? runSelection(Object.freeze({ kind: PROJECT_GATE_SELECTION.complete }))
      : parseFailure("--all cannot be combined with focused Project Gate presets");
  }

  const presets: ProjectGatePreset[] = [];
  for (const argument of arguments_) {
    const preset = presetForArgument(argument);
    if (preset === undefined) return parseFailure(`unknown Project Gate argument: ${argument}`);
    presets.push(preset);
  }
  return runSelection(Object.freeze({ kind: "focused", presets: canonicalPresets(presets) }));
}

/** Describes the complete adapter-owned preset grammar. */
export function projectGateHelp(): string {
  return [
    "Usage: bun run check -- [options]",
    "",
    "Options:",
    "  --typecheck               Run product and script typechecks.",
    "  --lint                    Run product and script lint.",
    "  --test                    Run routine tests without package acceptance.",
    "  --docs                    Run documentation validation.",
    "  --quality                 Run repository quality Checks.",
    "  --all                     Run the complete Gate; cannot be combined with presets.",
    "  --release-receipt <path>  Consume one closed formal receipt; requires --all.",
    "  -h, --help                Show this help without preparing or running a candidate.",
    "",
    "No selection option runs the required daily Gate. Focused presets can be combined",
    "and replace the default required selection.",
    "",
    "Examples:",
    "  bun run check -- --typecheck --lint",
    "  bun run check -- --test",
    "  bun run check -- --docs --quality",
    "  bun run check -- --all",
    "  bun run check -- --all --release-receipt build/releases/zxyycom-vibe-check-0.0.1.release.json"
  ].join("\n");
}

/** Summarizes the effective selection before Check output begins. */
export function projectGateSelectionSummary(selection: ProjectGateSelection): string {
  switch (selection.kind) {
    case "required":
      return "selection=required; package-acceptance=not-selected";
    case "all":
      return "selection=all; package-acceptance=selected";
    case "focused":
      return `selection=focused; presets=${selection.presets.join(",")}; package-acceptance=not-selected`;
  }
}

/** Encodes one normalized project selection as Product Run flag tokens. */
export function selectionFlags(selection: ProjectGateSelection): readonly string[] {
  switch (selection.kind) {
    case "required":
      return Object.freeze([PROJECT_GATE_REQUIRED_FLAG]);
    case "all":
      return Object.freeze([PROJECT_GATE_ALL_FLAG]);
    case "focused":
      return Object.freeze(selection.presets.map(projectGatePresetFlag));
  }
}

/** Reconstructs the adapter-owned selection from Product's opaque frozen flags. */
export function selectionFromFlags(flags: readonly string[]): ProjectGateSelection | undefined {
  if (flags.length === 1 && flags[0] === PROJECT_GATE_REQUIRED_FLAG)
    return Object.freeze({ kind: "required" });
  if (flags.length === 1 && flags[0] === PROJECT_GATE_ALL_FLAG)
    return Object.freeze({ kind: "all" });
  if (flags.length === 0 || new Set(flags).size !== flags.length) return undefined;

  const presets: ProjectGatePreset[] = [];
  for (const flag of flags) {
    if (!flag.startsWith(PROJECT_GATE_PRESET_FLAG_PREFIX)) return undefined;
    const preset = flag.slice(PROJECT_GATE_PRESET_FLAG_PREFIX.length);
    if (!isProjectGatePreset(preset)) return undefined;
    presets.push(preset);
  }
  const canonical = canonicalPresets(presets);
  if (canonical.some((preset, index) => presets[index] !== preset)) return undefined;
  return Object.freeze({ kind: "focused", presets: canonical });
}

export function projectGatePresetFlag(preset: ProjectGatePreset): string {
  return `${PROJECT_GATE_PRESET_FLAG_PREFIX}${preset}`;
}

export function isProjectGatePreset(value: unknown): value is ProjectGatePreset {
  return typeof value === "string" && PROJECT_GATE_PRESETS.some((preset) => preset === value);
}

export function isCompleteProjectGateSelection(selection: ProjectGateSelection): boolean {
  return selection.kind === "all";
}

export function projectGateStandardProfile(
  selection: ProjectGateSelection
): "full" | "required" | undefined {
  if (selection.kind === "required") return "required";
  if (selection.kind === "all") return "full";
  return undefined;
}

function presetForArgument(argument: string): ProjectGatePreset | undefined {
  const preset = argument.startsWith("--") ? argument.slice(2) : undefined;
  return isProjectGatePreset(preset) ? preset : undefined;
}

function canonicalPresets(presets: readonly ProjectGatePreset[]): readonly ProjectGatePreset[] {
  return Object.freeze([...new Set(presets)].sort());
}

function runSelection(value: ProjectGateSelection): ProjectGateArgumentParseResult {
  return Object.freeze({ ok: true, action: "run", value });
}

function parseFailure(error: string): ProjectGateArgumentFailure {
  return Object.freeze({ ok: false, error });
}
