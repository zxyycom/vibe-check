export const PROJECT_GATE_PROFILES = ["required", "full"] as const;
export type ProjectGateProfile = (typeof PROJECT_GATE_PROFILES)[number];

export const PROJECT_GATE_TAGS = [
  "catalog",
  "docs",
  "format",
  "foundation",
  "git",
  "product",
  "quality",
  "scripts",
  "tests"
] as const;
export type ProjectGateTag = (typeof PROJECT_GATE_TAGS)[number];

export interface ProjectGateCheckDescriptor {
  readonly checkId: string;
  readonly command: string;
  readonly dependencies: readonly string[];
  readonly displayName: string;
  readonly environment: Readonly<Record<string, string>>;
  readonly args: readonly string[];
  readonly profiles: readonly ProjectGateProfile[];
  readonly tags: readonly ProjectGateTag[];
}

const requiredAndFull = ["required", "full"] as const;

export const PROJECT_GATE_CATALOG = defineProjectGateCatalog([
  check({
    checkId: "typecheck-product",
    command: "bun",
    args: ["scripts/development/typecheck.ts", "product"],
    displayName: "TypeScript product typecheck and import boundary",
    profiles: requiredAndFull,
    tags: ["product"]
  }),
  check({
    checkId: "lint-product",
    command: "bun",
    args: ["scripts/development/lint.ts", "product"],
    displayName: "TypeScript product lint",
    profiles: requiredAndFull,
    tags: ["product"]
  }),
  check({
    checkId: "typecheck-scripts",
    command: "bun",
    args: ["scripts/development/typecheck.ts", "scripts"],
    displayName: "TypeScript script typecheck",
    profiles: requiredAndFull,
    tags: ["scripts"]
  }),
  check({
    checkId: "lint-scripts",
    command: "bun",
    args: ["scripts/development/lint.ts", "scripts"],
    displayName: "TypeScript script lint",
    profiles: requiredAndFull,
    tags: ["scripts"]
  }),
  check({
    checkId: "format-check",
    command: "bun",
    args: ["scripts/development/format.ts", "check"],
    displayName: "Source format",
    profiles: requiredAndFull,
    tags: ["format"]
  }),
  check({
    checkId: "quality-quick-check",
    command: "bun",
    args: ["scripts/quality/index.ts"],
    dependencies: ["typecheck-product", "lint-product", "typecheck-scripts", "lint-scripts"],
    displayName: "Repository Package Run dogfood",
    environment: { VIBE_CHECK_QUALITY_TIMINGS: "1" },
    profiles: ["required"],
    tags: ["quality"]
  }),
  check({
    checkId: "docs-json-validator",
    command: "bun",
    args: ["scripts/validate.ts", "docs", "json"],
    displayName: "Docs JSON validator",
    profiles: requiredAndFull,
    tags: ["docs"]
  }),
  check({
    checkId: "docs-schema-validator",
    command: "bun",
    args: ["scripts/validate.ts", "docs", "schema"],
    displayName: "Docs schema validator",
    profiles: requiredAndFull,
    tags: ["docs"]
  }),
  check({
    checkId: "docs-example-validator",
    command: "bun",
    args: ["scripts/validate.ts", "docs", "examples"],
    displayName: "Docs example validator",
    profiles: requiredAndFull,
    tags: ["docs"]
  }),
  check({
    checkId: "docs-links-validator",
    command: "bun",
    args: ["scripts/validate.ts", "docs", "links"],
    displayName: "Docs links validator",
    profiles: requiredAndFull,
    tags: ["docs"]
  }),
  check({
    checkId: "decision-records",
    command: "bun",
    args: ["scripts/decision-records.ts", "check"],
    displayName: "Decision records",
    profiles: requiredAndFull,
    tags: ["catalog"]
  }),
  check({
    checkId: "test-evidence",
    command: "bun",
    args: ["scripts/test-evidence/index.ts", "check", "--root", "."],
    displayName: "Semantic Case ledger",
    profiles: requiredAndFull,
    tags: ["catalog", "tests"]
  }),
  check({
    checkId: "test-evidence-rule-tests",
    command: "bun",
    args: ["scripts/test-evidence/test-rules.ts"],
    displayName: "Test evidence ast-grep rule tests",
    profiles: requiredAndFull,
    tags: ["catalog", "tests"]
  }),
  check({
    checkId: "git-diff-whitespace",
    command: "git",
    args: ["diff", "--check"],
    displayName: "Git diff whitespace",
    profiles: requiredAndFull,
    tags: ["git"]
  }),
  check({
    checkId: "product-tests",
    command: "bun",
    args: ["scripts/development/test.ts", "product"],
    displayName: "TypeScript product tests",
    profiles: ["full"],
    tags: ["product", "tests"]
  }),
  check({
    checkId: "toolkit-foundation-typecheck",
    command: "bun",
    args: ["run", "--cwd", "scripts/tools/foundation", "typecheck"],
    displayName: "Foundation toolkit typecheck",
    profiles: ["full"],
    tags: ["foundation"]
  }),
  check({
    checkId: "toolkit-foundation-lint",
    command: "bun",
    args: ["run", "--cwd", "scripts/tools/foundation", "lint"],
    displayName: "Foundation toolkit lint",
    profiles: ["full"],
    tags: ["foundation"]
  }),
  check({
    checkId: "toolkit-foundation-format-check",
    command: "bun",
    args: ["run", "--cwd", "scripts/tools/foundation", "format", "--", "check"],
    displayName: "Foundation toolkit format check",
    profiles: ["full"],
    tags: ["foundation", "format"]
  }),
  check({
    checkId: "toolkit-foundation-tests",
    command: "bun",
    args: ["run", "--cwd", "scripts/tools/foundation", "test"],
    displayName: "Foundation toolkit tests",
    profiles: ["full"],
    tags: ["foundation", "tests"]
  }),
  check({
    checkId: "quality-full-check",
    command: "bun",
    args: ["scripts/quality/index.ts"],
    dependencies: [
      "test-evidence",
      "typecheck-product",
      "lint-product",
      "typecheck-scripts",
      "lint-scripts"
    ],
    displayName: "Repository Package Run full-profile dogfood",
    environment: { VIBE_CHECK_QUALITY_TIMINGS: "1" },
    profiles: ["full"],
    tags: ["quality"]
  })
]);

