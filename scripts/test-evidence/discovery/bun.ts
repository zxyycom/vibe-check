import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  astSourceRange,
  scanAstRule,
  unsupportedAstDiagnostics,
  type AstMatch
} from "../ast-grep/scan.ts";
import { closeStaticAndRuntimeEntities } from "../closure.ts";
import {
  diagnostic,
  type RuntimeTestEntity,
  type StaticTestEntity,
  type TestEntity,
  type TestEvidenceDiagnostic
} from "../entities.ts";
import type { SupportedRunnerProfile } from "../profile.ts";
import { processFailureMessage, runBunCommand } from "./runner-process.ts";
import { resolveBunTestFiles } from "./bun-files.ts";
import { parseBunRegistrationJUnit, type BunJUnitCase } from "./bun-junit.ts";
export { parseBunJUnit, parseBunRegistrationJUnit, type BunJUnitCase } from "./bun-junit.ts";

type BunDiscoveryOptions = {
  cancelSignal?: AbortSignal;
  workspaceRoot: string;
  profile: SupportedRunnerProfile;
};
type BunDiscoveryResult = { entities: TestEntity[]; diagnostics: TestEvidenceDiagnostic[] };
type BunRuntimeResult = { entities: RuntimeTestEntity[]; diagnostics: TestEvidenceDiagnostic[] };
type BunStaticResult = { entities: StaticTestEntity[]; diagnostics: TestEvidenceDiagnostic[] };

const REGISTRATION_ONLY_TEST_PATTERN = "a^";

export async function discoverBunEntities(
  options: BunDiscoveryOptions
): Promise<BunDiscoveryResult> {
  const diagnostics: TestEvidenceDiagnostic[] = [];
  let files: string[];
  try {
    files = resolveBunTestFiles({
      workspaceRoot: options.workspaceRoot,
      profile: options.profile.bun
    });
  } catch (error) {
    return {
      entities: [],
      diagnostics: [
        diagnostic(
          "runner-profile-invalid",
          "profile",
          error instanceof Error ? error.message : String(error),
          { runner: "bun" }
        )
      ]
    };
  }

  const staticResult = await scanBunStaticEntities(
    options.workspaceRoot,
    files,
    options.cancelSignal
  );
  diagnostics.push(...staticResult.diagnostics);
  const runtimeResult = await enumerateBunTests(options, files);
  diagnostics.push(...runtimeResult.diagnostics);
  if (diagnostics.some(({ blocking }) => blocking)) {
    return {
      entities: [],
      diagnostics
    };
  }
  const closed = closeStaticAndRuntimeEntities({
    runner: "bun",
    statics: staticResult.entities,
    runtime: runtimeResult.entities,
    createEntityKey: ({ target, selector }) => `bun|${target}|${selector}`
  });
  return {
    entities: closed.entities,
    diagnostics: [...diagnostics, ...closed.diagnostics]
  };
}

async function enumerateBunTests(
  options: BunDiscoveryOptions,
  files: readonly string[]
): Promise<BunRuntimeResult> {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vibe-check-bun-report-"));
  const reportPath = path.join(temporaryRoot, "junit.xml");
  try {
    const result = await runBunRegistrationReport(options, files, reportPath);
    if (result.status !== 0 && result.status !== 1) {
      return runtimeDiagnostic(
        "runner-report-failed",
        processFailureMessage(result, "Bun test registration report")
      );
    }
    return runtimeEntitiesFromReport(reportPath);
  } finally {
    fs.rmSync(temporaryRoot, { force: true, recursive: true });
  }
}

async function runBunRegistrationReport(
  options: BunDiscoveryOptions,
  files: readonly string[],
  reportPath: string
) {
  return runBunCommand({
    cancelSignal: options.cancelSignal,
    workspaceRoot: options.workspaceRoot,
    args: [
      "test",
      ...files,
      `--test-name-pattern=${REGISTRATION_ONLY_TEST_PATTERN}`,
      "--reporter=junit",
      `--reporter-outfile=${reportPath}`
    ],
    label: "Bun test registration report"
  });
}

function runtimeEntitiesFromReport(reportPath: string): BunRuntimeResult {
  if (!fs.existsSync(reportPath))
    return runtimeDiagnostic(
      "runner-report-invalid",
      "Bun test did not create the requested JUnit report"
    );
  try {
    return {
      entities: parseBunRegistrationJUnit(fs.readFileSync(reportPath, "utf8")).map(runtimeEntity),
      diagnostics: []
    };
  } catch (error) {
    return runtimeDiagnostic(
      "runner-report-invalid",
      `Bun JUnit report is malformed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function runtimeEntity(testCase: BunJUnitCase): RuntimeTestEntity {
  return {
    identity: bunLocationIdentity(testCase.file, testCase.line, testCase.name),
    target: testCase.file,
    selector: testCase.className ? `${testCase.className} > ${testCase.name}` : testCase.name
  };
}
function runtimeDiagnostic(
  code: "runner-report-failed" | "runner-report-invalid",
  message: string
): BunRuntimeResult {
  return { entities: [], diagnostics: [diagnostic(code, "runner", message, { runner: "bun" })] };
}

async function scanBunStaticEntities(
  workspaceRoot: string,
  files: string[],
  cancelSignal?: AbortSignal
): Promise<BunStaticResult> {
  const ruleRoot = path.join(workspaceRoot, "scripts", "test-evidence", "ast-grep", "rules");
  const nativeScan = await scanAstRule({
    cancelSignal,
    workspaceRoot,
    rulePath: path.join(ruleRoot, "bun-native-test.yml"),
    paths: files
  });
  const diagnostics = [...nativeScan.diagnostics];
  for (const ruleName of [
    "bun-unsupported-alias.yml",
    "bun-unsupported-dynamic.yml",
    "bun-unsupported-parameterized.yml"
  ]) {
    const scan = await scanAstRule({
      cancelSignal,
      workspaceRoot,
      rulePath: path.join(ruleRoot, ruleName),
      paths: files
    });
    diagnostics.push(...scan.diagnostics);
    diagnostics.push(...unsupportedAstDiagnostics(scan.matches, "bun"));
  }
  const candidates = bunStaticCandidates(nativeScan.matches);
  return {
    entities: candidates.entities,
    diagnostics: [...diagnostics, ...candidates.diagnostics]
  };
}

function bunStaticCandidates(matches: readonly AstMatch[]): BunStaticResult {
  const entities: StaticTestEntity[] = [];
  const diagnostics: TestEvidenceDiagnostic[] = [];
  for (const match of matches) {
    const name = match.metaVariables.single.NAME?.text;
    if (!name) {
      diagnostics.push(
        diagnostic("static-scan-failed", "static", "Bun native test rule did not capture NAME", {
          path: match.file,
          line: match.range.start.line + 1,
          runner: "bun"
        })
      );
      continue;
    }
    entities.push({
      identity: bunLocationIdentity(match.file, match.range.start.line + 1, name),
      sourcePath: match.file,
      sourceRange: astSourceRange(match)
    });
  }
  return { entities, diagnostics };
}

function bunLocationIdentity(sourcePath: string, line: number, name: string): string {
  return `${sourcePath}\0${line}\0${name}`;
}
