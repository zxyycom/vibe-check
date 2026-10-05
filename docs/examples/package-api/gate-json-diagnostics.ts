import { assertConfigurationDiagnostics } from "../package-api-support/gate-example-acceptance.ts";

// #region package-api-example:gate-json-diagnostics
import {
  commandCheck,
  defineConfig,
  type CheckResult,
  type AfterCommandContext
} from "@zxyycom/vibe-check";

type DiagnosticData = { exitCode: number; diagnosticsAvailable?: boolean };

function projectJsonDiagnostics(text: string) {
  const value: unknown = JSON.parse(text);
  if (
    value === null ||
    typeof value !== "object" ||
    !("errors" in value) ||
    !Array.isArray(value.errors)
  )
    throw new TypeError("Expected an errors array");
  return value.errors.map((item) => {
    if (
      item === null ||
      typeof item !== "object" ||
      item.filename !== "config/app.json" ||
      item.rule !== "CFG001" ||
      item.location === null ||
      typeof item.location !== "object" ||
      typeof item.location.row !== "number" ||
      !Number.isSafeInteger(item.location.row) ||
      item.location.row < 1
    )
      throw new TypeError("Unsupported diagnostic");
    return { path: "config/app.json", line: item.location.row, code: "missing-name" };
  });
}

const afterCommand = {
  execute({ command, records }: AfterCommandContext): CheckResult<DiagnosticData> {
    if (command.exitCode === 0) {
      return { status: "passed", data: { exitCode: 0 } };
    }
    let diagnostics;
    try {
      diagnostics = projectJsonDiagnostics(command.stdout);
    } catch {
      return {
        status: "failed",
        data: { exitCode: command.exitCode, diagnosticsAvailable: false }
      };
    }
    diagnostics.forEach((data, index) => records.report({ id: "config-" + index }, data));
    return {
      status: "failed",
      data: { exitCode: command.exitCode, diagnosticsAvailable: true }
    };
  }
};

const check = commandCheck({
  checkId: "config-json-diagnostics",
  displayName: "Configuration diagnostics",
  executable: process.execPath,
  arguments: [
    "--eval",
    'process.stdout.write(JSON.stringify({errors:[{filename:"config/app.json",location:{row:3},rule:"CFG001",debug:"internal context"}]})); process.exit(1);'
  ],
  timeoutMs: 5_000,
  outputByteLimit: 64 * 1024,
  afterCommand
});

const definition = defineConfig({
  checks: [check],
  outputs: { machinePublication: { enabled: false } }
});
// #endregion package-api-example:gate-json-diagnostics

await assertConfigurationDiagnostics({
  definition,
  afterCommand,
  invalidOutputs: [
    '{"errors":[{"filename":"config/app.json","location":{"row":3},"rule":"CFG001"},{"filename":"config/app.json","location":{"row":4},"rule":"CFG002"}]}',
    '{"errors":[{"filename":"config/app.json","location":{"row":3},"rule":"CFG001"},{"filename":"../outside.json","location":{"row":4},"rule":"CFG001"}]}',
    '{"errors":[{"filename":"config/app.json","location":{"row":3},"rule":"CFG001"},null]}'
  ]
});
