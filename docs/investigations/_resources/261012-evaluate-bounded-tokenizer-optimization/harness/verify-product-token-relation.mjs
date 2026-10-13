import fs from "node:fs";
import crypto from "node:crypto";
import ts from "typescript";

if (process.argv.length !== 2)
  throw new Error("arguments: this fixed-input historical helper accepts none");

const candidatePrefix = "tmp/optimization-20261012/tokenizer/candidate-v3.1/";
const sourcePaths = [
  "src/package-checks/function-metrics/analyzer/shared/code-reader.ts",
  "src/package-checks/function-metrics/analyzer/readers/typescript.ts",
  "src/package-checks/function-metrics/analyzer/readers/tsx.ts"
];
const digest = (sourceCode) => crypto.createHash("sha256").update(sourceCode).digest("hex");

function collectNonTriviaLeaves(sourceCode, options) {
  const { shouldEraseTypes, sourceLabel } = options;
  const parsedCode = shouldEraseTypes
    ? ts.transpileModule(sourceCode, {
        compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext }
      }).outputText
    : sourceCode;
  const sourceFile = ts.createSourceFile(
    sourceLabel,
    parsedCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  if (sourceFile.parseDiagnostics.length > 0) {
    const messages = sourceFile.parseDiagnostics.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
    );
    throw new Error(`${sourceLabel}: invalid source: ${messages.join("; ")}`);
  }
  const leaves = [];
  function visit(node) {
    const children = node.getChildren(sourceFile);
    if (children.length > 0) {
      for (const child of children) visit(child);
      return;
    }
    if (node.kind !== ts.SyntaxKind.EndOfFileToken)
      leaves.push([node.kind, node.getText(sourceFile)]);
  }
  visit(sourceFile);
  return leaves;
}

const rows = [];
for (const sourcePath of sourcePaths) {
  const candidateSource = fs.readFileSync(candidatePrefix + sourcePath, "utf8");
  const productionSource = fs.readFileSync(sourcePath, "utf8");
  const candidateTsLeaves = collectNonTriviaLeaves(candidateSource, {
    shouldEraseTypes: false,
    sourceLabel: candidatePrefix + sourcePath
  });
  const productionTsLeaves = collectNonTriviaLeaves(productionSource, {
    shouldEraseTypes: false,
    sourceLabel: sourcePath
  });
  const candidateJsLeaves = collectNonTriviaLeaves(candidateSource, {
    shouldEraseTypes: true,
    sourceLabel: candidatePrefix + sourcePath
  });
  const productionJsLeaves = collectNonTriviaLeaves(productionSource, {
    shouldEraseTypes: true,
    sourceLabel: sourcePath
  });
  rows.push({
    path: sourcePath,
    candidateSha256: digest(candidateSource),
    productionSha256: digest(productionSource),
    typescriptNonTriviaEqual:
      JSON.stringify(candidateTsLeaves) === JSON.stringify(productionTsLeaves),
    erasedJavascriptNonTriviaEqual:
      JSON.stringify(candidateJsLeaves) === JSON.stringify(productionJsLeaves),
    candidateJsTokens: candidateJsLeaves.length,
    productionJsTokens: productionJsLeaves.length
  });
}
const result = {
  capturedAt: new Date().toISOString(),
  typescriptVersion: ts.version,
  relation:
    "Production has formatter/comment edits and two explicit boolean annotations authorized after TS7022; parser-contextual erased JavaScript non-trivia leaf tokens must equal measured candidate-v3.1.",
  rows
};
fs.writeFileSync(
  "tmp/optimization-20261012/tokenizer/product-token-relation.json",
  JSON.stringify(result, null, 2) + "\n"
);
console.log(JSON.stringify(result));
if (rows.some((row) => !row.erasedJavascriptNonTriviaEqual)) process.exitCode = 1;
