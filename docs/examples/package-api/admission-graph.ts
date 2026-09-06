// #region package-api-example:admission-graph
import { createAdmissionGraph } from "@zxyycom/vibe-check";

const graph = createAdmissionGraph({
  graph: {
    resourceCapacities: [{ resourceId: "browser", units: 1 }],
    scopes: [],
    tasks: [
      {
        admissionPriority: 0,
        dependsOn: [],
        mutex: [],
        observes: [],
        resourceClaims: [{ resourceId: "browser", units: 1 }],
        scopeId: null,
        taskId: "compile"
      },
      {
        admissionPriority: 0,
        dependsOn: ["compile"],
        mutex: [],
        observes: [],
        resourceClaims: [],
        scopeId: null,
        taskId: "publish"
      }
    ]
  },
  maxParallel: 1
});

const initial = graph.initialState();
const compile = initial.select("compile");
if (!compile.accepted) throw new Error(`Cannot select compile: ${compile.reason.kind}`);

// Retaining `initial` and the successor forms two independent hypothetical branches.
const completed = compile.state.settle("compile", "satisfied");
if (!completed.accepted || !completed.state.catalog.selectableTaskIds.includes("publish")) {
  throw new Error("Expected publish to become selectable after hypothetical completion");
}
// #endregion package-api-example:admission-graph
