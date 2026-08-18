import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { acceptScopedMeasurements } from "./scoped-measurement.ts";

describe("scoped measurement acceptance", () => {
  it("validates declared source paths without inspecting payload shape", () => {
    const payload = { path: "../opaque-adapter-path.ts" };
    const accepted = acceptScopedMeasurements(
      [
        {
          payload,
          sourcePaths: ["src/a.ts", "src/b.ts"]
        }
      ],
      ["src/a.ts", "src/b.ts", "src/c.ts"]
    );

    assert.equal(accepted.ok, true);
    if (accepted.ok) {
      assert.equal(accepted.payloads[0], payload);
    }

    const unapproved = acceptScopedMeasurements(
      [
        {
          payload,
          sourcePaths: ["../outside.ts"]
        }
      ],
      ["src/a.ts"]
    );
    assert.equal(unapproved.ok, false);
    if (!unapproved.ok) {
      assert.match(unapproved.error, /unapproved input path "\.\.\/outside\.ts"/);
    }

    const pathless = acceptScopedMeasurements(
      [
        {
          payload,
          sourcePaths: []
        }
      ],
      ["src/a.ts"]
    );
    assert.equal(pathless.ok, false);
    if (!pathless.ok) {
      assert.match(pathless.error, /did not declare a source path/);
    }
  });
});
