import { cpSync, readFileSync, writeFileSync, existsSync } from "node:fs";
if (process.argv.length !== 2)
  throw new Error("arguments: this fixed-input historical helper accepts none");

const work = "/workspace/vibe-check/tmp/optimization-20261012/tokenizer";
const owner = "src/package-checks/function-metrics/analyzer";
for (const name of ["candidate-v3", "candidate-native-rejected"]) {
  if (existsSync(work + "/" + name)) throw new Error("refuse overwriting existing " + name);
}
cpSync(work + "/candidate", work + "/candidate-native-rejected", { recursive: true });
cpSync(work + "/candidate", work + "/candidate-v3", { recursive: true });
const sourcePath = work + "/candidate-v3/" + owner + "/shared/code-reader.ts";
const sourceCode = readFileSync(sourcePath, "utf8");
const baselineSource = readFileSync(work + "/baseline/" + owner + "/shared/code-reader.ts", "utf8");
const patchedSource = createCostDispatchCandidateSource(sourceCode, baselineSource);
writeFileSync(sourcePath, patchedSource);
console.log(
  JSON.stringify({
    candidate: "candidate-v3",
    retained: "candidate-native-rejected",
    status: "source preparation only; not executed"
  })
);
function createCostDispatchCandidateSource(sourceCode, baseline) {
  let patchedSource = sourceCode;
  const start = locateUniqueSourceMarker(patchedSource, {
    marker: "    // Investigation-only native matchAll candidate",
    sourceLabel: "v2 tokenizer"
  });
  const end = locateUniqueSourceMarker(patchedSource, {
    marker: "    if (macro) yield macro;",
    sourceLabel: "v2 tokenizer end",
    startOffset: start
  });
  patchedSource =
    patchedSource.slice(0, start) +
    `    // Investigation-only v3: cost dispatch, not syntax classification.
    const originalPattern = createTokenPattern(true, Boolean(templateLiteralPattern));
    const lastCommentOpen = sourceCode.lastIndexOf("/*");
    const lastCommentClose = sourceCode.lastIndexOf("*/");
    const lastTemplateDelimiter = templateLiteralPattern ? sourceCode.lastIndexOf("\u0060") : -1;
    const commentTailRisk = lastCommentOpen >= 0 && lastCommentOpen > lastCommentClose - 2;
    const templateTailRisk = Boolean(templateLiteralPattern) && lastTemplateDelimiter >= 0 &&
      sourceCode.indexOf("\u0024{", lastTemplateDelimiter + 1) !== -1;
    function* guardedMatches(): Generator<RegExpMatchArray> {
      let pattern = originalPattern;
      let includesComment = true;
      let includesTemplate = Boolean(templateLiteralPattern);
      let cursor = 0;
      while (cursor <= sourceCode.length) {
        const includeComment = includesComment && !(commentTailRisk && cursor > lastCommentClose - 2);
        const includeTemplate = includesTemplate && !(templateTailRisk && cursor === lastTemplateDelimiter);
        if (includeComment !== includesComment || includeTemplate !== includesTemplate) {
          pattern = createTokenPattern(includeComment, includeTemplate);
          includesComment = includeComment;
          includesTemplate = includeTemplate;
        }
        pattern.lastIndex = cursor;
        const boundary = Math.min(
          commentTailRisk && includesComment ? lastCommentClose - 1 : Infinity,
          templateTailRisk && includesTemplate && cursor <= lastTemplateDelimiter ? lastTemplateDelimiter : Infinity
        );
        let switched = false;
        for (const match of sourceCode.matchAll(pattern)) {
          cursor = match.index + match[0].length;
          if (match[0].length === 0) {
            const codePoint = sourceCode.codePointAt(cursor);
            cursor += codePoint !== undefined && codePoint > 0xffff ? 2 : 1;
          }
          yield match;
          if (cursor >= boundary) {
            switched = true;
            break;
          }
        }
        if (!switched) break;
      }
    }
    let macro = "";
    const matches = commentTailRisk || templateTailRisk ? guardedMatches() : sourceCode.matchAll(originalPattern);
    for (const match of matches) {
      const token = tokenFactory(new TokenMatch(match[0], match.index));
      if (macro) {
        if (token.includes("\\\\\\n") || !token.includes("\\n")) {
          macro += token;
        } else {
          yield macro;
          yield token;
          macro = "";
        }
      } else if (token === "#") {
        macro = token;
      } else {
        yield token;
      }
    }
` +
    patchedSource.slice(end);
  // Macro literal is copied byte-for-byte from frozen original to avoid template escaping drift.

  const baselineMethodStart = locateUniqueSourceMarker(baseline, {
    marker: "  public static *generateTokens(",
    sourceLabel: "baseline generateTokens"
  });
  const baselineBodyStart = locateUniqueSourceMarker(baseline, {
    marker: "      const token = tokenFactory",
    sourceLabel: "baseline macro body",
    startOffset: baselineMethodStart
  });
  const baselineBodyEnd = locateUniqueSourceMarker(baseline, {
    marker: "    }\n    if (macro) yield macro;",
    sourceLabel: "baseline macro end",
    startOffset: baselineBodyStart
  });
  const v3Start = locateUniqueSourceMarker(patchedSource, {
    marker: "    // Investigation-only v3:",
    sourceLabel: "v3 tokenizer"
  });
  const candidateBodyStart = locateUniqueSourceMarker(patchedSource, {
    marker: "      const token = tokenFactory",
    sourceLabel: "v3 macro body",
    startOffset: v3Start
  });
  const candidateBodyEnd = locateUniqueSourceMarker(patchedSource, {
    marker: "    }\n    if (macro) yield macro;",
    sourceLabel: "v3 macro end",
    startOffset: candidateBodyStart
  });
  patchedSource =
    patchedSource.slice(0, candidateBodyStart) +
    baseline.slice(baselineBodyStart, baselineBodyEnd) +
    patchedSource.slice(candidateBodyEnd);
  return patchedSource;
}
function locateUniqueSourceMarker(sourceCode, options) {
  const { marker, sourceLabel, startOffset = 0 } = options;
  const offset = sourceCode.indexOf(marker, startOffset);
  if (offset < 0 || sourceCode.indexOf(marker, offset + marker.length) !== -1)
    throw new Error(sourceLabel + ": expected exactly one source marker " + JSON.stringify(marker));
  return offset;
}
