# 性能审查清单（Performance Review Checklist）

这是 code review 时使用的 performance quick reference。只有当改动触及 hot path、large input、pagination、database/query、process invocation、serialization、browser rendering、bundle size 或可能改变可观察性能成本时才加载。

性能判断必须以 measurement、复杂度变化或明确 budget 为依据。不要把主观“看起来更快/更慢”当作 finding。

## 审查入口（Review Entry Points）

- [ ] 改动是否影响用户高频路径、startup、request latency、CLI command latency、page load、interaction 或 CI runtime。
- [ ] 是否改变 parsing、search、query、pagination、rendering、serialization、process boundary 或 generated output。
- [ ] 是否引入 full-data load、重复 parse/query、N+1 traversal、unbounded recursion、large clone、render loop 或 expensive synchronous work。
- [ ] 是否影响 Windows/path handling、large file streaming、stdout/stderr capture、timeout behavior、bundle/runtime size 或 dependency install/build cost。

## 先度量（Measurement First）

- [ ] 有 baseline：现有 test、fixture、smoke command、benchmark、profiling data、monitoring 或复杂度说明。
- [ ] 有对比：改动前后使用相同数据、相同 command/request/UI path、相同 output mode 与相同 limits。
- [ ] 结果报告 p50/p95、median 或至少多次运行的稳定趋势；单次 wall-clock 只作为弱证据。
- [ ] 如果没有可运行 measurement，review 说明 residual risk，并要求聚焦 fixture、benchmark 或 follow-up。

## Large Input / Query / Rendering

- [ ] Large input 不会在每个 page、match、request 或 render 中重复做完整扫描/查询。
- [ ] Search、parse、query、render 和 serialization 是线性或有界行为，避免 nested loop 随 record/input size 爆炸。
- [ ] Long lines、invalid Unicode、large payload、deep nesting、large DOM 或 big result sets 不会导致 pathological memory growth。
- [ ] 输出摘要、list、preview 或 find 时，不会构造不需要的大段正文、HTML、JSON 或 object graph。
- [ ] 需要保留 slice/cache 时，避免无意义复制；但不要为微优化牺牲 correctness 或 contract stability。

## Pagination / Limits / Continuation

- [ ] List/search/read/query 都强制 page size、limit、timeout 或 output caps。
- [ ] Pagination metadata 稳定，continuation/cursor 不会跳项、重复项或需要重新加载无限结果集。
- [ ] Empty result、error path 和 not-found path 同样有界，不能因为没有命中而扫描额外无关资源。

## CLI/API/Process/Browser 边界

- [ ] Wrapper 没有复制 owning implementation 的 parsing/routing 逻辑；重复实现通常也会重复成本。
- [ ] Process invocation 有 timeout 与 output-size caps；失败路径不会等待额外 stderr/stdout。
- [ ] JSON serialization/deserialization 不重复转换 wrappers。
- [ ] Browser rendering 避免 unnecessary re-render、layout thrashing、large synchronous work 和 missing image dimensions。
- [ ] Logging 不输出大块 raw body，也不在 hot path 做昂贵 formatting。

## 依赖与构建成本（Dependency / Build Cost）

- [ ] 新 dependency 对 runtime cost、bundle/binary size、install/build time 与 platform support 的影响被说明。
- [ ] Dependency 改动使用 repository-approved workflow，并检查 lockfile impact。
- [ ] Generated artifacts 不显著放大 repo size、test fixture size 或 CI runtime。

## 常见反模式（Anti-Patterns）

| Anti-pattern | Impact | Review response |
| --- | --- | --- |
| Full-data load for every page | Large inputs become slow and memory-heavy | Require bounded pagination or cached parse/query |
| Repeating parser/query in wrapper | Duplicates logic and cost, breaks ownership | Keep behavior in owning layer |
| Rebuilding wrappers repeatedly | Serialization overhead and contract risk | Share business data, not transport wrappers |
| Unbounded search/traversal | Timeouts and high memory usage | Require limits and negative fixtures |
| Logging raw bodies | Slow output and possible secret leakage | Log concise structured context |
| Adding dependency for tiny helper | Install/build/runtime cost | Prefer local simple code when clear |
| Re-running broad verification unchanged | Wastes review time | Run again only after relevant edits |
