# Design

本设计将一次 Scheduler-private 静态图编译表示为少量有领域结果的流水线阶段，再由一个唯一装配点冻结结果。

## Context

- `src/project-run/task-scheduler/graph.ts::prepareTaskGraph` 是 untrusted graph 的唯一 validation/normalization 边界，输出 immutable `PlannedTaskGraph` 和其已冻结 `schedulerGraphSnapshot`。
- `src/project-run/task-scheduler/admission-core-compiled-graph.ts::compilePreparedAdmissionGraph` 是 Product-private compiler entry，只应消费该 prepared graph；它仍保留对调用错误和不可达 prepared-graph 破坏的防御性检查。它不是第二个 untrusted-input validation/normalization boundary。
- `admission-core.ts` 消费 compiler 的 static indexes 来实现 immutable reducer；`scheduler.ts` 保持 shell、Task/Promise、measurement 和 diagnostic owner。二者不在本 Change 范围。
- 当前 Architecture 明确 Scheduler graph snapshot 每 Run 只形成一次，之后不可重建；Map 是 private compiled runtime state，不能因此扩大 public 可见性或 mutability capability。

## Goals / Non-Goals

**Goals**

- 以真实 compiler pipeline stages 表示 catalog、mutex index、relation index、scope index 与 final frozen compiled graph，而不是机械地给每个循环包 helper。
- 保持 declaration slot/occurrence、public lexical order、core 的 forced reverse-slot effect order，以及 active scopes 的 existing maxParallel-plus-ID ordering。
- 用直接的 private compiler test 锁定 graph/snapshot identity、静态 indexes、duplicate occurrence、顺序和 Object.freeze guard；建立一个当前 architecture-owned Case。
- 消除这一个函数对应的两个 quality Records，且不新增 Records；将 focused-quality 的 9 条 total Records 限定为代码质量计数证据。

**Non-Goals**

- 不修改 `admission-core.ts`、`scheduler.ts`、Scheduler loop、admission reducer、decision fallback、measurement、diagnostics、hooks、public API 或 package documentation。
- 不宣称或测量性能提升，不运行 benchmark，也不改变 Map 的 runtime mutability、导出面或可见性。
- 不重新验证或 duplicate-normalize untrusted graph、创建第二张 graph/snapshot，或删除 `taskById` / `scopesById`。
- 不把 focused-quality 的 Record 数量、对象冻结或 pipeline decomposition 解释为速度、吞吐、内存或任何性能结果；不运行 benchmark 或 `--all` Project Gate。focused quality 本身不替代已明确授权的单次 default Project Gate。

## Decisions

### Intended Change

1. `compilePreparedAdmissionGraph` 保留为一次完整编译的 Product-private entry：先验证 root cap，再构造 named task/scope catalogs、mutex slot/occurrence index、relation reverse indexes、scope terminal/activation indexes、canonical public ordering，最后由唯一 assembly stage 冻结 `CompiledAdmissionGraph`。
2. 每个 stage 只拥有一个可命名的 compiler result。关系与 mutex indexes 保留 authored occurrence 和其声明顺序，包括 duplicate relation/mutex entry；unknown dependency、observation 或 terminal 继续在 compiler 中抛出既有防御性错误。它们不替代 `prepareTaskGraph` 对 untrusted input 的 validation/normalization。
3. Final assembly 保留 supplied `graph` reference，因而保留其 single `schedulerGraphSnapshot` reference；不会 materialize 或 copy graph/snapshot。它继续保留 internal `taskById` 和 `scopesById` maps，且不新增任何 externally reachable mutator/accessor。唯一 assembly 保留既有 `Object.freeze` guard；这不把 JavaScript `Map` 表述为深度不可变。
4. Only a direct private test is added. It checks prepared input identity and every compiler-owned index/order that can be asserted without reaching into Scheduler/control behavior. Existing reducer/Scheduler tests remain the evidence for forced-frontier and active-scope selection consequences.

### Resulting Impacts

- **Compiler owner:** helper boundaries must describe pipeline data, preserve existing Object.freeze boundaries and output field identities, retain declaration/occurrence/order semantics, and not move or duplicate untrusted validation from `prepareTaskGraph`.
- **Admission core owner:** no code change; its reverse-slot forced ordering and scope selection semantics consume identical index values.
- **Scheduler owner:** no code change; `decideScheduler` with/without an injected core retains its existing fallback semantics.
- **Test/Case owner:** one direct test entity is added to `WB-RUNTIME-ADMISSION-COMPILED-GRAPH-001`, which owns the private static-index compilation fact without changing public AdmissionGraph evidence.
- **Quality verification:** focused quality records a 9-total-Record snapshot (6 function, 3 file), with the two target Records absent and no Change-caused new Record. It is code-quality evidence only, not a performance result, benchmark, or default/full Project Gate acceptance.

## Risks / Trade-offs

- Decomposition can accidentally reorder declaration slots or lexical public order, collapse duplicate entries, rebuild snapshot data, or move the freeze boundary. The direct test uses intentionally non-lexical task IDs, duplicate relation/mutex entries, multiple scopes and activation/terminal data, and frozen-result assertions to detect these regressions.
- Defensive errors normally follow `prepareTaskGraph` validation and may be hard to reach through valid input; they remain in compiler stages rather than being deleted or shifted to Scheduler.
- `Object.freeze` does not make a JavaScript `Map` intrinsically immutable. This Change neither advertises nor widens those maps; it only preserves their current private runtime use.

## Open Questions

无。范围、owner 和验证入口均已由当前任务明确；若 focused quality 产生不相关现有 Records，只报告其边界，不以本 Change 修复它们。

## Implementation Observations

- 已将 compiler 拆为 declaration-slot catalog、mutex occurrence、relation reverse index、scope terminal/activation、public lexical order 和单一 frozen assembly。`admission-core.ts` 与 `scheduler.ts` 未修改。
- 直接 compiler proof 用 prepared graph 验证 graph/snapshot identity、task/scope/mutex slots、duplicate relation/mutex occurrence、reverse mappings、terminal/activation、lexical order 和 Object.freeze guard；新增 `WB-RUNTIME-ADMISSION-COMPILED-GRAPH-001`。已有 core/Scheduler tests 保持 forced reverse-slot 与 active-scope cap/ID order 的 owner 证据。
- 2026-09-05 的 focused-quality observation 记录：function Records 从 8 条（含本 Change 的 CCN 20 和 density 88）变为 6 条，file Records 仍为 3 条，合计从 11 条变为 9 条。没有 compiler target 或本 Change 新增的 Record。该计数只证明该次质量检查的结果；它不证明性能，也不等同 Project Gate result。
- 已运行 direct and adjacent tests、test-evidence、product typecheck/lint/format、docs validation、Change Plan check 和 focused quality。2026-09-05 已重跑 focused quality（passed；logs: `.log/project-gate/2026-09-05T06-31-40.188Z-1992877-bb413aed-824b-4802-97b0-5c37cac8760a`），确认 9 total Records、6 function Records、0 target compiler Records。已按后续显式授权执行一次 default `bun run check`（passed；31 passed、5 not-applicable、0 failed/unavailable；logs: `.log/project-gate/2026-09-05T06-32-23.334Z-1993216-1b7893a7-9d43-4072-abb2-b78ef8e35eb8`）。归档与 task-scoped commit 随后执行；`bun run check -- --all`、benchmark 和 push 未执行。
