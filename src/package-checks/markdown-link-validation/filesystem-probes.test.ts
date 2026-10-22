import assert from "node:assert/strict";
import { symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { probeRootContainedPath, readRegularFile } from "./filesystem-probes.ts";
import { assertBoundedReadDrivers } from "./filesystem-probes.test-support.ts";
import { LinkIoSession } from "./io-session.ts";
import { withFixture, writeFixtureFile } from "./local-resolver.test-support.ts";

describe("Markdown bounded filesystem drivers", () => {
  it("uses adaptive bounded capacity through real EOF and closes after failures or cancellation", () => {
    assertBoundedReadDrivers();
  });

  it("shares containment hop limits and stops at the first external symlink destination", async () => {
    await withFixture(async ({ root, outside }) => {
      await writeFixtureFile(root, "target.md", "# Inside\n");
      await symlink(root, path.join(outside, "back"));
      await symlink(outside, path.join(root, "escape"));
      for (let index = 40; index >= 0; index--) {
        await symlink(
          index === 40 ? "target.md" : `hop-${index + 1}`,
          path.join(root, `hop-${index}`)
        );
      }
      const io = new LinkIoSession(root, new AbortController().signal);
      try {
        for (const probe of [
          (target: string) => probeRootContainedPath(root, target),
          (target: string) => io.probeRootContainedPath(target)
        ]) {
          assert.equal((await probe(path.join(root, "hop-1"))).kind, "contained");
          assert.deepEqual(await probe(path.join(root, "hop-0")), { kind: "unavailable" });
          assert.deepEqual(await probe(path.join(root, "escape", "back", "target.md")), {
            kind: "outside"
          });
          assert.deepEqual(await probe(path.join(root, "escape", "missing")), { kind: "outside" });
        }
        assert.deepEqual(await readRegularFile(path.join(root, "hop-40"), 100), {
          ok: false,
          reason: "unavailable"
        });
        assert.deepEqual(await io.readRegularFile(path.join(root, "hop-40"), 100), {
          ok: false,
          reason: "unavailable"
        });
        assert.equal(
          (await io.probeRootContainedPath(path.join(root, "target.md"))).kind,
          "contained"
        );
        await writeFile(path.join(root, "target.md"), "# Replaced\n");
        const read = await io.readRegularFile(path.join(root, "target.md"), 100);
        assert.equal(read.ok && new TextDecoder().decode(read.bytes), "# Replaced\n");
      } finally {
        await io.finalize();
      }
      assert.equal(io.failed, false);
    });
  });
});
