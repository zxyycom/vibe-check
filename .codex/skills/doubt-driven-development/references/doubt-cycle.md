# Doubt Cycle

Use this reference when a high-risk engineering claim needs a bounded adversarial pass.

## Cycle Template

```text
CLAIM:
- The decision that must be true.

WHY THIS MATTERS:
- The user-visible, compatibility, migration, data, release, security or contract consequence.

CONTRACT:
- Observable requirements.
- Compatibility promises.
- Constraints and edge cases.
- Out-of-scope boundaries.

ARTIFACT:
- Minimal diff, design note, schema fragment, output sample, migration plan, benchmark claim or behavior description.

DOUBT:
- Findings that try to prove artifact violates contract.

RECONCILE:
- contract gap / valid issue / accepted trade-off / noise.

STOP:
- Stop condition reached or unresolved risk exposed.
```

If the claim cannot be written in one or two sentences, narrow the decision before continuing.

## Contract Prompts

Use observable statements:

- Stable inputs and outputs that must not change.
- Error behavior, edge cases, malformed input, hostile paths and concurrency assumptions。
- Security, migration, release, downgrade or rollback constraints。
- Explicit out-of-scope behavior。

Keep the contract separate from reasoning. The challenge checks whether artifact satisfies contract, not whether the reasoning sounds plausible.

## Adversarial Checklist

Apply only the questions relevant to the contract surface:

- Which existing project contract or user-visible behavior could this violate?
- Does the artifact change protocol/API shape、readable output、schema meaning、example compatibility、UI state or release behavior?
- Are continuation、pagination、ordering、limits、timeouts or boundary conditions ambiguous?
- Can malformed input、hostile paths、untrusted content、external data or tool/browser output cause unsafe behavior?
- Is the claim only partially covered by compiler feedback、tests、docs、examples、benchmarks or monitoring?
- If the assumption is wrong, what would downstream users, scripts, services or operators observe?

## Finding Taxonomy

Classify each finding before changing code or docs:

1. **Contract gap**: contract is ambiguous or incomplete. Fix the contract, then rerun the relevant challenge。
2. **Valid issue**: artifact may violate contract. Change artifact or add targeted verification。
3. **Accepted trade-off**: risk is real and intentionally accepted. Record reason, impact and mitigation。
4. **Noise**: finding depends on context outside the contract or does not describe a defect。

Re-read the artifact before accepting or rejecting a finding, including reviewer output.

## Stop Conditions

Stop when one condition is true:

- The next cycle finds only duplicate, already-classified, or trivial issues。
- Three bounded cycles have completed。
- The user explicitly accepts a known risk。
- The artifact has been split and the current smaller decision has no unresolved substantive finding。

If three cycles still leave substantive issues, expose unresolved risk and the needed next action instead of continuing indefinitely.
