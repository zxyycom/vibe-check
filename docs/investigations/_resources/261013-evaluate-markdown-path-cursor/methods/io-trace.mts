import * as fs from "node:fs/promises";

export const events: string[] = [];
export const faults = new Map<string, string>();
export const copyCounts = { remainingArraySlots: 0 };
let activeOperations = 0;
let peakOperations = 0;

export function resetTrace(): void {
  if (activeOperations !== 0) throw new Error("Previous IO not fully settled");
  events.length = 0;
  faults.clear();
  copyCounts.remainingArraySlots = 0;
  peakOperations = 0;
}

export function recordRemainingArrayCopy(slotCount: number): void {
  copyCounts.remainingArraySlots += slotCount;
}

export function settlement(): Readonly<{ activeOperations: number; peakOperations: number }> {
  return { activeOperations, peakOperations };
}

async function observed<T>(
  operation: string,
  filePath: string,
  action: () => Promise<T>
): Promise<T> {
  const key = `${operation}:${filePath}`;
  events.push(`start:${key}`);
  activeOperations += 1;
  peakOperations = Math.max(peakOperations, activeOperations);
  try {
    const code = faults.get(key);
    if (code !== undefined) throw Object.assign(new Error("Injected experiment fault"), { code });
    return await action();
  } finally {
    activeOperations -= 1;
    events.push(`end:${key}`);
  }
}

export async function lstat(filePath: string) {
  return observed("lstat", filePath, () => fs.lstat(filePath));
}

export async function readlink(filePath: string) {
  return observed("readlink", filePath, () => fs.readlink(filePath));
}

export async function open(filePath: string, flags: number) {
  const handle = await observed(`open-${flags}`, filePath, () => fs.open(filePath, flags));
  return {
    stat: () => observed("stat", filePath, () => handle.stat()),
    read: (bytes: Uint8Array, offset: number, length: number, position: number) =>
      observed(`read-${offset}-${length}-${position}`, filePath, () =>
        handle.read(bytes, offset, length, position)
      ),
    close: () => observed("close", filePath, () => handle.close())
  };
}
