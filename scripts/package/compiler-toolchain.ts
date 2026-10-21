import { createHash } from "node:crypto";
import { readFileSync, realpathSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

import { isNonArrayRecord } from "../value-guards.ts";
import { isPathWithin } from "../repository-files/paths.ts";

const repositoryRequire = createRequire(import.meta.url);
type InstalledToolchainPackage = Readonly<{
  manifestPath: string;
  manifest: Readonly<Record<string, unknown> & { version: string }>;
}>;

/** Resolves the stable compiler's declared bin, never a competing PATH/.bin entry. */
export function nativeTypeScriptBinPath(): string {
  return compilerBinPath(installedPackage("@typescript/native", "typescript"));
}

function compilerBinPath(compiler: InstalledToolchainPackage): string {
  const bin = compiler.manifest.bin;
  if (!isNonArrayRecord(bin) || typeof bin.tsc !== "string" || bin.tsc.trim().length === 0) {
    throw new Error("stable TypeScript compiler does not declare its tsc bin");
  }
  const compilerDirectory = dirname(compiler.manifestPath);
  const binPath = resolve(compilerDirectory, bin.tsc);
  if (!isPathWithin(compilerDirectory, binPath)) {
    throw new Error(`stable TypeScript tsc bin escapes its package: ${binPath}`);
  }
  try {
    if (
      !isPathWithin(realpathSync(compilerDirectory), realpathSync(binPath)) ||
      !statSync(binPath).isFile()
    ) {
      throw new Error("bin must be a regular file contained in the compiler package");
    }
  } catch (error: unknown) {
    throw new Error(`invalid stable TypeScript tsc bin: ${binPath}`, { cause: error });
  }
  return binPath;
}

/** Binds the native runner/platform and both compatibility and actual TS6 API owners. */
export function typeScriptToolchainFingerprint(): string {
  const compiler = installedPackage("@typescript/native", "typescript");
  const compatibility = installedPackage("typescript", "@typescript/typescript6");
  const compatibilityRequire = createRequire(compatibility.manifestPath);
  const api = installedPackage("@typescript/old", "typescript", compatibilityRequire);
  const platformName = `@typescript/typescript-${process.platform}-${process.arch}`;
  const platform = installedPackage(
    platformName,
    platformName,
    createRequire(compiler.manifestPath)
  );
  const optionalDependencies = compiler.manifest.optionalDependencies;
  if (
    !isNonArrayRecord(optionalDependencies) ||
    optionalDependencies[platformName] !== platform.manifest.version
  ) {
    throw new Error(`stable TypeScript platform does not match its compiler: ${platformName}`);
  }
  const compilerDirectory = dirname(compiler.manifestPath);
  const files = {
    "native/package.json": compiler.manifestPath,
    "native/bin": compilerBinPath(compiler),
    "native/runner": resolve(compilerDirectory, "lib/tsc.js"),
    "native/platform-resolver": resolve(compilerDirectory, "lib/getExePath.js"),
    "platform/package.json": platform.manifestPath,
    "platform/bin": resolve(
      dirname(platform.manifestPath),
      "lib",
      process.platform === "win32" ? "tsc.exe" : "tsc"
    ),
    "compatibility/package.json": compatibility.manifestPath,
    "compatibility/api": repositoryRequire.resolve("typescript"),
    "compatibility/types": resolve(dirname(compatibility.manifestPath), "lib/typescript.d.ts"),
    "api/package.json": api.manifestPath,
    "api/implementation": compatibilityRequire.resolve("@typescript/old"),
    "api/types": resolve(dirname(api.manifestPath), "lib/typescript.d.ts")
  };
  const hash = createHash("sha256");
  for (const [identity, path] of Object.entries(files)) {
    hash.update(identity).update("\0").update(readFileSync(path)).update("\0");
  }
  return hash.digest("hex");
}

function installedPackage(
  packageName: string,
  expectedName: string,
  require = repositoryRequire
): InstalledToolchainPackage {
  const manifestPath = require.resolve(`${packageName}/package.json`);
  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error: unknown) {
    throw new Error(`could not read TypeScript toolchain manifest: ${manifestPath}`, {
      cause: error
    });
  }
  if (
    !isNonArrayRecord(manifest) ||
    manifest.name !== expectedName ||
    typeof manifest.version !== "string" ||
    manifest.version.length === 0 ||
    manifest.version.trim() !== manifest.version
  ) {
    throw new Error(
      `invalid TypeScript toolchain package identity: ${packageName} (${manifestPath})`
    );
  }
  return { manifestPath, manifest: { ...manifest, version: manifest.version } };
}
