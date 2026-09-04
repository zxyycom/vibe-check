const rootRunModuleUrl = process.argv[2];
if (rootRunModuleUrl === undefined)
  throw new Error("expected the sandbox root Gate run module URL as the first argument");

const rootGateModule: unknown = await import(rootRunModuleUrl);
if (typeof rootGateModule !== "object" || rootGateModule === null)
  throw new Error("sandbox root Gate module was not an object");
const invokeProjectGateRoot = requiredProjectGateRootRun(rootGateModule);

let candidatePrepared = false;
const preparedCandidate = Object.freeze({
  artifactPath: "/tmp/vibe-check.tgz",
  candidateVersion: "0.0.0-local.fixture",
  consumerDirectory: "/tmp/consumer",
  files: ["package/index.mjs"],
  inputFingerprint: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  installedPackageDirectory: "/tmp/consumer/node_modules/@zxyycom/vibe-check",
  preparationAction: "reuse",
  preparationReason: "installation-current",
  resolvedEntryPath: "/tmp/consumer/node_modules/@zxyycom/vibe-check/index.mjs",
  reused: true,
  sha256: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  stagingDirectory: "/tmp/staging"
});

const status: unknown = await invokeProjectGateRoot([], {
  createInvocationLogDirectory: () => "/tmp/project-gate-import-boundary",
  loadRunModule: async () => {
    if (!candidatePrepared) throw new Error("bound module loaded before candidate preparation");
    return {
      afterGate: (initialResult: unknown) => initialResult,
      resolvedEntryPath: preparedCandidate.resolvedEntryPath,
      run: async () => ({
        aggregate: "passed",
        definitionWarnings: [],
        kind: "completed",
        outputs: { progressRendering: { status: "succeeded" } }
      })
    };
  },
  prepareCandidate: async () => {
    candidatePrepared = true;
    return preparedCandidate;
  },
  startTranscript: () => ({
    complete: () => "succeeded",
    writeGateMessage: () => undefined
  })
});

if (status !== 0)
  throw new Error(`root adapter returned unexpected exit status: ${String(status)}`);

function requiredProjectGateRootRun(
  rootModule: object
): (...arguments_: readonly unknown[]) => unknown {
  const candidate = Reflect.get(rootModule, "runProjectGate") as unknown;
  if (typeof candidate !== "function")
    throw new Error("sandbox root Gate module did not export runProjectGate");
  return (...arguments_: readonly unknown[]): unknown =>
    Reflect.apply(candidate, rootModule, arguments_) as unknown;
}