function check(
  input: Omit<ProjectGateCheckDescriptor, "dependencies" | "environment"> &
    Partial<Pick<ProjectGateCheckDescriptor, "dependencies" | "environment">>
): ProjectGateCheckDescriptor {
  return Object.freeze({
    ...input,
    args: Object.freeze([...input.args]),
    dependencies: canonicalValues(input.dependencies ?? []),
    environment: Object.freeze({ ...(input.environment ?? {}) }),
    profiles: canonicalValues(input.profiles),
    tags: canonicalValues(input.tags)
  });
}

function canonicalValues<Value extends string>(values: readonly Value[]): readonly Value[] {
  return Object.freeze([...new Set(values)].sort());
}

/** Validates the closed command catalog before projecting it into a Project Definition. */
export function defineProjectGateCatalog(
  descriptors: readonly ProjectGateCheckDescriptor[]
): readonly ProjectGateCheckDescriptor[] {
  const descriptorsById = indexCatalogDescriptors(descriptors);
  assertCatalogDependencies(descriptors, descriptorsById);
  assertAcyclicDependencies(descriptorsById);
  assertCatalogProfileCounts(descriptors);
  return Object.freeze([...descriptors]);
}

function indexCatalogDescriptors(
  descriptors: readonly ProjectGateCheckDescriptor[]
): ReadonlyMap<string, ProjectGateCheckDescriptor> {
  const descriptorsById = new Map<string, ProjectGateCheckDescriptor>();
  for (const descriptor of descriptors) {
    if (!/^[a-z][a-z0-9-]*$/.test(descriptor.checkId) || descriptorsById.has(descriptor.checkId)) {
      throw new TypeError(`Project Gate catalog has an invalid Check ID: ${descriptor.checkId}`);
    }
    descriptorsById.set(descriptor.checkId, descriptor);
    assertCatalogDescriptor(descriptor);
  }
  return descriptorsById;
}

function assertCatalogDescriptor(descriptor: ProjectGateCheckDescriptor): void {
  if (
    descriptor.command.length === 0 ||
    descriptor.displayName.length === 0 ||
    descriptor.profiles.length === 0 ||
    descriptor.profiles.some((profile) => !PROJECT_GATE_PROFILES.includes(profile)) ||
    descriptor.tags.some((tag) => !PROJECT_GATE_TAGS.includes(tag))
  ) {
    throw new TypeError(`Project Gate catalog has an invalid descriptor: ${descriptor.checkId}`);
  }
}

function assertCatalogDependencies(
  descriptors: readonly ProjectGateCheckDescriptor[],
  descriptorsById: ReadonlyMap<string, ProjectGateCheckDescriptor>
): void {
  for (const descriptor of descriptors) {
    if (
      descriptor.dependencies.some(
        (dependency) => dependency === descriptor.checkId || !descriptorsById.has(dependency)
      )
    ) {
      throw new TypeError(`Project Gate catalog has an invalid dependency: ${descriptor.checkId}`);
    }
    for (const profile of descriptor.profiles) {
      if (
        descriptor.dependencies.some(
          (dependency) => !descriptorsById.get(dependency)?.profiles.includes(profile)
        )
      ) {
        throw new TypeError(
          `Project Gate catalog dependency is excluded from profile ${profile}: ${descriptor.checkId}`
        );
      }
    }
  }
}

function assertCatalogProfileCounts(descriptors: readonly ProjectGateCheckDescriptor[]): void {
  if (descriptors.length !== 20) throw new TypeError("Project Gate catalog must contain 20 Checks");
  if (descriptors.filter(({ profiles }) => profiles.includes("required")).length !== 14)
    throw new TypeError("Project Gate required profile must contain 14 Checks");
  if (descriptors.filter(({ profiles }) => profiles.includes("full")).length !== 19)
    throw new TypeError("Project Gate full profile must contain 19 Checks");
}

function assertAcyclicDependencies(
  descriptorsById: ReadonlyMap<string, ProjectGateCheckDescriptor>
): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (checkId: string): void => {
    if (visited.has(checkId)) return;
    if (visiting.has(checkId)) {
      throw new TypeError(`Project Gate catalog has a dependency cycle at: ${checkId}`);
    }
    visiting.add(checkId);
    const descriptor = descriptorsById.get(checkId);
    if (descriptor === undefined) {
      throw new TypeError(`Project Gate catalog has an invalid dependency: ${checkId}`);
    }
    for (const dependency of descriptor.dependencies) visit(dependency);
    visiting.delete(checkId);
    visited.add(checkId);
  };

  for (const checkId of descriptorsById.keys()) visit(checkId);
}
