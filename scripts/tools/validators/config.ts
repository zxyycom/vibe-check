// Vibe Check docs validators keep stable paths and task names in one place.
// Product semantics remain owned by docs/output.md, schemas, examples, and Rust tests.
export const TASK_NAMES = {
  json: "json",
  schema: "schema",
  examples: "examples",
  links: "links"
};

export const FILE_SYSTEM = {
  docsDir: "docs",
  examplesJsonDir: "docs/examples/json",
  schemasDir: "docs/schemas",
  ignoredDirs: [
    ".git",
    ".codegraph",
    ".cache",
    ".log",
    ".tmp",
    "artifacts",
    "node_modules",
    "target",
    ".venv",
    "dist",
    "build"
  ],
  markdownLinkRoots: ["AGENTS.md", "docs"],
  jsonExtension: ".json",
  markdownExtension: ".md",
  schemaExtension: ".schema.json"
};

export const SCHEMAS = {
  report: "docs/schemas/vibe-check-report.schema.json"
};

export const EXAMPLES = {
  reportExamplesDir: FILE_SYSTEM.examplesJsonDir
};
