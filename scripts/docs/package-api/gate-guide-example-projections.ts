import type { PackageApiExampleProjection } from "./example-projections.ts";

/** Executable task steps owned by the building-project-gate guide, in reading order. */
export const GATE_GUIDE_EXAMPLE_PROJECTIONS = Object.freeze([
  Object.freeze({
    evidence: "runtime",
    id: "gate-minimal",
    regionId: "gate-minimal",
    sourcePath: "docs/examples/package-api/gate-minimal.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "building-project-gate",
        headingPath: Object.freeze(["先跑通：定义检查、运行、判断结果"]),
        kind: "markdown"
      })
    ]),
    title: "先跑通：定义检查、运行、判断结果"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "gate-existing-command",
    regionId: "gate-existing-command",
    sourcePath: "docs/examples/package-api/gate-existing-command.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "building-project-gate",
        headingPath: Object.freeze(["1．接入已有检查"]),
        kind: "markdown"
      })
    ]),
    title: "1．接入已有检查"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "gate-shared-preparation",
    regionId: "gate-shared-preparation",
    sourcePath: "docs/examples/package-api/gate-shared-preparation.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "building-project-gate",
        headingPath: Object.freeze(["2．准备一次，分别验收"]),
        kind: "markdown"
      })
    ]),
    title: "2．准备一次，分别验收"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "gate-terminal-observation",
    regionId: "gate-terminal-observation",
    sourcePath: "docs/examples/package-api/gate-terminal-observation.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "building-project-gate",
        headingPath: Object.freeze(["3．成功依赖与终态观察"]),
        kind: "markdown"
      })
    ]),
    title: "3．成功依赖与终态观察"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "gate-task-selection",
    regionId: "gate-task-selection",
    sourcePath: "docs/examples/package-api/gate-task-selection.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "building-project-gate",
        headingPath: Object.freeze(["4．按任务选择检查"]),
        kind: "markdown"
      })
    ]),
    title: "4．按任务选择检查"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "gate-change-selection",
    regionId: "gate-change-selection",
    sourcePath: "docs/examples/package-api/gate-change-selection.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "building-project-gate",
        headingPath: Object.freeze(["5．按真实输入增量选择"]),
        kind: "markdown"
      })
    ]),
    title: "5．按真实输入增量选择"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "gate-cached-measurement",
    regionId: "gate-cached-measurement",
    sourcePath: "docs/examples/package-api/gate-cached-measurement.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "building-project-gate",
        headingPath: Object.freeze(["7．复用计算，而非通过结论"]),
        kind: "markdown"
      })
    ]),
    title: "7．复用计算，而非通过结论"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "gate-resource-claims",
    regionId: "gate-resource-claims",
    sourcePath: "docs/examples/package-api/gate-resource-claims.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "building-project-gate",
        headingPath: Object.freeze(["8．表达并发约束"]),
        kind: "markdown"
      })
    ]),
    title: "8．表达并发约束"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "gate-text-diagnostics",
    regionId: "gate-text-diagnostics",
    sourcePath: "docs/examples/package-api/gate-text-diagnostics.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "building-project-gate",
        headingPath: Object.freeze([
          "9．把工具输出转换为结构化诊断",
          "9.1．只有文本：解析明确的格式"
        ]),
        kind: "markdown"
      })
    ]),
    title: "9.1．只有文本：解析明确的格式"
  }),
  Object.freeze({
    evidence: "runtime",
    id: "gate-json-diagnostics",
    regionId: "gate-json-diagnostics",
    sourcePath: "docs/examples/package-api/gate-json-diagnostics.ts",
    targets: Object.freeze([
      Object.freeze({
        documentId: "building-project-gate",
        headingPath: Object.freeze([
          "9．把工具输出转换为结构化诊断",
          "9.2．已有结构：验证并映射为项目字段"
        ]),
        kind: "markdown"
      })
    ]),
    title: "9.2．已有结构：验证并映射为项目字段"
  })
] satisfies readonly PackageApiExampleProjection[]);
