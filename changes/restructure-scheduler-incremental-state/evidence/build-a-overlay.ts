import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve("tmp/restructure-scheduler-incremental-state/source-A/src/project-run/task-scheduler/admission-core");
const change = (name: string, before: string, after: string) => {
  const path = `${root}/${name}.ts`; const text = readFileSync(path, "utf8");
  if (!text.includes(before)) throw new Error(`A overlay target missing: ${name}`);
  writeFileSync(path, text.replace(before, after));
};
change("selection-transition", "  const relationReadyTaskSlots = selection.relationReadyTaskSlots.withMutations((batch) => {", "  const added: number[] = [];\n  const removed: number[] = [];\n  const relationReadyTaskSlots = selection.relationReadyTaskSlots.withMutations((batch) => {");
change("selection-transition", `      if (
        statusForStore(facts.statuses, slot).kind === "pending" &&
        pendingRelationBlockerStageForSelection(facts, slot) === undefined
      )
        batch.add(slot);
      else batch.delete(slot);`, `      const isReady = statusForStore(facts.statuses, slot).kind === "pending" &&
        pendingRelationBlockerStageForSelection(facts, slot) === undefined;
      if (isReady === selection.relationReadyTaskSlots.has(slot)) continue;
      if (isReady) { batch.add(slot); added.push(slot); }
      else { batch.delete(slot); removed.push(slot); }`);
change("selection-transition", "    relationReadyTaskSlots,\n    activeScopeSlots:", "    relationReadyTaskSlots,\n    membershipDelta: { added, removed },\n    activeScopeSlots:");
change("selection-frontiers", "    relationReadyTaskSlots: PersistentSet<number>;", "    relationReadyTaskSlots: PersistentSet<number>;\n    membershipDelta: Readonly<{added: readonly number[]; removed: readonly number[]}>;");
change("selection-frontiers", "    selection.relationReadyTaskSlots,\n    relationReadyTaskSlots,\n    affectedTaskSlots", "    relationReadyTaskSlots,\n    input.membershipDelta");
change("ready-frontier", "  previousReady: PersistentSet<number>,\n  nextReady: PersistentSet<number>,\n  affectedTaskSlots: ReadonlySet<number>", "  nextReady: PersistentSet<number>,\n  membershipDelta: Readonly<{added: readonly number[]; removed: readonly number[]}>");
change("ready-frontier", `  for (const taskSlot of affectedTaskSlots) {
    const wasReady = previousReady.has(taskSlot);
    const isReady = nextReady.has(taskSlot);
    if (wasReady === isReady) continue;
    const groupSlot = groupSlotFor(compiled, taskSlot);
    affectedGroups.add(groupSlot);
    if (isReady) next = frontierWithTask(compiled, next, taskSlot);
  }`, `  for (const taskSlot of membershipDelta.added) {
    affectedGroups.add(groupSlotFor(compiled, taskSlot));
    next = frontierWithTask(compiled, next, taskSlot);
  }
  for (const taskSlot of membershipDelta.removed) affectedGroups.add(groupSlotFor(compiled, taskSlot));`);
const runner = resolve("tmp/restructure-scheduler-incremental-state/operations.ts");
writeFileSync(runner.replace("operations.ts", "operations-A.ts"), readFileSync(runner, "utf8").replaceAll('"../../src/', '"./source-A/src/'));
const benchmark = resolve("tmp/restructure-scheduler-incremental-state/benchmark.ts");
writeFileSync(benchmark.replace("benchmark.ts", "benchmark-A.ts"), readFileSync(benchmark, "utf8").replaceAll('"../../src/', '"./source-A/src/'));
