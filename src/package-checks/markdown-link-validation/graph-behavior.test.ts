import assert from "node:assert/strict";
import { mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { executeMarkdownLinkValidation } from "./execution.ts";
import { execute, MARKDOWN_LINK_OPTIONS } from "./constructor.test-support.ts";
import {
  createdResolver,
  readSource,
  requestFor,
  validTarget,
  withFixture,
  writeFixtureFile
} from "./local-resolver.test-support.ts";

const SOURCE_ONLY = { patterns: ["source.md"] };

describe("Markdown reference graph", () => {
  it("reuses selected source facts through cycles and keeps every duplicate finding in source order", async () => {
    await withFixture(async ({ root }) => {
      await writeFixtureFile(
        root,
        "a.md",
        "# A\n[b](b.md#b)\n[missing](b.md#absent)\n[again](b.md#absent)\n"
      );
      await writeFixtureFile(root, "b.md", "# B\n[a](a.md#a)\n");
      const checked = await execute(executeMarkdownLinkValidation, MARKDOWN_LINK_OPTIONS, root, {
        patterns: ["*.md"]
      });
      assert.equal(checked.result.status, "failed");
      assert.ok("data" in checked.result);
      assert.deepEqual(checked.result.data, {
        sourceFileCount: 2,
        occurrenceCount: 4,
        targetReadCount: 4,
        findingCount: 2,
        rejectedInputCount: 0
      });
      assert.deepEqual(
        checked.records.map(({ data }): unknown => Reflect.get(data, "range")),
        [
          { start: { line: 3, column: 1 }, end: { line: 3, column: 23 } },
          { start: { line: 4, column: 1 }, end: { line: 4, column: 21 } }
        ]
      );
      assert.deepEqual(
        checked.records.map(({ identity }) => identity.id),
        [
          "source:a.md:occurrence:2:reason:missing-anchor",
          "source:a.md:occurrence:3:reason:missing-anchor"
        ]
      );
      const resolver = await createdResolver(root, 2);
      const a = await readSource(resolver, "a.md");
      await readSource(resolver, "b.md");
      await rm(path.join(root, "b.md"));
      assert.deepEqual(
        await resolver.resolve(requestFor(a, "b.md#b")),
        validTarget("project-file", "b.md", "b")
      );
      assert.equal(resolver.targetReadCount, 1);
    });
  });

  it("fixes missing and directory observations while observing logical aliases independently", async () => {
    await withFixture(async ({ root }) => {
      await writeFixtureFile(root, "source.md", "# Source\n");
      await writeFixtureFile(root, "target.md", "# Before\n");
      await symlink("target.md", path.join(root, "alias.md"));
      await mkdir(path.join(root, "empty"));
      const resolver = await createdResolver(root, 10);
      const source = await readSource(resolver, "source.md");
      const missing = await resolver.resolve(requestFor(source, "missing.md"));
      await writeFixtureFile(root, "missing.md", "# Now present\n");
      assert.deepEqual(await resolver.resolve(requestFor(source, "missing.md")), missing);
      assert.deepEqual(
        await resolver.resolve(requestFor(source, "target.md#before")),
        validTarget("project-file", "target.md", "before")
      );
      await writeFixtureFile(root, "target.md", "# After\n");
      assert.deepEqual(
        await resolver.resolve(requestFor(source, "alias.md#after")),
        validTarget("project-file", "alias.md", "after")
      );
      assert.deepEqual(
        await resolver.resolve(requestFor(source, "target.md#before")),
        validTarget("project-file", "target.md", "before")
      );
      const emptyRequest = requestFor(source, "empty", { requireNonEmptyDirectories: true });
      const empty = await resolver.resolve(emptyRequest);
      await writeFixtureFile(root, "empty/entry", "present");
      assert.deepEqual(await resolver.resolve(emptyRequest), empty);
      const next = await createdResolver(root, 2);
      const nextSource = await readSource(next, "source.md");
      assert.deepEqual(
        await next.resolve(requestFor(nextSource, "missing.md")),
        validTarget("project-file", "missing.md", null)
      );
      assert.deepEqual(
        await next.resolve(requestFor(nextSource, "empty", { requireNonEmptyDirectories: true })),
        validTarget("project-directory", "empty", null)
      );
    });
  });

  it("keeps authorization domains distinct and projects mixed symlink policies independently", async () => {
    await withFixture(async ({ root, outside }) => {
      await writeFixtureFile(root, "source.md", "# Source\n");
      await writeFixtureFile(outside, "target.md", "# Outside\n");
      await symlink(outside, path.join(root, "escape"));
      const resolver = await createdResolver(root, 5);
      const source = await readSource(resolver, "source.md");
      const resolutions = await resolver.resolveAll(
        (["report", "validate", "ignore"] as const).map((mode) =>
          requestFor(source, "escape/target.md#outside", {
            rootExternalTargetMode: mode
          })
        )
      );
      assert.deepEqual(resolutions, [
        {
          kind: "finding",
          reason: "target-outside-project-root",
          target: { kind: "outside-project-root" }
        },
        { kind: "valid", target: { kind: "outside-project-root" } },
        { kind: "ignored" }
      ]);
      assert.equal(resolver.targetReadCount, 1);
      // An explicit absolute root-in path has external authorization identity, not the source role's identity.
      await writeFixtureFile(root, "source.md", "# Replacement\n");
      assert.deepEqual(
        await resolver.resolve(
          requestFor(source, `${path.join(root, "source.md")}#replacement`, {
            rootExternalTargetMode: "validate"
          })
        ),
        { kind: "valid", target: { kind: "outside-project-root" } }
      );
      assert.equal(resolver.targetReadCount, 2);
    });
  });

  it("prechecks the entire logical-node batch before extra target reads and honors staged failure order", async () => {
    await withFixture(async ({ root }) => {
      await writeFixtureFile(root, "source.md", "[a](target.md#x)\n[b](target.md#y)\n");
      await writeFile(path.join(root, "target.md"), new Uint8Array([255]));
      const limited = await execute(
        executeMarkdownLinkValidation,
        {
          ...MARKDOWN_LINK_OPTIONS,
          limits: { ...MARKDOWN_LINK_OPTIONS.limits, maxTargetReads: 1 }
        },
        root,
        SOURCE_ONLY
      );
      assert.equal(limited.result.status, "unavailable");
      assert.ok("reason" in limited.result);
      assert.deepEqual(limited.result.reason, { code: "target-read-limit-exceeded" });
      assert.deepEqual(limited.records, []);
      await writeFixtureFile(root, "source.md", "[a](target.md#x)\n");
      await writeFixtureFile(root, "z.md", "# Much larger than the source file budget\n");
      const sourceFirst = await execute(
        executeMarkdownLinkValidation,
        {
          ...MARKDOWN_LINK_OPTIONS,
          limits: { ...MARKDOWN_LINK_OPTIONS.limits, maxMarkdownBytes: 24 }
        },
        root,
        { patterns: ["*.md", "!target.md"] }
      );
      assert.ok("reason" in sourceFirst.result);
      assert.deepEqual(sourceFirst.result.reason, { code: "source-too-large" });
      await writeFixtureFile(root, "source.md", "[a](target.md#x)\n");
      const targetFirst = await execute(
        executeMarkdownLinkValidation,
        MARKDOWN_LINK_OPTIONS,
        root,
        SOURCE_ONLY
      );
      assert.ok("reason" in targetFirst.result);
      assert.deepEqual(targetFirst.result.reason, { code: "target-unavailable" });
      assert.deepEqual(targetFirst.records, []);
    });
  });

  // oxfmt-ignore
  it("completes more than the old target maximum with disabled or explicit larger totals", { timeout: 20_000 }, async () => {
      await withFixture(async ({ root }) => {
        await writeFixtureFile(root, "source.md", "[x](attachment)\n".repeat(10_001));
        await writeFixtureFile(root, "attachment", "present");
        for (const limits of [
          { maxOccurrences: false as const, maxTargetReads: false as const },
          { maxOccurrences: 100_001, maxTargetReads: 10_001 }
        ]) {
          const checked = await execute(
            executeMarkdownLinkValidation,
            { ...MARKDOWN_LINK_OPTIONS, limits: { ...MARKDOWN_LINK_OPTIONS.limits, ...limits } },
            root,
            SOURCE_ONLY
          );
          assert.equal(checked.result.status, "passed");
          assert.ok("data" in checked.result);
          assert.deepEqual(checked.result.data, {
            sourceFileCount: 1,
            occurrenceCount: 10_001,
            targetReadCount: 10_001,
            findingCount: 0,
            rejectedInputCount: 0
          });
          assert.deepEqual(checked.records, []);
        }
        const limited = await execute(
          executeMarkdownLinkValidation,
          {
            ...MARKDOWN_LINK_OPTIONS,
            limits: {
              ...MARKDOWN_LINK_OPTIONS.limits,
              maxOccurrences: false,
              maxTargetReads: 10_000
            }
          },
          root,
          SOURCE_ONLY
        );
        assert.ok("reason" in limited.result);
        assert.deepEqual(limited.result.reason, { code: "target-read-limit-exceeded" });
        assert.deepEqual(limited.records, []);
      });
  });

  it("yields edge batches to timer and I/O cancellation without publishing normal Records", async () => {
    await withFixture(async ({ root }) => {
      await writeFixtureFile(root, "source.md", "# Source\n");
      for (const cancellation of ["timer", "io"] as const) {
        const controller = new AbortController();
        const resolver = await createdResolver(root, 10, { enabled: false }, controller.signal);
        const source = await readSource(resolver, "source.md");
        const pending =
          cancellation === "timer"
            ? new Promise<void>((resolve) => {
                setTimeout(() => {
                  controller.abort();
                  resolve();
                }, 0);
              })
            : readFile(path.join(root, "source.md")).then(() => {
                controller.abort();
              });
        const resolutions = await resolver.resolveAll(
          Array.from({ length: 8_000 }, () => requestFor(source, "#source"))
        );
        await pending;
        assert.equal(controller.signal.aborted, true);
        assert.deepEqual(resolutions, { kind: "unavailable", reason: "target-unavailable" });
      }
      await writeFixtureFile(root, "source.md", "[x](missing)\n".repeat(8_000));
      const controller = new AbortController();
      const pending = new Promise<void>((resolve) => {
        setTimeout(() => {
          controller.abort();
          resolve();
        }, 0);
      });
      const cancelled = await execute(
        executeMarkdownLinkValidation,
        {
          ...MARKDOWN_LINK_OPTIONS,
          limits: { ...MARKDOWN_LINK_OPTIONS.limits, maxTargetReads: false }
        },
        root,
        SOURCE_ONLY,
        controller.signal
      );
      await pending;
      assert.ok("reason" in cancelled.result);
      assert.deepEqual(cancelled.result.reason, { code: "cancelled" });
      assert.equal("data" in cancelled.result, false);
      assert.deepEqual(cancelled.records, []);
    });
  });
});
