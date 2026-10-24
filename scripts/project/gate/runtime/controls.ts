import { PROJECT_GATE_PRESETS, PROJECT_GATE_SELECTION, type ProjectGatePreset } from "./catalog.ts";

export const PROJECT_GATE_ALL_FLAG = "project-gate:all";
export const PROJECT_GATE_FAST_FLAG = "project-gate:fast";
export const PROJECT_GATE_CHANGED_FLAG = "project-gate:changed";
export const PROJECT_GATE_RELEASE_FLAG = "project-gate:release";
const PROJECT_GATE_PRESET_FLAG_PREFIX = "project-gate:preset=";

export type ProjectGateSelection =
  | Readonly<{ readonly kind: "all"; readonly release?: true }>
  | Readonly<{ readonly kind: "focused"; readonly presets: readonly ProjectGatePreset[] }>
  | Readonly<{ readonly kind: "fast" | "changed" }>;

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
  for (const exclusive of [PROJECT_GATE_SELECTION.complete, PROJECT_GATE_SELECTION.changed]) {
    if (!arguments_.includes(`--${exclusive}`)) continue;
    return arguments_.length === 1
      ? runSelection(Object.freeze({ kind: exclusive }))
      : parseFailure(`--${exclusive} must be used without other selection arguments`);
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
    "  --test                    Run routine tests without package acceptance or workbench.",
    "  --consumer-types          Diagnose installed package consumer types.",
    "  --admission-workbench     Run admission workbench tests explicitly.",
    "  --materials               Run repository material validation.",
    "  --quality                 Run repository quality Checks.",
    "  --changed                 Run all affected Checks, including package acceptance.",
    "  --all                     Run complete routine acceptance, excluding explicit-only work.",
    "  --release-receipt <path>  Consume one closed formal receipt; requires --all.",
    "  -h, --help                Show this help without preparing or running a candidate.",
    "",
    "No selection option runs fast affected engineering checks and qualified quick tests.",
    "Focused presets can be combined and replace the default fast selection; only --all",
    "is complete routine acceptance independent of changed-path evidence.",
    "Consumer types run only explicitly or with --all --release-receipt; workbench is explicit-only.",
    "",
    "Examples:",
    "  bun run check -- --typecheck --lint",
    "  bun run check -- --consumer-types",
    "  bun run check -- --admission-workbench",
    "  bun run check -- --materials --quality",
    "  bun run check -- --changed",
    "  bun run check -- --all",
    "  bun run check -- --all --release-receipt build/releases/zxyycom-vibe-check-0.0.1.release.json"
  ].join("\n");
}

/** Summarizes the effective selection before Check output begins. */
export function projectGateSelectionSummary(selection: ProjectGateSelection): string {
  switch (selection.kind) {
    case "fast":
      return "selection=fast; acceptance=partial; package-acceptance=not-selected";
    case "changed":
      return "selection=changed; acceptance=affected; package-acceptance=affected";
    case "all":
      return `selection=all; acceptance=${selection.release === true ? "release" : "routine-complete"}; package-acceptance=selected; consumer-types=${selection.release === true ? "selected" : "not-selected"}`;
    case "focused":
      return `selection=focused; presets=${selection.presets.join(",")}; acceptance=partial; package-acceptance=${selection.presets.includes("consumer-types") ? "consumer-types-only" : "not-selected"}`;
  }
}

/** Encodes one normalized project selection as Product Run flag tokens. */
export function selectionFlags(selection: ProjectGateSelection): readonly string[] {
  switch (selection.kind) {
    case "fast":
      return Object.freeze([PROJECT_GATE_FAST_FLAG]);
    case "changed":
      return Object.freeze([PROJECT_GATE_CHANGED_FLAG]);
    case "all":
      return Object.freeze([
        PROJECT_GATE_ALL_FLAG,
        ...(selection.release === true ? [PROJECT_GATE_RELEASE_FLAG] : [])
      ]);
    case "focused":
      return Object.freeze(selection.presets.map(projectGatePresetFlag));
  }
}

/** Reconstructs the adapter-owned selection from Product's opaque frozen flags. */
export function selectionFromFlags(flags: readonly string[]): ProjectGateSelection | undefined {
  const exclusiveSelection = selectionForExclusiveFlag(flags);
  if (exclusiveSelection !== undefined) return exclusiveSelection;
  if (!hasDistinctFocusedFlags(flags)) return undefined;

  return focusedSelectionFromFlags(flags);
}

function selectionForExclusiveFlag(flags: readonly string[]): ProjectGateSelection | undefined {
  if (
    flags.length === 2 &&
    flags[0] === PROJECT_GATE_ALL_FLAG &&
    flags[1] === PROJECT_GATE_RELEASE_FLAG
  )
    return Object.freeze({ kind: "all", release: true });
  if (flags.length !== 1) return undefined;
  if (flags[0] === PROJECT_GATE_FAST_FLAG) return Object.freeze({ kind: "fast" });
  if (flags[0] === PROJECT_GATE_CHANGED_FLAG) return Object.freeze({ kind: "changed" });
  if (flags[0] === PROJECT_GATE_ALL_FLAG) return Object.freeze({ kind: "all" });
  return undefined;
}

function hasDistinctFocusedFlags(flags: readonly string[]): boolean {
  return flags.length > 0 && new Set(flags).size === flags.length;
}

function focusedSelectionFromFlags(flags: readonly string[]): ProjectGateSelection | undefined {
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
): "all" | "fast" | "changed" | undefined {
  return selection.kind === "focused" ? undefined : selection.kind;
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
