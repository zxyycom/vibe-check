#!/usr/bin/env bun

import { run } from "./project-run.ts";

export async function runScan(): Promise<number> {
  const result = await run();
  if (result.kind === "completed") return 0;
  return result.kind === "configuration" ? 3 : 2;
}

if (import.meta.main) {
  process.exitCode = await runScan();
}
