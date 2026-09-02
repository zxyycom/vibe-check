import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { executeCheck, type ReportedCheckRecord } from "../check-execution.test-support.ts";

export const FILES = Object.freeze({
  exclude: Object.freeze([]),
  include: Object.freeze(["**/*.ts"]),
  source: "filesystem" as const
});

export const execute = executeCheck;
export type ReportedRecord = ReportedCheckRecord;

export function createRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(root, "scripts"), { recursive: true });
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "scripts", "b.ts"), "export const b = 2;\n", "utf8");
  writeFileSync(join(root, "src", "a.ts"), "export const a = 1;\n", "utf8");
  return root;
}

export function scanner(root: string, source: string): string {
  const path = join(root, "scanner.mjs");
  writeFileSync(path, `#!/usr/bin/env bun\n${source}`, "utf8");
  chmodSync(path, 0o755);
  return path;
}
