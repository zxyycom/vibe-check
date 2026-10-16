import type { TaskGraph } from "../../src/project-run/task-scheduler/graph.ts";

export const shapes = ["wide", "groups", "mutex-resource", "heterogeneous", "deep", "fanout", "scopes", "blocked-prefix"] as const;
export type Shape = typeof shapes[number];
export const sizes = [16, 256, 2048] as const;
export function workload(shape: Shape, size: number): { graph: TaskGraph; maxParallel: number } {
  const ids = Array.from({ length: size }, (_, slot) => `t-${String(size - slot).padStart(5, "0")}`);
  const tasks = ids.map((id, slot) => ({
    id,
    admissionPriority: slot % 3,
    ...(shape === "groups" ? { mutex: [`m-${slot}`] } : {}),
    ...(shape === "mutex-resource" ? { mutex: [`m-${slot % 4}`, `m-${slot % 4}`], resourceClaims: { r: 1 } } : {}),
    ...(shape === "heterogeneous" ? { resourceClaims: { r: 1 + slot % 7, s: 1 + slot % 3 } } : {}),
    ...(shape === "deep" && slot > 0 ? { dependsOn: [ids[slot - 1]!] } : {}),
    ...(shape === "fanout" && slot > 0 ? (slot % 2 === 0 ? { dependsOn: [ids[0]!, ids[0]!] } : { observes: [ids[0]!] }) : {}),
    ...(shape === "scopes" ? { scopeId: `s-${Math.floor(slot / 8)}`, ...(slot % 8 === 7 ? { observes: ids.slice(slot - 7, slot) } : {}) } : {}),
    ...(shape === "blocked-prefix" ? { admissionPriority: size - slot, ...(slot === size - 1 ? {} : { resourceClaims: { r: slot === 0 ? size : slot + 1 } }) } : {})
  }));
  return {
    graph: {
      tasks,
      ...(shape === "scopes" ? { scopes: Array.from({ length: size / 8 }, (_, scope) => ({ id: `s-${scope}`, maxParallel: 4, activationTaskIds: [ids[scope * 8]!], terminalTaskId: ids[scope * 8 + 7]! })) } : {}),
      ...(["mutex-resource", "heterogeneous", "blocked-prefix"].includes(shape) ? { resourceCapacities: { r: shape === "blocked-prefix" ? size + 1 : 8, ...(shape === "heterogeneous" ? { s: 4 } : {}) } } : {})
    },
    maxParallel: 16
  };
}
