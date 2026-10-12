import { strict as assert } from "node:assert";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import {
  createdResolver,
  projectTarget,
  readSource,
  requestFor,
  validTarget,
  withFixture,
  writeFixtureFile
} from "./local-resolver.test-support.ts";

describe("Markdown local resolver", () => {
  it("resolves direct local files, directories, and same or cross-document anchors", async () => {
    await withFixture(async ({ root }) => {
      const repeatedHeadings = "# Repeat\n# Repeat\n# Café\n";
      await writeFixtureFile(root, "docs/source.md", `# Source\n${repeatedHeadings}`);
      await writeFixtureFile(root, "docs/target.md", `# Target\n${repeatedHeadings}`);
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
      const targetReadsBeforeSameDocument = resolver.targetReadCount;
      const anchors = [
        ["repeat", "repeat"],
        ["repeat-1", "repeat-1"],
        ["%72epeat-1", "repeat-1"],
        ["caf%C3%A9", "café"]
      ] as const;
      for (const [rawFragment, slug] of anchors) {
        assert.deepEqual(
          await resolver.resolve(requestFor(source, `#${rawFragment}`)),
          validTarget("same-document", "docs/source.md", slug)
        );
      }
      assert.equal(resolver.targetReadCount, targetReadsBeforeSameDocument);
      for (const [rawFragment, slug] of anchors) {
        assert.deepEqual(
          await resolver.resolve(requestFor(source, `target.md#${rawFragment}`)),
          validTarget("project-file", "docs/target.md", slug)
        );
      }
      for (const [destination, kind, targetPath, flag] of [
        ["#repeat-2", "same-document", "docs/source.md", "validateSameDocumentAnchors"],
        ["target.md#repeat-2", "project-file", "docs/target.md", "validateCrossDocumentAnchors"]
      ] as const) {
        assert.deepEqual(
          await resolver.resolve(requestFor(source, destination, { [flag]: false })),
          validTarget(kind, targetPath, "repeat-2")
        );
        assert.deepEqual(await resolver.resolve(requestFor(source, destination)), {
          kind: "finding",
          reason: "missing-anchor",
          target: projectTarget(kind, targetPath, "repeat-2")
        });
      }
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
});
