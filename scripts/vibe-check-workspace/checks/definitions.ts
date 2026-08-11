import { defineChecks } from "./normalization.ts";
import { PROFILE_FULL, PROFILE_REQUIRED } from "./model.ts";
import type { CheckDefinition } from "./model.ts";

const qualityWarningOutput = [
  /^Quality check status: warning$/,
  /^Warnings: \d+ total \(\d+ changed, \d+ regressions\)$/,
  /^This is a quick quality check, not a full quality scan\.$/,
  /^Showing first \d+ warnings:$/,
  /^\s*\d+\. \[.+\] .+$/,
  /^\s*Accepted reason: .+$/,
  /^\s*\.\.\. and \d+ more warnings$/,
  /^Detailed report: .+$/,
  /^Warning records: .+$/
];

const qualityVerificationWarningOutput = [
  /^Quality verification status: warning$/,
  /^Warnings without accepted reason: \d+ total \(\d+ changed, \d+ regressions\)$/,
  /^Showing first \d+ warnings without accepted reason:$/,
  /^\s*\d+\. \[.+\] .+$/,
  /^\s*\.\.\. and \d+ more warnings without accepted reason$/,
  /^Detailed report: .+$/,
  /^Warning records: .+$/
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
        label: "quality quick check",
        command: "bun",
        args: [
          "scripts/quality/scan.ts",
          "--profile",
          "quick",
          "--artifact-dir",
          "artifacts/vibe-check-quality/quick"
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
              /^Decision records check passed \(\d+ domains, \d+ decisions, \d+ active, \d+ aligned, \d+ unaligned, \d+ archived\)\.$/
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
        id: "producer-annotation-acceptance",
        label: "producer-to-annotation acceptance",
        command: "bun",
        args: ["test", "scripts/quality/producer-annotation-acceptance.test.ts"],
        ignoreOutput: [
          /^bun test v\d+\.\d+\.\d+ /,
          /^scripts\/quality\/producer-annotation-acceptance\.test\.ts:$/,
          /^\(pass\) producer-to-annotation acceptance > /,
          /^\s*1 pass$/,
          /^\s*0 fail$/,
          /^Ran 1 test across 1 file\. /
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
        label: "quality full check",
        command: "bun",
        args: [
          "scripts/quality/scan.ts",
          "--profile",
          "full",
          "--verification-output"
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
          ...qualityVerificationWarningOutput
        ],
        warningOutput: [
          /^Quality verification status: warning$/m
        ]
      }
    ]
  }
]);

function docsValidatorChecks(): CheckDefinition[] {
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
