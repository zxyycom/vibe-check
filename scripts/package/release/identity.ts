const FORMAL_RELEASE_VERSION_PATTERN = /^0\.0\.([1-9][0-9]*)$/u;
const RELEASE_TAG_PATTERN = /^[a-z][a-z0-9-]{0,31}$/u;
const FULL_GIT_COMMIT_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;

/** Accepts only a canonical positive patch on the approved prestable version line. */
export function parseFormalReleaseVersion(value: unknown): string {
  if (typeof value !== "string") {
    throw new TypeError("formal release version must use canonical 0.0.<positive-patch> syntax");
  }
  const match = FORMAL_RELEASE_VERSION_PATTERN.exec(value);
  const patch = match === null ? undefined : Number(match[1]);
  if (patch === undefined || !Number.isSafeInteger(patch)) {
    throw new TypeError("formal release version must use canonical 0.0.<positive-patch> syntax");
  }
  return value;
}

/** Keeps release tags explicit and deliberately narrower than npm's complete tag grammar. */
export function parseReleaseTag(value: unknown): string {
  if (typeof value !== "string" || !RELEASE_TAG_PATTERN.test(value)) {
    throw new TypeError(
      "formal release tag must start with a lowercase letter and contain only lowercase letters, digits, or hyphens"
    );
  }
  return value;
}

/** Accepts only the complete lowercase object identity recorded by supported Git hashes. */
export function isFullGitCommit(value: unknown): value is string {
  return typeof value === "string" && FULL_GIT_COMMIT_PATTERN.test(value);
}
