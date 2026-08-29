import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { createDiagnosticLogger } from "./logger.ts";

describe("Project Run diagnostic logger", () => {
  it("renders only bounded descriptor-safe details without invoking author hooks", () => {
    const root = mkdtempSync(join(tmpdir(), "vibe-check-diagnostic-logger-"));
    try {
      let accessorReads = 0;
      let proxyTraps = 0;
      let toJsonCalls = 0;
      const accessor: Record<string, unknown> = {};
      Object.defineProperty(accessor, "value", {
        enumerable: true,
        get: (): string => {
          accessorReads += 1;
          return "must-not-read";
        }
      });
      const toJson: Record<string, unknown> = {};
      Object.defineProperty(toJson, "toJSON", {
        enumerable: true,
        value: (): object => {
          toJsonCalls += 1;
          return { leaked: true };
        }
      });
      const proxy = new Proxy(
        {},
        {
          get: (): never => {
            proxyTraps += 1;
            throw new Error("must-not-read");
          },
          getPrototypeOf: (): never => {
            proxyTraps += 1;
            throw new Error("must-not-read");
          },
          ownKeys: (): never => {
            proxyTraps += 1;
            throw new Error("must-not-read");
          }
        }
      );
      const cyclic: Record<string, unknown> = {};
      cyclic.self = cyclic;
      let deep: Record<string, unknown> = {};
      const deeplyNested = deep;
      for (let index = 0; index < 16; index += 1) {
        const next: Record<string, unknown> = {};
        deep.next = next;
        deep = next;
      }
      const ordinaryWidth = Array.from({ length: 700 }, (_, index) => `entry-${index}`);
      const extremeWidth = Array.from({ length: 4_097 }, (_, index) => `entry-${index}`);

      const logger = createDiagnosticLogger({
        clock: { now: () => 0 },
        enabled: true,
        file: join(root, "run.log")
      });
      logger.observe({
        scope: "run",
        event: "safe",
        summary: "safe details",
        details: { z: "ready", a: [true, 2] }
      });
      logger.observe({
        scope: "run",
        event: "accessor",
        summary: "accessor",
        details: { accessor }
      });
      logger.observe({ scope: "run", event: "to-json", summary: "to JSON", details: { toJson } });
      logger.observe({ scope: "run", event: "proxy", summary: "proxy", details: { proxy } });
      logger.observe({ scope: "run", event: "cycle", summary: "cycle", details: { cyclic } });
      logger.observe({ scope: "run", event: "depth", summary: "depth", details: deeplyNested });
      logger.observe({
        scope: "scope\\path\nforged",
        event: "event\u0085\rfabricated",
        summary: "summary\u2028separated\u2029text\u009f"
      });
      logger.observe({
        scope: "run",
        event: "ordinary-width",
        summary: "ordinary width",
        details: ordinaryWidth
      });
      logger.observe({
        scope: "run",
        event: "extreme-width",
        summary: "extreme width",
        details: extremeWidth
      });
      logger.observe({
        scope: "run",
        event: "size",
        summary: "size",
        details: { value: "x".repeat(1_048_577) }
      });

      assert.equal(logger.close(), "succeeded");
      assert.equal(accessorReads, 0);
      assert.equal(proxyTraps, 0);
      assert.equal(toJsonCalls, 0);
      const log = readFileSync(join(root, "run.log"), "utf8");
      assert.match(log, /details={"a":\[true,2\],"z":"ready"}/);
      assert.match(log, /details=details-unavailable:accessor-or-hidden-property/);
      assert.match(log, /details=details-unavailable:unsupported-function/);
      assert.match(log, /details=details-unavailable:proxy/);
      assert.match(log, /details=details-unavailable:cycle/);
      assert.match(log, /details=details-unavailable:depth-limit/);
      assert.match(
        log,
        /scope\\\\path\\u000aforged event\\u0085\\u000dfabricated summary\\u2028separated\\u2029text\\u009f/
      );
      assert.equal(log.endsWith("\n"), true);
      const records = log.slice(0, -1).split("\n");
      assert.equal(records.length, 10);
      assert.ok(records.every((record) => record.startsWith("#")));
      const ordinaryWidthLine = log.split("\n").find((line) => line.includes(" ordinary-width "));
      assert.ok(ordinaryWidthLine);
      assert.doesNotMatch(ordinaryWidthLine, /details-unavailable/);
      assert.match(ordinaryWidthLine, /\["entry-0","entry-1"/);
      assert.match(ordinaryWidthLine, /"entry-699"\]/);
      assert.match(log, /details=details-unavailable:width-limit/);
      assert.match(log, /details=details-unavailable:size-limit/);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});
