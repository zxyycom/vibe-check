import fs from "node:fs";
if (process.argv.length !== 2)
  throw new Error("arguments: this fixed-input historical helper accepts none");

const work = "/workspace/vibe-check/tmp/optimization-20261012/tokenizer";
const sourceRelativePath = "src/package-checks/function-metrics/analyzer/shared/code-reader.ts";
if (fs.existsSync(work + "/candidate-v3.1")) throw new Error("refuse overwrite");
fs.cpSync(work + "/candidate-v3", work + "/candidate-v3.1", { recursive: true });
const sourcePath = work + "/candidate-v3.1/" + sourceRelativePath;
const sourceCode = fs.readFileSync(sourcePath, "utf8");
const patchedSource = createIndependentAdditionCandidateSource(sourceCode);
fs.writeFileSync(sourcePath, patchedSource);
console.log("prepared independent candidate-v3.1; v3 retained");
function createIndependentAdditionCandidateSource(sourceCode) {
  let source = sourceCode;
  source = replaceUniqueSourceFragment(
    source,
    "function* guardedMatches(): Generator<RegExpMatchArray>",
    "function* guardedMatches(): Generator<RegExpExecArray>"
  );
  source = replaceUniqueSourceFragment(
    source,
    "    const matches = commentTailRisk || templateTailRisk ? guardedMatches() : sourceCode.matchAll(originalPattern);",
    '    // Non-alternative additions may quantify the preceding comment slash.\n    const tailGuardEligible = cleanedAddition === "" || cleanedAddition.startsWith("|");\n    const matches = tailGuardEligible && (commentTailRisk || templateTailRisk)\n      ? guardedMatches()\n      : sourceCode.matchAll(originalPattern);'
  );
  return source;
}
function replaceUniqueSourceFragment(sourceCode, before, after) {
  if (sourceCode.split(before).length !== 2)
    throw new Error(
      "v3.1 preparation: expected exactly one source fragment " + JSON.stringify(before)
    );
  return sourceCode.replace(before, after);
}
