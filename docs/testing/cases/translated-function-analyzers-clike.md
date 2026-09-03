# translated-function-analyzers-clike

## Case FM-ANALYZER-READERS-D-001: translated C-like readers preserve Lizard 1.24 direct function facts

Owner: `docs/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/function-metrics/analyzer/readers/clike-readers.test.ts|C-like shared reader preserves every C and C++ suffix plus the edge oracle`
- `bun|src/package-checks/function-metrics/analyzer/readers/clike-readers.test.ts|Java, C#, Objective-C, and TTCN preserve every reader suffix and edge oracle`
- `bun|src/package-checks/function-metrics/analyzer/readers/clike-readers.test.ts|C-like family retains class qualification, annotations, generic declarations, expression members, selectors, and TTCN control names`
- `bun|src/package-checks/function-metrics/analyzer/readers/clike-readers.test.ts|Java retains annotations, records, local and anonymous classes, static blocks, expression tokens, and old-C parameters`
- `bun|src/package-checks/function-metrics/analyzer/readers/clike-readers.test.ts|C# retains full source state behavior for class members, primary constructors, expression bodies, and condition categories`
- `bun|src/package-checks/function-metrics/analyzer/readers/clike-readers.test.ts|Objective-C retains C-like declarations, selectors, typedef skipping, and implementation methods`
- `bun|src/package-checks/function-metrics/analyzer/readers/clike-readers.test.ts|TTCN retains C-like preprocessing, declarations, qualified signatures, special names, and decision categories`

Proves:

- The existing shared CLikeReader preserves every current C/C++ suffix and its normal/edge Lizard 1.24 oracle facts without a redundant concrete wrapper.
- Java, C#, Objective-C, and TTCN reader-local translations preserve all checked-in suffix/edge observations and their class qualification, annotations/generic declaration, expression-bodied member, Objective-C selector, and TTCN testcase naming behavior. Java further retains record/compact-constructor exclusion, local/anonymous/static class state, Java expression token skipping and old-C parameter transitions; C# retains primary-constructor exclusion, ordinary constructor qualification and its full condition categories; Objective-C retains typedef suppression and multi-selector long names; TTCN retains C-like macro preprocessing, function/testcase/control names, `runs on`/return signatures and its special tokenizer annotations.
- These entities prove direct in-memory reader behavior only. Reader registry selection, Check integration, cancellation/resource enforcement, and removal of the Lizard runtime remain separately owned boundaries.
