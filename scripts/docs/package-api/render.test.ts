import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { describe, it } from "node:test";

import {
  PACKAGE_API_EXAMPLE_PROJECTIONS,
  PACKAGE_API_MARKDOWN_DOCUMENTS,
  type PackageApiExampleProjection
} from "./example-projections.ts";
import { renderPackageApiDocumentation } from "./render.ts";
import { createPackageApiDocumentationFixture, PACKAGE_API_JSDOC_TARGETS } from "./test-support.ts";

interface MarkdownExampleTargetFailureFixture {
  readonly corruptSource: (source: string) => string;
  readonly diagnostic: RegExp;
}

describe("package API documentation renderer", () => {
  it("projects every registry source region to its declared Markdown fence and JSDoc target without changing payload bytes", () => {
    const fixtureRoot = createPackageApiDocumentationFixture();
    try {
      const rendered = renderPackageApiDocumentation({ repositoryRoot: fixtureRoot });
      assert.equal(rendered.readme.absolutePath, join(fixtureRoot, "README.md"));
      assert.deepEqual(
        rendered.markdownDocuments
          .map((document) => relative(fixtureRoot, document.absolutePath).split("\\").join("/"))
          .sort(),
        PACKAGE_API_MARKDOWN_DOCUMENTS.map((document) => document.packagePath).sort()
      );
      assert.deepEqual(
        rendered.jsdocSources
          .map((source) => relative(fixtureRoot, source.absolutePath).split("\\").join("/"))
          .sort(),
        PACKAGE_API_JSDOC_TARGETS.map((target) => target.sourcePath)
          .filter((sourcePath, index, paths) => paths.indexOf(sourcePath) === index)
          .sort()
      );
      for (const document of rendered.markdownDocuments) {
        assert.equal(document.content, readFileSync(document.absolutePath, "utf8"));
      }
      assert.equal(rendered.readme.content.includes("](./docs/api-mechanics.md)"), true);
      assert.equal(
        rendered.markdownDocuments
          .find((document) => document.documentId === "api-mechanics")
          ?.content.includes("](../README.md)"),
        true
      );

      for (const projection of PACKAGE_API_EXAMPLE_PROJECTIONS) {
        const payload = regionPayload(fixtureRoot, projection.sourcePath, projection.regionId);
        for (const target of projection.targets) {
          if (target.kind === "markdown") {
            const document = rendered.markdownDocuments.find(
              (candidate) => candidate.documentId === target.documentId
            );
            assert.ok(document);
            assert.equal(document.content.includes(fencedTypeScript(payload)), true);
          } else {
            const source = rendered.jsdocSources.find(
              (candidate) => candidate.absolutePath === join(fixtureRoot, target.sourcePath)
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
      assert.equal(
        rendered.markdownDocuments.some((document) =>
          document.content.includes("<!-- package-api-example:")
        ),
        false
      );
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true });
    }
  });

  it("replaces generated JSDoc tails and rejects malformed source or Markdown example targets", () => {
    const markdownTargetFailures: readonly MarkdownExampleTargetFailureFixture[] = [
      {
        corruptSource: (source) =>
          source.replace("## 自定义 Check 快速开始", "## Renamed quick start"),
        diagnostic: /expected exactly one package API Markdown heading target.*found 0/
      },
      {
        corruptSource: (source) =>
          source.replace(/\n$/, "\n## 自定义 Check 快速开始\n\n```ts\nvoid 0;\n```\n"),
        diagnostic: /expected exactly one package API Markdown heading target.*found 2/
      },
      {
        corruptSource: (source) =>
          source.replace(
            "```ts\nimport { defineCheck, defineConfig, run }",
            "```text\nimport { defineCheck, defineConfig, run }"
          ),
        diagnostic: /expected exactly one fenced TypeScript example.*found 0/
      },
      {
        corruptSource: (source) =>
          source.replace("\n```\n\n示例选择关闭", "\n```\n\n```ts\nvoid 0;\n```\n\n示例选择关闭"),
        diagnostic: /expected exactly one fenced TypeScript example.*found 2/
      },
      {
        corruptSource: (source) =>
          source.replace(
            "```ts\nimport { defineCheck, defineConfig, run }",
            "````ts\nimport { defineCheck, defineConfig, run }"
          ),
        diagnostic: /unclosed Markdown fence/
      },
      {
        corruptSource: (source) =>
          source.replace(/\n$/, "\n<!-- package-api-example:start:obsolete -->\n"),
        diagnostic: /package Markdown contains a package example projection marker/
      }
    ];
    for (const failure of markdownTargetFailures) {
      const fixtureRoot = createPackageApiDocumentationFixture();
      try {
        const readmePath = join(fixtureRoot, "README.md");
        writeFileSync(readmePath, failure.corruptSource(readFileSync(readmePath, "utf8")), "utf8");
        assert.throws(
          () => renderPackageApiDocumentation({ repositoryRoot: fixtureRoot }),
          failure.diagnostic
        );
      } finally {
        rmSync(fixtureRoot, { force: true, recursive: true });
      }
    }

    const headingLevelGapFixture = createPackageApiDocumentationFixture();
    try {
      const readmePath = join(headingLevelGapFixture, "README.md");
      const readme = readFileSync(readmePath, "utf8");
      const readmeWithHeadingLevelGap = readme.replace(
        "## 自定义 Check 快速开始",
        "  ### 自定义 Check 快速开始"
      );
      assert.notEqual(readmeWithHeadingLevelGap, readme);
      writeFileSync(readmePath, readmeWithHeadingLevelGap, "utf8");
      assert.doesNotThrow(() =>
        renderPackageApiDocumentation({ repositoryRoot: headingLevelGapFixture })
      );
    } finally {
      rmSync(headingLevelGapFixture, { force: true, recursive: true });
    }

    const invalidHeadingPathFixture = createPackageApiDocumentationFixture();
    try {
      assert.throws(
        () =>
          renderPackageApiDocumentation({
            projections: projectionsWithEmptyMarkdownHeadingPath(),
            repositoryRoot: invalidHeadingPathFixture
          }),
        /invalid package API Markdown example target: quick-start/
      );
      const sparseHeadingPath = Object.freeze(Array<string>(1));
      assert.throws(
        () =>
          renderPackageApiDocumentation({
            projections: projectionsWithMarkdownHeadingPath(sparseHeadingPath),
            repositoryRoot: invalidHeadingPathFixture
          }),
        /invalid package API Markdown example target: quick-start/
      );
    } finally {
      rmSync(invalidHeadingPathFixture, { force: true, recursive: true });
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
      const source = rendered.jsdocSources.find(
        (candidate) => candidate.absolutePath === sourcePath
      );
      assert.ok(source);
      assert.equal(source.content.includes("manual example"), false);
    } finally {
      rmSync(staleJSDocFixture, { force: true, recursive: true });
    }

    const removedJSDocTargetFixture = createPackageApiDocumentationFixture();
    try {
      const sourcePath = join(removedJSDocTargetFixture, "src/check/check.ts");
      const current = renderPackageApiDocumentation({ repositoryRoot: removedJSDocTargetFixture });
      const currentSource = current.jsdocSources.find(
        (source) => source.absolutePath === sourcePath
      );
      assert.ok(currentSource);
      writeFileSync(sourcePath, currentSource.content, "utf8");
      const readmePath = join(removedJSDocTargetFixture, "README.md");
      writeFileSync(
        readmePath,
        readFileSync(readmePath, "utf8").replace(
          /\n$/,
          "\n## Former JSDoc example\n\n```ts\nstale\n```\n"
        ),
        "utf8"
      );

      const rendered = renderPackageApiDocumentation({
        projections: projectionsWithRemovedJSDocTarget(),
        repositoryRoot: removedJSDocTargetFixture
      });
      const source = rendered.jsdocSources.find(
        (candidate) => candidate.absolutePath === sourcePath
      );
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
            Object.freeze({
              documentId: "readme",
              headingPath: Object.freeze(["Former JSDoc example"]),
              kind: "markdown" as const
            })
          ])
        }
      : projection
  );
}

function projectionsWithEmptyMarkdownHeadingPath(): readonly PackageApiExampleProjection[] {
  return projectionsWithMarkdownHeadingPath(Object.freeze([]));
}

function projectionsWithMarkdownHeadingPath(
  headingPath: readonly string[]
): readonly PackageApiExampleProjection[] {
  return PACKAGE_API_EXAMPLE_PROJECTIONS.map((projection) => {
    if (projection.id !== "quick-start") return projection;
    return {
      ...projection,
      targets: projection.targets.map((target) => {
        if (target.kind !== "markdown") return target;
        return { ...target, headingPath };
      })
    };
  });
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

function fencedTypeScript(payload: string): string {
  let fence = "```";
  while (payload.includes(fence)) fence = `${fence}\``;
  return `${fence}ts\n${payload}${fence}`;
}
