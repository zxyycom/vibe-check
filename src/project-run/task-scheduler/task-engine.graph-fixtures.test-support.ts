import type { TaskGraph } from "./graph.ts";

export function rootBudgetGraph(): TaskGraph {
  return {
    tasks: [
      { id: "base" },
      { id: "dependent", dependsOn: ["base"] },
      { id: "mutex-one", mutex: ["shared"] },
      { id: "mutex-two", mutex: ["shared"] },
      { id: "independent" }
    ]
  };
}

export function continuationPriorityGraph(): TaskGraph {
  return {
    tasks: [
      { id: "limited-work", scopeId: "limited" },
      { id: "limited-terminal", dependsOn: ["limited-work"], scopeId: "limited" },
      { id: "wide-one" },
      { id: "wide-two" }
    ],
    scopes: [
      {
        id: "limited",
        maxParallel: 1,
        activationTaskIds: ["limited-work"],
        terminalTaskId: "limited-terminal"
      }
    ]
  };
}

export function tighteningScopeGraph(): TaskGraph {
  return {
    tasks: [
      { id: "gate" },
      { id: "wide-one", scopeId: "wide" },
      { id: "wide-two", scopeId: "wide" },
      { id: "wide-terminal", dependsOn: ["wide-one", "wide-two"], scopeId: "wide" },
      { id: "low", dependsOn: ["gate"], scopeId: "low" }
    ],
    scopes: [
      {
        id: "wide",
        maxParallel: 2,
        activationTaskIds: ["wide-one", "wide-two"],
        terminalTaskId: "wide-terminal"
      },
      {
        id: "low",
        maxParallel: 1,
        activationTaskIds: ["low"],
        terminalTaskId: "low"
      }
    ]
  };
}

export function noActivationGraph(): TaskGraph {
  return {
    tasks: [{ id: "zero-terminal", scopeId: "zero" }, { id: "wide-one" }, { id: "wide-two" }],
    scopes: [
      {
        id: "zero",
        maxParallel: 1,
        activationTaskIds: [],
        terminalTaskId: "zero-terminal"
      }
    ]
  };
}

export function failureGraph(): TaskGraph {
  return {
    tasks: [{ id: "failure" }, { id: "blocked", dependsOn: ["failure"] }, { id: "independent" }]
  };
}

export function cancellationGraph(): TaskGraph {
  return {
    tasks: [{ id: "started" }, { id: "pending-one" }, { id: "pending-two" }]
  };
}
