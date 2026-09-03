# Admission-state consumer proofs

This readiness evidence proves that the proposed public protocol has two distinct consumers. It does **not** claim that the current Product exports the protocol: the implementation tasks must turn both scenarios into current scheduler and installed-package consumer evidence.

## Standalone branching consumer

**Fixture.** `root` has no relations; `alternative` has the same mutex as `root`; `dependent` has `dependsOn: ["root"]`; and `observer` has `observes: ["root"]`. Root capacity is two.

```ts
const graph = createAdmissionGraph({ graph: fixture, maxParallel: 2 });
const root = graph.initialState();

// Validation deliberately accepts arbitrary strings and has the same selection
// rejection as `select`, without exposing settlement-only rejection variants.
assert.deepEqual(root.validateSelection("missing"), {
  accepted: false,
  reason: { kind: "unknown-task" }
});
assert.deepEqual(root.select("missing"), {
  accepted: false,
  reason: { kind: "unknown-task" }
});

const chooseRoot = root.select("root");
const chooseAlternative = root.select("alternative");
if (!chooseRoot.accepted || !chooseAlternative.accepted) throw new Error("fixture is invalid");

// `root` remains the predecessor: it still catalogues both initial choices.
assert.deepEqual(root.catalog.selectableTaskIds, ["alternative", "root"]);
assert.deepEqual(chooseRoot.state.catalog.nonSelectableTasks, [
  { taskId: "alternative", reason: { kind: "mutex-held", mutexIds: ["shared"] } },
  { taskId: "dependent", reason: { kind: "depends-on-pending", taskIds: ["root"] } },
  { taskId: "observer", reason: { kind: "observes-pending", taskIds: ["root"] } }
]);

const rootSettled = chooseRoot.state.settle("root", "satisfied");
if (!rootSettled.accepted) throw new Error("fixture is invalid");
assert.deepEqual(rootSettled.state.catalog.selectableTaskIds, ["dependent", "observer"]);
```

The consumer needs all of the following in the public contract: an independent initial state, retained predecessor identity, divergent successors, arbitrary-ID selection validation with the same rejection as `select`, primary reasons, binary settlement, and canonical catalog order. A getter-only callback snapshot cannot express this branch comparison.

## Live custom-lookahead consumer

**Fixture.** A custom simple strategy uses the real callback state to choose the ready Task whose hypothetical successor exposes the most selectable downstream Tasks. It returns only the existing `AdmissionProposal`.

```ts
const strategy = {
  kind: "simple" as const,
  decide(context: AdmissionPolicyContext): AdmissionProposal {
    const candidates = context.admissionState.catalog.selectableTaskIds;
    const scored = candidates.flatMap((taskId) => {
      const transition = context.admissionState.select(taskId);
      return transition.accepted
        ? [{ taskId, downstreamSelectable: transition.state.catalog.selectableTaskIds.length }]
        : [];
    });
    const best = scored.sort(compareDescendingThenTaskId)[0];
    return best === undefined ? { kind: "wait" } : { kind: "select", taskId: best.taskId };
  }
} as const;
```

This uses the same state/query/action shape as the standalone consumer, but it neither starts nor settles a real Task. The Scheduler must still run its current callback-return lifecycle/candidate/capacity/cancellation hard guards before executing the returned proposal. The post-callback test required by the Plan therefore proves both (1) the state can guide a valid lookahead and (2) the state is not a reservation or control channel.

## Consumer conclusion

The two consumers are independent: the first requires persistent divergent branches outside a Run; the second requires a read-only real decision-boundary seed and hard revalidation. A context-only helper would fail the first; a standalone-only simulator would duplicate the real decision semantics required by the second. They justify one public state contract and one shared private core.
