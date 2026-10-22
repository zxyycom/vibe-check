/** Investigation-only source transformations. Compiled into temporary bundles, never written to src. */
export type Variant = "baseline" | "thin" | "callback";
export function once(source: string, before: string, after: string) {
  if (source.split(before).length !== 2) throw new Error(`Expected one source seam: ${before}`);
  return source.replace(before, after);
}

const thin = String.raw`
export async function probeRootContainedPath(root: string, candidate: string): Promise<RootProbe> {
  if (!isWithinRoot(root, candidate)) return Object.freeze({ kind: "outside" as const });
  let current = root;
  let segments = relativeSegments(root, candidate);
  let index = 0;
  let hops = 0;
  while (index < segments.length) {
    const next = path.join(current, segments[index]!);
    let status: Awaited<ReturnType<typeof lstat>>;
    try { status = await lstat(next); }
    catch (error) { return Object.freeze(isNotFound(error)
      ? { kind: "missing" as const, absolutePath: next } : { kind: "unavailable" as const }); }
    if (!status.isSymbolicLink()) {
      if (index + 1 === segments.length) return Object.freeze({ kind: "contained" as const,
        absolutePath: next, endpoint: endpointFromStatus(status) });
      current = next; index += 1; continue;
    }
    if (hops >= 40) return Object.freeze({ kind: "unavailable" as const });
    let destination: string;
    try { destination = path.resolve(path.dirname(next), await readlink(next)); }
    catch { return Object.freeze({ kind: "unavailable" as const }); }
    if (!isWithinRoot(root, destination)) return Object.freeze({ kind: "outside" as const });
    segments = [...relativeSegments(root, destination), ...segments.slice(index + 1)];
    current = root; index = 0; hops += 1;
  }
  return Object.freeze({ kind: "contained" as const, absolutePath: current });
}
`;

const callback = String.raw`
export function probeRootContainedPath(root: string, candidate: string, signal?: AbortSignal): Promise<RootProbe> {
  return new Promise((resolve) => {
    let current = root;
    let segments: string[] = [];
    let index = 0;
    let hops = 0;
    let completed = false;
    function finish(result: RootProbe) {
      if (!completed) { completed = true; resolve(Object.freeze(result)); }
    }
    function cancelled() {
      if (signal?.aborted) { finish({ kind: "unavailable" }); return true; }
      return completed;
    }
    function advance() {
      if (cancelled()) return;
      if (index >= segments.length) { finish({ kind: "contained", absolutePath: current }); return; }
      const next = path.join(current, segments[index]!);
      lstatCallback(next, (error, status) => {
        if (cancelled()) return;
        if (error) { finish(isNotFound(error) ? { kind: "missing", absolutePath: next } : { kind: "unavailable" }); return; }
        if (!status.isSymbolicLink()) {
          if (index + 1 === segments.length) {
            finish({ kind: "contained", absolutePath: next, endpoint: endpointFromStatus(status) }); return;
          }
          current = next; index += 1; advance(); return;
        }
        if (hops >= 40) { finish({ kind: "unavailable" }); return; }
        readlinkCallback(next, (linkError, link) => {
          if (cancelled()) return;
          if (linkError) { finish({ kind: "unavailable" }); return; }
          const destination = path.resolve(path.dirname(next), link);
          if (!isWithinRoot(root, destination)) { finish({ kind: "outside" }); return; }
          segments = [...relativeSegments(root, destination), ...segments.slice(index + 1)];
          current = root; index = 0; hops += 1; advance();
        });
      });
    }
    if (cancelled()) return;
    if (!isWithinRoot(root, candidate)) { finish({ kind: "outside" }); return; }
    segments = relativeSegments(root, candidate);
    advance();
  });
}
`;

export function transform(source: string, file: string, variant: Variant): string {
  if (variant === "baseline") return source;
  if (file.endsWith("/markdown-link-validation/filesystem-probes.ts")) {
    const start = source.indexOf("interface RootContainedPathProbeState");
    const end = source.indexOf("export async function probeEndpoint(");
    if (start < 0 || end <= start) throw new Error("Cannot locate probe region");
    source = source.slice(0, start) + (variant === "thin" ? thin : callback) + source.slice(end);
    if (variant === "callback") source = once(source, 'import { constants } from "node:fs";',
      'import { constants, lstat as lstatCallback, readlink as readlinkCallback } from "node:fs";');
  }
  if (variant !== "callback") return source;
  if (file.endsWith("/markdown-link-validation/source-reader.ts")) {
    source = once(source, "probeRootContainedPath(request.canonicalProjectRoot, sourcePath)",
      "probeRootContainedPath(request.canonicalProjectRoot, sourcePath, request.signal)");
  }
  if (file.endsWith("/markdown-link-validation/target-observation.ts")) {
    source = once(source, "export async function authorizeTargetNode(\n  node: TargetNode,\n  root: string",
      "export async function authorizeTargetNode(\n  node: TargetNode,\n  root: string, signal?: AbortSignal");
    source = once(source, "observeContainedEndpoint(node, root)", "observeContainedEndpoint(node, root, signal)");
    source = once(source, "async function observeContainedEndpoint(\n  node: TargetNode,\n  root: string",
      "async function observeContainedEndpoint(\n  node: TargetNode,\n  root: string, signal?: AbortSignal");
    source = once(source, "probeRootContainedPath(root, node.path)", "probeRootContainedPath(root, node.path, signal)");
  }
  if (file.endsWith("/markdown-link-validation/resolver-engine.ts")) {
    source = once(source, "authorizeTargetNode(node, this.#canonicalProjectRoot)",
      "authorizeTargetNode(node, this.#canonicalProjectRoot, this.#signal)");
  }
  return source;
}
