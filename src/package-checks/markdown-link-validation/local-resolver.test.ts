import { strict as assert } from "node:assert";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { createMarkdownLocalResolver } from "./local-resolver.ts";
import type { MarkdownLinkSource, MarkdownLocalResolutionRequest } from "./local-resolver.ts";

describe("Markdown local resolver", () => {
  it("reads only root-contained sources and returns their Link parser facts", async () => {
    await withFixture(async ({ root, outside }) => {
      await writeFixtureFile(root, "docs/source.md", "# Source\n[link](target.md)");
      await writeFixtureFile(outside, "escape.md", "# Escaped\n");
      await symlink(path.join(outside, "escape.md"), path.join(root, "docs", "escape.md"));
      const resolver = await createdResolver(root, 10);

      const source = await resolver.readSource("docs/source.md", 1_024);
      assert.equal(source.ok, true);
      if (source.ok) {
        assert.equal(source.source.path, "docs/source.md");
        assert.equal(source.source.facts.headings[0]?.slug, "source");
        assert.deepEqual(
          source.source.facts.occurrences.map((occurrence) => occurrence.rawDestination),
          ["target.md"]
        );
      }
      assert.deepEqual(await resolver.readSource("../outside.md", 1_024), {
        ok: false,
        reason: "source-unavailable"
      });
      assert.deepEqual(await resolver.readSource("docs/escape.md", 1_024), {
        ok: false,
        reason: "source-unavailable"
      });
      assert.deepEqual(await resolver.readSource("docs/source.md", 1), {
        ok: false,
        reason: "source-too-large"
      });
    });
  });

  it("resolves direct local files, directories, and same or cross-document anchors", async () => {
    await withFixture(async ({ root }) => {
      await writeFixtureFile(root, "docs/source.md", "# Source\n");
      await writeFixtureFile(root, "docs/target.md", "# Target\n");
      await writeFixtureFile(root, "docs/image.png", "not Markdown");
      await mkdir(path.join(root, "docs", "empty"));
      await writeFixtureFile(root, "docs/nonempty/child.txt", "present");
      const resolver = await createdResolver(root, 20);
      const source = await readSource(resolver, "docs/source.md");

      assert.deepEqual(
        await resolver.resolve(requestFor(source, "#source")),
        validTarget("same-document", "docs/source.md", "source")
      );
      assert.deepEqual(await resolver.resolve(requestFor(source, "target.md#target")), {
        ...validTarget("project-file", "docs/target.md", "target")
      });
      assert.deepEqual(await resolver.resolve(requestFor(source, "target.md#missing")), {
        kind: "finding",
        reason: "missing-anchor",
        target: projectTarget("project-file", "docs/target.md", "missing")
      });
      assert.deepEqual(await resolver.resolve(requestFor(source, "missing.md")), {
        kind: "finding",
        reason: "missing-target",
        target: projectTarget("project-path", "docs/missing.md", null)
      });
      assert.deepEqual(await resolver.resolve(requestFor(source, "image.png#anchor")), {
        kind: "finding",
        reason: "anchor-target-not-markdown",
        target: projectTarget("project-file", "docs/image.png", "anchor")
      });
      assert.deepEqual(
        await resolver.resolve(
          requestFor(source, "image.png#anchor", { validateCrossDocumentAnchors: false })
        ),
        validTarget("project-file", "docs/image.png", "anchor")
      );
      assert.deepEqual(
        await resolver.resolve(requestFor(source, "empty", { requireNonEmptyDirectories: true })),
        {
          kind: "finding",
          reason: "empty-directory",
          target: projectTarget("project-directory", "docs/empty", null)
        }
      );
      assert.deepEqual(
        await resolver.resolve(
          requestFor(source, "nonempty", { requireNonEmptyDirectories: true })
        ),
        {
          ...validTarget("project-directory", "docs/nonempty", null)
        }
      );
      assert.deepEqual(await resolver.resolve(requestFor(source, "nonempty#anchor")), {
        kind: "finding",
        reason: "anchor-on-directory",
        target: projectTarget("project-directory", "docs/nonempty", "anchor")
      });
    });
  });

  it("gates lexical and symlink escapes before external work and accepts only strict file URIs", async () => {
    await withFixture(async ({ root, outside }) => {
      await writeFixtureFile(root, "docs/source.md", "# Source\n");
      await writeFixtureFile(outside, "outside.md", "# Outside\n");
      await symlink(outside, path.join(root, "docs", "escape"));
      const resolver = await createdResolver(root, 20);
      const source = await readSource(resolver, "docs/source.md");
      const outsideFileUri = `file://${path.join(outside, "outside.md")}`;

      assert.deepEqual(await resolver.resolve(requestFor(source, "../../outside/outside.md")), {
        kind: "finding",
        reason: "target-outside-project-root",
        target: outsideProjectRootTarget()
      });
      assert.deepEqual(
        await resolver.resolve(
          requestFor(source, "../../outside/outside.md", { rootExternalTargetMode: "ignore" })
        ),
        { kind: "ignored" }
      );
      assert.deepEqual(await resolver.resolve(requestFor(source, "escape/outside.md")), {
        kind: "finding",
        reason: "target-outside-project-root",
        target: outsideProjectRootTarget()
      });
      assert.equal(resolver.targetReadCount, 0);
      assert.deepEqual(await resolver.resolve(requestFor(source, outsideFileUri)), {
        kind: "finding",
        reason: "target-outside-project-root",
        target: outsideProjectRootTarget()
      });
      assert.deepEqual(await resolver.resolve(requestFor(source, "file://localhost/etc/passwd")), {
        kind: "not-local"
      });
      assert.deepEqual(await resolver.resolve(requestFor(source, "file:////etc/passwd")), {
        kind: "not-local"
      });
      assert.deepEqual(await resolver.resolve(requestFor(source, `${outsideFileUri}?query`)), {
        kind: "not-local"
      });
      assert.deepEqual(await resolver.resolve(requestFor(source, "target%2Fchild.md")), {
        kind: "unavailable",
        reason: "invalid-local-destination"
      });
      for (const invalidFragment of [
        "target.md#%00",
        "target.md#%2F",
        "target.md#\u0000",
        `${outsideFileUri}#%00`
      ]) {
        assert.deepEqual(await resolver.resolve(requestFor(source, invalidFragment)), {
          kind: "unavailable",
          reason: "invalid-local-destination"
        });
      }
      assert.equal(resolver.targetReadCount, 0);

      const hostNativeAbsolute =
        process.platform === "win32" ? "C:\\outside\\target.md" : "C:/outside/target.md";
      const hostNativeFileUri = "file:///C:/outside/target.md";
      const expectedWindowsTarget = {
        kind: "finding" as const,
        reason: "target-outside-project-root" as const,
        target: outsideProjectRootTarget()
      };
      if (process.platform === "win32") {
        assert.deepEqual(
          await resolver.resolve(requestFor(source, hostNativeAbsolute)),
          expectedWindowsTarget
        );
        assert.deepEqual(
          await resolver.resolve(requestFor(source, hostNativeFileUri)),
          expectedWindowsTarget
        );
      } else {
        assert.deepEqual(await resolver.resolve(requestFor(source, hostNativeAbsolute)), {
          kind: "not-local"
        });
        assert.deepEqual(await resolver.resolve(requestFor(source, hostNativeFileUri)), {
          kind: "not-local"
        });
      }
    });
  });

  it("allows explicit validate mode and enforces the per-invocation direct target limit", async () => {
    await withFixture(async ({ root, outside }) => {
      await writeFixtureFile(root, "docs/source.md", "# Source\n");
      await writeFixtureFile(root, "docs/target.md", "# Target\n");
      await writeFixtureFile(outside, "outside.md", "# Outside\n");
      const resolver = await createdResolver(root, 1);
      const source = await readSource(resolver, "docs/source.md");

      assert.deepEqual(
        await resolver.resolve(requestFor(source, "#source")),
        validTarget("same-document", "docs/source.md", "source")
      );
      assert.equal(resolver.targetReadCount, 0);
      assert.deepEqual(
        await resolver.resolve(
          requestFor(source, "../../outside/outside.md", { rootExternalTargetMode: "validate" })
        ),
        validOutsideTarget()
      );
      assert.equal(resolver.targetReadCount, 1);
      assert.deepEqual(await resolver.resolve(requestFor(source, "target.md")), {
        kind: "unavailable",
        reason: "target-read-limit-exceeded"
      });

      await symlink(outside, path.join(root, "docs", "escape"));
      const escapingResolver = await createdResolver(root, 1);
      const escapingSource = await readSource(escapingResolver, "docs/source.md");
      assert.deepEqual(
        await escapingResolver.resolve(
          requestFor(escapingSource, "escape/outside.md", { rootExternalTargetMode: "validate" })
        ),
        validOutsideTarget()
      );
      assert.equal(escapingResolver.targetReadCount, 1);
    });
  });

  it("memoizes successful canonical Markdown targets without changing logical target limits", async () => {
    await withFixture(async ({ root }) => {
      await writeFixtureFile(root, "docs/source.md", "# Source\n");
      await writeFixtureFile(root, "docs/target.md", "# One\n# Two\n");
      const resolver = await createdResolver(root, 2);
      const source = await readSource(resolver, "docs/source.md");

      assert.deepEqual(
        await resolver.resolve(requestFor(source, "target.md#one")),
        validTarget("project-file", "docs/target.md", "one")
      );
      await writeFixtureFile(root, "docs/target.md", "# One\n");
      assert.deepEqual(
        await resolver.resolve(requestFor(source, "./target.md#two")),
        validTarget("project-file", "docs/target.md", "two")
      );
      assert.equal(resolver.targetReadCount, 2);
      assert.deepEqual(await resolver.resolve(requestFor(source, "target.md#one")), {
        kind: "unavailable",
        reason: "target-read-limit-exceeded"
      });
      assert.equal(resolver.targetReadCount, 2);
    });
  });

  it("does not retain an unavailable Markdown target parse for a later occurrence", async () => {
    await withFixture(async ({ root }) => {
      await writeFixtureFile(root, "docs/source.md", "# Source\n");
      await writeFixtureFile(root, "docs/target.md", "# This heading is too large\n");
      const resolver = await createdResolver(root, 2);
      const source = await readSource(resolver, "docs/source.md");

      assert.deepEqual(
        await resolver.resolve(requestFor(source, "target.md#found", { maxMarkdownBytes: 10 })),
        { kind: "unavailable", reason: "target-unavailable" }
      );
      await writeFixtureFile(root, "docs/target.md", "# Found\n");
      assert.deepEqual(
        await resolver.resolve(requestFor(source, "target.md#found", { maxMarkdownBytes: 10 })),
        validTarget("project-file", "docs/target.md", "found")
      );
      assert.equal(resolver.targetReadCount, 2);
    });
  });
});

