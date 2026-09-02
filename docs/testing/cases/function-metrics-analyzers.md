# function-metrics-analyzers

## Case FM-ANALYZER-READERS-A-001: Fortran、Structured Text 与 Erlang reader 保持 Lizard 1.23 可观察语义

Owner: `docs/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/function-metrics/analyzer/readers/fortran.test.ts|Fortran reader preserves every registered suffix, edge fixture, and fixed/free form metrics`
- `bun|src/package-checks/function-metrics/analyzer/readers/st.test.ts|Structured Text reader preserves fixtures and upstream function-block/function/action boundaries`
- `bun|src/package-checks/function-metrics/analyzer/readers/erlang.test.ts|Erlang reader preserves every suffix, comments, branches, guards, nested fun, and macro complexity`
  Proves:

- Fortran 的九个当前 suffix与 Structured Text 的 `st` 对 Lizard 1.23 normal/edge corpus 给出相同 function name、range、NLOC、CCN 与 parameter count；Fortran 同时保留 fixed/free form 边界。Erlang 的四个 suffix、comment、guard、case branch、nested `fun` 与 `?` macro 由当前 direct reader corpus 覆盖。
- Erlang reader-local lexer 直接翻译 Lizard MIT 与 Pygments 2.18.0 BSD-2-Clause 的覆盖范围，不引入 Python/Pygments runtime；已通过四个 fixed-tag suffix fixture、source/adversarial function-metrics observations、七条 Pygments 2.18 token-and-metrics rules 与 exact lexer probe。该 Case 仍不证明 package legal materials、Product integration 或 hard cut。

## Case FM-ANALYZER-EXTENSION-PROTOCOL-001: internal extension protocol keeps the Lizard 1.23 lifecycle closed

Owner: `docs/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/function-metrics/analyzer/extensions/extension-protocol.test.ts|internal extensions preserve default processor order plus object/class ordering_index registration`
- `bun|src/package-checks/function-metrics/analyzer/extensions/extension-protocol.test.ts|internal extension hooks retain FUNCTION_INFO, set_args, cross_file_process, print_result, and silent order`
- `bun|src/package-checks/function-metrics/analyzer/extensions/extension-protocol.test.ts|ExtensionBase receives reader context and can decorate nesting before reader states consume a brace`
- `bun|src/package-checks/function-metrics/analyzer/extensions/extension-protocol.test.ts|every unported extension body is classified and named loading fails explicitly`
- `bun|src/package-checks/function-metrics/analyzer/extensions/extension-protocol.test.ts|Lizard static extension hooks resolve after instance lookup with a wordcount-style class`
- `bun|src/package-checks/function-metrics/analyzer/extensions/extension-protocol.test.ts|extension descriptor lookup gives subclass statics MRO priority and same-instance members priority`
- `bun|src/package-checks/function-metrics/analyzer/extensions/extension-protocol.test.ts|extension call lookup ignores instance-own __call__ while ordinary hooks use it`
- `bun|src/package-checks/function-metrics/analyzer/extensions/extension-protocol.test.ts|extension registration rejects non-Python-compatible ordering indexes`
- `bun|src/package-checks/function-metrics/analyzer/extensions/extension-protocol.test.ts|extension ordering accepts exact non-safe integers with Python list.insert clamping`
- `bun|src/package-checks/function-metrics/analyzer/extensions/extension-protocol.test.ts|invalid subclass static metadata shadows inherited instance metadata instead of falling back`

Proves:

- Core/internal extension protocol preserves default processor order, direct instance/class registration with Python-compatible ordering indexes, instance-then-static wordcount-style hook resolution, extension metadata and lifecycle hooks, and ExtensionBase context/state handoff. Descriptor/ordering fidelity additionally preserves subclass-static MRO priority before inherited instance metadata, same-instance-member priority, the source's special direct-call lookup that ignores an instance-own `__call__` while ordinary hooks use it, exact non-safe-integer `list.insert` clamping, and invalid subclass static metadata shadowing rather than fallback.
- The 19 deferred extension bodies remain explicitly named and fail closed when loaded; this Case does not prove a deferred body’s implementation, reader fidelity, registry enablement, Product integration, or hard cut.

## Case FM-ANALYZER-MALFORMED-DIFFERENTIAL-001: source-order readers retain complete malformed-source observations

Owner: `docs/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/function-metrics/analyzer/readers/malformed-source.test.ts|every source-order reader preserves Lizard 1.23 malformed-source whole-file observations`

Proves:

- 每个 Lizard 1.23 source-order reader 都有一个确定的、reader-state-targeted malformed/incomplete fixture；固定 exact-source oracle 与 TypeScript in-memory analyzer 对每项完整函数列表（含 NLOC、CCN、token、parameters、long name、顺序和 range）产生相同结果，或同为完整空列表。
- 该测试同时以 canonical mapping 锁定 27 个 reader identity、source order 和 55 个 case-insensitive suffix；它不把 malformed source 的语法有效性公开为 Product contract，也不代替 Worker protocol、cancellation 或 resource 边界测试。

## Case FM-ANALYZER-SOURCE-IDENTITY-001: translated reader/shared structure retains fixed Lizard 1.23 identities

Owner: `docs/scanner-dependencies.md#owner-local-adapters`
Entities:

- `bun|src/package-checks/function-metrics/analyzer/source-identity.test.ts|fixed Lizard reader/shared source identities map to translated symbols or named host seams`

Proves:

- Checked-in source-to-target identity evidence closes every translated `lizard_languages/**` provenance range (33 ranges, 72 classes, 687 listed module/class/member definitions). The AST test verifies every named definition at its TypeScript target or an explicitly named, narrow host seam.
- Source lifecycle class, field, and callback identities cannot silently disappear. The manifest is static verification evidence only: it does not create a runtime registry, reflection surface, or Product plugin API.
- This Case does not prove oracle semantic parity, deferred extension-body implementation, or Product adapter integration.
