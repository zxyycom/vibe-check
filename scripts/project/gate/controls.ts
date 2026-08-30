import {
  PROJECT_GATE_PROFILES,
  PROJECT_GATE_OPT_IN_TAGS,
  PROJECT_GATE_TAGS,
  type ProjectGateOptInTag,
  type ProjectGateProfile,
  type ProjectGateTag
} from "./catalog.ts";

const PROFILE_FLAG_PREFIX = "project-gate:profile=";
const DISABLED_TAG_FLAG_PREFIX = "project-gate:disable-tag=";
const ENABLED_TAG_FLAG_PREFIX = "project-gate:enable-tag=";

const PACKAGE_ACCEPTANCE_SELECTION = Object.freeze({
  disabledByTag: "disabled-by-tag-package-tests",
  notSelected: "not-selected (use --enable-tag package-tests or --profile full)",
  selectedByProfile: "selected-by-profile",
  selectedByTag: "selected-by-tag-package-tests"
} as const);

type PackageAcceptanceSelection =
  (typeof PACKAGE_ACCEPTANCE_SELECTION)[keyof typeof PACKAGE_ACCEPTANCE_SELECTION];

export interface ProjectGateSelection {
  readonly disabledTags: readonly ProjectGateTag[];
  readonly enabledTags: readonly ProjectGateOptInTag[];
  readonly profile: ProjectGateProfile;
}

export type ProjectGateArgumentParseResult =
  | Readonly<{ readonly ok: true; readonly action: "help" }>
  | Readonly<{
      readonly ok: true;
      readonly action: "run";
      readonly value: ProjectGateSelection;
    }>
  | Readonly<{ readonly ok: false; readonly error: string }>;

type ProjectGateArgumentFailure = Readonly<{ readonly ok: false; readonly error: string }>;

type ParsedProjectGateArgument =
  | Readonly<{ readonly ok: true; readonly kind: "profile"; readonly value: ProjectGateProfile }>
  | Readonly<{ readonly ok: true; readonly kind: "disable-tag"; readonly value: ProjectGateTag }>
  | Readonly<{
      readonly ok: true;
      readonly kind: "enable-tag";
      readonly value: ProjectGateOptInTag;
    }>
  | ProjectGateArgumentFailure;

type ParsedProjectGateFlag =
  | Readonly<{ readonly ok: true; readonly kind: "profile"; readonly value: ProjectGateProfile }>
  | Readonly<{ readonly ok: true; readonly kind: "disable-tag"; readonly value: ProjectGateTag }>
  | Readonly<{
      readonly ok: true;
      readonly kind: "enable-tag";
      readonly value: ProjectGateOptInTag;
    }>
  | undefined;

/** Parses the adapter's deliberately small public grammar. */
export function parseProjectGateArguments(
  arguments_: readonly string[]
): ProjectGateArgumentParseResult {
  if (arguments_.includes("--help") || arguments_.includes("-h")) {
    return arguments_.length === 1
      ? Object.freeze({ ok: true, action: "help" })
      : parseFailure("--help and -h must be used without other arguments");
  }

  let profile: ProjectGateProfile = "required";
  let profileSpecified = false;
  const disabledTags: ProjectGateTag[] = [];
  const enabledTags: ProjectGateOptInTag[] = [];

  for (let index = 0; index < arguments_.length; index += 1) {
    const parsed = parseProjectGateArgument(arguments_[index], arguments_[index + 1]);
    if (parsed.ok === false) return parsed;
    if (parsed.kind === "profile") {
      if (profileSpecified) return parseFailure("--profile requires one of: required, full");
      profile = parsed.value;
      profileSpecified = true;
    } else if (parsed.kind === "disable-tag") {
      disabledTags.push(parsed.value);
    } else {
      enabledTags.push(parsed.value);
    }
    index += 1;
  }

  const canonicalDisabledTags = canonicalTags(disabledTags);
  const canonicalEnabledTags = canonicalOptInTags(enabledTags);
  if (canonicalEnabledTags.some((tag) => canonicalDisabledTags.includes(tag))) {
    return parseFailure("the same Project Gate tag cannot be both enabled and disabled");
  }

  return Object.freeze({
    ok: true,
    action: "run",
    value: Object.freeze({
      disabledTags: canonicalDisabledTags,
      enabledTags: canonicalEnabledTags,
      profile
    })
  });
}

/** Describes the complete adapter-owned profile and tag grammar. */
export function projectGateHelp(): string {
  return [
    "Usage: bun scripts/project/gate/run.ts [options]",
    "",
    "Options:",
    "  --profile <required|full>  Select the required or full Check profile (default: required).",
    "  --enable-tag <tag>         Include an opt-in tag in the required profile; repeatable.",
    "  --disable-tag <tag>        Exclude Checks carrying a tag; repeatable.",
    "  -h, --help                 Show this help without preparing or running a candidate.",
    "",
    `Opt-in tags: ${PROJECT_GATE_OPT_IN_TAGS.join(", ")}`,
    `Disable filters (all currently used): ${PROJECT_GATE_TAGS.join(", ")}`,
    "",
    "Package acceptance:",
    "  required                  Not run unless --enable-tag package-tests is supplied.",
    "  full                      Runs candidate, artifact, and external-consumer acceptance.",
    "",
    "Examples:",
    "  bun scripts/project/gate/run.ts --profile required --enable-tag package-tests",
    "  bun scripts/project/gate/run.ts --profile full --disable-tag docs"
  ].join("\n");
}

