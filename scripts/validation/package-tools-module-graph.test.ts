import assert from "node:assert/strict";
import { it } from "node:test";

import * as ts from "typescript";

import { collectModuleEdges, type ModuleEdge } from "./package-tools-module-graph.ts";

it("rejects unsupported loading syntax under Core and package-tool policies", () => {
  const cases: readonly Readonly<{
    readonly expectedEdges: readonly ModuleEdge[];
    readonly source: string;
    readonly strict: boolean;
    readonly syntax: string;
  }>[] = [
    {
      expectedEdges: [],
      source:
        'const specifier = "./public-contract.ts";\nconst publicContract = import(specifier);\nvoid publicContract;\n',
      strict: false,
      syntax: "nonliteral dynamic import"
    },
    {
      expectedEdges: [],
      source:
        'import packageTool = require("../package-tools/consumer/tool.ts");\nvoid packageTool;\n',
      strict: false,
      syntax: "import equals"
    },
    {
      expectedEdges: [],
      source: 'import publicValue from "../../check/public-contract.ts";\nvoid publicValue;\n',
      strict: true,
      syntax: "default import"
    },
    {
      expectedEdges: [],
      source: 'import * as contract from "../../check/public-contract.ts";\nvoid contract;\n',
      strict: true,
      syntax: "namespace import"
    },
    {
      expectedEdges: [{ bindings: [], specifier: "../../check/public-contract.ts" }],
      source: 'import "../../check/public-contract.ts";\n',
      strict: true,
      syntax: "side-effect import"
    },
    {
      expectedEdges: [],
      source: 'export * from "../../check/public-contract.ts";\n',
      strict: true,
      syntax: "export star"
    },
    {
      expectedEdges: [],
      source: 'const contract = import("../../check/public-contract.ts");\nvoid contract;\n',
      strict: true,
      syntax: "dynamic import"
    },
    {
      expectedEdges: [],
      source: 'const contract = require("../../check/public-contract.ts");\nvoid contract;\n',
      strict: true,
      syntax: "require"
    },
    {
      expectedEdges: [],
      source:
        'type Contract = import("../../check/public-contract.ts").PublicContract;\nexport type { Contract };\n',
      strict: true,
      syntax: "import type query"
    }
  ];

  for (const scenario of cases) {
    const codePrefix = scenario.strict ? "package-tools" : "package-tools-core";
    const repositoryPath = scenario.strict
      ? "src/package-tools/consumer/tool.ts"
      : "src/check/loading.ts";
    const sourceFile = ts.createSourceFile(
      repositoryPath,
      scenario.source,
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.TS
    );
    const violations: string[] = [];
    const edges = collectModuleEdges(sourceFile, {
      codePrefix,
      repositoryPath,
      strict: scenario.strict,
      violations
    });
    assert.deepEqual(
      violations,
      [`${codePrefix}-unsupported-module-syntax: ${repositoryPath} (${scenario.syntax})`],
      `${codePrefix}: ${scenario.syntax}`
    );
    assert.deepEqual(edges, scenario.expectedEdges, `${codePrefix}: ${scenario.syntax}`);
  }
});
