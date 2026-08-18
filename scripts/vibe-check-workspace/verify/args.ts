import {
  booleanOption,
  parsePositiveInteger,
  parseScriptArgs,
  stringOption
} from "../../tools/foundation/src/args.ts";
import { PROFILE_FULL, parseProfile } from "../checks/index.ts";
import type { Profile } from "../checks/index.ts";

export interface VerificationOptions {
  readonly help: boolean;
  readonly profile: Profile;
  readonly concurrency: number | undefined;
}

export function parseArgs(argv: string[]): VerificationOptions {
  const parsed = parseScriptArgs({
    args: argv,
    options: {
      concurrency: { type: "string" },
      help: { type: "boolean", short: "h" },
      profile: { type: "string" }
    }
  });

  return {
    help: booleanOption({ name: "help", values: parsed.values }),
    profile: parseProfile(stringOption(parsed.values, "profile") ?? PROFILE_FULL),
    concurrency: resolveVerificationConcurrency({
      value: stringOption(parsed.values, "concurrency")
    })
  };
}

export function resolveVerificationConcurrency({
  value = process.env.VIBE_CHECK_VERIFY_CONCURRENCY
}: {
  readonly value?: string;
} = {}): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return parsePositiveInteger(value, "verification concurrency");
}
