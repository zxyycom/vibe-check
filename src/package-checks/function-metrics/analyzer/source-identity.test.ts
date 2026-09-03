/**
 * Source-identity evidence for the Lizard 1.24.0 source-aligned port.
 * The root provenance inventory owns source hashes, SPDX, and target paths;
 * this fixture only names symbols and explicit host seams to verify.
 */

import { strict as assert } from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import * as ts from "typescript";

const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const EVIDENCE_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures/lizard-1.24.0/evidence"
);
const IDENTITY_MANIFEST_PATH = resolve(EVIDENCE_ROOT, "lizard-1.24-source-identity.json");
const PROVENANCE_PATH = resolve(WORKSPACE_ROOT, "licenses/lizard-1.24.0-provenance.json");
const PROVENANCE_RELATIVE_PATH = "licenses/lizard-1.24.0-provenance.json";
const CURRENT_SOURCE_ROOT = resolve(WORKSPACE_ROOT, "src");
const ARCHIVED_CHANGE_PATH_SEGMENT = ["changes", "archive"].join("/");

const MAPPING_VOCABULARY = new Set([
  "direct",
  "python-constructor",
  "source-name-host-alias",
  "inherited-source-storage",
  "call-signature-host-seam",
  "string-subclass-host-seam",
  "host-casing-seam",
  "dynamic-attribute-host-seam",
  "entry-surface-host-seam",
  "field-initializer-host-seam"
]);
const FIXED_IDENTITY_COUNTS = {
  classes: 83,
  entries: 46,
  symbols: 820,
  targets: 41
} as const;
const FIXED_UPSTREAM = {
  project: "terryyin/lizard",
  revision: "308b1c3efd8c1c69bcc3eb82deeaec64fd3662ec",
  tag: "1.24.0"
} as const;
const FIXED_STATUS_VOCABULARY = [
  "deferred-extension-body",
  "excluded-entry-surface",
  "translated"
] as const;

type TargetRole = "additional" | "primary";

interface SourceReference {
  readonly sourcePath: string;
  readonly sourceRange: string;
}

interface TargetReference {
  readonly className?: string;
  readonly provenance?: SourceReference;
  readonly static?: boolean;
  readonly symbol: string;
  readonly targetRole?: TargetRole;
}

interface SymbolMapping {
  readonly mapping: string;
  readonly reason?: string;
  readonly sourceName: string;
  readonly target: TargetReference;
}

interface TargetSeam extends SymbolMapping {
  readonly targetRole: TargetRole;
}

interface ClassMapping {
  readonly classFields: readonly SymbolMapping[];
  readonly instanceFields: readonly SymbolMapping[];
  readonly methods: readonly SymbolMapping[];
  readonly sourceName: string;
  readonly targetName: string;
}

interface IdentityEntry extends SourceReference {
  readonly classes: readonly ClassMapping[];
  readonly moduleFields: readonly SymbolMapping[];
  readonly moduleFunctions: readonly SymbolMapping[];
  readonly targetSeams?: readonly TargetSeam[];
}

interface IdentityManifest {
  readonly counts: {
    readonly classes: number;
    readonly entries: number;
    readonly symbols: number;
    readonly targets: number;
  };
  readonly entries: readonly IdentityEntry[];
  readonly mappingVocabulary: readonly string[];
  readonly provenancePath: string;
  readonly schemaVersion: number;
  readonly scope: string;
}

interface ProvenanceEntry {
  readonly additionalTargetPaths?: readonly string[];
  readonly range: string;
  readonly sha256: string;
  readonly sourcePath: string;
  readonly spdx: string;
  readonly status: string;
  readonly targetPath?: string;
}

interface ProvenanceLedger {
  readonly files: readonly ProvenanceEntry[];
  readonly schemaVersion: number;
  readonly statusVocabulary: readonly string[];
  readonly upstream: {
    readonly project: string;
    readonly revision: string;
    readonly tag: string;
  };
}

interface TranslatedInventory {
  readonly entriesByKey: ReadonlyMap<string, ProvenanceEntry>;
  readonly sourceKeys: ReadonlySet<string>;
  readonly targetPaths: ReadonlySet<string>;
  readonly translatedEntries: readonly ProvenanceEntry[];
}

