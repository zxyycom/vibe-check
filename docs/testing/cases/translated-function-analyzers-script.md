# translated-function-analyzers-script

## Case FM-ANALYZER-CORE-001: translated in-memory analyzer primitives preserve their Lizard 1.24 processor boundary

Owner: `docs/development/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/function-metrics/analyzer/pipeline.test.ts|Lizard in-memory core > preserves basic C-like function information, NLOC, CCN, and parameters`
- `bun|src/package-checks/function-metrics/analyzer/pipeline.test.ts|Lizard in-memory core > keeps comment directives and generated-code stopping in upstream processor order`
- `bun|src/package-checks/function-metrics/analyzer/pipeline.test.ts|Lizard in-memory core > keeps FileAnalyzer's default no-extension processor pipeline equivalent to the direct source helper`
- `bun|src/package-checks/function-metrics/analyzer/pipeline.test.ts|Lizard in-memory core > matches Python splitlines and whitespace token distinctions in the core pipeline`
- `bun|src/package-checks/function-metrics/analyzer/model-context.test.ts|Lizard in-memory core > retains source-named model aliases through a static extension lifecycle`
- `bun|src/package-checks/function-metrics/analyzer/extension-output.test.ts|Lizard in-memory core > patches FUNCTION_INFO averages for dynamic source-named extension metrics`
- `bun|src/package-checks/function-metrics/analyzer/extension-output.test.ts|Lizard in-memory core > retains OutputScheme fields, schema values, and retained formatting lifecycle`
- `bun|src/package-checks/function-metrics/analyzer/extension-output.test.ts|Lizard in-memory core > runs source analyze_files cross-file and print-result hooks in registration order`
- `bun|src/package-checks/function-metrics/analyzer/model-context.test.ts|Lizard in-memory core > adapts source-spelled duplicate nesting decorators through FileInfoBuilder`
- `bun|src/package-checks/function-metrics/analyzer/pipeline.test.ts|Lizard in-memory core > propagates an explicit undefined cross-file result instead of treating it as an absent hook`
- `bun|src/package-checks/function-metrics/analyzer/shared/code-reader.test.ts|Lizard shared tokenizer > preserves upstream macro, comment, string, and symbol token boundaries`
- `bun|src/package-checks/function-metrics/analyzer/shared/code-reader.test.ts|Lizard shared tokenizer > clones the concrete state-machine class for later reader and extension substates`
- `bun|src/package-checks/function-metrics/analyzer/shared/clike.test.ts|Lizard C-like shared states > keeps r-value-reference CCN corrections and namespace-qualified function state`
- `bun|src/package-checks/function-metrics/analyzer/shared/clike.test.ts|Lizard C-like shared states > uses Unicode code points for C-like names and initializes all derived condition categories`
- `bun|src/package-checks/function-metrics/analyzer/shared/clike.test.ts|Lizard C-like shared states > dispatches CLike source override seams through declaration and implementation transitions`
- `bun|src/package-checks/function-metrics/analyzer/shared/golike.test.ts|Go-like shared states retain Go func behavior and resolve every source-derived keyword override`
- `bun|src/package-checks/function-metrics/analyzer/shared/golike.test.ts|Go-like source override seams preserve super dispatch and state receiver binding`
- `bun|src/package-checks/function-metrics/analyzer/shared/code-reader.test.ts|Lizard shared tokenizer > retains Python tokenizer whitespace and splitlines boundaries`
- `bun|src/package-checks/function-metrics/analyzer/shared/code-reader.test.ts|Lizard shared tokenizer > retains CodeReader source fields and aliases with single shared storage`
- `bun|src/package-checks/function-metrics/analyzer/shared/code-reader.test.ts|Lizard shared state machine > invokes the completed-state callback before clearing it, preserving recursive callback replacement`
- `bun|src/package-checks/function-metrics/analyzer/shared/code-reader.test.ts|Lizard shared state machine > retains source-spelled state fields and state hooks`
- `bun|src/package-checks/function-metrics/analyzer/shared/code-reader.test.ts|Lizard shared state machine > retains source decorator factories for bracket and token-until states`
- `bun|src/package-checks/function-metrics/analyzer/shared/js-style-regex.test.ts|JavaScript-style regex joining only accepts a match anchored at the combined token start`
- `bun|src/package-checks/function-metrics/analyzer/shared/rubylike.test.ts|Ruby-like states clone the runtime subclass and resolve its function keyword`
- `bun|src/package-checks/function-metrics/analyzer/shared/rubylike.test.ts|Ruby-like states expose inherited _def callbacks to Lua anonymous _defs`

