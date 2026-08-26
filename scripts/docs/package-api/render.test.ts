import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, it } from "node:test";

import { PACKAGE_API_EXAMPLE_PROJECTIONS, type PackageApiExampleProjection } from "./registry.ts";
import { renderPackageApiDocumentation } from "./render.ts";
import { createPackageApiDocumentationFixture, PACKAGE_API_JSDOC_TARGETS } from "./test-support.ts";

describe("package API documentation renderer", () => {
  it("projects every registry region to its declared README and JSDoc targets without changing payload bytes", () => {
    const fixtureRoot = createPackageApiDocumentationFixture();
    try {
      const rendered = renderPackageApiDocumentation({ repositoryRoot: fixtureRoot });
      assert.equal(rendered.readme.path, join(fixtureRoot, "README.md"));
      assert.deepEqual(
        rendered.jsdocSources
          .map((source) => relative(fixtureRoot, source.path).split("\\").join("/"))
          .sort(),
        PACKAGE_API_JSDOC_TARGETS.map((target) => target.sourcePath)
          .filter((sourcePath, index, paths) => paths.indexOf(sourcePath) === index)
          .sort()
      );
      assert.equal(rendered.readme.content.includes("package-api-example:"), false);

      for (const projection of PACKAGE_API_EXAMPLE_PROJECTIONS) {
        const payload = regionPayload(fixtureRoot, projection.sourcePath, projection.regionId);
        for (const target of projection.targets) {
          if (target.kind === "readme") {
            assert.equal(rendered.readme.content.includes(`\`\`\`ts\n${payload}\`\`\``), true);
          } else {
            const source = rendered.jsdocSources.find(
              (candidate) => candidate.path === join(fixtureRoot, target.sourcePath)
            );
            assert.ok(source);
            const prefixedPayload = payload
              .slice(0, -1)
              .split("\n")
              .map((line) => (line.length === 0 ? " *" : ` * ${line}`))
              .join("\n");
            assert.equal(
              source.content.includes(
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
    const fencedTemplateFixture = createPackageApiDocumentationFixture();
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

    const staleJSDocFixture = createPackageApiDocumentationFixture();
    try {
      const sourcePath = join(staleJSDocFixture, "src/check/check.ts");
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
      const source = rendered.jsdocSources.find((candidate) => candidate.path === sourcePath);
      assert.ok(source);
      assert.equal(source.content.includes("manual example"), false);
    } finally {
      rmSync(staleJSDocFixture, { force: true, recursive: true });
    }

    const removedJSDocTargetFixture = createPackageApiDocumentationFixture();
    try {
      const sourcePath = join(removedJSDocTargetFixture, "src/check/check.ts");
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
      const source = rendered.jsdocSources.find((candidate) => candidate.path === sourcePath);
      assert.ok(source);
      assert.equal(source.content.includes("@example"), false);
    } finally {
      rmSync(removedJSDocTargetFixture, { force: true, recursive: true });
    }

    const malformedRegionFixture = createPackageApiDocumentationFixture();
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

    const duplicateRegionFixture = createPackageApiDocumentationFixture();
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

    const malformedPlaceholderFixture = createPackageApiDocumentationFixture();
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

    const duplicateTargetFixture = createPackageApiDocumentationFixture();
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

    const sharedTargetFixture = createPackageApiDocumentationFixture();
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

    const nonAdjacentExampleFixture = createPackageApiDocumentationFixture();
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

    const duplicateDiscoveredTargetFixture = createPackageApiDocumentationFixture();
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

    const unsafeTailFixture = createPackageApiDocumentationFixture();
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