test("fixed Lizard reader/shared source identities map to translated symbols or named host seams", () => {
  assertNoArchivedChangeReadsFromCurrentSource();

  const manifest = readJson<IdentityManifest>(IDENTITY_MANIFEST_PATH);
  const provenance = readJson<ProvenanceLedger>(PROVENANCE_PATH);
  const inventory = assertTranslatedInventory(provenance);

  assertManifestShape(manifest, inventory);

  const sourceFiles = new Map<string, ts.SourceFile>();
  const targetClassNames = new Set<string>();
  const manifestSourceKeys = new Set<string>();
  const mappedTargetPaths = new Set<string>();
  let mappedClassCount = 0;
  let mappedSymbolCount = 0;

  for (const entry of manifest.entries) {
    assertNoCompetingProvenanceFacts(entry);
    const sourceKey = sourceReferenceKey(entry);
    assert.ok(manifestSourceKeys.add(sourceKey), `identity manifest duplicates ${sourceKey}`);

    const provenanceEntry = inventory.entriesByKey.get(sourceKey);
    assert.ok(
      provenanceEntry,
      `identity manifest has no translated provenance entry for ${sourceKey}`
    );
    const primaryTargetPath = targetPathForRole(provenanceEntry, "primary");
    const verifiedEntryTargetPaths = new Set<string>();
    const entryTarget = sourceFile(primaryTargetPath, sourceFiles);

    assert.ok(
      entry.moduleFunctions.length +
        entry.moduleFields.length +
        entry.classes.length +
        (entry.targetSeams?.length ?? 0) >
        0,
      `${sourceKey}: identity entry must name a symbol or host seam`
    );
    assertAllModuleSymbols(
      entry.moduleFunctions,
      provenanceEntry,
      entryTarget,
      sourceKey,
      "function",
      inventory,
      sourceFiles,
      verifiedEntryTargetPaths
    );
    assertAllModuleSymbols(
      entry.moduleFields,
      provenanceEntry,
      entryTarget,
      sourceKey,
      "field",
      inventory,
      sourceFiles,
      verifiedEntryTargetPaths
    );
    mappedSymbolCount += entry.moduleFunctions.length + entry.moduleFields.length;

    for (const classMapping of entry.classes) {
      mappedClassCount += 1;
      assert.ok(
        findClass(entryTarget, classMapping.targetName),
        `${sourceKey}:${classMapping.sourceName} is absent from ${primaryTargetPath}`
      );
      assert.ok(
        targetClassNames.add(`${primaryTargetPath}:${classMapping.targetName}`),
        `${sourceKey}:${classMapping.sourceName} duplicates a target class identity`
      );
      verifiedEntryTargetPaths.add(primaryTargetPath);

      mappedSymbolCount += assertAllClassSymbols(
        classMapping,
        provenanceEntry,
        sourceKey,
        inventory,
        sourceFiles,
        verifiedEntryTargetPaths
      );
    }

    for (const targetSeam of entry.targetSeams ?? []) {
      mappedSymbolCount += assertTargetSeam(
        targetSeam,
        provenanceEntry,
        sourceKey,
        sourceFiles,
        verifiedEntryTargetPaths
      );
    }

    assert.ok(
      verifiedEntryTargetPaths.has(primaryTargetPath),
      `${sourceKey}: identity entry has no AST-verified primary target mapping`
    );
    for (const targetPath of verifiedEntryTargetPaths) mappedTargetPaths.add(targetPath);
  }

  assertSetEquality(manifestSourceKeys, inventory.sourceKeys, "translated source/range coverage");
  assertSetEquality(mappedTargetPaths, inventory.targetPaths, "translated target coverage");
  assert.equal(mappedClassCount, manifest.counts.classes);
  assert.equal(mappedSymbolCount, manifest.counts.symbols);
});

