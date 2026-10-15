# Design

在各现有 owner 内保留输出与失败边界，以 invocation-local 索引和一次片段拼接兑现相同结果的较低重复成本。

## Context

输入为 `tmp/tooling-census-20261015/census.md`。已按现有工具 owner 逐项核实候选，
采用依据为同输入操作量和语义回归；详细采用表、差分与组合验收见 [evidence.md](evidence.md)。

## Goals / Non-Goals

目标是去除不承担契约的重复工作。非目标是改变 Product、Analyzer/来源、容量管理、timeout、字节限制、trace 完整性、发布或网络工作流；不增加依赖或跨 invocation cache。

## Decisions

### Intended Change

按现有工具职责实施五组局部调整，候选编号、部分采用项和不采用理由由
[evidence 采用表](evidence.md#candidate-closure)逐项承接：

1. package material：registry 以路径 segment 的 ancestor/target Sets 保留首个冲突诊断；tar 使用本次 inventory 的
   path Map；ESM token 一次拼接。digest 前置、完整解压及全部审计保持。
2. 文档投影：同源只读一次，Markdown 建 heading/section 索引，非重叠 replacement 一次构造，delimiter 扫描最长 run。
   重叠 replacement 沿原倒序拼接/splice；JSDoc per-target matcher 保留，以保持 `$` 和异常 comment 行为。
3. 模拟观测：本 Run 复用 task Map，资源 Map 在每次 computeRates 首个实际 claim 时建立；累计 wait 顺序不变，
   context 捕获固定 observation prefix 并校验索引，旧 context 不能读取未来。
4. membership 与分析：lanes/topic 使用局部 Sets/计数；missing-link 单调定位仍逐 occurrence 查询 live 文件系统；
   layout 内复用 module facts/resolution cache/public symbol identity，保持 value/type 与独立 no-emit 证明。
5. canonical 文本：追加 chunks 后 join 一次，完整 descriptor/prototype/symbol/cycle/finite-number 拒绝规则与反射顺序保持。


### Resulting Impacts

所有索引有 invocation/Run 明确生命周期，不信任 mtime 或 receipt 代替 bytes。替换构造保留未管内容 bytes 与 token quoting；诊断仍按原 traversal 顺序生成并由原 owner 排序。新增测试优先扩展已有实体、复用对应 Case，不为性能操作数建立名义 Case。

## Risks / Trade-offs

小输入可能增加少量 Map/Set 分配；换取已证明的合法输入增长成本降低。递归 canonical 遍历仍有调用深度边界；不借本次优化宣称固定内存或 DoS 防护。snapshot closure 必须拒绝负数、非整数等原数组不可索引值；不以 live history 直接暴露未来。

## Open Questions

无。采用范围已按等价性证据收敛，逐项保留成本见 [evidence.md](evidence.md#candidate-closure)。

## Implementation Observations

现有质量门槛曾发现新增函数参数数、CCN/nesting、code density 和 renderer 文件规模问题。最终按领域职责整理：
example region 使用同次 parser state；heading-path grouping 与 section-fence sweep 分开；captured-prefix lookup
独立校验索引；Core traversal 集中本次解析状态；canonical container/key 资格校验与逐项串化分离，并保留反射访问序。

`markdown-example-target-index.ts` 长期归属既有 package-api projection owner，承接完整 heading/fence 索引，
renderer 继续拥有解析、诊断和 replacement/fallback。旧位置没有重复实现或兼容 wrapper，也未新增 root entry。
阈值、waiver、Analyzer、算法和输出契约保持；单次 SCC 结果仅作为 evidence 中的形成时验证记录。
局部差分、反射顺序和既有组合验收的精确边界统一保存在 [evidence.md](evidence.md#verification-and-handoff)，
本页不重复逐轮运行日志。
