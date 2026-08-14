#!/usr/bin/env bun

import { pathToFileURL } from "node:url";

const MIGRATION_MESSAGE = "Vibe Check JSON configuration and Product CLI scan/init are retired. Create a TypeScript Project Definition and a bound project Run, then call the project Run directly.";

export async function runProductCli(
  _argv: readonly string[] = process.argv.slice(2),
  runtime: Readonly<{ readonly error?: (message: string) => void }> = {}
): Promise<3> {
  (runtime.error ?? console.error)(MIGRATION_MESSAGE);
  return 3;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await runProductCli());
}
