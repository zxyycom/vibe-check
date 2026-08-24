import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { createCaseFixture } from "./fixtures/catalog.ts";

const entrypoint = fileURLToPath(new URL("./command.ts", import.meta.url));
const workspaceRoot = path.resolve(path.dirname(entrypoint), "..", "..");

test("returns a query failure status at the CLI boundary", () => {
  using fixture = createCaseFixture();
  const result = spawnSync(
    process.execPath,
    [entrypoint, "show", "CASE-THAT-DOES-NOT-EXIST", "--root", fixture.root],
    {
      cwd: workspaceRoot,
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 6);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /"code": "query\.case-not-found"/);
});
