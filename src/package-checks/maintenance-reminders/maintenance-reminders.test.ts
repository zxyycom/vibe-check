import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Check } from "../../check/check.ts";
import {
  createDeclarativeFingerprint,
  normalizeProjectDefinition
} from "../../project-definition/project-definition.ts";
import { run } from "../../project-run/run.ts";
import { parseMaintenanceRemindersData } from "./final-data.ts";
import { maintenanceReminders } from "./maintenance-reminders.ts";
import { FULL_BASE, definition } from "./maintenance-reminders.test-support.ts";

describe("maintenance reminders", () => {
  it("constructs one fixed Check, validates full composed policy, and fingerprints entries", async () => {
    const first = maintenanceReminders([
      {
        id: "docs-review",
        baseCommit: FULL_BASE,
        limits: { commits: 10 },
        message: "Review documentation"
      }
    ]);
    assert.equal(first.parseData, parseMaintenanceRemindersData);
    assert.deepEqual(
      first.parseData({
        entries: [
          {
            assessment: "clear",
            baseCommit: FULL_BASE,
            changedLines: 0,
            commitCount: 0,
            exceeded: [],
            headCommit: FULL_BASE,
            id: "docs-review",
            mode: "advisory"
          }
        ]
      }),
      {
        entries: [
          {
            assessment: "clear",
            baseCommit: FULL_BASE,
            changedLines: 0,
            commitCount: 0,
            exceeded: [],
            headCommit: FULL_BASE,
            id: "docs-review",
            mode: "advisory"
          }
        ]
      }
    );
    assert.throws(
      () =>
        first.parseData({
          entries: [
            {
              assessment: "due",
              baseCommit: FULL_BASE,
              changedLines: 0,
              commitCount: 0,
              exceeded: [],
              headCommit: FULL_BASE,
              id: "docs-review",
              mode: "advisory"
            }
          ]
        }),
      /maintenanceReminders final data/
    );
    const second = maintenanceReminders([
      {
        id: "docs-review",
        baseCommit: FULL_BASE,
        limits: { commits: 11 },
        message: "Review documentation"
      }
    ]);
    const sha256Base = maintenanceReminders([
      {
        id: "sha256-history",
        baseCommit: "b".repeat(64),
        limits: { commits: 1 },
        message: "Accept a full SHA-256 object ID"
      }
    ]);

    assert.deepEqual(
      {
        checkId: first.checkId,
        displayName: first.displayName,
        git: first.options.git,
        hasChecks: Object.hasOwn(first, "checks"),
        visibility: first.visibility
      },
      {
        checkId: "maintenance-reminders",
        displayName: "Maintenance reminders",
        git: { executable: "git" },
        hasChecks: false,
        visibility: "attention"
      }
    );
    assert.notEqual(
      createDeclarativeFingerprint(normalizeProjectDefinition(definition(first)).declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(definition(second)).declarative)
    );
    assert.doesNotThrow(() => normalizeProjectDefinition(definition(sha256Base)));

    const validEntry = first.options.entries[0];
    const invalidOptions = [
      {
        entries: [
          {
            ...validEntry,
            limits: {}
          }
        ],
        git: first.options.git
      },
      {
        entries: [
          validEntry,
          {
            ...validEntry,
            message: "A duplicate ID"
          }
        ],
        git: first.options.git
      },
      {
        entries: [
          {
            ...validEntry,
            baseCommit: "not-a-full-commit"
          }
        ],
        git: first.options.git
      },
      {
        entries: [
          {
            ...validEntry,
            limits: { commits: 0 }
          }
        ],
        git: first.options.git
      },
      {
        entries: [
          {
            ...validEntry,
            message: ""
          }
        ],
        git: first.options.git
      },
      {
        entries: [
          {
            ...validEntry,
            mode: "blocking"
          }
        ],
        git: first.options.git
      },
      {
        entries: [
          {
            ...validEntry,
            unknown: true
          }
        ],
        git: first.options.git
      },
      {
        entries: [validEntry],
        git: { executable: "" }
      }
    ];
    for (const options of invalidOptions) {
      const invalid = { ...first, options } as Check;
      const invalidResult = await run(definition(invalid));
      assert.equal(invalidResult.kind, "completed");
      if (invalidResult.kind === "completed") {
        assert.deepEqual(invalidResult.snapshot.checks[0]?.outcome, {
          status: "unavailable",
          reason: { code: "invalid-options" }
        });
        assert.deepEqual(invalidResult.checkDurations, [
          { checkId: "maintenance-reminders", durationMs: null }
        ]);
      }
    }
  });
});
