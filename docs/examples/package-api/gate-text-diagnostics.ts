import { assertConfigurationDiagnostics } from "../package-api-support/gate-example-acceptance.ts";

// #region package-api-example:gate-text-diagnostics
import {
  commandCheck,
  defineConfig,
  type CheckResult,
  type AfterCommandContext
} from "@zxyycom/vibe-check";

type DiagnosticData = { exitCode: number; diagnosticsAvailable?: boolean };

function parseTextDiagnostics(text: string) {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const match = /^config\/app\.json:([1-9][0-9]*): MISSING_NAME$/.exec(line);
      if (!match) throw new TypeError("Unsupported diagnostic line");
      const lineNumber = Number(match[1]);
      if (!Number.isSafeInteger(lineNumber)) throw new TypeError("Invalid line number");
      return { path: "config/app.json", line: lineNumber, code: "missing-name" };
    });
}

const afterCommand = {
  execute({ command, records }: AfterCommandContext): CheckResult<DiagnosticData> {
    if (command.exitCode === 0) return { status: "passed", data: { exitCode: 0 } };
    let diagnostics;
    try {
      diagnostics = parseTextDiagnostics(command.stdout);
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
  checkId: "config-text-diagnostics",
  displayName: "Configuration diagnostics",
  executable: process.execPath,
  arguments: [
    "--eval",
    'process.stdout.write("config/app.json:3: MISSING_NAME\\n"); process.exit(1);'
  ],
  timeoutMs: 5_000,
  outputByteLimit: 64 * 1024,
  afterCommand
});

const definition = defineConfig({
  checks: [check],
  outputs: { machinePublication: { enabled: false } }
});
// #endregion package-api-example:gate-text-diagnostics

await assertConfigurationDiagnostics({
  definition,
  afterCommand,
  invalidOutputs: [
    "config/app.json:3: MISSING_NAME\nunsupported log\n",
    "config/app.json:3: MISSING_NAME\n../outside.json:4: MISSING_NAME\n"
  ]
});
