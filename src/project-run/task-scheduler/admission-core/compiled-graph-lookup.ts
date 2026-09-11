/** Required accessors for compiler-owned dense slot indexes. */

import type { PlannedTask } from "../graph.ts";
import type { CompiledAdmissionGraph } from "./compiled-graph.ts";

export function requiredTaskForCompiled(
  compiled: CompiledAdmissionGraph,
  taskSlot: number
): PlannedTask {
  const task = compiled.graph.tasks[taskSlot];
  if (task === undefined) throw new Error(`admission core task slot is unknown: ${taskSlot}`);
  return task;
}

export function requiredTaskMutexSlotsForCompiled(
  compiled: CompiledAdmissionGraph,
  taskSlot: number
): CompiledAdmissionGraph["taskMutexSlots"][number] {
  const slots = compiled.taskMutexSlots[taskSlot];
  if (slots === undefined) throw new Error(`admission core task slot is unknown: ${taskSlot}`);
  return slots;
}

export function requiredTaskResourceClaimsForCompiled(
  compiled: CompiledAdmissionGraph,
  taskSlot: number
): CompiledAdmissionGraph["taskResourceClaims"][number] {
  const claims = compiled.taskResourceClaims[taskSlot];
  if (claims === undefined) throw new Error(`admission core task slot is unknown: ${taskSlot}`);
  return claims;
}

export function requiredReverseDependenciesForCompiled(
  compiled: CompiledAdmissionGraph,
  taskSlot: number
): CompiledAdmissionGraph["relationIndexes"]["reverseDependencies"][number] {
  const dependencies = compiled.relationIndexes.reverseDependencies[taskSlot];
  if (dependencies === undefined)
    throw new Error(`admission core task slot is unknown: ${taskSlot}`);
  return dependencies;
}

export function requiredReverseObservationsForCompiled(
  compiled: CompiledAdmissionGraph,
  taskSlot: number
): CompiledAdmissionGraph["relationIndexes"]["reverseObservations"][number] {
  const observations = compiled.relationIndexes.reverseObservations[taskSlot];
  if (observations === undefined)
    throw new Error(`admission core task slot is unknown: ${taskSlot}`);
  return observations;
}

export function requiredReverseMutexOccurrencesForCompiled(
  compiled: CompiledAdmissionGraph,
  mutexSlot: number
): CompiledAdmissionGraph["relationIndexes"]["reverseMutexOccurrences"][number] {
  const occurrences = compiled.relationIndexes.reverseMutexOccurrences[mutexSlot];
  if (occurrences === undefined) {
    throw new Error(`admission core mutex slot is unknown: ${mutexSlot}`);
  }
  return occurrences;
}

export function requiredScopeTerminalSlotsForCompiled(
  compiled: CompiledAdmissionGraph,
  taskSlot: number
): CompiledAdmissionGraph["scopeSlotsByTerminalTaskSlot"][number] {
  const scopeSlots = compiled.scopeSlotsByTerminalTaskSlot[taskSlot];
  if (scopeSlots === undefined) throw new Error(`admission core task slot is unknown: ${taskSlot}`);
  return scopeSlots;
}
