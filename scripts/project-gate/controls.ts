import {
  PROJECT_GATE_PROFILES,
  PROJECT_GATE_TAGS,
  type ProjectGateProfile,
  type ProjectGateTag
} from "./catalog.ts";

const PROFILE_FLAG_PREFIX = "project-gate:profile=";
const DISABLED_TAG_FLAG_PREFIX = "project-gate:disable-tag=";

export interface ProjectGateSelection {
  readonly disabledTags: readonly ProjectGateTag[];
  readonly profile: ProjectGateProfile;
}

export type ProjectGateArgumentParseResult =
  | Readonly<{ readonly ok: true; readonly value: ProjectGateSelection }>
  | Readonly<{ readonly ok: false; readonly error: string }>;

/** Parses the adapter's deliberately small public grammar. */
export function parseProjectGateArguments(
  arguments_: readonly string[]
): ProjectGateArgumentParseResult {
  let profile: ProjectGateProfile = "full";
  let profileSpecified = false;
  const disabledTags: ProjectGateTag[] = [];

  for (let index = 0; index < arguments_.length; index += 1) {
    const token = arguments_[index];
    if (token === "--profile") {
      const value = arguments_[index + 1];
      if (profileSpecified || !isProjectGateProfile(value)) {
        return parseFailure("--profile requires one of: required, full");
      }
      profile = value;
      profileSpecified = true;
      index += 1;
      continue;
    }
    if (token === "--disable-tag") {
      const value = arguments_[index + 1];
      if (!isProjectGateTag(value)) {
        return parseFailure("--disable-tag requires a known non-empty tag");
      }
      disabledTags.push(value);
      index += 1;
      continue;
    }
    return parseFailure(`unknown Project Gate argument: ${token}`);
  }

  return Object.freeze({
    ok: true,
    value: Object.freeze({
      disabledTags: canonicalTags(disabledTags),
      profile
    })
  });
}

export function selectionFlags(selection: ProjectGateSelection): readonly string[] {
  return Object.freeze([
    `${PROFILE_FLAG_PREFIX}${selection.profile}`,
    ...selection.disabledTags.map((tag) => `${DISABLED_TAG_FLAG_PREFIX}${tag}`)
  ]);
}

/** Reconstructs the adapter-owned selection from Product's opaque frozen flags. */
export function selectionFromFlags(flags: readonly string[]): ProjectGateSelection | undefined {
  let profile: ProjectGateProfile | undefined;
  const tags: ProjectGateTag[] = [];
  for (const flag of flags) {
    if (flag.startsWith(PROFILE_FLAG_PREFIX)) {
      const candidate = flag.slice(PROFILE_FLAG_PREFIX.length);
      if (profile !== undefined || !isProjectGateProfile(candidate)) return undefined;
      profile = candidate;
      continue;
    }
    if (flag.startsWith(DISABLED_TAG_FLAG_PREFIX)) {
      const candidate = flag.slice(DISABLED_TAG_FLAG_PREFIX.length);
      if (!isProjectGateTag(candidate)) return undefined;
      tags.push(candidate);
      continue;
    }
    return undefined;
  }
  return profile === undefined
    ? undefined
    : Object.freeze({ disabledTags: canonicalTags(tags), profile });
}

export function isProjectGateProfile(value: unknown): value is ProjectGateProfile {
  return typeof value === "string" && PROJECT_GATE_PROFILES.some((profile) => profile === value);
}

export function isProjectGateTag(value: unknown): value is ProjectGateTag {
  return typeof value === "string" && PROJECT_GATE_TAGS.some((tag) => tag === value);
}

function canonicalTags(tags: readonly ProjectGateTag[]): readonly ProjectGateTag[] {
  return Object.freeze([...new Set(tags)].sort());
}

function parseFailure(error: string): ProjectGateArgumentParseResult {
  return Object.freeze({ ok: false, error });
}