function assertManifestShape(manifest: IdentityManifest, inventory: TranslatedInventory): void {
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.provenancePath, PROVENANCE_RELATIVE_PATH);
  assert.ok(manifest.scope.length > 0, "identity manifest scope must be non-empty");
  assert.equal(manifest.mappingVocabulary.length, MAPPING_VOCABULARY.size);
  assert.deepEqual(new Set(manifest.mappingVocabulary), MAPPING_VOCABULARY);
  assert.deepEqual(manifest.counts, FIXED_IDENTITY_COUNTS);
  assert.equal(manifest.entries.length, inventory.translatedEntries.length);
  assert.equal(manifest.counts.entries, manifest.entries.length);
  assert.equal(manifest.counts.targets, inventory.targetPaths.size);
  assert.equal(JSON.stringify(manifest).includes('"sha256"'), false);
  assert.equal(JSON.stringify(manifest).includes('"spdx"'), false);
  assert.equal(JSON.stringify(manifest).includes('"targetPath"'), false);
}

function assertTranslatedInventory(provenance: ProvenanceLedger): TranslatedInventory {
  assert.equal(provenance.schemaVersion, 2);
  assert.deepEqual(provenance.upstream, FIXED_UPSTREAM);
  assert.deepEqual([...provenance.statusVocabulary].sort(), [...FIXED_STATUS_VOCABULARY]);
  const entriesByKey = new Map<string, ProvenanceEntry>();
  const sourceKeys = new Set<string>();
  const targetPaths = new Set<string>();
  const translatedEntries = provenance.files.filter((entry) => entry.status === "translated");

  assert.equal(translatedEntries.length, FIXED_IDENTITY_COUNTS.entries);

  for (const entry of translatedEntries) {
    assertProvenanceEntryShape(entry);
    const sourceKey = sourceReferenceKey({
      sourcePath: entry.sourcePath,
      sourceRange: entry.range
    });
    assert.ok(sourceKeys.add(sourceKey), `root provenance duplicates translated ${sourceKey}`);
    entriesByKey.set(sourceKey, entry);
    targetPaths.add(targetPathForRole(entry, "primary"));
    for (const targetPath of entry.additionalTargetPaths ?? []) {
      assertWorkspaceTargetPath(targetPath);
      targetPaths.add(targetPath);
    }
  }

  assert.equal(targetPaths.size, FIXED_IDENTITY_COUNTS.targets);
  return { entriesByKey, sourceKeys, targetPaths, translatedEntries };
}

function assertProvenanceEntryShape(entry: ProvenanceEntry): void {
  assertNonEmptyString(entry.sourcePath, "root provenance sourcePath");
  assertNonEmptyString(entry.range, `${entry.sourcePath}: root provenance range`);
  assert.match(entry.sha256, /^[a-f0-9]{64}$/u, `${entry.sourcePath}: source hash must be SHA-256`);
  assertNonEmptyString(entry.spdx, `${entry.sourcePath}: SPDX`);
  assert.equal(entry.status, "translated");
  assertWorkspaceTargetPath(targetPathForRole(entry, "primary"));
  if (entry.additionalTargetPaths !== undefined) {
    assert.ok(Array.isArray(entry.additionalTargetPaths));
    assert.equal(new Set(entry.additionalTargetPaths).size, entry.additionalTargetPaths.length);
  }
}

function assertNoCompetingProvenanceFacts(entry: IdentityEntry): void {
  assert.equal(Object.hasOwn(entry, "sourceSha256"), false);
  assert.equal(Object.hasOwn(entry, "targetPath"), false);
}

function assertAllModuleSymbols(
  mappings: readonly SymbolMapping[],
  provenanceEntry: ProvenanceEntry,
  entryTarget: ts.SourceFile,
  sourceKey: string,
  expectedKind: "field" | "function",
  inventory: TranslatedInventory,
  sourceFiles: Map<string, ts.SourceFile>,
  verifiedTargetPaths: Set<string>
): void {
  for (const mapping of mappings) {
    assertMappingShape(mapping, sourceKey);
    assert.equal(
      mapping.target.className,
      undefined,
      `${sourceKey}:${mapping.sourceName} module ${expectedKind} cannot target a class member`
    );
    const targetPath = targetPathForMapping(provenanceEntry, mapping.target, inventory);
    const target =
      targetPath === targetPathForRole(provenanceEntry, "primary")
        ? entryTarget
        : sourceFile(targetPath, sourceFiles);
    assert.ok(
      expectedKind === "function"
        ? hasModuleFunction(target, mapping.target.symbol)
        : hasModuleField(target, mapping.target.symbol),
      `${sourceKey}:${mapping.sourceName} is missing target module ${expectedKind} ${mapping.target.symbol}`
    );
    verifiedTargetPaths.add(targetPath);
  }
}

