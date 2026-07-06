---
name: performance-optimization
description: >-
  用于 performance optimization：当明确 budget、baseline、用户报告、monitoring、
  benchmark 或 profiling data 指向 load time、response time、CLI latency、parser/search、
  pagination、serialization、rendering、CPU、memory、bundle 或 IO bottleneck 时使用。
---

# Performance Optimization

## 使用边界

- 只在已有性能证据时使用：spec 写出 budget，已有 baseline 可比较，用户或 monitoring 报告慢行为，或 profiling/benchmark 指出慢路径。
- 不为直觉 micro-optimization 启动；没有 baseline 时，先建立 baseline。
- 默认先优化用户可观察路径或明确 budget 路径，而不是优化实现中看起来“可能慢”的局部。
- Web、backend、CLI/local-tool、data processing、build/test pipeline 都可适用；按当前任务选择对应 workload。

## 先测量

每次改动前先记录可复现 workload：

- **Command/API/UI path**：binary、subcommand、endpoint、route、flags、path、query、payload、output mode、page/limit、browser action。
- **Fixture/data**：数据规模、输入形状、文件大小、record 数、重复项、长字段、嵌套深度、真实 edge case。
- **环境**：debug/release、OS、runtime version、network/storage、warm/cold cache、相关 env var、device/profile。
- **结果**：wall time、p50/p95、CPU、memory、bundle size、stdout/payload size、Core Web Vitals 或是否触发 pagination。

没有这些信息，不要声明 bottleneck 或收益。

## 工作流

1. **Baseline**：用当前 public surface 记录 before numbers。
2. **Isolate**：比较相邻层，把慢点归类为 parsing/domain、routing、IO/process、database/query、network、rendering、serialization、identifier lookup、search、pagination、bundle 或 memory。
3. **Representative workload**：使用能代表问题的数据、页面、fixture、traffic shape 或 large input，而不是只测短 smoke case。
4. **Benchmark/profile**：优先使用项目已有 benchmark/profiling 工具；没有时使用可复现命令或系统计时工具，并保持 workload 和环境一致。
5. **Fix**：只改已证明的最小慢路径，保持 owner boundary、schema、ordering、pagination、error behavior 和 user-visible behavior 稳定。
6. **Remeasure**：用同一 workload 比较 before/after；噪声较大时报告多次运行的 median、p95 或保守范围。
7. **Guard**：只有已有 budget、baseline、用户报告或 merge policy 需要后续比较时，沉淀覆盖优化路径的最小性能验证证据：unit test、benchmark、smoke check、monitoring note 或 budget 文档。Timing measurement 默认作为 observation；只有明确 budget 或 merge policy 时才成为 required check。

## 参考加载

- 需要 workload 分类、baseline 模板、fixture/data shape、bottleneck triage、budget 模板、常见误判或验证范围时，读取 [performance-checklist.md](references/performance-checklist.md)。
- `references/original-skill.md` 仅作为迁移前来源记录；运行任务时不默认加载。

## 验证

交付前确认：

- before/after measurements 使用同一 workload、build/profile、数据、配置和环境假设。
- 已说明 bottleneck 分类，以及为什么当前改动命中该分类。
- User-visible behavior、schema/output shape、ordering、pagination、security boundary 和 error behavior 没有被性能改动破坏。
- 已运行覆盖改动范围的最小 benchmark/test/smoke；跨 runtime、schema/examples、output layer、CLI/API、browser、deployment 或 docs 边界时按仓库规则扩大验证。
- 无法沉淀自动化 timing evidence 时，已记录复现命令、fixture/data、budget 或 baseline，以及原因。
