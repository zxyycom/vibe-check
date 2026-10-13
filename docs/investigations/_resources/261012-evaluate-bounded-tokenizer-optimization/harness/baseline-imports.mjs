import { registerHooks } from "node:module";
import { appendFileSync } from "node:fs";

// Historical test import hook, not a standalone CLI: main test-runner argv belongs to Node.
const sourceUrlPrefix = "file:///workspace/vibe-check/src/";
const snapshotUrlPrefix =
  "file:///workspace/vibe-check/tmp/optimization-20261012/tokenizer/baseline/src/";
const importMapPath =
  "/workspace/vibe-check/tmp/optimization-20261012/tokenizer/baseline-import-map.jsonl";

function resolveSnapshotModule(specifier, context, nextResolve) {
  const resolved = nextResolve(specifier, context);
  const shouldRedirectSource =
    resolved.url.startsWith(sourceUrlPrefix) &&
    resolved.url.endsWith(".ts") &&
    !/(?:test|test-support)\.ts$/.test(resolved.url) &&
    !resolved.url.includes("/fixtures/");
  if (!shouldRedirectSource) return resolved;
  const snapshotUrl = snapshotUrlPrefix + resolved.url.slice(sourceUrlPrefix.length);
  appendFileSync(importMapPath, JSON.stringify({ from: resolved.url, to: snapshotUrl }) + "\n");
  return { ...resolved, url: snapshotUrl };
}
registerHooks({ resolve: resolveSnapshotModule });
