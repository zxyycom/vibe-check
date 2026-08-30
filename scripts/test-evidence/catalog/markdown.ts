import { diagnostic, type TestEvidenceDiagnostic } from "../entities.ts";
import type { SemanticTestCase } from "./catalog-types.ts";
import { isOwnerRef } from "./owner-ref.ts";
import type { TopicFileSource } from "./source.ts";

const CASE_HEADING_PATTERN = /^## Case ([A-Za-z0-9][A-Za-z0-9._-]*): (\S.*)$/;

export function parseTopicLines(
  source: TopicFileSource,
  diagnostics: TestEvidenceDiagnostic[]
): SemanticTestCase[] {
  diagnoseTopicHeading(source, diagnostics);
  return parseTopicBlocks(source, diagnostics);
}

function diagnoseTopicHeading(
  source: TopicFileSource,
  diagnostics: TestEvidenceDiagnostic[]
): void {
  if (source.lines[0]?.replace(/^\uFEFF/, "").trimEnd() === `# ${source.topic}`) {
    return;
  }
  diagnostics.push(
    diagnostic(
      "topic.heading-invalid",
      "case",
      `Case topic file ${source.fileName} must start with H1 "# ${source.topic}"`,
      { path: source.sourcePath, line: 1 }
    )
  );
}

function parseTopicBlocks(
  source: TopicFileSource,
  diagnostics: TestEvidenceDiagnostic[]
): SemanticTestCase[] {
  const cases: SemanticTestCase[] = [];
  let cursor = 1;
  while (cursor < source.lines.length) {
    const line = source.lines[cursor] ?? "";
    if (line.trim().length === 0) {
      cursor += 1;
      continue;
    }
    if (!isH2(line)) {
      diagnostics.push(
        diagnostic(
          "topic.content-unexpected",
          "case",
          "Case topic files may contain only blank lines and Case H2 blocks after the H1",
          { path: source.sourcePath, line: cursor + 1 }
        )
      );
      cursor += 1;
      continue;
    }

    const end = findNextH2(source.lines, cursor + 1);
    const match = CASE_HEADING_PATTERN.exec(line);
    if (match !== null) {
      cases.push(
        parseCaseBlock(
          {
            lines: source.lines,
            start: cursor,
            end,
            topic: source.topic,
            sourcePath: source.sourcePath,
            diagnostics
          },
          match
        )
      );
    } else {
      diagnostics.push(invalidCaseHeading(line, source.sourcePath, cursor + 1));
    }
    cursor = end;
  }
  return cases;
}

function invalidCaseHeading(
  line: string,
  sourcePath: string,
  sourceLine: number
): TestEvidenceDiagnostic {
  const malformedCase = line.startsWith("## Case");
  return diagnostic(
    malformedCase ? "case.heading-invalid" : "topic.heading-unexpected",
    "case",
    malformedCase
      ? 'Case heading must use "## Case <CASE-ID>: <title>"'
      : 'Case topic files allow only "## Case <CASE-ID>: <title>" H2 headings',
    { path: sourcePath, line: sourceLine }
  );
}

type CaseContentLine = Readonly<{ readonly line: number; readonly text: string }>;

interface CaseBlockParser {
  readonly content: readonly CaseContentLine[];
  readonly id: string;
  readonly options: {
    readonly diagnostics: TestEvidenceDiagnostic[];
    readonly sourcePath: string;
    readonly start: number;
  };
  cursor: number;
}

function parseCaseBlock(
  options: {
    lines: readonly string[];
    start: number;
    end: number;
    topic: string;
    sourcePath: string;
    diagnostics: TestEvidenceDiagnostic[];
  },
  match: RegExpExecArray
): SemanticTestCase {
  const [, id, title] = match;
  const parser: CaseBlockParser = {
    content: options.lines
      .slice(options.start + 1, options.end)
      .map((text, index) => ({ text: text.trim(), line: options.start + index + 2 }))
      .filter(({ text }) => text.length > 0),
    id,
    options,
    cursor: 0
  };
  const ownerRef = parseCaseOwner(parser);
  const entityKeys = parseCaseEntities(parser);
  const proves = parseCaseProofs(parser);
  return {
    id,
    title,
    topic: options.topic,
    ownerRef,
    entityKeys,
    proves,
    sourcePath: options.sourcePath,
    sourceLine: options.start + 1
  };
}

