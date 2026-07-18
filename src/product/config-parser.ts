import {
  booleanValue,
  exactObject,
  finiteNumber,
  objectValue,
  stringArray,
  stringValue
} from "./config-validation.ts";
import {
  parseJscpdConfig,
  parseLizardConfig,
  parseSccConfig
} from "./config-thresholds.ts";
import {
  WARNING_POLICIES,
  type AcceptedWarningConfig,
  type CodeAreaDefinition,
  type QualityConfig,
  type ToolConfig
} from "./quality-core/src/model/schema.ts";

const TOP_LEVEL_FIELDS = [
  "acceptedWarnings",
  "artifactDir",
  "cacheDir",
  "codeAreas",
  "excludeDirs",
  "generatedFiles",
  "include",
  "jscpd",
  "lizard",
  "report",
  "scc",
  "tools",
  "version"
] as const;

export function parseQualityConfig(input: unknown): QualityConfig {
  const config = exactObject(input, "config", TOP_LEVEL_FIELDS);

  return {
    acceptedWarnings: parseAcceptedWarnings(config.acceptedWarnings),
    artifactDir: stringValue(config.artifactDir, "config.artifactDir"),
    cacheDir: stringValue(config.cacheDir, "config.cacheDir"),
    codeAreas: parseCodeAreas(config.codeAreas),
    excludeDirs: stringArray(config.excludeDirs, "config.excludeDirs"),
    generatedFiles: stringArray(config.generatedFiles, "config.generatedFiles"),
    include: stringArray(config.include, "config.include"),
    jscpd: parseJscpdConfig(config.jscpd),
    lizard: parseLizardConfig(config.lizard),
    report: parseReportConfig(config.report),
    scc: parseSccConfig(config.scc),
    tools: parseTools(config.tools),
    version: stringValue(config.version, "config.version")
  };
}

function parseAcceptedWarnings(input: unknown): AcceptedWarningConfig[] {
  if (!Array.isArray(input)) {
    throw new Error("config.acceptedWarnings must be an array");
  }

  return input.map((value, index) => {
    const path = `config.acceptedWarnings[${index}]`;
    const warning = exactObject(
      value,
      path,
      ["reason", "ruleId"],
      [
        "codeArea",
        "messageIncludes",
        "metric",
        "path",
        "sourceTool",
        "suggestionIncludes",
        "value"
      ]
    );

    const parsed: AcceptedWarningConfig = {
      reason: stringValue(warning.reason, `${path}.reason`),
      ruleId: stringValue(warning.ruleId, `${path}.ruleId`)
    };
    if (Object.hasOwn(warning, "codeArea")) {
      parsed.codeArea = stringValue(warning.codeArea, `${path}.codeArea`);
    }
    if (Object.hasOwn(warning, "messageIncludes")) {
      parsed.messageIncludes = stringArray(
        warning.messageIncludes,
        `${path}.messageIncludes`
      );
    }
    if (Object.hasOwn(warning, "metric")) {
      parsed.metric = stringValue(warning.metric, `${path}.metric`);
    }
    if (Object.hasOwn(warning, "path")) {
      parsed.path = stringValue(warning.path, `${path}.path`);
    }
    if (Object.hasOwn(warning, "sourceTool")) {
      parsed.sourceTool = stringValue(warning.sourceTool, `${path}.sourceTool`);
    }
    if (Object.hasOwn(warning, "suggestionIncludes")) {
      parsed.suggestionIncludes = stringArray(
        warning.suggestionIncludes,
        `${path}.suggestionIncludes`
      );
    }
    if (Object.hasOwn(warning, "value")) {
      parsed.value = finiteNumber(warning.value, `${path}.value`);
    }
    return parsed;
  });
}

function parseCodeAreas(input: unknown): Record<string, CodeAreaDefinition> {
  const codeAreas = objectValue(input, "config.codeAreas");
  return Object.fromEntries(
    Object.entries(codeAreas).map(([name, value]) => {
      const path = `config.codeAreas.${name}`;
      const area = exactObject(
        value,
        path,
        ["description", "excludeGlobs", "globs", "warningPolicy"]
      );
      const warningPolicy = stringValue(area.warningPolicy, `${path}.warningPolicy`);
      if (!WARNING_POLICIES.includes(warningPolicy as typeof WARNING_POLICIES[number])) {
        throw new Error(
          `${path}.warningPolicy must be one of ${WARNING_POLICIES.join(", ")}`
        );
      }

      return [name, {
        description: stringValue(area.description, `${path}.description`),
        excludeGlobs: stringArray(area.excludeGlobs, `${path}.excludeGlobs`),
        globs: stringArray(area.globs, `${path}.globs`),
        warningPolicy: warningPolicy as CodeAreaDefinition["warningPolicy"]
      }];
    })
  );
}

function parseReportConfig(input: unknown): QualityConfig["report"] {
  const report = exactObject(
    input,
    "config.report",
    [
      "footerGeneratedBy",
      "footerNotice",
      "nonBlockingNotice",
      "showWatchlist",
      "timeZone",
      "title",
      "topN",
      "watchlistMax"
    ]
  );

  return {
    footerGeneratedBy: stringValue(
      report.footerGeneratedBy,
      "config.report.footerGeneratedBy"
    ),
    footerNotice: stringValue(report.footerNotice, "config.report.footerNotice"),
    nonBlockingNotice: stringValue(
      report.nonBlockingNotice,
      "config.report.nonBlockingNotice"
    ),
    showWatchlist: booleanValue(report.showWatchlist, "config.report.showWatchlist"),
    timeZone: parseTimeZone(report.timeZone),
    title: stringValue(report.title, "config.report.title"),
    topN: finiteNumber(report.topN, "config.report.topN"),
    watchlistMax: finiteNumber(report.watchlistMax, "config.report.watchlistMax")
  };
}

function parseTools(input: unknown): QualityConfig["tools"] {
  const tools = exactObject(input, "config.tools", ["jscpd", "lizard", "scc"]);
  return {
    jscpd: parseToolConfig(tools.jscpd, "config.tools.jscpd"),
    lizard: parseToolConfig(tools.lizard, "config.tools.lizard"),
    scc: parseToolConfig(tools.scc, "config.tools.scc")
  };
}

function parseToolConfig(input: unknown, path: string): ToolConfig {
  const tool = exactObject(input, path, ["args", "command"]);
  return {
    args: stringArray(tool.args, `${path}.args`),
    command: stringValue(tool.command, `${path}.command`)
  };
}

function parseTimeZone(input: unknown): string {
  const path = "config.report.timeZone";
  const timeZone = stringValue(input, path);
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
  } catch (cause: unknown) {
    throw new Error(`${path} must be a valid time zone`, { cause });
  }
  return timeZone;
}
