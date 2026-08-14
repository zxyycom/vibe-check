#!/usr/bin/env bun

import { run } from "./project-run.ts";

if (import.meta.main) {
  const result = await run();
  process.exitCode = result.kind === "completed" ? 0 : result.kind === "configuration" ? 3 : 2;
}
