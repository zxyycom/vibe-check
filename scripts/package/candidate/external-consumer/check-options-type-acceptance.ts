/** Public consumer source that proves callback options retain deeply readonly type information. */
export const CHECK_OPTIONS_TYPE_ACCEPTANCE_SOURCE = String.raw`interface CallbackOptionShapes {
  readonly command: readonly [executable: string, ...arguments: string[]];
  readonly payload: unknown;
  readonly tagged:
    | readonly [kind: "text", value: string]
    | readonly [kind: "count", value: number];
}

import type {
  // @ts-expect-error CheckPreflight was removed in favor of CheckPreparation.
  CheckPreflight
} from "@zxyycom/vibe-check";

const preservedOptionShapesCheck = defineCheck<"isolated-option-shapes", CallbackOptionShapes>({
  checkId: "isolated-option-shapes",
  displayName: "Isolated option shapes",
  options: {
    command: ["node", "--version"],
    payload: 42,
    tagged: ["count", 1]
  },
  execute: ({ options }) => {
    const command: CallbackOptionShapes["command"] = options.command;
    const executable: string = options.command[0];
    if (options.tagged[0] === "count") {
      const count: number = options.tagged[1];
      void count;
    }
    // @ts-expect-error installed callbacks retain unknown leaf uncertainty.
    const payload: string = options.payload;
    void command;
    void executable;
    void payload;
    return { status: "passed", data: {} };
  }
});

const legacyCheck = defineCheck({
  checkId: "isolated-legacy-check",
  displayName: "Isolated legacy check",
  // @ts-expect-error legacy execution is not an accepted Check authoring field.
  execution: () => ({ status: "passed", data: {} })
});
void legacyCheck;

defineConfig({
  scheduler: {
    // @ts-expect-error legacy measurementHooks is not an accepted Scheduler field.
    measurementHooks: []
  }
});
`;
