import { readdirSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, join, dirname, relative } from "node:path";
import { createHash } from "node:crypto";

if (process.argv.length !== 2)
  throw new Error("arguments: this fixed-input historical helper accepts none");

const root = "/workspace/vibe-check";
const work = resolve(root, "tmp/optimization-20261012/tokenizer");
const candidate = resolve(work, "candidate");
const copied = [];
function copyProductionSources(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const source = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!["fixtures", "archive"].includes(entry.name)) copyProductionSources(source);
      continue;
    }
    if (
      !entry.isFile() ||
      !entry.name.endsWith(".ts") ||
      /(?:test|test-support)\.ts$/.test(entry.name)
    )
      continue;
    const target = join(candidate, relative(root, source));
    mkdirSync(dirname(target), { recursive: true });
    const bytes = readFileSync(source);
    writeFileSync(target, bytes);
    copied.push({
      path: relative(root, source),
      sha256: createHash("sha256").update(bytes).digest("hex")
    });
  }
}
copyProductionSources(join(root, "src"));
function applyUniqueReplacements(sourceCode, changes, sourcePath) {
  let patchedSource = sourceCode;
  for (const [before, after] of changes) {
    if (patchedSource.split(before).length !== 2)
      throw new Error("Nonunique patch: " + sourcePath + " " + JSON.stringify(before));
    patchedSource = patchedSource.replace(before, after);
  }
  return patchedSource;
}
function patchSnapshotSource(sourcePath, changes) {
  const targetPath = join(candidate, sourcePath);
  const sourceCode = readFileSync(targetPath, "utf8");
  const patchedSource = applyUniqueReplacements(sourceCode, changes, sourcePath);
  writeFileSync(targetPath, patchedSource);
}
const owner = "src/package-checks/function-metrics/analyzer";
patchSnapshotSource(`${owner}/shared/code-reader.ts`, [
  [
    "tokenFactory: TokenFactory = (match) => match.text\n  ): Generator<string>",
    'tokenFactory: TokenFactory = (match) => match.text,\n    templateLiteralPattern = ""\n  ): Generator<string>'
  ],
  [
    "const tokenPattern = new RegExp(",
    "const createTokenPattern = (includeComment: boolean, includeTemplate: boolean): RegExp => new RegExp("
  ],
  [
    "String.raw`\\/\\*.*?\\*\\/` +\n        cleanedAddition +",
    '(includeComment ? String.raw`\\/\\*.*?\\*\\/` : "(?!)") +\n        cleanedAddition +\n        (includeTemplate && templateLiteralPattern ? `|${normalizePythonRegex(templateLiteralPattern)}` : "") +'
  ],
  [
    '    let macro = "";\n    for (const match of sourceCode.matchAll(tokenPattern)) {',
    `    // Investigation-only candidate: retain complete-source anchors/offsets.
    const lastCommentClose = sourceCode.lastIndexOf("*/");
    const lastTemplateDelimiter = templateLiteralPattern ? sourceCode.lastIndexOf("\u0060") : -1;
    // Compile original alternatives first to preserve regex construction failure.
    let pattern = createTokenPattern(true, true);
    let includesComment = true;
    let includesTemplate = true;
    function* matches(): Generator<RegExpExecArray> {
      let cursor = 0;
      while (cursor <= sourceCode.length) {
        const includeComment = cursor <= lastCommentClose - 2;
        const includeTemplate = Boolean(templateLiteralPattern) && cursor < lastTemplateDelimiter;
        if (includeComment !== includesComment || includeTemplate !== includesTemplate) {
          pattern = createTokenPattern(includeComment, includeTemplate);
          includesComment = includeComment;
          includesTemplate = includeTemplate;
        }
        pattern.lastIndex = cursor;
        const match = pattern.exec(sourceCode);
        if (!match) return;
        cursor = match.index + match[0].length;
        if (match[0].length === 0) {
          const codePoint = sourceCode.codePointAt(cursor);
          cursor += codePoint !== undefined && codePoint > 0xffff ? 2 : 1;
        }
        yield match;
      }
    }
    let macro = "";
    for (const match of matches()) {`
  ]
]);
for (const reader of ["typescript", "tsx"]) {
  patchSnapshotSource(`${owner}/readers/${reader}.ts`, [
    ["|${TEMPLATE_LITERAL}`;", "`;"],
    [
      `CodeReader.generateTokens(sourceCode, ${reader === "typescript" ? "typeScript" : "tsx"}Addition, tokenFactory)`,
      `CodeReader.generateTokens(sourceCode, ${reader === "typescript" ? "typeScript" : "tsx"}Addition, tokenFactory, TEMPLATE_LITERAL)`
    ]
  ]);
}
writeFileSync(
  join(work, "copy-manifest.json"),
  JSON.stringify({ root, candidate, sourceFiles: copied }, null, 2) + "\n"
);
console.log(JSON.stringify({ candidate, sourceFiles: copied.length }));
