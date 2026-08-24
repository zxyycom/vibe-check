import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { PACKAGE_API_EXAMPLE_PROJECTIONS, type PackageApiExampleProjection } from "./registry.ts";
import { renderPackageApiDocumentation } from "./render.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("package API documentation renderer", () => {
  it("projects every registry region to its declared README and JSDoc targets without changing payload bytes", () => {
    const fixtureRoot = createDocumentationFixture();
    try {
      const rendered = renderPackageApiDocumentation({ repositoryRoot: fixtureRoot });
      assert.equal(rendered.readme.path, join(fixtureRoot, "README.md"));
      assert.equal(rendered.jsdocSources.length, 1);
      assert.equal(
        rendered.jsdocSources[0]?.path,
        join(fixtureRoot, "src/definition/custom-check.ts")
      );
      assert.equal(rendered.readme.content.includes("package-api-example:"), false);

      for (const projection of PACKAGE_API_EXAMPLE_PROJECTIONS) {
        const payload = regionPayload(fixtureRoot, projection.sourcePath, projection.regionId);
        for (const target of projection.targets) {
          if (target.kind === "readme") {
            assert.equal(rendered.readme.content.includes(`\`\`\`ts\n${payload}\`\`\``), true);
          } else {
            const prefixedPayload = payload
              .slice(0, -1)
              .split("\n")
              .map((line) => (line.length === 0 ? " *" : ` * ${line}`))
              .join("\n");
            assert.equal(
              rendered.jsdocSources[0]?.content.includes(
                ` * @example ${projection.title}\n * \`\`\`ts\n${prefixedPayload}\n * \`\`\``
              ),
              true
            );
          }
        }
      }
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true });
    }
  });

  it("replaces generated JSDoc tails and rejects malformed source regions", () => {
    const fencedTemplateFixture = createDocumentationFixture();
    try {
      const templatePath = join(fencedTemplateFixture, "docs/package-readme.template.md");
      writeFileSync(templatePath, `${readFileSync(templatePath, "utf8")}\n  ~~~ts\n`, "utf8");
      assert.throws(
        () => renderPackageApiDocumentation({ repositoryRoot: fencedTemplateFixture }),
        /must not contain fenced code/
      );
    } finally {
      rmSync(fencedTemplateFixture, { force: true, recursive: true });
    }

    const staleJSDocFixture = createDocumentationFixture();
    try {
      const sourcePath = join(staleJSDocFixture, "src/definition/custom-check.ts");
      writeFileSync(
        sourcePath,
        [
          "/**",
          " * Defines a Check.",
          " * @example manual example",
          " * ```ts",
          " * void 0;",
          " * ```",
          " */",
          "export function defineCheck() { return {}; }",
          ""
        ].join("\n"),
        "utf8"
      );
      const rendered = renderPackageApiDocumentation({ repositoryRoot: staleJSDocFixture });
      assert.equal(rendered.jsdocSources[0]?.content.includes("manual example"), false);
    } finally {
      rmSync(staleJSDocFixture, { force: true, recursive: true });
    }

    const removedJSDocTargetFixture = createDocumentationFixture();
    try {
      const sourcePath = join(removedJSDocTargetFixture, "src/definition/custom-check.ts");
      const current = renderPackageApiDocumentation({ repositoryRoot: removedJSDocTargetFixture });
      const currentSource = current.jsdocSources.find((source) => source.path === sourcePath);
      assert.ok(currentSource);
      writeFileSync(sourcePath, currentSource.content, "utf8");
      const templatePath = join(removedJSDocTargetFixture, "docs/package-readme.template.md");
      writeFileSync(
        templatePath,
        `${readFileSync(templatePath, "utf8")}\n<!-- package-api-example:former-jsdoc -->\n`,
        "utf8"
      );

      const rendered = renderPackageApiDocumentation({
        projections: projectionsWithRemovedJSDocTarget(),
        repositoryRoot: removedJSDocTargetFixture
      });
      assert.equal(rendered.jsdocSources.length, 1);
      assert.equal(rendered.jsdocSources[0]?.path, sourcePath);
      assert.equal(rendered.jsdocSources[0]?.content.includes("@example"), false);
    } finally {
      rmSync(removedJSDocTargetFixture, { force: true, recursive: true });
    }

    const malformedRegionFixture = createDocumentationFixture();
    try {
      const sourcePath = join(malformedRegionFixture, "docs/examples/package-api/quick-start.ts");
      writeFileSync(
        sourcePath,
        readFileSync(sourcePath, "utf8").replace(
          "// #endregion package-api-example:quick-start",
          "// end"
        ),
        "utf8"
      );
      assert.throws(
        () => renderPackageApiDocumentation({ repositoryRoot: malformedRegionFixture }),
        /unclosed package API example region quick-start/
      );
    } finally {
      rmSync(malformedRegionFixture, { force: true, recursive: true });
    }

    const duplicateRegionFixture = createDocumentationFixture();
    try {
      const sourcePath = join(
        duplicateRegionFixture,
        "docs/examples/package-api/typed-dependency.ts"
      );
      writeFileSync(
        sourcePath,
        readFileSync(sourcePath, "utf8").replaceAll("typed-dependency", "quick-start"),
        "utf8"
      );
      assert.throws(
        () => renderPackageApiDocumentation({ repositoryRoot: duplicateRegionFixture }),
        /duplicate package API example region id: quick-start/
      );
    } finally {
      rmSync(duplicateRegionFixture, { force: true, recursive: true });
    }

    const malformedPlaceholderFixture = createDocumentationFixture();
    try {
      const templatePath = join(malformedPlaceholderFixture, "docs/package-readme.template.md");
      writeFileSync(
        templatePath,
        `${readFileSync(templatePath, "utf8")}extra package-api-example:unknown\n`,
        "utf8"
      );
      assert.throws(
        () => renderPackageApiDocumentation({ repositoryRoot: malformedPlaceholderFixture }),
        /malformed package API README placeholder/
      );
    } finally {
      rmSync(malformedPlaceholderFixture, { force: true, recursive: true });
    }

    const duplicateTargetFixture = createDocumentationFixture();
    try {
      assert.throws(
        () =>
          renderPackageApiDocumentation({
            projections: projectionsWithDuplicateJSDocTarget(),
            repositoryRoot: duplicateTargetFixture
          }),
        /duplicate package API example target: custom-check-definition/
      );
    } finally {
      rmSync(duplicateTargetFixture, { force: true, recursive: true });
    }

    const sharedTargetFixture = createDocumentationFixture();
    try {
      assert.doesNotThrow(() =>
        renderPackageApiDocumentation({
          projections: projectionsWithSharedJSDocTarget(),
          repositoryRoot: sharedTargetFixture
        })
      );
    } finally {
      rmSync(sharedTargetFixture, { force: true, recursive: true });
    }

    const nonAdjacentExampleFixture = createDocumentationFixture();
    try {
      writeProductSource(
        nonAdjacentExampleFixture,
        "obsolete.ts",
        ["/**", " * @example unsupported declaration", " */", "function obsolete() {}", ""].join(
          "\n"
        )
      );
      assert.throws(
        () => renderPackageApiDocumentation({ repositoryRoot: nonAdjacentExampleFixture }),
        /@example is not adjacent to a supported export/
      );
    } finally {
      rmSync(nonAdjacentExampleFixture, { force: true, recursive: true });
    }

    const duplicateDiscoveredTargetFixture = createDocumentationFixture();
    try {
      writeProductSource(
        duplicateDiscoveredTargetFixture,
        "duplicate.ts",
        [
          "/**",
          " * @example first",
          " */",
          "export function duplicate() {}",
          "/**",
          " * @example second",
          " */",
          "export function duplicate() {}",
          ""
        ].join("\n")
      );
      assert.throws(
        () => renderPackageApiDocumentation({ repositoryRoot: duplicateDiscoveredTargetFixture }),
        /duplicate package API JSDoc target/
      );
    } finally {
      rmSync(duplicateDiscoveredTargetFixture, { force: true, recursive: true });
    }

    const unsafeTailFixture = createDocumentationFixture();
    try {
      writeProductSource(
        unsafeTailFixture,
        "unsafe-tail.ts",
        [
          "/**",
          " * @example stale",
          " * ```ts",
          " * void 0;",
          " * ```",
          " * @returns unsafe trailing tag",
          " */",
          "export function unsafeTail() {}",
          ""
        ].join("\n")
      );
      assert.throws(
        () => renderPackageApiDocumentation({ repositoryRoot: unsafeTailFixture }),
        /non-example JSDoc tag follows @example/
      );
    } finally {
      rmSync(unsafeTailFixture, { force: true, recursive: true });
    }
  });
});

