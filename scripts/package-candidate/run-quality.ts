import { preparePackageCandidate } from "./index.ts";

type CandidateBackedQualitySteps = Readonly<{
  readonly prepareCandidate: () => Promise<void>;
  readonly runScan: () => Promise<number>;
}>;

const defaultCandidateBackedQualitySteps: CandidateBackedQualitySteps = Object.freeze({
  prepareCandidate: async (): Promise<void> => {
    await preparePackageCandidate();
  },
  runScan: loadScan
});

export async function runCandidateBackedQuality(
  steps: CandidateBackedQualitySteps = defaultCandidateBackedQualitySteps
): Promise<number> {
  try {
    await steps.prepareCandidate();
    return await steps.runScan();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`candidate-backed quality could not run: ${message}`);
    return 1;
  }
}

async function loadScan(): Promise<number> {
  const { runScan } = await import("../quality/scan.ts");
  return runScan();
}

if (import.meta.main) {
  process.exitCode = await runCandidateBackedQuality();
}