Proves:

- The product-owned, in-memory primitive pipeline preserves the named source-aligned processor and shared tokenizer/state behavior needed by translated readers: function facts, NLOC, CCN, parameters, default no-extension pipeline, Python splitlines/whitespace distinctions (including `str.strip()` directive handling for U+001C and BOM), comment directives, generated-code stopping, token boundaries, anchored JavaScript-style regex joining, Unicode C-like identifiers, derived condition categories, CLike source override dispatch through declaration, entering-implementation, implementation and old-C callback transitions, source-named model aliases, the complete retained `OutputScheme` object (`extensions`, mutable `items`, `value_columns`, `FUNCTION_INFO` average patching, silent metadata, code-point widths, Python `str.strip()` captions, and string-format lifecycle), source `analyze_files`/`map_files_to_analyzer` construction and ordered cross-file reassignment, completed-state callback-before-clear ordering with recursive callback replacement, concrete nesting/state subclass cloning, source-spelled CodeReader/state fields and bracket/token decorator factories, source-spelled duplicate nesting decorator adaptation, explicit `undefined` cross-file result propagation (rather than an absent hook), r-value CCN corrections, namespace qualification, Go/Ruby-like source-derived function-keyword dispatch, Go-like source subclass `super` dispatch with its state receiver binding, and Ruby-like inherited definition-callback visibility for Lua's source subclass seam. The retained OutputScheme string helpers do not invoke report, CLI, or Product output behavior.
- These entities do not prove reader registry selection, Check integration, cancellation/resource limits, or removal of the Lizard runtime.

## Case FM-ANALYZER-READERS-B-001: translated script readers preserve Lizard 1.24 reader-local function metrics

Owner: `docs/development/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/function-metrics/analyzer/readers/script-readers.test.ts|script readers preserve every registered suffix and normal/edge oracle fixture`
- `bun|src/package-checks/function-metrics/analyzer/readers/script-readers.test.ts|Python and GDScript keep decorators, nested functions, multiline parameters, and inner branches`
- `bun|src/package-checks/function-metrics/analyzer/readers/script-readers.test.ts|Ruby and Lua retain function block boundaries and branch complexity`
- `bun|src/package-checks/function-metrics/analyzer/readers/script-readers.test.ts|Ruby keeps percent literals, symbols, variables, and interpolation token boundaries`
- `bun|src/package-checks/function-metrics/analyzer/readers/script-readers.test.ts|Perl package-qualified named subroutines and R assigned functions retain source names`
- `bun|src/package-checks/function-metrics/analyzer/readers/script-readers.test.ts|Python source groups preserve soft keywords, triple strings, indentation, and forgiveness`
- `bun|src/package-checks/function-metrics/analyzer/readers/script-readers.test.ts|GDScript source group preserves func inheritance and elif complexity`
- `bun|src/package-checks/function-metrics/analyzer/readers/script-readers.test.ts|Ruby and Lua source groups preserve tokenizer offsets, nested blocks, and anonymous functions`
- `bun|src/package-checks/function-metrics/analyzer/readers/script-readers.test.ts|Perl source groups preserve prototypes, attributes, nested calls, and anonymous declarations`
- `bun|src/package-checks/function-metrics/analyzer/readers/script-readers.test.ts|R source groups preserve left and right assignment, aliases, nesting, and logical complexity`

Proves:

- Python, GDScript, Ruby, Lua, Perl, and R readers preserve the checked-in Lizard 1.24 normal and edge oracle observations for every reader-owned suffix, including case-distinct R suffix spellings.
- The reader-local regressions preserve Python/GDScript decorator, nested-function and multiline-parameter facts; Python soft-keyword, triple-string, indentation and forgiveness processing; GDScript `func` inheritance and `elif`; Ruby percent literals, symbols, variables, MyToken-relative interpolation restarts and block boundaries; Lua comment tokenization, inherited Ruby-like nested blocks and assigned anonymous functions; Perl package-qualified named subs, prototypes, attributes, nested calls, anonymous declarations and ternary condition behavior; and R source token lifecycle, left/right assignment, source-faithful alias ranges (including the upstream alias NLOC), nested function lifecycle and logical complexity.
- These entities prove direct in-memory reader behavior only; registry selection, Check integration, cancellation/resource enforcement, and Lizard-runtime removal remain separately owned boundaries.
