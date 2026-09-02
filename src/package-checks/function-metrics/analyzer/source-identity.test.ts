/**
 * Derived from terryyin/lizard 1.23.0 source ranges recorded in the Change
 * provenance ledger. This test consumes only the checked-in identity manifest;
 * it does not add a runtime registry or reflection surface to the analyzer.
 */

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import * as ts from "typescript";

const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const EVIDENCE_ROOT = resolve(
  WORKSPACE_ROOT,
  "changes/archive/replace-lizard-with-typescript-function-analyzers/evidence"
);
const IDENTITY_MANIFEST_PATH = resolve(EVIDENCE_ROOT, "lizard-1.23-reader-source-identity.json");
const PROVENANCE_LEDGER_PATH = resolve(EVIDENCE_ROOT, "lizard-1.23-provenance-ledger.json");

const MAPPING_VOCABULARY = new Set([
  "direct",
  "python-constructor",
  "source-name-host-alias",
  "inherited-source-storage",
  "call-signature-host-seam",
  "string-subclass-host-seam"
]);
const FIXED_IDENTITY_COUNTS = {
  classes: 72,
  entries: 33,
  symbols: 687
} as const;

interface TargetReference {
  readonly path?: string;
  readonly className?: string;
  readonly static?: boolean;
  readonly symbol: string;
}

interface SymbolMapping {
  readonly mapping: string;
  readonly reason?: string;
  readonly sourceName: string;
  readonly target: TargetReference;
}

interface ClassMapping {
  readonly classFields: readonly SymbolMapping[];
  readonly instanceFields: readonly SymbolMapping[];
  readonly methods: readonly SymbolMapping[];
  readonly sourceName: string;
  readonly targetName: string;
}

interface IdentityEntry {
  readonly classes: readonly ClassMapping[];
  readonly moduleFields: readonly SymbolMapping[];
  readonly moduleFunctions: readonly SymbolMapping[];
  readonly sourcePath: string;
  readonly sourceRange: string;
  readonly sourceSha256: string;
  readonly targetPath: string;
}

interface IdentityManifest {
  readonly counts: {
    readonly classes: number;
    readonly entries: number;
    readonly symbols: number;
  };
  readonly entries: readonly IdentityEntry[];
  readonly mappingVocabulary: readonly string[];
  readonly schemaVersion: number;
}

interface ProvenanceEntry {
  readonly range: string;
  readonly sha256: string;
  readonly sourcePath: string;
  readonly status: string;
  readonly targetPath?: string;
}

interface ProvenanceLedger {
  readonly files: readonly ProvenanceEntry[];
}

test("fixed Lizard reader/shared source identities map to translated symbols or named host seams", () => {
  const manifest = readJson<IdentityManifest>(IDENTITY_MANIFEST_PATH);
  const provenance = readJson<ProvenanceLedger>(PROVENANCE_LEDGER_PATH);
  const translatedLanguageEntries = provenance.files.filter(
    (entry) => entry.status === "translated" && entry.sourcePath.startsWith("lizard_languages/")
  );

  assert.equal(manifest.schemaVersion, 1);
  assert.deepEqual(new Set(manifest.mappingVocabulary), MAPPING_VOCABULARY);
  assert.deepEqual(manifest.counts, FIXED_IDENTITY_COUNTS);
  assert.equal(manifest.entries.length, translatedLanguageEntries.length);
  assert.equal(manifest.counts.entries, manifest.entries.length);

  const provenanceBySourcePath = new Map(
    translatedLanguageEntries.map((entry) => [entry.sourcePath, entry])
  );
  const sourceFiles = new Map<string, ts.SourceFile>();
  const targetClassNames = new Set<string>();
  let mappedClassCount = 0;
  let mappedSymbolCount = 0;

  for (const entry of manifest.entries) {
    const provenanceEntry = provenanceBySourcePath.get(entry.sourcePath);
    assert.ok(
      provenanceEntry,
      `identity manifest has no translated provenance entry for ${entry.sourcePath}`
    );
    assert.equal(
      entry.sourceRange,
      provenanceEntry.range,
      `${entry.sourcePath}: source range drifted`
    );
    assert.equal(
      entry.sourceSha256,
      provenanceEntry.sha256,
      `${entry.sourcePath}: source hash drifted`
    );
    assert.equal(
      entry.targetPath,
      provenanceEntry.targetPath,
      `${entry.sourcePath}: target path drifted`
    );

    const entryTarget = sourceFile(entry.targetPath, sourceFiles);
    assertAllModuleSymbols(entry.moduleFunctions, entryTarget, entry.sourcePath, "function");
    assertAllModuleSymbols(entry.moduleFields, entryTarget, entry.sourcePath, "field");
    mappedSymbolCount += entry.moduleFunctions.length + entry.moduleFields.length;

    for (const classMapping of entry.classes) {
      mappedClassCount += 1;
      assert.ok(
        findClass(entryTarget, classMapping.targetName),
        `${entry.sourcePath}:${classMapping.sourceName} is absent from ${entry.targetPath}`
      );
      assert.ok(
        targetClassNames.add(`${entry.targetPath}:${classMapping.targetName}`),
        `${entry.sourcePath}:${classMapping.sourceName} duplicates a target class identity`
      );

      mappedSymbolCount += assertAllClassSymbols(classMapping, entry, sourceFiles);
    }
  }

  assert.equal(mappedClassCount, manifest.counts.classes);
  assert.equal(mappedSymbolCount, manifest.counts.symbols);
});

