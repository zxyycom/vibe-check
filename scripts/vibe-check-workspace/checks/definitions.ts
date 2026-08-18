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
];

export const checks = defineChecks([
  {
    id: "required-checks",
    type: PROFILE_REQUIRED,
    tasks: [
      {
        id: "typecheck-product",
        label: "TypeScript product typecheck and import boundary",
        command: "bun",
        args: ["run", "typecheck:product"],
        ignoreOutput: [
          /^\$ tsgo -p tsconfig\.product\.json$/
        ]
      },
      {
        id: "lint-product",
        label: "TypeScript product lint",
        command: "bun",
        args: ["run", "lint:product"],
        ignoreOutput: [
          /^\$ eslint .*src\/product\/\*\*\/\*\.ts.*$/
        ]
      },
      {
        id: "typecheck-scripts",
        label: "TypeScript script typecheck",
        command: "bun",
        args: ["run", "typecheck:scripts"],
        ignoreOutput: [
          /^\$ tsgo -p tsconfig\.json$/
        ]
      },
      {
        id: "lint-scripts",
        label: "TypeScript script lint",
        command: "bun",
        args: ["run", "lint:scripts"],
        ignoreOutput: [
          /^\$ eslint .*scripts\/\*\*\/\*\.ts.*$/
        ]
      },
      {
        id: "quality-quick-check",
        label: "repository Package Run dogfood",
        command: "bun",
        args: [
          "scripts/quality/scan.ts"
        ],
        env: {
          VIBE_CHECK_QUALITY_TIMINGS: "1"
        },
        dependsOn: ["typecheck-product", "lint-product", "typecheck-scripts", "lint-scripts"],
        allowOutput: [
          ...qualityWarningOutput
        ],
        warningOutput: [
          /^Quality check status: warning$/m
        ]
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
            args: ["run", "decisions:check"],
            ignoreOutput: [
              /^\$ bun scripts\/decision-records\.ts check$/,
              /^Decision records check passed \(\d+ decisions, \d+ active, \d+ aligned, \d+ unaligned, \d+ archived, \d+ candidates\)\.$/
            ]
          },
          {
            id: "test-evidence",
            label: "semantic Case ledger",
            command: "bun",
            args: ["run", "test-evidence:check"],
            ignoreOutput: [
              /^\$ bun scripts\/test-evidence\/index\.ts check --root \.$/,
              /^Test Case check passed: \d+ current test entities \(\d+ Bun\); \d+ mapped by \d+ semantic Cases across \d+ topics\.$/
            ]
          }
        ]
      },
      {
        id: "test-evidence-rule-tests",
        label: "test evidence ast-grep rule tests",
        command: "bun",
        args: ["run", "test:test-evidence-rules"],
        ignoreOutput: [
          /^\$ bun scripts\/test-evidence\/test-rules\.ts$/,
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
        ignoreOutput: [
          /\b(CRLF|LF) will be replaced by (CRLF|LF)\b/i
        ]
      }
    ]
  },
  {
    id: "full-checks",
    type: PROFILE_FULL,
    tasks: [
      {
        id: "quality-full-check",
        label: "repository Package Run full-profile dogfood",
        command: "bun",
        args: [
          "scripts/quality/scan.ts"
        ],
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
        allowOutput: [
          ...qualityWarningOutput
        ],
        warningOutput: [
          /^Quality check status: warning$/m
        ]
      }
    ]
  }
]);

function docsValidatorChecks(): readonly CheckDefinition[] {
  return [
    docsValidatorCheck("docs-json-validator", "docs json validator", "json", [
      /^json syntax ok:/
    ]),
    docsValidatorCheck("docs-schema-validator", "docs schema validator", "schema", [
      /^schema strict compile ok:/
    ]),
    docsValidatorCheck("docs-example-validator", "docs example validator", "examples", [
      /^schema ok:/,
      /^report examples ok:/
    ]),
    docsValidatorCheck("docs-links-validator", "docs links validator", "links", [
      /^markdown links ok:/
    ])
  ];
}

function docsValidatorCheck(
  id: string,
  label: string,
  target: string,
  successOutput: readonly RegExp[]
): CheckDefinition {
  return {
    id,
    label,
    command: "bun",
    args: ["run", "validate:docs", target],
    ignoreOutput: [
      new RegExp(`^\\$ bun scripts\\/docs\\/validate\\.ts "?${target}"?$`),
      ...successOutput
    ]
  };
}
