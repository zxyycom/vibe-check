import type { CheckMessage, CheckOutcome, CheckVisibility } from "../../check/check.ts";
import type { ProgressFeedback, ProgressWriter } from "./renderer.ts";

export const COUNTS = Object.freeze({ failed: 1, notApplicable: 1, passed: 1, unavailable: 1 });

export function createWriter(input: Readonly<Partial<Omit<ProgressWriter, "write">>> = {}) {
  const writes: string[] = [];
  const writer: ProgressWriter = {
    color: input.color ?? false,
    isTTY: input.isTTY ?? false,
    term: input.term,
    write: (content: string): void => {
      writes.push(content);
    }
  };
  return { writes, writer };
}

export function settled(
  checkId: string,
  displayName: string,
  outcome: CheckOutcome,
  durationMs: number | null,
  presentation: Readonly<{
    readonly messages?: readonly CheckMessage[];
    readonly visibility?: CheckVisibility;
  }> = {}
): ProgressFeedback {
  return {
    kind: "settled",
    checkId,
    displayName,
    durationMs,
    outcome,
    messages: presentation.messages ?? [],
    visibility: presentation.visibility ?? "always"
  };
}

/** A minimal independent terminal model for the cursor operations this renderer emits. */
export function visibleTerminalScreen(writes: readonly string[]): readonly string[] {
  const rows = [""];
  let column = 0;
  let row = 0;
  const ensureRow = (): void => {
    while (rows.length <= row) rows.push("");
  };
  for (const write of writes) {
    for (let index = 0; index < write.length; index += 1) {
      if (write.startsWith("\u001B[1A", index)) {
        row = Math.max(0, row - 1);
        index += 3;
      } else if (write.startsWith("\u001B[2K", index)) {
        ensureRow();
        rows[row] = "";
        index += 3;
      } else if (write[index] === "\n") {
        row += 1;
        column = 0;
        ensureRow();
      } else {
        ensureRow();
        const current = rows[row] ?? "";
        rows[row] = `${current.slice(0, column)}${write[index]}${current.slice(column + 1)}`;
        column += 1;
      }
    }
  }
  let lastVisible = rows.length - 1;
  while (lastVisible >= 0 && rows[lastVisible] === "") lastVisible -= 1;
  return rows.slice(0, lastVisible + 1);
}
