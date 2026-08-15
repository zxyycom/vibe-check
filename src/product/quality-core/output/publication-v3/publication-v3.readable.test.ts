import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { TEST_QUALITY_CONFIG } from "../../test/config.ts";
import {
  PUBLICATION_ANNOTATION_INPUT_V3,
  createPublicationModelV3,
  projectReadablePublicationV3
} from "./index.ts";
import {
  reportProjectionInput,
  richPublicationInput
} from "./publication-test-fixtures.ts";

const presentation = {
  ...TEST_QUALITY_CONFIG.report,
  footerGeneratedBy: "Readable projection test",
  footerNotice: "Review the projected records.",
  nonBlockingNotice: "Projection-only notice.",
  timeZone: "Asia/Tokyo",
  title: "Configured readable report",
  topN: 1,
  watchlistMax: 1
};

describe("machine publication v3 readable contract", () => {
  it("projects shared statuses accepted previews and presentation from one model", async () => {
    const model = createPublicationModelV3(await richPublicationInput());
    const readable = projectReadablePublicationV3({
      model,
      report: { changedFiles: ["src/a.ts"], presentation }
    });

    assert.notEqual(readable.report, readable.console);
    assert.deepEqual(readable.report.statuses, {
      quality: { label: "Quality check status", status: "warning" },
      verification: { label: "Quality verification status", status: "passed" }
    });
    assert.deepEqual(readable.report.warningRecords, []);
    assert.deepEqual(readable.report.acceptedRecords, [{
      acceptance: [{ acceptanceId: "accepted-large-file", reason: "Reviewed" }],
      level: "warning",
      location: { path: "src/a.ts", line: 7, column: 1 },
      message: "Publication finding",
      recordId: model.records[0]!.recordId
    }]);
    assert.deepEqual(readable.report.presentation, presentation);
    assert.deepEqual(readable.report.watchlistRecords, readable.report.acceptedRecords);
    assert.deepEqual(readable.console.acceptedRecords, readable.report.acceptedRecords);

    const hiddenWatchlist = projectReadablePublicationV3({
      model,
      report: {
        changedFiles: ["src/a.ts"],
        presentation: { ...presentation, showWatchlist: false }
      }
    });
    assert.deepEqual(hiddenWatchlist.report.watchlistRecords, []);
  });
});

describe("machine publication v3 readable contract", () => {
  it("applies report preview and changed-record limits without truncating console records", async () => {
    const model = createPublicationModelV3(await reportProjectionInput());
    const exactWatchlist = projectReadablePublicationV3({
      model,
      report: {
        changedFiles: ["src/a.ts"],
        presentation: { ...presentation, topN: 5, watchlistMax: 5 }
      }
    });
    assert.deepEqual(
      exactWatchlist.report.watchlistRecords.map((record) => record.location?.path),
      ["src/a.ts"]
    );

    const topOne = projectReadablePublicationV3({
      model,
      report: {
        changedFiles: ["src/b.ts", "src/c.ts"],
        presentation: { ...presentation, topN: 1, watchlistMax: 1 }
      }
    });
    const topThree = projectReadablePublicationV3({
      model,
      report: {
        changedFiles: ["src/b.ts", "src/c.ts"],
        presentation: { ...presentation, topN: 3, watchlistMax: 3 }
      }
    });
    assert.equal(topOne.console.warningRecords.length, 5);
    assert.equal(topThree.console.warningRecords.length, 5);
    assert.equal(topOne.report.warningRecords.length, 1);
    assert.equal(topThree.report.warningRecords.length, 3);
    assert.equal(topOne.report.watchlistRecords.length, 1);
    assert.equal(topThree.report.watchlistRecords.length, 2);
  });
});

describe("machine publication v3 readable contract", () => {
  it("pins annotation consumption to one validated two-file artifact directory", () => {
    assert.deepEqual(PUBLICATION_ANNOTATION_INPUT_V3, {
      argument: "artifact-directory",
      kind: "validated-machine-set",
      requiredFileNames: ["run.json", "records.ndjson"]
    });
  });
});
