import type { PackageApiExampleProjection } from "./example-projections.ts";

/** Executable Gate design examples projected into the guide and related topics. */
export const GATE_GUIDE_EXAMPLE_PROJECTIONS = Object.freeze([
  Object.freeze({
    evidence: "runtime",
    id: "gate-minimal",
    regionId: "gate-minimal",
    sourcePath: "docs/examples/package-api/gate-minimal.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "building-project-gate",
        headingPath: Object.freeze(["建立项目入口", "编写完整入口"]),
        kind: "markdown"
      })
    ]),
    title: "首次接入：检查真实 JSON 文件"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "gate-existing-command",
    regionId: "gate-existing-command",
    sourcePath: "docs/examples/package-api/gate-existing-command.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "command-check",
        headingPath: Object.freeze(["接入项目已有命令"]),
        kind: "markdown"
      })
    ]),
    title: "接入已有检查"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "gate-task-selection",
    regionId: "gate-task-selection",
    sourcePath: "docs/examples/package-api/gate-task-selection.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "extending-check-lifecycle",
        headingPath: Object.freeze(["按任务选择检查示例"]),
        kind: "markdown"
      })
    ]),
    title: "按任务选择检查"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "gate-change-selection",
    regionId: "gate-change-selection",
    sourcePath: "docs/examples/package-api/gate-change-selection.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "selecting-checks-by-git-changes",
        headingPath: Object.freeze(["按真实输入增量选择示例"]),
        kind: "markdown"
      })
    ]),
    title: "按真实输入增量选择"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "gate-shared-preparation",
    regionId: "gate-shared-preparation",
    sourcePath: "docs/examples/package-api/gate-shared-preparation.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "check-dependencies",
        headingPath: Object.freeze(["共享准备与独立判决示例"]),
        kind: "markdown"
      })
    ]),
    title: "准备一次，分别验收"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "gate-cached-measurement",
    regionId: "gate-cached-measurement",
    sourcePath: "docs/examples/package-api/gate-cached-measurement.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "cache-results",
        headingPath: Object.freeze(["缓存测量而非判决示例"]),
        kind: "markdown"
      })
    ]),
    title: "复用计算，而非通过结论"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "gate-resource-claims",
    regionId: "gate-resource-claims",
    sourcePath: "docs/examples/package-api/gate-resource-claims.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "scheduling",
        headingPath: Object.freeze(["并发约束示例"]),
        kind: "markdown"
      })
    ]),
    title: "表达并发约束"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "gate-terminal-observation",
    regionId: "gate-terminal-observation",
    sourcePath: "docs/examples/package-api/gate-terminal-observation.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "check-dependencies",
        headingPath: Object.freeze(["成功依赖与终态观察示例"]),
        kind: "markdown"
      })
    ]),
    title: "成功依赖与终态观察"
  })
] satisfies readonly PackageApiExampleProjection[]);
