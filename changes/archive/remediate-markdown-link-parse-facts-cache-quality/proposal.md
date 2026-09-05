# Proposal

本 Plan 将 Markdown Link parse-facts cache 拆为 codec 与 session 两个内部模块，并记录完成该调整所需的范围内验证。

## Why

`src/package-checks/markdown-link-validation/parse-facts-cache.ts` 同时拥有持久 JSONL envelope/payload codec 和每次 invocation 的 session lifecycle/I/O。两种不变量耦合在一个文件中，产生 file code-lines 与 `parse` cyclomatic-complexity 两条质量 Record，也使审查者难以分别判断持久化兼容性和 Check-transparent lifecycle。

## Outcome

完成后，codec 只负责 parse-facts 的持久化表示、identity 与恢复；session 只负责单次 invocation 的读、解析、dirty 状态与最终发布。该边界不改变 Markdown Link Check 的 settlement：缓存异常、取消或无效缓存仍只导致 fresh parse、miss 或跳过发布。focused quality 比较中，原目标文件的两条 Record 消失，且两个 cache 模块不新增质量 Record。

## Scope

### Intended Change

抽取 Link-private envelope/payload codec；将 session 的 `parse` 拆为具名 lifecycle 步骤；保留现有 JSONL 持久化格式、字节级 digest identity 与 Check-transparent fallback。范围只限 Markdown Link parse-facts cache 及其直接证据。

### Resulting Impacts

- codec 与 session 以不可变 `ParsedMarkdownLinkFacts` 和 digest/envelope 操作交接；调用方继续只使用 session 的 `parse` 与 `finalize`。
- 直接 cache 测试保持既有 parser-facts Case/entity identity，并只补充从该 entity 可观察的 lifecycle 证据。
- 验证必须分别覆盖持久化/生命周期兼容性与这两条目标质量 Record 的比较；全局 Gate 或发布验证不由本 Change 的范围内证据替代。

## Success Criteria

- `parse-facts-cache-payload.ts` 拥有 closed/frozen payload projection、版本与 identity validation、SHA-256 identity 和 parser-facts restoration；`parse-facts-cache.ts` 仅拥有 session lifecycle/I/O。
- 持久 cache 的 exact-byte digest、strict UTF-8、JSONL complete-line recovery、dirty dedupe 与一次 awaited terminal publication 保持可观察兼容；缓存读写失败、malformed state 与 cancellation 不改变 Check result boundary。
- focused quality 结果从基线 39 条降至 37 条：原 `parse-facts-cache.ts` 的 file code-lines 与 `parse` cyclomatic-complexity Record 均消失，两个 cache 模块均无新增 Record。
- narrow cache tests、Case ledger、product typecheck/lint/format、active Change check、focused quality comparison 与一次 default Project Gate 均有通过证据；package 与 release 验证不得由这些结果推断为已运行。

## Affected Owners

- `docs/checks/markdown-link-validation.md#parse-facts-cache-的生命周期与可见性`
- `docs/decisions/enable-explicit-markdown-link-parse-cache.md`
- `docs/coding-style.md`
- `docs/testing.md` and `docs/testing/case-maintenance.md`
