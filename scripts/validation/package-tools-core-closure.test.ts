import assert from "node:assert/strict";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { it } from "node:test";

import { validateRepositoryLayout } from "./layout-characterization.ts";
import {
  createTargetLayout,
  escapeRegExp,
  writePackageToolContract,
  writeSource
} from "./layout-characterization.test-support.ts";
import {
  validatePackageToolsBoundary,
  validatePackageToolsCoreNoEmit
} from "./package-tools-boundary.ts";

it("enforces package-tool public contracts and Core closure", { timeout: 30_000 }, () => {
  const validRoot = createTargetLayout();
  try {
    writePackageToolContract(validRoot);
    writeSource(
      validRoot,
      "src/check/dynamic.ts",
      'const publicContract = import("./public-contract.ts");\nvoid publicContract;\n'
    );
    assert.doesNotThrow(() => {
      validateRepositoryLayout({ repositoryRoot: validRoot });
    });
    assert.doesNotThrow(() => {
      validatePackageToolsCoreNoEmit(validRoot);
    });
  } finally {
    rmSync(validRoot, { force: true, recursive: true });
  }

  const violations: readonly Readonly<{
    readonly expected: string;
    readonly mutate: (root: string) => void;
  }>[] = [
    {
      expected:
        "package-tools-core-imports-non-core: src/check/direct.ts -> ../package-tools/consumer/tool.ts",
      mutate: (root) => {
        writeSource(
          root,
          "src/check/direct.ts",
          'import { packageTool } from "../package-tools/consumer/tool.ts";\nvoid packageTool;\n'
        );
      }
    },
    {
      expected:
        "package-tools-core-imports-non-core: src/machine-output/bridge.ts -> ../package-tools/consumer/tool.ts",
      mutate: (root) => {
        writeSource(
          root,
          "src/check/direct.ts",
          'import { packageTool } from "../machine-output/bridge.ts";\nvoid packageTool;\n'
        );
        writeSource(
          root,
          "src/machine-output/bridge.ts",
          'export { packageTool } from "../package-tools/consumer/tool.ts";\n'
        );
      }
    },
    {
      expected: "package-tools-core-imports-non-core: src/check/absolute.ts -> ",
      mutate: (root) => {
        const toolPath = join(root, "src/package-tools/consumer/tool.ts");
        writeSource(
          root,
          "src/check/absolute.ts",
          `import { packageTool } from ${JSON.stringify(toolPath)};\nvoid packageTool;\n`
        );
      }
    },
    {
      expected:
        "package-tools-core-imports-non-core: src/check/alias.ts -> @workspace/package-tools/consumer/tool.ts",
      mutate: (root) => {
        writeFileSync(
          join(root, "tsconfig.json"),
          JSON.stringify({
            compilerOptions: {
              allowImportingTsExtensions: true,
              baseUrl: ".",
              module: "nodenext",
              moduleResolution: "nodenext",
              paths: { "@workspace/*": ["src/*"] }
            }
          })
        );
        writeSource(
          root,
          "src/check/alias.ts",
          'import { packageTool } from "@workspace/package-tools/consumer/tool.ts";\nvoid packageTool;\n'
        );
      }
    },
    {
      expected:
        "package-tools-core-imports-non-core: src/check/dynamic.ts -> ../package-tools/consumer/tool.ts",
      mutate: (root) => {
        writeSource(
          root,
          "src/check/dynamic.ts",
          'const packageTool = import("../package-tools/consumer/tool.ts");\nvoid packageTool;\n'
        );
      }
    },
    {
      expected:
        "package-tools-core-unsupported-module-syntax: src/check/dynamic.ts (nonliteral dynamic import)",
      mutate: (root) => {
        writeSource(
          root,
          "src/check/dynamic.ts",
          'const specifier = "./public-contract.ts";\nconst publicContract = import(specifier);\nvoid publicContract;\n'
        );
      }
    },
    {
      expected:
        "package-tools-core-unsupported-module-syntax: src/check/import-equals.ts (import equals)",
      mutate: (root) => {
        writeSource(
          root,
          "src/check/import-equals.ts",
          'import packageTool = require("../package-tools/consumer/tool.ts");\nvoid packageTool;\n'
        );
      }
    },
    {
      expected:
        "package-tools-private-product-symbol: src/package-tools/new-tool/new-tool.ts -> ../../check/public-contract.ts (PrivateContract)",
      mutate: (root) => {
        writeSource(
          root,
          "src/package-tools/new-tool/new-tool.ts",
          'import type { PrivateContract } from "../../check/public-contract.ts";\nexport type { PrivateContract };\n'
        );
      }
    },
    {
      expected:
        "package-tools-private-product-symbol: src/package-tools/consumer/private-helper.ts -> ../../check/public-contract.ts (PrivateContract)",
      mutate: (root) => {
        writeSource(
          root,
          "src/package-tools/new-tool/new-tool.ts",
          'import type { PrivateContract } from "../consumer/private-helper.ts";\nexport type { PrivateContract };\n'
        );
        writeSource(
          root,
          "src/package-tools/consumer/private-helper.ts",
          'import type { PrivateContract } from "../../check/public-contract.ts";\nexport type { PrivateContract };\n'
        );
      }
    },
    {
      expected:
        "package-tools-imports-test-material: src/package-tools/consumer/tool.ts -> ../test-support/helper.ts",
      mutate: (root) => {
        writeSource(
          root,
          "src/package-tools/test-support/helper.ts",
          "export interface Helper {}\n"
        );
        writeSource(
          root,
          "src/package-tools/consumer/tool.ts",
          'import type { Helper } from "../test-support/helper.ts";\nexport type { Helper };\n'
        );
      }
    },
    {
      expected:
        "package-tools-unsupported-module-syntax: src/package-tools/consumer/tool.ts (default import)",
      mutate: (root) => {
        writeSource(
          root,
          "src/package-tools/consumer/tool.ts",
          'import publicValue from "../../check/public-contract.ts";\nvoid publicValue;\n'
        );
      }
    },
    {
      expected:
        "package-tools-unsupported-module-syntax: src/package-tools/consumer/tool.ts (namespace import)",
      mutate: (root) => {
        writeSource(
          root,
          "src/package-tools/consumer/tool.ts",
          'import * as contract from "../../check/public-contract.ts";\nvoid contract;\n'
        );
      }
    },
    {
      expected:
        "package-tools-unsupported-module-syntax: src/package-tools/consumer/tool.ts (side-effect import)",
      mutate: (root) => {
        writeSource(
          root,
          "src/package-tools/consumer/tool.ts",
          'import "../../check/public-contract.ts";\n'
        );
      }
    },
    {
      expected:
        "package-tools-unsupported-module-syntax: src/package-tools/consumer/tool.ts (export star)",
      mutate: (root) => {
        writeSource(
          root,
          "src/package-tools/consumer/tool.ts",
          'export * from "../../check/public-contract.ts";\n'
        );
      }
    },
    {
      expected:
        "package-tools-unsupported-module-syntax: src/package-tools/consumer/tool.ts (dynamic import)",
      mutate: (root) => {
        writeSource(
          root,
          "src/package-tools/consumer/tool.ts",
          'const contract = import("../../check/public-contract.ts");\nvoid contract;\n'
        );
      }
    },
    {
      expected:
        "package-tools-unsupported-module-syntax: src/package-tools/consumer/tool.ts (require)",
      mutate: (root) => {
        writeSource(
          root,
          "src/package-tools/consumer/tool.ts",
          'const contract = require("../../check/public-contract.ts");\nvoid contract;\n'
        );
      }
    },
    {
      expected:
        "package-tools-unsupported-module-syntax: src/package-tools/consumer/tool.ts (import type query)",
      mutate: (root) => {
        writeSource(
          root,
          "src/package-tools/consumer/tool.ts",
          'type Contract = import("../../check/public-contract.ts").PublicContract;\nexport type { Contract };\n'
        );
      }
    },
    {
      expected:
        "package-tools-unresolved-repository-import: src/package-tools/consumer/tool.ts -> ../../check/missing.ts",
      mutate: (root) => {
        writeSource(
          root,
          "src/package-tools/consumer/tool.ts",
          'import type { Missing } from "../../check/missing.ts";\nexport type { Missing };\n'
        );
      }
    },
    {
      expected:
        "package-tools-unapproved-external-import: src/package-tools/consumer/tool.ts -> node:child_process",
      mutate: (root) => {
        writeSource(
          root,
          "src/package-tools/consumer/tool.ts",
          'import type { ChildProcess } from "node:child_process";\nexport type { ChildProcess };\n'
        );
      }
    }
  ];

  for (const [index, violation] of violations.entries()) {
    const root = createTargetLayout();
    try {
      writePackageToolContract(root);
      violation.mutate(root);
      const findings: string[] = [];
      validatePackageToolsBoundary(root, findings);
      assert.match(findings.join("\n"), new RegExp(escapeRegExp(violation.expected)));
      if (index === 0) {
        assert.throws(
          () => {
            validateRepositoryLayout({ repositoryRoot: root });
          },
          new RegExp(escapeRegExp(violation.expected))
        );
      }
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  }
});
