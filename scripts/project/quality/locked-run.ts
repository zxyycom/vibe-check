import { errorMessage } from "../../error-message.ts";
import { preparePackageCandidate } from "../../package/candidate/prepare.ts";

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

/** Prepares the exact candidate before invoking the pure repository scan adapter. */
export async function runCandidateBackedQuality(
  steps: CandidateBackedQualitySteps = defaultCandidateBackedQualitySteps
): Promise<number> {
  try {
    await steps.prepareCandidate();
    return await steps.runScan();
  } catch (error: unknown) {
    console.error(`candidate-backed quality could not run: ${errorMessage(error)}`);
    return 1;
  }
}

async function loadScan(): Promise<number> {
  const { runScan } = await import("./scan.ts");
  return runScan();
}

if (import.meta.main) {
  process.exitCode = await runCandidateBackedQuality();
}
