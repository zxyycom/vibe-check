import { cpSync, readFileSync, writeFileSync } from "node:fs";
if (process.argv.length !== 2)
  throw new Error("arguments: this fixed-input historical helper accepts none");

const work = "/workspace/vibe-check/tmp/optimization-20261012/tokenizer";
const sourcePath =
  work + "/candidate/src/package-checks/function-metrics/analyzer/shared/code-reader.ts";
cpSync(work + "/candidate", work + "/candidate-exec-rejected", { recursive: true });
const sourceCode = readFileSync(sourcePath, "utf8");
const patchedSource = createNativeCandidateSource(sourceCode);
writeFileSync(sourcePath, patchedSource);
console.log(
  JSON.stringify({
    candidate: "native-matchAll-tail-boundaries",
    retained: "candidate-exec-rejected"
  })
);

function createNativeCandidateSource(sourceCode) {
  let source = sourceCode;
  const start = locateUniqueSourceMarker(source, {
    marker: "    // Investigation-only candidate:",
    sourceLabel: "v1 tokenizer"
  });
  const bodyStart = locateUniqueSourceMarker(source, {
    marker: "      const token = tokenFactory",
    sourceLabel: "v1 tokenizer body",
    startOffset: start
  });
  const bodyEnd = locateUniqueSourceMarker(source, {
    marker: "    }\n    if (macro) yield macro;",
    sourceLabel: "v1 tokenizer body end",
    startOffset: bodyStart
  });
  const body = source
    .slice(bodyStart, bodyEnd)
    .split("\n")
    .map((line) => (line ? "  " + line : line))
    .join("\n");
  source =
    source.slice(0, start) +
    `    // Investigation-only native matchAll candidate, full-source cursor retained.
    const lastCommentClose = sourceCode.lastIndexOf("*/");
    const lastTemplateDelimiter = templateLiteralPattern ? sourceCode.lastIndexOf("\u0060") : -1;
    let includesComment = true;
    let includesTemplate = Boolean(templateLiteralPattern);
    let pattern = createTokenPattern(includesComment, includesTemplate);
    let cursor = 0;
    let macro = "";
    while (cursor <= sourceCode.length) {
      const includeComment = cursor <= lastCommentClose - 2;
      const includeTemplate = Boolean(templateLiteralPattern) && cursor < lastTemplateDelimiter;
      if (includeComment !== includesComment || includeTemplate !== includesTemplate) {
        pattern = createTokenPattern(includeComment, includeTemplate);
        includesComment = includeComment;
        includesTemplate = includeTemplate;
      }
      pattern.lastIndex = cursor;
      const boundary = Math.min(
        includesComment ? lastCommentClose - 1 : Infinity,
        includesTemplate ? lastTemplateDelimiter : Infinity
      );
      let switched = false;
      for (const match of sourceCode.matchAll(pattern)) {
${body}        cursor = match.index + match[0].length;
        if (match[0].length === 0) {
          const codePoint = sourceCode.codePointAt(cursor);
          cursor += codePoint !== undefined && codePoint > 0xffff ? 2 : 1;
        }
        if (cursor >= boundary) {
          switched = true;
          break;
        }
      }
      if (!switched) break;
    }
` +
    source.slice(bodyEnd + "    }\n".length);
  return source;
}
function locateUniqueSourceMarker(sourceCode, options) {
  const { marker, sourceLabel, startOffset = 0 } = options;
  const offset = sourceCode.indexOf(marker, startOffset);
  if (offset < 0 || sourceCode.indexOf(marker, offset + marker.length) !== -1)
    throw new Error(sourceLabel + ": expected exactly one source marker " + JSON.stringify(marker));
  return offset;
}
