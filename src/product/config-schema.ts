import Type from "typebox";

export const SEMANTIC_PROJECT_CONFIG_V1_SCHEMA_ID =
  "urn:vibe-check:schema:config:v1";
export const SEMANTIC_PROJECT_CONFIG_V1_SCHEMA_PATH =
  "docs/schemas/vibe-check-config.schema.json";

const WarningPolicySchema = Type.Enum([
  "strict",
  "moderate",
  "relaxed",
  "watchlist-only",
  "exclude-warnings"
], {
  description: "Warning policy applied to files classified into this code area.",
  type: "string"
});

const CodeAreaSchema = Type.Object({
  description: Type.String({
    description: "Human-readable description of this code area."
  }),
  excludeGlobs: Type.Array(Type.String({
    description: "Glob excluded from this code area."
  }), {
    description: "Globs excluded after this code area's positive globs match."
  }),
  globs: Type.Array(Type.String({
    description: "Glob that assigns matching project files to this code area."
  }), {
    description: "Globs that select project files for this code area."
  }),
  warningPolicy: WarningPolicySchema
}, {
  additionalProperties: false,
  description: "One named Vibe Check code-area definition."
});

const ThresholdSchema = Type.Object({
  absoluteFloor: Type.Number({
    description: "Absolute warning floor for this quality check."
  }),
  changedDelta: Type.Number({
    description: "Changed-value delta used by this quality check."
  })
}, {
  additionalProperties: false,
  description: "Absolute and changed-delta thresholds for one quality check."
});

const FileCodeLinesSchema = Type.Object({
  absoluteFloor: Type.Number({
    description: "Absolute file code-line warning floor."
  }),
  changedDelta: Type.Number({
    description: "Changed file code-line warning delta."
  }),
  lowDecisionTokenAllowance: Type.Object({
    codeLineFloor: Type.Number({
      description: "Code-line floor at which the low-decision-token allowance applies."
    }),
    maxDecisionTokens: Type.Number({
      description: "Maximum decision-token value allowed by the file exception."
    })
  }, {
    additionalProperties: false,
    description: "Allowance for large files with low decision-token counts."
  })
}, {
  additionalProperties: false,
  description: "Product-owned file code-line warning settings."
});

const FunctionCodeLinesSchema = Type.Object({
  absoluteFloor: Type.Number({
    description: "Absolute function code-line warning floor."
  }),
  changedDelta: Type.Number({
    description: "Changed function code-line warning delta."
  }),
  lowComplexityAllowance: Type.Object({
    codeLineFloor: Type.Number({
      description: "Code-line floor at which the low-complexity allowance applies."
    }),
    maxCyclomaticComplexityExclusive: Type.Number({
      description: "Exclusive cyclomatic-complexity ceiling for the allowance."
    })
  }, {
    additionalProperties: false,
    description: "Allowance for long functions with low cyclomatic complexity."
  })
}, {
  additionalProperties: false,
  description: "Product-owned function code-line warning settings."
});

const AcceptedWarningSchema = Type.Object({
  checkId: Type.Enum([
    "file-code-lines",
    "function-cyclomatic-complexity",
    "function-code-lines",
    "function-parameter-count",
    "duplicate-code"
  ], {
    description: "Stable Vibe Check semantic check identity.",
    type: "string"
  }),
  codeArea: Type.Optional(Type.String({
    description: "Optional exact code-area filter."
  })),
  messageIncludes: Type.Optional(Type.Array(Type.String({
    description: "Text fragment required in the warning message."
  }), {
    description: "Optional warning-message fragments that must all match."
  })),
  metric: Type.Optional(Type.String({
    description: "Optional exact normalized metric filter."
  })),
  path: Type.Optional(Type.String({
    description: "Optional exact project-relative path filter."
  })),
  reason: Type.String({
    description: "Owner-supplied reason for accepting the matched warning."
  }),
  suggestionIncludes: Type.Optional(Type.Array(Type.String({
    description: "Text fragment required in the warning suggestion."
  }), {
    description: "Optional warning-suggestion fragments that must all match."
  })),
  value: Type.Optional(Type.Number({
    description: "Optional exact finite warning value filter."
  }))
}, {
  additionalProperties: false,
  description: "One backend-neutral accepted-warning matcher."
});

