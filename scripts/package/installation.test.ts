import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { RELEASE_MANIFEST_SOURCE_PATH, readReleaseManifest } from "./artifact/manifest.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const installationModule = fileURLToPath(new URL("./installation.ts", import.meta.url));

// Installs execute in children so the loopback registry remains responsive during spawnSync.
test("offline installs require prepared cache and isolate files", { timeout: 30_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "vibe-check-offline-install-test-"));
  const cacheDirectory = join(root, "cache");
  const marker = join(root, "lifecycle-script-ran");
  const leafName = "offline-leaf-fixture";
  const dependencyName = "offline-dependency-fixture";
  const rootName = "offline-root-fixture";
  let requests = 0;
  const packages = new Map<string, Buffer>();
  let registryUrl = "";
  const server = createServer((request, response) => {
    requests += 1;
    const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname.slice(1);
    if (path.endsWith(".tgz")) {
      const bytes = packages.get(path.slice(0, -4));
      response.statusCode = bytes === undefined ? 404 : 200;
      response.end(bytes ?? "missing");
      return;
    }
    if (packages.has(path)) {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          name: path,
          "dist-tags": { latest: "1.0.0" },
          versions: {
            "1.0.0": {
              name: path,
              version: "1.0.0",
              dependencies: path === dependencyName ? { [leafName]: "1.0.0" } : {},
              dist: { tarball: `${registryUrl}/${path}.tgz` }
            }
          }
        })
      );
      return;
    }
    response.statusCode = 404;
    response.end("missing");
  });
  await new Promise<void>((fulfill) => {
    server.listen(0, "127.0.0.1", fulfill);
  });
  const address = server.address();
  assert.ok(address !== null && typeof address !== "string");
  registryUrl = `http://127.0.0.1:${String(address.port)}`;
  try {
    for (const [name, dependencies, source] of [
      [leafName, {}, "export default 41;\n"],
      [
        dependencyName,
        { [leafName]: "1.0.0" },
        `import value from '${leafName}'; export default value + 1;\n`
      ],
      [rootName, { [dependencyName]: "1.0.0" }, `export { default } from '${dependencyName}';\n`]
    ] as const) {
      const artifact = packFixture(root, name, dependencies, source);
      packages.set(name, readFileSync(artifact));
    }
    const artifactPath = join(root, rootName, `${rootName}-1.0.0.tgz`);
    const missingConsumer = writeConsumer(root, "missing", marker);
    const missingArtifact = await runInstallationChild({
      root,
      cacheDirectory,
      registryUrl,
      operation: `installOfflinePackage({ artifactPath: ${JSON.stringify(join(root, "private-token-never-display.tgz"))}, consumerDirectory: ${JSON.stringify(missingConsumer)}, cacheDirectory });`
    });
    assert.equal(missingArtifact.exitCode, 1);
    assert.equal(missingArtifact.output.includes("private-token-never-display"), false);
    assert.equal(missingArtifact.output.includes(root), false);
    const coldConsumer = writeConsumer(root, "cold", marker);
    const cold = await runInstallationChild({
      root,
      cacheDirectory,
      registryUrl,
      operation: `installOfflinePackage({ artifactPath: ${JSON.stringify(artifactPath)}, consumerDirectory: ${JSON.stringify(coldConsumer)}, cacheDirectory });`
    });
    assert.equal(cold.exitCode, 1, cold.output);
    assert.match(cold.output, /strict offline package installation failed \(exit 1\)/u);
    assert.match(cold.output, /bun run package:cache:prepare/u);
    assert.equal(requests, 0, "offline cache miss must not contact a live registry");

    const fixtureRepository = join(root, "repository");
    const manifestPath = join(fixtureRepository, RELEASE_MANIFEST_SOURCE_PATH);
    mkdirSync(dirname(manifestPath), { recursive: true });
    writeFileSync(
      manifestPath,
      JSON.stringify({
        ...readReleaseManifest(repositoryRoot),
        dependencies: { [dependencyName]: "1.0.0" }
      })
    );
    const prepared = await runInstallationChild({
      root,
      cacheDirectory,
      registryUrl,
      operation: `preparePackageInstallationCache({ repositoryRoot: ${JSON.stringify(fixtureRepository)}, cacheDirectory });`
    });
    assert.equal(prepared.exitCode, 0, prepared.output);
    assert.ok(
      requests >= 4,
      "explicit online preparation must fetch dependencies and their metadata"
    );
    const preparedRequests = requests;
    await closeRegistry(server);

    for (const name of ["first", "second"]) {
      const consumerDirectory = writeConsumer(root, name, marker);
      const entryPath = join(consumerDirectory, "node_modules", rootName, "index.js");
      const installed = await runInstallationChild({
        root,
        cacheDirectory,
        registryUrl,
        operation: `installOfflinePackage({ artifactPath: ${JSON.stringify(artifactPath)}, consumerDirectory: ${JSON.stringify(consumerDirectory)}, cacheDirectory }); process.stdout.write(String((await import(${JSON.stringify(entryPath)})).default));`
      });
      assert.equal(installed.exitCode, 0, installed.output);
      assert.equal(installed.output, "42");
      const dependencyManifestPath = join(
        consumerDirectory,
        "node_modules",
        dependencyName,
        "package.json"
      );
      const manifest: unknown = JSON.parse(readFileSync(dependencyManifestPath, "utf8"));
      assert.deepEqual(manifest, {
        name: dependencyName,
        version: "1.0.0",
        type: "module",
        exports: "./index.js",
        license: "MIT",
        dependencies: { [leafName]: "1.0.0" }
      });
      if (name === "first") writeFileSync(dependencyManifestPath, '{"license":"GPL-3.0-only"}\n');
      assert.equal(existsSync(join(consumerDirectory, "bun.lock")), false);
      assert.equal(
        readFileSync(join(consumerDirectory, "package.json"), "utf8"),
        consumerManifest(marker)
      );
    }
    assert.equal(requests, preparedRequests);
    assert.equal(existsSync(marker), false, "installation must not run lifecycle scripts");
  } finally {
    await closeRegistry(server);
    rmSync(root, { force: true, recursive: true });
  }
});

