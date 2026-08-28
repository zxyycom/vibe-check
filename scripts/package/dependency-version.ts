interface BunSemverCapability {
  readonly satisfies: (version: string, range: string) => boolean;
}

declare const Bun: Readonly<{ semver: BunSemverCapability }>;

export type PackageDependencyVersionRequirement =
  | Readonly<{ readonly kind: "exact"; readonly version: string }>
  | Readonly<{ readonly kind: "range"; readonly range: string }>;

/** Evaluates one resolved package version against its declared dependency requirement. */
export function isAcceptedPackageDependencyVersion(
  input: Readonly<{
    readonly resolvedVersion: string;
    readonly requirement: PackageDependencyVersionRequirement;
  }>
): boolean {
  return input.requirement.kind === "exact"
    ? input.resolvedVersion === input.requirement.version
    : Bun.semver.satisfies(input.resolvedVersion, input.requirement.range);
}

export function packageDependencyVersionRequirementText(
  requirement: PackageDependencyVersionRequirement
): string {
  return requirement.kind === "exact" ? requirement.version : requirement.range;
}