/** Summarizes the effective package-acceptance action before Check output begins. */
export function projectGateSelectionSummary(selection: ProjectGateSelection): string {
  const disabledTags =
    selection.disabledTags.length === 0 ? "none" : selection.disabledTags.join(",");
  return `profile=${selection.profile}; package-acceptance=${packageAcceptanceSelection(selection)}; disabled-tags=${disabledTags}`;
}

export function selectionFlags(selection: ProjectGateSelection): readonly string[] {
  return Object.freeze([
    `${PROFILE_FLAG_PREFIX}${selection.profile}`,
    ...selection.disabledTags.map((tag) => `${DISABLED_TAG_FLAG_PREFIX}${tag}`),
    ...selection.enabledTags.map((tag) => `${ENABLED_TAG_FLAG_PREFIX}${tag}`)
  ]);
}

/** Reconstructs the adapter-owned selection from Product's opaque frozen flags. */
export function selectionFromFlags(flags: readonly string[]): ProjectGateSelection | undefined {
  let profile: ProjectGateProfile | undefined;
  const disabledTags: ProjectGateTag[] = [];
  const enabledTags: ProjectGateOptInTag[] = [];
  for (const flag of flags) {
    const parsed = parseProjectGateFlag(flag);
    if (parsed === undefined) return undefined;
    if (parsed.kind === "profile") {
      if (profile !== undefined) return undefined;
      profile = parsed.value;
    } else if (parsed.kind === "disable-tag") {
      disabledTags.push(parsed.value);
    } else {
      enabledTags.push(parsed.value);
    }
  }
  if (profile === undefined) return undefined;
  const canonicalDisabledTags = canonicalTags(disabledTags);
  const canonicalEnabledTags = canonicalOptInTags(enabledTags);
  if (canonicalEnabledTags.some((tag) => canonicalDisabledTags.includes(tag))) return undefined;
  return Object.freeze({
    disabledTags: canonicalDisabledTags,
    enabledTags: canonicalEnabledTags,
    profile
  });
}

export function isProjectGateProfile(value: unknown): value is ProjectGateProfile {
  return typeof value === "string" && PROJECT_GATE_PROFILES.some((profile) => profile === value);
}

export function isProjectGateTag(value: unknown): value is ProjectGateTag {
  return typeof value === "string" && PROJECT_GATE_TAGS.some((tag) => tag === value);
}

export function isProjectGateOptInTag(value: unknown): value is ProjectGateOptInTag {
  return typeof value === "string" && PROJECT_GATE_OPT_IN_TAGS.some((tag) => tag === value);
}

function parseProjectGateArgument(
  token: string | undefined,
  value: string | undefined
): ParsedProjectGateArgument {
  if (token === "--profile") {
    return isProjectGateProfile(value)
      ? Object.freeze({ ok: true, kind: "profile", value })
      : parseFailure("--profile requires one of: required, full");
  }
  if (token === "--disable-tag") {
    return isProjectGateTag(value)
      ? Object.freeze({ ok: true, kind: "disable-tag", value })
      : parseFailure("--disable-tag requires a known non-empty tag");
  }
  if (token === "--enable-tag") {
    return isProjectGateOptInTag(value)
      ? Object.freeze({ ok: true, kind: "enable-tag", value })
      : parseFailure("--enable-tag requires a known opt-in tag");
  }
  return parseFailure(`unknown Project Gate argument: ${token}`);
}

function parseProjectGateFlag(flag: string): ParsedProjectGateFlag {
  if (flag.startsWith(PROFILE_FLAG_PREFIX)) {
    const value = flag.slice(PROFILE_FLAG_PREFIX.length);
    return isProjectGateProfile(value)
      ? Object.freeze({ ok: true, kind: "profile", value })
      : undefined;
  }
  if (flag.startsWith(DISABLED_TAG_FLAG_PREFIX)) {
    const value = flag.slice(DISABLED_TAG_FLAG_PREFIX.length);
    return isProjectGateTag(value)
      ? Object.freeze({ ok: true, kind: "disable-tag", value })
      : undefined;
  }
  if (flag.startsWith(ENABLED_TAG_FLAG_PREFIX)) {
    const value = flag.slice(ENABLED_TAG_FLAG_PREFIX.length);
    return isProjectGateOptInTag(value)
      ? Object.freeze({ ok: true, kind: "enable-tag", value })
      : undefined;
  }
  return undefined;
}

function canonicalTags(tags: readonly ProjectGateTag[]): readonly ProjectGateTag[] {
  return Object.freeze([...new Set(tags)].sort());
}

function canonicalOptInTags(tags: readonly ProjectGateOptInTag[]): readonly ProjectGateOptInTag[] {
  return Object.freeze([...new Set(tags)].sort());
}

function packageAcceptanceSelection(selection: ProjectGateSelection): PackageAcceptanceSelection {
  if (selection.disabledTags.includes("package-tests")) {
    return PACKAGE_ACCEPTANCE_SELECTION.disabledByTag;
  }
  if (selection.profile === "full") return PACKAGE_ACCEPTANCE_SELECTION.selectedByProfile;
  if (selection.enabledTags.includes("package-tests")) {
    return PACKAGE_ACCEPTANCE_SELECTION.selectedByTag;
  }
  return PACKAGE_ACCEPTANCE_SELECTION.notSelected;
}

function parseFailure(error: string): ProjectGateArgumentFailure {
  return Object.freeze({ ok: false, error });
}
