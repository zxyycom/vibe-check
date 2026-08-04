import Type from "typebox";

import { MetricValueSchema } from "./metrics-metadata-schema.ts";

export const FileMetricSchema = Type.Object({
  blankLines: Type.Optional(Type.Integer({
    description: "Optional blank physical-line count reported by the file scanner.",
    minimum: 0
  })),
  codeArea: Type.String({
    description: "Vibe Check code-area identifier for this file.",
    minLength: 1
  }),
  codeLines: Type.Optional(Type.Integer({
    description: "Optional non-comment, non-blank code-line count reported by the file scanner.",
    minimum: 0
  })),
  commentLines: Type.Optional(Type.Integer({
    description: "Optional comment physical-line count reported by the file scanner.",
    minimum: 0
  })),
  decisionTokens: Type.Object(MetricValueSchema.properties, {
    additionalProperties: false,
    description: "scc decision-token count and normalized source for this file."
  }),
  isChanged: Type.Boolean({
    description: "Whether path is included in the invocation's changed-file scope."
  }),
  language: Type.String({
    description: "Normalized source language name reported for this file.",
    minLength: 1
  }),
  lines: Type.Integer({
    description: "Total physical lines in this file.",
    minimum: 0
  }),
  path: Type.String({
    description: "Product-normalized project-relative path using forward slashes.",
    minLength: 1
  })
}, {
  additionalProperties: false,
  description: "Normalized current measurements for one project-relative file."
});

export const FunctionMetricSchema = Type.Object({
  codeArea: Type.String({
    description: "Vibe Check code-area identifier for this function.",
    minLength: 1
  }),
  cyclomaticComplexity: Type.Object(MetricValueSchema.properties, {
    additionalProperties: false,
    description: "Cyclomatic-complexity count and normalized source for this function."
  }),
  endLine: Type.Integer({
    description: "One-based inclusive function end line within file.",
    minimum: 1
  }),
  file: Type.String({
    description: "Product-normalized project-relative path using forward slashes.",
    minLength: 1
  }),
  isChanged: Type.Boolean({
    description: "Whether file is included in the invocation's changed-file scope."
  }),
  lines: Type.Integer({
    description: "Normalized function code-line count.",
    minimum: 0
  }),
  name: Type.String({
    description: "Normalized function name reported by the function scanner."
  }),
  parameterCount: Type.Integer({
    description: "Function parameter count.",
    minimum: 0
  }),
  startLine: Type.Integer({
    description: "One-based inclusive function start line within file.",
    minimum: 1
  })
}, {
  additionalProperties: false,
  description: "Normalized current measurements for one source function."
});

const DuplicateCodeLocationSchema = Type.Object({
  codeArea: Type.String({
    description: "Vibe Check code-area identifier for this location.",
    minLength: 1
  }),
  endLine: Type.Integer({
    description: "One-based inclusive end line in path.",
    minimum: 1
  }),
  path: Type.String({
    description: "Product-normalized project-relative path using forward slashes.",
    minLength: 1
  }),
  startLine: Type.Integer({
    description: "One-based inclusive start line in path.",
    minimum: 1
  })
}, {
  additionalProperties: false,
  description: "One normalized project-relative duplicate location."
});

export const DuplicateCodeFragmentSchema = Type.Object({
  codeAreas: Type.Array(Type.String({
    description: "Vibe Check code-area identifier.",
    minLength: 1
  }), {
    description:
      "Code areas touched by the fragment. Order is producer semantic and preserved from duplicate normalization."
  }),
  hitsChangedScope: Type.Boolean({
    description: "Whether any duplicate location intersects the changed-file scope."
  }),
  id: Type.Integer({
    description: "Producer-assigned duplicate-fragment numeric identifier.",
    minimum: 0
  }),
  lineCount: Type.Integer({
    description: "Normalized duplicated line count per fragment occurrence.",
    minimum: 0
  }),
  locations: Type.Array(DuplicateCodeLocationSchema, {
    description:
      "Normalized source locations for the fragment. Order is semantic and preserved from duplicate normalization."
  }),
  tokenCount: Type.Integer({
    description: "Normalized duplicate token count per fragment occurrence.",
    minimum: 0
  })
}, {
  additionalProperties: false,
  description: "One normalized duplicate-code fragment and its source locations."
});
