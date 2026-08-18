import { defineChecks } from "./normalization.ts";
import { PROFILE_FULL, PROFILE_REQUIRED } from "./model.ts";
import type { CheckDefinition } from "./model.ts";

const qualityWarningOutput = [
  /^─+$/,
  /^Summary:$/,
  /^ {2}Checks: \d+$/,
  /^ {2}Records: \d+$/,
  /^Quality check status: warning$/,
  /^ {2}\d+\. \[(?:error|info|warning)\] .+$/,
  /^ {2}\.\.\. and \d+ more records$/,
  /^⚠️ Quality scan complete with warnings\.$/,
  /^Artifacts in: .+$/,
  /^ {2}run\.json → .+$/,
  /^ {2}records\.ndjson → .+$/,
  /^ {2}report\.md → .+$/
] as const;

export const checks = defineChecks([
  {
    id: "required-checks",
    type: PROFILE_REQUIRED,
    tasks: [
      {
        id: "typecheck-product",
        label: "TypeScript product typecheck and import boundary",
        command: "bun",
        args: ["scripts/development/typecheck.ts", "product"]
      },
      {
        id: "lint-product",
        label: "TypeScript product lint",
        command: "bun",
        args: ["scripts/development/lint.ts", "product"]
      },
      {
        id: "typecheck-scripts",
        label: "TypeScript script typecheck",
        command: "bun",
        args: ["scripts/development/typecheck.ts", "scripts"]
      },
      {
        id: "lint-scripts",
        label: "TypeScript script lint",
        command: "bun",
        args: ["scripts/development/lint.ts", "scripts"]
      },
      {
        id: "format-check",
        label: "source format",
        command: "bun",
        args: ["scripts/development/format.ts", "check"],
        ignoreOutput: [
          /^Checking formatting\.\.\.$/,
          /^All matched files use the correct format\.$/,
          /^Finished in \d+ms on \d+ files using \d+ threads\.$/
        ]
      },
      {
        id: "quality-quick-check",
        label: "repository Package Run dogfood",
        command: "bun",
        args: ["scripts/quality/index.ts"],
        env: {
          VIBE_CHECK_QUALITY_TIMINGS: "1"
        },
        dependsOn: ["typecheck-product", "lint-product", "typecheck-scripts", "lint-scripts"],
        allowOutput: [...qualityWarningOutput],
        warningOutput: [/^Quality check status: warning$/m]
      },
      {
        id: "docs-validators",
        label: "docs validators",
        tasks: docsValidatorChecks()
      },
      {
        id: "repository-catalogs",
        label: "repository catalog checks",
        tasks: [
          {
            id: "decision-records",
            label: "decision records",
            command: "bun",
            args: ["scripts/decision-records.ts", "check"],
            ignoreOutput: [
              /^Decision records check passed \(\d+ decisions, \d+ active, \d+ aligned, \d+ unaligned, \d+ archived, \d+ candidates\)\.$/
            ]
          },
          {
            id: "test-evidence",
            label: "semantic Case ledger",
            command: "bun",
            args: ["scripts/test-evidence/index.ts", "check", "--root", "."],
            ignoreOutput: [
              /^Test Case check passed: \d+ current test entities \(\d+ Bun\); \d+ mapped by \d+ semantic Cases across \d+ topics\.$/
            ]
          }
        ]
      },
      {
        id: "test-evidence-rule-tests",
        label: "test evidence ast-grep rule tests",
        command: "bun",
        args: ["scripts/test-evidence/test-rules.ts"],
        ignoreOutput: [
          /^ast-grep \d+\.\d+\.\d+$/,
          /^Running \d+ tests$/,
          /^-+ Case Details -+$/,
          /^PASS .+$/,
          /^test result: ok\. \d+ passed; 0 failed;$/
        ]
      },
      {
        id: "git-diff-whitespace",
        label: "git diff whitespace",
        command: "git",
        args: ["diff", "--check"],
        ignoreOutput: [/\b(CRLF|LF) will be replaced by (CRLF|LF)\b/i]
      }
    ]
  },
  {
    id: "full-checks",
    type: PROFILE_FULL,
    tasks: [
      {
        id: "product-tests",
        label: "TypeScript product tests",
        command: "bun",
        args: ["scripts/development/test.ts", "product"],
        allowOutput: [/^Ran \d+ tests across \d+ files\..+$/]
      },
      {
        id: "toolkit-foundation-typecheck",
        label: "foundation toolkit typecheck",
        command: "bun",
        args: ["run", "--cwd", "scripts/tools/foundation", "typecheck"],
        ignoreOutput: [/^\$ bun \.\.\/\.\.\/\.\.\/scripts\/development\/typecheck\.ts foundation$/]
      },
      {
        id: "toolkit-foundation-lint",
        label: "foundation toolkit lint",
        command: "bun",
        args: ["run", "--cwd", "scripts/tools/foundation", "lint"],
        ignoreOutput: [/^\$ bun \.\.\/\.\.\/\.\.\/scripts\/development\/lint\.ts foundation$/]
      },
      {
        id: "toolkit-foundation-format-check",
        label: "foundation toolkit format",
        command: "bun",
        args: ["run", "--cwd", "scripts/tools/foundation", "format", "--", "check"],
        ignoreOutput: [
          /^\$ bun \.\.\/\.\.\/\.\.\/scripts\/development\/format\.ts foundation check$/,
          /^Checking formatting\.\.\.$/,
          /^All matched files use the correct format\.$/,
          /^Finished in \d+ms on \d+ files using \d+ threads\.$/
        ]
      },
      {
        id: "toolkit-foundation-tests",
        label: "foundation toolkit tests",
        command: "bun",
        args: ["run", "--cwd", "scripts/tools/foundation", "test"],
        allowOutput: [/^Ran \d+ tests across \d+ files\..+$/]
      },
      {
        id: "quality-full-check",
        label: "repository Package Run full-profile dogfood",
        command: "bun",
        args: ["scripts/quality/index.ts"],
        env: {
          VIBE_CHECK_QUALITY_TIMINGS: "1"
        },
        dependsOn: [
          "test-evidence",
          "typecheck-product",
          "lint-product",
          "typecheck-scripts",
          "lint-scripts"
        ],
        allowOutput: [...qualityWarningOutput],
        warningOutput: [/^Quality check status: warning$/m]
      }
    ]
  }
]);

function docsValidatorChecks(): readonly CheckDefinition[] {
  return [
    docsValidatorCheck({
      id: "docs-json-validator",
      label: "docs json validator",
      successOutput: [/^json syntax ok:/],
      target: "json"
    }),
    docsValidatorCheck({
      id: "docs-schema-validator",
      label: "docs schema validator",
      successOutput: [/^schema strict compile ok:/],
      target: "schema"
    }),
    docsValidatorCheck({
      id: "docs-example-validator",
      label: "docs example validator",
      successOutput: [/^schema ok:/, /^report examples ok:/],
      target: "examples"
    }),
    docsValidatorCheck({
      id: "docs-links-validator",
      label: "docs links validator",
      successOutput: [/^markdown links ok:/],
      target: "links"
    })
  ];
}

function docsValidatorCheck({
  id,
  label,
  successOutput,
  target
}: {
  readonly id: string;
  readonly label: string;
  readonly successOutput: readonly RegExp[];
  readonly target: string;
}): CheckDefinition {
  return {
    id,
    label,
    command: "bun",
    args: ["scripts/validate.ts", "docs", target],
    ignoreOutput: successOutput
  };
}