function projectionsWithRemovedJSDocTarget(): readonly PackageApiExampleProjection[] {
  return PACKAGE_API_EXAMPLE_PROJECTIONS.map((projection) =>
    projection.id === "custom-check-definition"
      ? {
          ...projection,
          targets: Object.freeze([
            Object.freeze({ kind: "readme" as const, placeholderId: "former-jsdoc" })
          ])
        }
      : projection
  );
}

function projectionsWithDuplicateJSDocTarget(): readonly PackageApiExampleProjection[] {
  return PACKAGE_API_EXAMPLE_PROJECTIONS.map((projection) => {
    if (projection.id !== "custom-check-definition") return projection;
    const target = projection.targets[0];
    if (target === undefined || target.kind !== "jsdoc")
      throw new Error("missing fixture JSDoc target");
    return { ...projection, targets: [...projection.targets, target] };
  });
}

function projectionsWithSharedJSDocTarget(): readonly PackageApiExampleProjection[] {
  const target = PACKAGE_API_EXAMPLE_PROJECTIONS.find(
    (projection) => projection.id === "custom-check-definition"
  )?.targets[0];
  if (target === undefined || target.kind !== "jsdoc")
    throw new Error("missing fixture JSDoc target");
  return PACKAGE_API_EXAMPLE_PROJECTIONS.map((projection) =>
    projection.id === "quick-start"
      ? { ...projection, targets: [...projection.targets, target] }
      : projection
  );
}

