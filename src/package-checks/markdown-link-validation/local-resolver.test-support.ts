import { strict as assert } from "node:assert";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { createMarkdownLocalResolver } from "./local-resolver.ts";
import type { MarkdownLinkSource, MarkdownLocalResolutionRequest } from "./local-resolver.ts";

export async function createdResolver(
  root: string,
  maxTargetReads: number,
  cache: Parameters<typeof createMarkdownLocalResolver>[2] = Object.freeze({ enabled: false }),
  signal: AbortSignal = new AbortController().signal
) {
  const creation = await createMarkdownLocalResolver(root, maxTargetReads, cache, signal);
  assert.equal(creation.ok, true);
  if (!creation.ok) {
    assert.fail("expected resolver");
  }
  return creation.resolver;
}

export async function readSource(
  resolver: Awaited<ReturnType<typeof createdResolver>>,
  rootRelativePath: string
): Promise<MarkdownLinkSource> {
  const source = await resolver.readSource(rootRelativePath, 1_024);
  assert.equal(source.ok, true);
  if (!source.ok) {
    assert.fail("expected source");
  }
  return source.source;
}

export function requestFor(
  source: MarkdownLinkSource,
  rawDestination: string,
  overrides: Partial<MarkdownLocalResolutionRequest> = {}
): MarkdownLocalResolutionRequest {
  return {
    source,
    rawDestination,
    rootExternalTargetMode: "report",
    requireExistingTargets: true,
    requireNonEmptyDirectories: false,
    validateSameDocumentAnchors: true,
    validateCrossDocumentAnchors: true,
    maxMarkdownBytes: 1_024,
    ...overrides
  };
}

export function validTarget(
  kind: "same-document" | "project-file" | "project-directory" | "project-path",
  relativePath: string,
  fragment: string | null
) {
  return { kind: "valid" as const, target: projectTarget(kind, relativePath, fragment) };
}

export function validOutsideTarget() {
  return { kind: "valid" as const, target: outsideProjectRootTarget() };
}

export function projectTarget(
  kind: "same-document" | "project-file" | "project-directory" | "project-path",
  relativePath: string,
  fragment: string | null
) {
  return { kind, path: relativePath, fragment };
}

export function outsideProjectRootTarget() {
  return { kind: "outside-project-root" as const };
}

interface Fixture {
  readonly root: string;
  readonly outside: string;
}

export async function withFixture(action: (fixture: Fixture) => Promise<void>): Promise<void> {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "vibe-check-link-resolver-"));
  const fixture = {
    root: path.join(workspace, "root"),
    outside: path.join(workspace, "outside")
  };
  try {
    await mkdir(fixture.root);
    await mkdir(fixture.outside);
    await action(fixture);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

export async function writeFixtureFile(
  root: string,
  relativePath: string,
  content: string
): Promise<void> {
  const filePath = path.join(root, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
}
