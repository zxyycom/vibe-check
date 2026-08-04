import Type from "typebox";

const LanguageAggregateSchema = Type.Object({
  blankLines: Type.Integer({
    description: "Total blank physical lines for this language.",
    minimum: 0
  }),
  codeLines: Type.Integer({
    description: "Total non-comment, non-blank code lines for this language.",
    minimum: 0
  }),
  commentLines: Type.Integer({
    description: "Total comment physical lines for this language.",
    minimum: 0
  }),
  comments: Type.Optional(Type.Integer({
    description: "Optional scanner-provided comment count distinct from comment lines.",
    minimum: 0
  })),
  files: Type.Integer({
    description: "Number of measured files for this language.",
    minimum: 0
  }),
  language: Type.String({
    description: "Normalized language name.",
    minLength: 1
  }),
  lines: Type.Integer({
    description: "Total physical lines for this language.",
    minimum: 0
  })
}, {
  additionalProperties: false,
  description: "Aggregate file measurements for one normalized language."
});

const CodeAreaAggregateSchema = Type.Object({
  codeArea: Type.String({
    description: "Vibe Check code-area identifier.",
    minLength: 1
  }),
  codeLines: Type.Optional(Type.Integer({
    description: "Optional total non-comment, non-blank code lines in this code area.",
    minimum: 0
  })),
  cyclomaticComplexity: Type.Optional(Type.Number({
    description: "Optional sum of function cyclomatic-complexity counts in this code area.",
    minimum: 0
  })),
  duplicateFragments: Type.Optional(Type.Integer({
    description: "Optional duplicate-fragment count associated with this code area.",
    minimum: 0
  })),
  fileDecisionTokens: Type.Optional(Type.Number({
    description: "Optional sum of scc decision-token counts in this code area.",
    minimum: 0
  })),
  files: Type.Integer({
    description: "Number of measured files in this code area.",
    minimum: 0
  }),
  functionLines: Type.Optional(Type.Number({
    description: "Optional sum of normalized function code lines in this code area.",
    minimum: 0
  })),
  functions: Type.Integer({
    description: "Number of measured functions in this code area.",
    minimum: 0
  }),
  lines: Type.Integer({
    description: "Total physical lines in measured files for this code area.",
    minimum: 0
  }),
  parameterCount: Type.Optional(Type.Number({
    description: "Optional sum of function parameter counts in this code area.",
    minimum: 0
  })),
  warningPolicy: Type.Enum([
    "strict",
    "moderate",
    "relaxed",
    "watchlist-only",
    "exclude-warnings"
  ], {
    description: "Closed warning policy applied to this code area.",
    type: "string"
  })
}, {
  additionalProperties: false,
  description: "Aggregate measurements for one Vibe Check code area."
});

const OverallAggregateSchema = Type.Object({
  totalCodeLines: Type.Integer({
    description: "Total non-comment, non-blank code lines.",
    minimum: 0
  }),
  totalDuplicateFragments: Type.Optional(Type.Integer({
    description: "Optional total normalized duplicate-fragment count.",
    minimum: 0
  })),
  totalFileDecisionTokens: Type.Optional(Type.Number({
    description: "Optional total scc decision-token count.",
    minimum: 0
  })),
  totalFiles: Type.Integer({
    description: "Total measured file count.",
    minimum: 0
  }),
  totalFunctionCyclomaticComplexity: Type.Optional(Type.Number({
    description: "Optional sum of function cyclomatic-complexity counts.",
    minimum: 0
  })),
  totalFunctionLines: Type.Optional(Type.Number({
    description: "Optional sum of normalized function code lines.",
    minimum: 0
  })),
  totalFunctionParameters: Type.Optional(Type.Number({
    description: "Optional sum of function parameter counts.",
    minimum: 0
  })),
  totalFunctions: Type.Integer({
    description: "Total measured function count.",
    minimum: 0
  }),
  totalLines: Type.Integer({
    description: "Total physical line count.",
    minimum: 0
  })
}, {
  additionalProperties: false,
  description: "Totals across all eligible current measurements."
});

export const AggregateMetricsSchema = Type.Object({
  byCodeArea: Type.Array(CodeAreaAggregateSchema, {
    description:
      "Aggregates by code-area ID. Order is presentation-only; consumers identify entries by codeArea."
  }),
  byLanguage: Type.Array(LanguageAggregateSchema, {
    description:
      "Aggregates by normalized language name. Order is presentation-only; consumers identify entries by language."
  }),
  overall: Type.Object(OverallAggregateSchema.properties, {
    additionalProperties: false,
    description: "Totals across all eligible current measurement inputs."
  })
}, {
  additionalProperties: false,
  description: "Current aggregate measurement groups."
});

export const TrendDeltaSchema = Type.Object({
  baseline: Type.Union([Type.Number(), Type.Null()], {
    description: "Baseline value in unit, or null when unavailable."
  }),
  current: Type.Union([Type.Number(), Type.Null()], {
    description: "Current value in unit, or null when unavailable."
  }),
  delta: Type.Union([Type.Number(), Type.Null()], {
    description: "Current-minus-baseline value in unit, or null when unavailable."
  }),
  metric: Type.String({
    description: "Stable normalized metric identifier.",
    minLength: 1
  }),
  percentChange: Type.Union([Type.Number(), Type.Null()], {
    description: "Percentage change from baseline, or null when not computable."
  }),
  unit: Type.String({
    description: "Normalized unit label for baseline, current, and delta values.",
    minLength: 1
  })
}, {
  additionalProperties: false,
  description: "One normalized current-to-baseline metric delta."
});