function parseCaseOwner(parser: CaseBlockParser): string {
  const item = currentCaseContent(parser);
  if (!item?.text.startsWith("Owner:")) {
    reportCaseDiagnostic(parser, "case.owner-missing", `Case ${parser.id} has no Owner field`);
    return "";
  }
  const owner = /^Owner: `([^`]+)`$/.exec(item.text);
  parser.cursor += 1;
  if (owner === null || !isOwnerRef(owner[1])) {
    reportCaseDiagnostic(
      parser,
      "case.owner-invalid",
      `Case ${parser.id} Owner must be a backticked workspace-relative .md#heading reference`,
      item.line
    );
    return "";
  }
  return owner[1];
}

function parseCaseEntities(parser: CaseBlockParser): string[] {
  if (currentCaseContent(parser)?.text !== "Entities:") {
    reportCaseDiagnostic(
      parser,
      "case.entities-missing",
      `Case ${parser.id} has no Entities field`,
      currentCaseContent(parser)?.line
    );
    return [];
  }
  parser.cursor += 1;
  const entities: string[] = [];
  const seen = new Set<string>();
  while (
    currentCaseContent(parser) !== undefined &&
    currentCaseContent(parser)?.text !== "Proves:"
  ) {
    const item = currentCaseContent(parser)!;
    const match = /^- `([^`]+)`$/.exec(item.text);
    if (match === null || match[1].trim() !== match[1])
      reportCaseDiagnostic(
        parser,
        "case.entity-invalid",
        `Case ${parser.id} Entities must contain exact backticked entity key bullets`,
        item.line
      );
    else if (seen.has(match[1]))
      parser.options.diagnostics.push(
        diagnostic(
          "case.entity-duplicate",
          "case",
          `Case ${parser.id} repeats test entity ${match[1]}`,
          {
            caseId: parser.id,
            entityKey: match[1],
            path: parser.options.sourcePath,
            line: item.line
          }
        )
      );
    else {
      seen.add(match[1]);
      entities.push(match[1]);
    }
    parser.cursor += 1;
  }
  if (entities.length === 0)
    reportCaseDiagnostic(
      parser,
      "case.entities-empty",
      `implemented Case ${parser.id} must reference at least one test entity`
    );
  return entities;
}

function parseCaseProofs(parser: CaseBlockParser): string[] {
  if (currentCaseContent(parser)?.text !== "Proves:") {
    reportCaseDiagnostic(
      parser,
      "case.proves-missing",
      `Case ${parser.id} has no Proves field`,
      currentCaseContent(parser)?.line
    );
    return [];
  }
  parser.cursor += 1;
  const proves: string[] = [];
  while (currentCaseContent(parser) !== undefined) {
    const item = currentCaseContent(parser)!;
    const match = /^- (\S.*)$/.exec(item.text);
    if (match === null)
      reportCaseDiagnostic(
        parser,
        "case.proves-invalid",
        `Case ${parser.id} Proves must contain non-empty semantic bullets`,
        item.line
      );
    else proves.push(match[1]);
    parser.cursor += 1;
  }
  if (proves.length === 0)
    reportCaseDiagnostic(
      parser,
      "case.proves-empty",
      `Case ${parser.id} must have at least one non-empty Proves bullet`
    );
  return proves;
}

function currentCaseContent(parser: CaseBlockParser): CaseContentLine | undefined {
  return parser.content[parser.cursor];
}
function reportCaseDiagnostic(
  parser: CaseBlockParser,
  code: string,
  message: string,
  line = parser.options.start + 1
): void {
  parser.options.diagnostics.push(
    diagnostic(code, "case", message, { caseId: parser.id, path: parser.options.sourcePath, line })
  );
}

function findNextH2(lines: readonly string[], start: number): number {
  for (let index = start; index < lines.length; index += 1) {
    if (isH2(lines[index] ?? "")) {
      return index;
    }
  }
  return lines.length;
}

function isH2(line: string): boolean {
  return /^##(?:[ \t]|$)/u.test(line);
}
