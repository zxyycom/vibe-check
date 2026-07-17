#!/usr/bin/env bun

import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { runProductCli } from "../../src/product/cli.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(await runProductCli(["scan", root, ...process.argv.slice(2)]));
}