function createDocumentationFixture(): string {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "vibe-check-package-api-docs-"));
  copyFixtureFile(fixtureRoot, "docs/package-readme.template.md");
  for (const projection of PACKAGE_API_EXAMPLE_PROJECTIONS) {
    copyFixtureFile(fixtureRoot, projection.sourcePath);
  }
  const sourcePath = join(fixtureRoot, "src/definition/custom-check.ts");
  mkdirSync(dirname(sourcePath), { recursive: true });
  writeFileSync(
    sourcePath,
    ["/**", " * Defines a Check.", " */", "export function defineCheck() { return {}; }", ""].join(
      "\n"
    ),
    "utf8"
  );
  return fixtureRoot;
}

function copyFixtureFile(fixtureRoot: string, repositoryPath: string): void {
  const destination = join(fixtureRoot, repositoryPath);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(join(repositoryRoot, repositoryPath), destination);
}

function writeProductSource(fixtureRoot: string, name: string, content: string): void {
  const path = join(fixtureRoot, "src", name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
}

function regionPayload(
  fixtureRoot: string,
  sourcePath: string,
  regionId: string | undefined
): string {
  const content = readFileSync(join(fixtureRoot, sourcePath), "utf8");
  if (regionId === undefined) return content;
  const start = `// #region package-api-example:${regionId}\n`;
  const end = `// #endregion package-api-example:${regionId}`;
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end);
  assert.notEqual(startIndex, -1, `missing ${regionId} start marker`);
  assert.notEqual(endIndex, -1, `missing ${regionId} end marker`);
  return content
    .slice(startIndex + start.length, endIndex)
    .split("\n")
    .filter((line) => !/^\/\/ #(?:end)?region package-api-example:[a-z][a-z0-9-]*$/.test(line))
    .join("\n");
}
