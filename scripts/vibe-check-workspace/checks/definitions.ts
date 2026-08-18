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
        args: ["run", "typecheck:product"],
        ignoreOutput: [/^\$ tsgo -p tsconfig\.product\.json$/]
      },
      {
        id: "lint-product",
        label: "TypeScript product lint",
        command: "bun",
        args: ["run", "lint:product"],
        ignoreOutput: [/^\$ mise exec -- pnpm exec oxlint --deny-warnings src\/product$/]
      },
      {
        id: "typecheck-scripts",
        label: "TypeScript script typecheck",
        command: "bun",
        args: ["run", "typecheck:scripts"],
        ignoreOutput: [/^\$ tsgo -p tsconfig\.json$/]
      },
      {
        id: "lint-scripts",
        label: "TypeScript script lint",
        command: "bun",
        args: ["run", "lint:scripts"],
        ignoreOutput: [/^\$ mise exec -- pnpm exec oxlint --deny-warnings scripts$/]
      },
      {
        id: "format-check",
        label: "source format",
        command: "bun",
        args: ["run", "format:check"],
        ignoreOutput: [
          /^\$ mise exec -- pnpm exec oxfmt --check .+$/,
          /^Checking formatting\.\.\.$/,
          /^All matched files use the correct format\.$/,
          /^Finished in \d+ms on \d+ files using \d+ threads\.$/
        ]
      },
      {
        id: "quality-quick-check",
        label: "repository Package Run dogfood",
        command: "bun",
        args: ["scripts/quality/scan.ts"],
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
        args: ["run", "test:product"],
        allowOutput: [/^Ran \d+ tests across \d+ files\..+$/]
      },
      {
        id: "toolkit-foundation-typecheck",
        label: "foundation toolkit typecheck",
        command: "bun",
        args: ["run", "toolkit:foundation:typecheck"],
        ignoreOutput: [
          /^\$ bun run toolkit:foundation:typecheck$/,
          /^\$ bun run --cwd scripts\/tools\/foundation typecheck$/,
          /^\$ tsgo -p tsconfig\.json$/
        ]
      },
      {
        id: "toolkit-foundation-lint",
        label: "foundation toolkit lint",
        command: "bun",
        args: ["run", "toolkit:foundation:lint"],
        ignoreOutput: [
          /^\$ bun run toolkit:foundation:lint$/,
          /^\$ bun run --cwd scripts\/tools\/foundation lint$/,
          /^\$ cd \.\.\/\.\.\/\.\. && mise exec -- pnpm exec oxlint --deny-warnings scripts\/tools\/foundation\/src scripts\/tools\/foundation\/test$/
        ]
      },
      {
        id: "toolkit-foundation-format-check",
        label: "foundation toolkit format",
        command: "bun",
        args: ["run", "toolkit:foundation:format:check"],
        ignoreOutput: [
          /^\$ bun run toolkit:foundation:format:check$/,
          /^\$ bun run --cwd scripts\/tools\/foundation format:check$/,
          /^\$ cd \.\.\/\.\.\/\.\. && mise exec -- pnpm exec oxfmt --check .+$/,
          /^Checking formatting\.\.\.$/,
          /^All matched files use the correct format\.$/,
          /^Finished in \d+ms on \d+ files using \d+ threads\.$/
        ]
      },
      {
        id: "toolkit-foundation-tests",
        label: "foundation toolkit tests",
        command: "bun",
        args: ["run", "toolkit:foundation:test"],
        allowOutput: [/^Ran \d+ tests across \d+ files\..+$/]
      },
      {
        id: "quality-full-check",
        label: "repository Package Run full-profile dogfood",
        command: "bun",
        args: ["scripts/quality/scan.ts"],
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
    args: ["run", "validate:docs", target],
    ignoreOutput: [
      new RegExp(`^\\$ bun scripts\\/docs\\/validate\\.ts "?${target}"?$`),
      ...successOutput
    ]
  };
}
