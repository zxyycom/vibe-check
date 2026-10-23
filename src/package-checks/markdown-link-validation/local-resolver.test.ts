import { strict as assert } from "node:assert";
import { rm, symlink } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import {
  createdResolver,
  outsideProjectRootTarget,
  projectTarget,
  readSource,
  requestFor,
  validOutsideTarget,
  validTarget,
  withFixture,
  writeFixtureFile
} from "./local-resolver.test-support.ts";

describe("Markdown local resolver", () => {
  it("reads only root-contained sources and returns their Link parser facts", async () => {
    await withFixture(async ({ root, outside }) => {
      await writeFixtureFile(root, "docs/source.md", "# Source\n[link](target.md)");
      await writeFixtureFile(outside, "escape.md", "# Escaped\n");
      await symlink(path.join(outside, "escape.md"), path.join(root, "docs", "escape.md"));
      await symlink("source.md", path.join(root, "docs", "alias.md"));
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
      const alias = await resolver.readSource("docs/alias.md", 1_024);
      assert.equal(alias.ok, true);
      if (alias.ok && source.ok) {
        assert.equal(alias.source.path, "docs/alias.md");
        assert.deepEqual(alias.source.facts, source.source.facts);
      }
      for (const rejected of ["docs/missing.md", "docs", "docs/missing/leaf.md"]) {
        assert.deepEqual(await resolver.readSource(rejected, 1_024), {
          ok: false,
          reason: "source-unavailable"
        });
      }
      assert.deepEqual(await resolver.readSource("docs/source.md", 1), {
        ok: false,
        reason: "source-too-large"
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

  it("fixes successful logical-node observations without changing target limits", async () => {
    await withFixture(async ({ root, outside }) => {
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

      const nextResolver = await createdResolver(root, 2);
      const nextSource = await readSource(nextResolver, "docs/source.md");
      assert.deepEqual(await nextResolver.resolve(requestFor(nextSource, "target.md#two")), {
        kind: "finding",
        reason: "missing-anchor",
        target: projectTarget("project-file", "docs/target.md", "two")
      });
      await writeFixtureFile(outside, "outside.md", "# Two\n");
      await rm(path.join(root, "docs/target.md"));
      await symlink(path.join(outside, "outside.md"), path.join(root, "docs/target.md"));
      assert.deepEqual(
        await nextResolver.resolve(requestFor(nextSource, "target.md#one")),
        validTarget("project-file", "docs/target.md", "one")
      );
      assert.equal(nextResolver.targetReadCount, 2);
      const replaced = await createdResolver(root, 1);
      const replacedSource = await readSource(replaced, "docs/source.md");
      assert.deepEqual(await replaced.resolve(requestFor(replacedSource, "target.md#one")), {
        kind: "finding",
        reason: "target-outside-project-root",
        target: { kind: "outside-project-root" }
      });
    });
  });

  it("stops target observation at the first unavailable node", async () => {
    await withFixture(async ({ root }) => {
      await writeFixtureFile(root, "docs/source.md", "# Source\n");
      await writeFixtureFile(root, "docs/target.md", "# This heading is too large\n");
      await writeFixtureFile(root, "docs/later.md", "# Later\n");
      const resolver = await createdResolver(root, 2);
      const source = await readSource(resolver, "docs/source.md");
      assert.deepEqual(
        await resolver.resolveAll([
          requestFor(source, "target.md#found", { maxMarkdownBytes: 10 }),
          requestFor(source, "later.md#later", { maxMarkdownBytes: 10 })
        ]),
        { kind: "unavailable", reason: "target-unavailable" }
      );
      assert.equal(resolver.targetReadCount, 1);
      await writeFixtureFile(root, "docs/target.md", "# Found\n");
      const next = await createdResolver(root, 2);
      const nextSource = await readSource(next, "docs/source.md");
      assert.deepEqual(
        await next.resolve(requestFor(nextSource, "target.md#found", { maxMarkdownBytes: 10 })),
        validTarget("project-file", "docs/target.md", "found")
      );
    });
  });
});
