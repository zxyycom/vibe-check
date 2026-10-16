import { runTaskGraph } from "../../src/project-run/task-scheduler/scheduler.ts";
let sample = 100;
const effects: unknown[] = [];
const result = await runTaskGraph({
  graph: { tasks: [{ id: "source" }, { id: "doomed", dependsOn: ["source"] }] },
  maxParallel: 1,
  preAdmissionTaskResults: [{ taskId: "source", value: false }],
  isPrerequisiteSatisfied: value => value,
  execute: () => { throw new Error("neither Task may execute"); },
  performanceDiagnostics: { clock: { now: () => sample++ }, declarativeFingerprint: "fixed-viability-reproducer" },
  terminalContextNeeds: ["execution", "runMeasurement", "taskTimings"],
  onAdmissionCoreEffect: effect => effects.push(effect.effect)
});
console.log(JSON.stringify({ settlements: result.settlements.map(({ task, settlement }) => ({ taskId: task.id, kind: settlement.kind })), effects, terminal: result.terminalContext }));