function assertAllClassSymbols(
  classMapping: ClassMapping,
  provenanceEntry: ProvenanceEntry,
  sourceKey: string,
  inventory: TranslatedInventory,
  sourceFiles: Map<string, ts.SourceFile>,
  verifiedTargetPaths: Set<string>
): number {
  const allMappings = [
    ...classMapping.methods,
    ...classMapping.classFields,
    ...classMapping.instanceFields
  ];
  const sourceNames = new Set<string>();

  for (const mapping of allMappings) {
    assertMappingShape(mapping, `${sourceKey}:${classMapping.sourceName}`);
    assert.ok(
      sourceNames.add(mapping.sourceName),
      `${sourceKey}:${classMapping.sourceName} maps ${mapping.sourceName} more than once`
    );

    const targetPath = targetPathForMapping(provenanceEntry, mapping.target, inventory);
    const targetClassName = mapping.target.className ?? classMapping.targetName;
    const targetSource = sourceFile(targetPath, sourceFiles);
    const targetClass = findClass(targetSource, targetClassName);
    assert.ok(
      targetClass,
      `${sourceKey}:${classMapping.sourceName} targets missing ${targetPath}:${targetClassName}`
    );
    assert.ok(
      hasClassMember(targetClass, mapping.target),
      `${sourceKey}:${classMapping.sourceName}.${mapping.sourceName} is missing target ${targetPath}:${targetClassName}.${mapping.target.symbol}`
    );
    verifiedTargetPaths.add(targetPath);
  }

  return allMappings.length;
}

function assertTargetSeam(
  targetSeam: TargetSeam,
  provenanceEntry: ProvenanceEntry,
  sourceKey: string,
  sourceFiles: Map<string, ts.SourceFile>,
  verifiedTargetPaths: Set<string>
): number {
  assertMappingShape(targetSeam, sourceKey);
  assert.equal(
    targetSeam.target.provenance,
    undefined,
    `${sourceKey}: target seam must use its entry provenance`
  );
  assert.equal(
    targetSeam.target.targetRole,
    undefined,
    `${sourceKey}: target seam role belongs on the seam`
  );
  const targetPath = targetPathForRole(provenanceEntry, targetSeam.targetRole);
  const target = sourceFile(targetPath, sourceFiles);
  if (targetSeam.target.className === undefined) {
    assert.ok(
      hasModuleFunction(target, targetSeam.target.symbol),
      `${sourceKey}:${targetSeam.sourceName} is missing target seam ${targetPath}:${targetSeam.target.symbol}`
    );
  } else {
    const targetClass = findClass(target, targetSeam.target.className);
    assert.ok(
      targetClass,
      `${sourceKey}:${targetSeam.sourceName} targets missing ${targetPath}:${targetSeam.target.className}`
    );
    assert.ok(
      hasClassMember(targetClass, targetSeam.target),
      `${sourceKey}:${targetSeam.sourceName} is missing target seam ${targetPath}:${targetSeam.target.className}.${targetSeam.target.symbol}`
    );
  }
  verifiedTargetPaths.add(targetPath);
  return 1;
}