function packFixture(
  root: string,
  name: string,
  dependencies: Readonly<Record<string, string>>,
  source: string
): string {
  const directory = join(root, name);
  mkdirSync(directory);
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({
      name,
      version: "1.0.0",
      type: "module",
      exports: "./index.js",
      license: "MIT",
      dependencies
    })
  );
  writeFileSync(join(directory, "index.js"), source);
  const packed = spawnSync(process.execPath, ["pm", "pack", "--ignore-scripts", "--quiet"], {
    cwd: directory,
    encoding: "utf8"
  });
  assert.equal(packed.status, 0, packed.stderr);
  return join(directory, `${name}-1.0.0.tgz`);
}

function consumerManifest(marker: string): string {
  const script = `require('fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`;
  const preinstall = `${JSON.stringify(process.execPath)} -e ${JSON.stringify(script)}`;
  return `${JSON.stringify({
    name: "offline-consumer-fixture",
    private: true,
    type: "module",
    scripts: { preinstall }
  })}\n`;
}

function writeConsumer(root: string, name: string, marker: string): string {
  const directory = join(root, name);
  mkdirSync(directory);
  writeFileSync(join(directory, "package.json"), consumerManifest(marker));
  return directory;
}

function runInstallationChild(input: {
  readonly root: string;
  readonly cacheDirectory: string;
  readonly registryUrl: string;
  readonly operation: string;
}): Promise<{ readonly exitCode: number | null; readonly output: string }> {
  return new Promise((fulfill, reject) => {
    const child = spawn(
      process.execPath,
      [
        "-e",
        `import { installOfflinePackage, preparePackageInstallationCache } from ${JSON.stringify(installationModule)}; const cacheDirectory = ${JSON.stringify(input.cacheDirectory)}; try { ${input.operation} } catch (error) { console.error(error.message); process.exitCode = 1; }`
      ],
      {
        cwd: input.root,
        env: {
          ...process.env,
          BUN_INSTALL_CACHE_DIR: input.cacheDirectory,
          npm_config_registry: input.registryUrl,
          NPM_CONFIG_REGISTRY: input.registryUrl
        },
        timeout: 10_000,
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
    let output = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      output += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      output += chunk;
    });
    child.once("error", reject);
    child.once("close", (exitCode) => {
      fulfill({ exitCode, output });
    });
  });
}

async function closeRegistry(server: Server): Promise<void> {
  if (!server.listening) return;
  server.closeAllConnections();
  await new Promise<void>((fulfill, reject) => {
    server.close((error) => {
      if (error !== undefined) reject(error);
      else fulfill();
    });
  });
}