function assertAllModuleSymbols(
  mappings: readonly SymbolMapping[],
  source: ts.SourceFile,
  sourcePath: string,
  expectedKind: "field" | "function"
): void {
  for (const mapping of mappings) {
    assertMappingShape(mapping, sourcePath);
    assert.equal(
      mapping.target.className,
      undefined,
      `${sourcePath}:${mapping.sourceName} module ${expectedKind} cannot target a class member`
    );
    assert.equal(
      mapping.target.path,
      undefined,
      `${sourcePath}:${mapping.sourceName} module ${expectedKind} cannot target another module`
    );
    assert.ok(
      expectedKind === "function"
        ? hasModuleFunction(source, mapping.target.symbol)
        : hasModuleField(source, mapping.target.symbol),
      `${sourcePath}:${mapping.sourceName} is missing target module ${expectedKind} ${mapping.target.symbol}`
    );
  }
}

function assertAllClassSymbols(
  classMapping: ClassMapping,
  entry: IdentityEntry,
  sourceFiles: Map<string, ts.SourceFile>
): number {
  const allMappings = [
    ...classMapping.methods,
    ...classMapping.classFields,
    ...classMapping.instanceFields
  ];
  const sourceNames = new Set<string>();

  for (const mapping of allMappings) {
    assertMappingShape(mapping, `${entry.sourcePath}:${classMapping.sourceName}`);
    assert.ok(
      sourceNames.add(mapping.sourceName),
      `${entry.sourcePath}:${classMapping.sourceName} maps ${mapping.sourceName} more than once`
    );

    const targetPath = mapping.target.path ?? entry.targetPath;
    const targetClassName = mapping.target.className ?? classMapping.targetName;
    const targetSource = sourceFile(targetPath, sourceFiles);
    const targetClass = findClass(targetSource, targetClassName);
    assert.ok(
      targetClass,
      `${entry.sourcePath}:${classMapping.sourceName}.${mapping.sourceName} targets missing ${targetPath}:${targetClassName}`
    );
    assert.ok(
      hasClassMember(targetClass, mapping.target),
      `${entry.sourcePath}:${classMapping.sourceName}.${mapping.sourceName} is missing target ${targetPath}:${targetClassName}.${mapping.target.symbol}`
    );
  }

  return allMappings.length;
}

function assertMappingShape(mapping: SymbolMapping, location: string): void {
  assert.ok(
    MAPPING_VOCABULARY.has(mapping.mapping),
    `${location}: unknown mapping ${mapping.mapping}`
  );
  assert.ok(mapping.sourceName.length > 0, `${location}: source symbol is empty`);
  assert.ok(
    mapping.target.symbol.length > 0,
    `${location}:${mapping.sourceName}: target symbol is empty`
  );
  if (mapping.mapping === "direct") {
    assert.equal(
      mapping.sourceName,
      mapping.target.symbol,
      `${location}: direct mapping renamed a symbol`
    );
    return;
  }
  assert.ok(
    mapping.reason,
    `${location}:${mapping.sourceName}: non-direct mapping needs a host-seam reason`
  );
}

function sourceFile(path: string, cache: Map<string, ts.SourceFile>): ts.SourceFile {
  const cached = cache.get(path);
  if (cached) return cached;

  const absolutePath = resolve(WORKSPACE_ROOT, path);
  const pathFromWorkspace = relative(WORKSPACE_ROOT, absolutePath);
  assert.ok(
    pathFromWorkspace.length > 0 && !pathFromWorkspace.startsWith(".."),
    `identity target escapes the workspace: ${path}`
  );
  const parsed = ts.createSourceFile(
    absolutePath,
    readFileSync(absolutePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  cache.set(path, parsed);
  return parsed;
}

function findClass(source: ts.SourceFile, name: string): ts.ClassDeclaration | undefined {
  return source.statements.find(
    (statement): statement is ts.ClassDeclaration =>
      ts.isClassDeclaration(statement) && statement.name?.text === name
  );
}

function hasModuleFunction(source: ts.SourceFile, name: string): boolean {
  return source.statements.some(
    (statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === name
  );
}

function hasModuleField(source: ts.SourceFile, name: string): boolean {
  return source.statements.some(
    (statement) =>
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.some(
        (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === name
      )
  );
}

function hasClassMember(classDeclaration: ts.ClassDeclaration, target: TargetReference): boolean {
  if (target.symbol === "constructor") {
    return classDeclaration.members.some((member) => ts.isConstructorDeclaration(member));
  }

  return classDeclaration.members.some((member) => {
    if (classMemberName(member) !== target.symbol) return false;
    if (target.static === undefined) return true;
    return isStatic(member) === target.static;
  });
}

function classMemberName(member: ts.ClassElement): string | undefined {
  if (
    !(
      ts.isPropertyDeclaration(member) ||
      ts.isMethodDeclaration(member) ||
      ts.isGetAccessorDeclaration(member) ||
      ts.isSetAccessorDeclaration(member)
    )
  ) {
    return undefined;
  }

  return ts.isIdentifier(member.name) ||
    ts.isStringLiteral(member.name) ||
    ts.isNumericLiteral(member.name)
    ? member.name.text
    : undefined;
}

function isStatic(member: ts.ClassElement): boolean {
  return (ts.getCombinedModifierFlags(member) & ts.ModifierFlags.Static) !== 0;
}

function readJson<T>(path: string): T {
  /* oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The test checks the loaded evidence against its closed schema invariants before consuming it. */
  return JSON.parse(readFileSync(path, "utf8")) as T;
}
