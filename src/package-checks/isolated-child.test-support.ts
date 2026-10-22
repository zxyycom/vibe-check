import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Completes one bounded test child or fails with its transport/exit evidence before reading JSON. */
export function runIsolatedTestChild(entrypoint: URL, args: readonly string[] = []): unknown {
  const child = spawnSync(process.execPath, [fileURLToPath(entrypoint), ...args], {
    encoding: "utf8",
    killSignal: "SIGKILL",
    timeout: 10_000
  });
  assert.equal(child.error, undefined, child.error?.message);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.signal, null, child.stderr);
  const completion: unknown = JSON.parse(child.stdout);
  return completion;
}

/** Install only inside a dedicated child: module replacements last for that process's lifetime. */
export async function mockModuleInIsolatedChild(
  specifier: string,
  factory: () => object
): Promise<void> {
  const bunTest: unknown = await import("bun:test");
  if (typeof bunTest !== "object" || bunTest === null)
    throw new Error("Bun test module unavailable");
  const mock: unknown = Reflect.get(bunTest, "mock");
  if (typeof mock !== "function") throw new Error("Bun mock unavailable");
  const mockModule: unknown = Reflect.get(mock, "module");
  if (typeof mockModule !== "function") throw new Error("Bun module mock unavailable");
  Reflect.apply(mockModule, mock, [specifier, factory]);
}