function assertMappingShape(mapping: SymbolMapping, location: string): void {
  assert.ok(
    MAPPING_VOCABULARY.has(mapping.mapping),
    `${location}: unknown mapping ${mapping.mapping}`
  );
  assertNonEmptyString(mapping.sourceName, `${location}: source symbol`);
  assertNonEmptyString(mapping.target.symbol, `${location}:${mapping.sourceName}: target symbol`);
  assert.equal(
    Object.hasOwn(mapping.target, "path"),
    false,
    `${location}: target paths belong to root provenance`
  );
  if (mapping.target.provenance !== undefined) {
    assertNonEmptyString(
      mapping.target.provenance.sourcePath,
      `${location}: target provenance sourcePath`
    );
    assertNonEmptyString(
      mapping.target.provenance.sourceRange,
      `${location}: target provenance sourceRange`
    );
  }
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

function targetPathForMapping(
  entryProvenance: ProvenanceEntry,
  target: TargetReference,
  inventory: TranslatedInventory
): string {
  if (target.provenance === undefined) {
    assert.equal(target.targetRole, undefined, "a target role requires a provenance reference");
    return targetPathForRole(entryProvenance, "primary");
  }

  const referencedProvenance = inventory.entriesByKey.get(sourceReferenceKey(target.provenance));
  assert.ok(
    referencedProvenance,
    `target reference lacks translated root provenance: ${sourceReferenceKey(target.provenance)}`
  );
  return targetPathForRole(referencedProvenance, target.targetRole ?? "primary");
}

function targetPathForRole(entry: ProvenanceEntry, targetRole: TargetRole): string {
  if (targetRole === "primary") {
    assertNonEmptyString(
      entry.targetPath,
      `${entry.sourcePath}:${entry.range}: primary targetPath`
    );
    return entry.targetPath;
  }

  const additionalTargets = entry.additionalTargetPaths;
  assert.ok(additionalTargets, `${entry.sourcePath}:${entry.range} has no additional target path`);
  assert.equal(
    additionalTargets.length,
    1,
    `${entry.sourcePath}:${entry.range} must name exactly one additional target`
  );
  const targetPath = additionalTargets[0];
  assertNonEmptyString(targetPath, `${entry.sourcePath}:${entry.range}: additional targetPath`);
  return targetPath;
}

function assertNoArchivedChangeReadsFromCurrentSource(): void {
  for (const sourcePath of sourceFilesUnder(CURRENT_SOURCE_ROOT)) {
    const source = readFileSync(sourcePath, "utf8");
    assert.equal(
      source.includes(ARCHIVED_CHANGE_PATH_SEGMENT),
      false,
      `${relative(WORKSPACE_ROOT, sourcePath)} reads archived Change evidence instead of current evidence`
    );
  }
}

function sourceFilesUnder(directory: string): readonly string[] {
  const paths: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) paths.push(...sourceFilesUnder(path));
    else if (entry.isFile() && entry.name.endsWith(".ts")) paths.push(path);
  }
  return paths;
}

function sourceReferenceKey(reference: SourceReference): string {
  return `${reference.sourcePath}\u0000${reference.sourceRange}`;
}

function assertSetEquality(
  actual: ReadonlySet<string>,
  expected: ReadonlySet<string>,
  label: string
): void {
  assert.deepEqual([...actual].sort(), [...expected].sort(), label);
}

function sourceFile(path: string, cache: Map<string, ts.SourceFile>): ts.SourceFile {
  const cached = cache.get(path);
  if (cached) return cached;

  assertWorkspaceTargetPath(path);
  const absolutePath = resolve(WORKSPACE_ROOT, path);
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

function assertWorkspaceTargetPath(path: string): void {
  assertNonEmptyString(path, "translated target path");
  const absolutePath = resolve(WORKSPACE_ROOT, path);
  const pathFromWorkspace = relative(WORKSPACE_ROOT, absolutePath);
  assert.ok(
    pathFromWorkspace.length > 0 && !pathFromWorkspace.startsWith(".."),
    `identity target escapes the workspace: ${path}`
  );
  assert.ok(
    path.startsWith("src/package-checks/function-metrics/analyzer/"),
    `translated target escapes the analyzer root: ${path}`
  );
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`);
  assert.ok(value.length > 0, `${label} must be non-empty`);
}

function findClass(source: ts.SourceFile, name: string): ts.ClassDeclaration | undefined {
  let matchingClass: ts.ClassDeclaration | undefined;
  const visit = (node: ts.Node): void => {
    if (matchingClass) return;
    if (ts.isClassDeclaration(node) && node.name?.text === name) {
      matchingClass = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return matchingClass;
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
  /* oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The test checks the loaded evidence against closed schema invariants before consuming it. */
  return JSON.parse(readFileSync(path, "utf8")) as T;
}
