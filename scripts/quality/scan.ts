#!/usr/bin/env bun

import { run } from "./project-run.ts";

if (import.meta.main) {
  const result = await run();
  if (result.kind === "completed") {
    process.exitCode = 0;
  } else if (result.kind === "configuration") {
    process.exitCode = 3;
  } else {
    process.exitCode = 2;
  }
}
