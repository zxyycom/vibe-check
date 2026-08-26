import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { collectPackageCheckGuides } from "./check-guides.ts";
import { renderPackageApiDocumentation } from "./render.ts";

type PackageApiDocumentationMode = "--check" | "--write";

export interface PackageApiDocumentationCliResult {
  readonly diagnostics: readonly string[];
  readonly exitCode: 0 | 1;
}

export function runPackageApiDocumentationCli(
  argv: readonly string[],
  options: Readonly<{ readonly repositoryRoot?: string }> = {}
): PackageApiDocumentationCliResult {
  const mode = parseMode(argv);
  const repositoryRoot = resolve(options.repositoryRoot ?? repositoryRootFromModule());
  const rendered = renderPackageApiDocumentation({ repositoryRoot });
  collectPackageCheckGuides(repositoryRoot, rendered.readme.content);
  const outputs = [rendered.readme, ...rendered.jsdocSources];
  if (mode === "--write") {
    for (const output of outputs) writeFileSync(output.path, output.content, "utf8");
    return Object.freeze({ diagnostics: Object.freeze([]), exitCode: 0 });
  }

  const stalePaths = outputs
    .filter(
      (output) => !existsSync(output.path) || readFileSync(output.path, "utf8") !== output.content
    )
    .map((output) => relative(repositoryRoot, output.path));
  if (stalePaths.length === 0)
    return Object.freeze({ diagnostics: Object.freeze([]), exitCode: 0 });
  return Object.freeze({
    diagnostics: Object.freeze([
      `package API documentation is stale: ${stalePaths.join(", ")}; run bun scripts/docs/package-api/command.ts --write`
    ]),
    exitCode: 1
  });
}

function parseMode(argv: readonly string[]): PackageApiDocumentationMode {
  const [mode] = argv;
  if ((mode === "--check" || mode === "--write") && argv.length === 1) return mode;
  throw new Error("usage: bun scripts/docs/package-api/command.ts --check|--write");
}

function repositoryRootFromModule(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
}

if (import.meta.main) {
  try {
    const result = runPackageApiDocumentationCli(process.argv.slice(2));
    for (const diagnostic of result.diagnostics) console.error(diagnostic);
    process.exitCode = result.exitCode;
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