const ReportSchema = Type.Object({
  footerGeneratedBy: Type.String({
    description: "Generated-by footer text."
  }),
  footerNotice: Type.String({
    description: "Report footer notice."
  }),
  nonBlockingNotice: Type.String({
    description: "Non-blocking report notice."
  }),
  showWatchlist: Type.Boolean({
    description: "Whether the changed-files watchlist is rendered."
  }),
  timeZone: Type.String({
    description: "IANA time-zone name used for report timestamps."
  }),
  title: Type.String({
    description: "Human-readable report title."
  }),
  topN: Type.Number({
    description: "Number of entries requested for ranked report sections."
  }),
  watchlistMax: Type.Number({
    description: "Maximum number of changed-file watchlist entries."
  })
}, {
  additionalProperties: false,
  description: "Human-readable report presentation settings."
});

export const SemanticProjectConfigV1Schema = Type.Object({
  acceptedWarnings: Type.Array(AcceptedWarningSchema, {
    description: "Owner-reviewed semantic warning acceptances."
  }),
  artifactDir: Type.String({
    description: "Project-root-relative directory for scan artifacts."
  }),
  cacheDir: Type.String({
    description: "Project-root-relative directory for measurement caches."
  }),
  checks: Type.Object({
    duplication: Type.Object({
      defaultMinimumTokens: Type.Number({
        description: "Default duplicate-detection token sensitivity."
      }),
      fragments: Type.Object({
        changedDelta: Type.Number({
          description: "Changed duplicate-fragment warning delta."
        })
      }, {
        additionalProperties: false,
        description: "Duplicate-fragment warning settings."
      }),
      minimumTokensByCodeArea: Type.Record(
        Type.String(),
        Type.Number({
          description: "Duplicate-detection token sensitivity for one code area."
        }),
        {
          description:
            "Per-code-area duplicate-detection sensitivity; keys must reference declared code areas."
        }
      )
    }, {
      additionalProperties: false,
      description: "Product-owned duplicate measurement and warning settings."
    }),
    files: Type.Object({
      codeLines: FileCodeLinesSchema
    }, {
      additionalProperties: false,
      description: "Product-owned file quality checks."
    }),
    functions: Type.Object({
      codeLines: FunctionCodeLinesSchema,
      cyclomaticComplexity: ThresholdSchema,
      parameterCount: ThresholdSchema
    }, {
      additionalProperties: false,
      description: "Product-owned function quality checks."
    })
  }, {
    additionalProperties: false,
    description: "Backend-neutral Vibe Check quality settings."
  }),
  codeAreas: Type.Record(Type.String(), CodeAreaSchema, {
    description: "Named project code areas used by scope, warning, and report semantics."
  }),
  excludeDirs: Type.Array(Type.String({
    description: "Directory name or path excluded from scan scope."
  }), {
    description: "Directories excluded from project file collection."
  }),
  generatedFiles: Type.Array(Type.String({
    description: "Glob that classifies a project file as generated."
  }), {
    description: "Generated-file globs excluded from ordinary scanner input."
  }),
  include: Type.Array(Type.String({
    description: "Glob included in project scan scope."
  }), {
    description: "Project-root-relative include globs."
  }),
  report: ReportSchema,
  version: Type.Literal("1", {
    description: "Exact semantic project-config contract discriminator."
  })
}, {
  additionalProperties: false,
  description: "Complete Vibe Check semantic project configuration v1.",
  title: "Vibe Check semantic project config v1"
});

export type SemanticProjectConfigV1 = Type.Static<
  typeof SemanticProjectConfigV1Schema
>;

export const ConfigDocumentSchema = Type.Object({
  $schema: Type.Optional(Type.String({
    description: "Relative or absolute editor schema reference for this document."
  })),
  ...SemanticProjectConfigV1Schema.properties
}, {
  additionalProperties: false,
  description:
    "Complete Vibe Check project configuration with optional editor metadata.",
  title: "Vibe Check project config document v1"
});

export type ConfigDocument = Type.Static<typeof ConfigDocumentSchema>;

/**
 * JSON Schema 2020-12 projection for editor and publication consumers.
 * `$schema` and `$id` describe this schema document; they do not add fields to
 * the closed runtime config instance contract above.
 */
export const SEMANTIC_PROJECT_CONFIG_V1_EDITOR_SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: SEMANTIC_PROJECT_CONFIG_V1_SCHEMA_ID,
  ...SemanticProjectConfigV1Schema
} as const;

export type SemanticProjectConfigV1EditorSchema =
  typeof SEMANTIC_PROJECT_CONFIG_V1_EDITOR_SCHEMA;

export function serializeSemanticProjectConfigV1EditorSchema(): string {
  return `${JSON.stringify(SEMANTIC_PROJECT_CONFIG_V1_EDITOR_SCHEMA, null, 2)}\n`;
}
