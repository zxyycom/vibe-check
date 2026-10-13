import { registerHooks } from "node:module";

// Historical test import hook, not a standalone CLI: main test-runner argv belongs to Node.
const sourceUrlPrefix = "file:///workspace/vibe-check/src/";
const snapshotUrlPrefix =
  "file:///workspace/vibe-check/tmp/optimization-20261012/tokenizer/candidate/src/";

function resolveSnapshotModule(specifier, context, nextResolve) {
  const resolved = nextResolve(specifier, context);
  const shouldRedirectSource =
    resolved.url.startsWith(sourceUrlPrefix) &&
    resolved.url.endsWith(".ts") &&
    !/(?:test|test-support)\.ts$/.test(resolved.url) &&
    !resolved.url.includes("/fixtures/");
  if (!shouldRedirectSource) return resolved;
  const snapshotUrl = snapshotUrlPrefix + resolved.url.slice(sourceUrlPrefix.length);
  return { ...resolved, url: snapshotUrl };
}
registerHooks({ resolve: resolveSnapshotModule });
