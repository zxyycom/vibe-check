import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { collectProjectFiles as before } from "./before/public-collection.ts";
import { collectProjectFiles as after } from "../../../src/index.ts";
import { parseLongLiteralArguments } from "./helper-inputs.ts";

type CapturedErrorDetails =
  | Readonly<{ name: string; message: string; cause?: CapturedErrorDetails }>
  | Readonly<{ value: string }>;

const outputLabel = parseLongLiteralArguments(process.argv.slice(2));
const base = resolve(
  process.cwd(),
  "tmp/optimization-20261012/file-selection/node_modules/long-literal-errors"
);
const rows = [];
function capture(fn: typeof before, projectRoot: string, patterns: string[]) {
  try {
    return { paths: fn({ projectRoot, selection: { patterns } }) };
  } catch (error: unknown) {
    function details(e: unknown): CapturedErrorDetails {
      return e instanceof Error
        ? {
            name: e.name,
            message: e.message,
            ...(e.cause === undefined ? {} : { cause: details(e.cause) })
          }
        : { value: String(e) };
    }
    return { error: details(error) };
  }
}
for (const scenario of ["default-directory", "lossy-byte-entry"]) {
  const root = resolve(base, scenario);
  mkdirSync(root, { recursive: true });
  if (scenario === "default-directory")
    mkdirSync(resolve(root, "node_modules"), { recursive: true });
  else writeFileSync(Buffer.concat([Buffer.from(`${root}/`), Buffer.from([0xff, 0x61])]), "x");
  const patterns = ["a".repeat(65537)];
  const old = capture(before, root, patterns),
    current = capture(after, root, patterns);
  rows.push({
    scenario,
    before: old,
    after: current,
    equal: JSON.stringify(old) === JSON.stringify(current)
  });
}
const output = { capturedAt: new Date().toISOString(), runtime: process.versions, rows };
const suffix = process.versions.bun ? "bun" : "node";
const path = resolve(
  process.cwd(),
  `tmp/optimization-20261012/file-selection/long-literal-${suffix}-${outputLabel}.json`
);
writeFileSync(path, JSON.stringify(output, null, 2));
console.log(JSON.stringify(rows));