async function createdResolver(
  root: string,
  maxTargetReads: number,
  cache: Parameters<typeof createMarkdownLocalResolver>[2] = Object.freeze({ enabled: false }),
  signal: AbortSignal = new AbortController().signal
) {
  const creation = await createMarkdownLocalResolver(root, maxTargetReads, cache, signal);
  assert.equal(creation.ok, true);
  if (!creation.ok) {
    assert.fail("expected resolver");
  }
  return creation.resolver;
}

async function readSource(
  resolver: Awaited<ReturnType<typeof createdResolver>>,
  rootRelativePath: string
): Promise<MarkdownLinkSource> {
  const source = await resolver.readSource(rootRelativePath, 1_024);
  assert.equal(source.ok, true);
  if (!source.ok) {
    assert.fail("expected source");
  }
  return source.source;
}

function requestFor(
  source: MarkdownLinkSource,
  rawDestination: string,
  overrides: Partial<MarkdownLocalResolutionRequest> = {}
): MarkdownLocalResolutionRequest {
  return {
    source,
    rawDestination,
    rootExternalTargetMode: "report",
    requireExistingTargets: true,
    requireNonEmptyDirectories: false,
    validateSameDocumentAnchors: true,
    validateCrossDocumentAnchors: true,
    maxMarkdownBytes: 1_024,
    ...overrides
  };
}

function validTarget(
  kind: "same-document" | "project-file" | "project-directory" | "project-path",
  relativePath: string,
  fragment: string | null
) {
  return { kind: "valid" as const, target: projectTarget(kind, relativePath, fragment) };
}

function validOutsideTarget() {
  return { kind: "valid" as const, target: outsideProjectRootTarget() };
}

function projectTarget(
  kind: "same-document" | "project-file" | "project-directory" | "project-path",
  relativePath: string,
  fragment: string | null
) {
  return { kind, path: relativePath, fragment };
}

function outsideProjectRootTarget() {
  return { kind: "outside-project-root" as const };
}

interface Fixture {
  readonly root: string;
  readonly outside: string;
}

async function withFixture(action: (fixture: Fixture) => Promise<void>): Promise<void> {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "vibe-check-link-resolver-"));
  const fixture = {
    root: path.join(workspace, "root"),
    outside: path.join(workspace, "outside")
  };
  await mkdir(fixture.root);
  await mkdir(fixture.outside);
  try {
    await action(fixture);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

async function writeFixtureFile(
  root: string,
  relativePath: string,
  content: string
): Promise<void> {
  const filePath = path.join(root, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}
