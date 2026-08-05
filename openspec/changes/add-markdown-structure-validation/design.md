本 design 仅说明 Markdown 结构 feature fragment、parser与observation/finding接入方案；它是临时未审计 artifact，不表示方案已获准实现。

## Context

本临时 change artifact 设计 Markdown 结构检查的实现边界；动机见 `proposal.md`，可观察契约见 `specs/markdown-structure-validation/spec.md`。当前仓库 `scripts/**` 的正则校验只服务 repo 开发流程，不能成为产品解析、配置或输出契约。实现依赖尚在并行起草的 `standardize-quality-capability-contract` 与 `add-file-policy-overrides`。

## Goals / Non-Goals

**Goals:**

- 在 `src/product/**` 建立 parser-adapter 到 content-quality Core 的单向边界，由本feature descriptor从normalized inventory与resolved policy选择精确 Markdown paths，输出 registered observations 与可定位 findings。
- 让解析语义、稳定单位、阈值选择和 finding 投影可独立测试，并让 per-file override 仅在政策决策层生效。
- 将 GFM 方言作为产品行为固定，而不将任一 parser package、版本或 AST 类型暴露为 public config。

**Non-Goals:**

- 不把仓库 script validator 迁移为产品实现，不做格式化、自动修复、Markdown lint 规则全集或外部链接网络请求。
- 不重定义 foundation 的 registry/Observation/Finding/machine DTO common shape，也不改写 file-policy patch与resolution算法；本change只拥有自己的optional config-v2 fragment和semantic catalogs。

## Decisions

### Decision 1: 以产品定义的 GFM 语义隔离 parser

实现 SHALL 通过内部 parser adapter 取得含 source location 的 Markdown semantic tree；Core 只消费产品内部的节点/文本投影。选择 GFM 是因为项目文档常用 table、task list 等扩展，且比让每个项目或检查选择 parser 更可复现。替代的 CommonMark-only 会错误处理既有 GFM 文档；让配置选择 parser 会泄露实现并破坏 tool-neutral public contract。

### Decision 2: 先计算 metrics，再由有效政策判定 finding

扫描阶段计算 document/section/paragraph 与 heading facts，政策阶段在Product Config解析的effective `checks.markdownStructure`（含 file override）上判定发现。这样 neutral observation 可以输出事实，而 gate/项目政策可以独立选择阈值。替代的“未配置阈值就不计算”会把观测与阻断耦合，也无法解释 override 的影响。

### Decision 3: prose 计量不把代码与表格内容伪装成文档长度

文本投影遵从 spec 所列 AST 节点，front matter/code/table 内容不贡献这些长度度量，list prose 贡献 document/section 且 list item paragraph 可单独评估。替代的整文件字符数或 regex 行计数会把标记、代码和数据表混入内容质量，且无法提供稳定结构位置。

### Decision 4: 依赖 change 是实现前置而非复制的契约来源

本change注册自身 capability/check/metric IDs、`checks.markdownStructure`完整schema与neutral/override metadata，并消费foundation的descriptor/Observation/Finding/output common shape和file-policy的typed patch/precedence。替代的foundation-owned feature fields或第二份merge/output shape会混淆owner。

### Decision 5: Observation catalog与顺序由feature descriptor固定

Descriptor固定六个metric IDs及unit/subject组合，并以path → document → source-ordered sections → source-ordered paragraphs、每个subject words先于characters排序。Subject identity使用document或AST ordinal，不使用absolute path、line number或parser node ID。替代的mapper排序或parser-native identity会使相同core facts在machine/human/cache边界漂移。

### Decision 6: Catalog注册改变semantic fingerprint而不改变machine schema

注册structure capability、四个check IDs与六个metric catalog entries必须进入foundation的sorted canonical registry projection并更新expected `semanticRegistryFingerprint`、examples与producing-revision validators。Immutable machine-v2 schema继续只验证non-empty identifier和record shape，其bytes/shape不得因本feature新增catalog ID改变。替代的把IDs枚举进schema会把revision membership与portable transport shape错误耦合。

### Decision 7: Finding evidence按check封闭且message只负责人读

四个checks分别注册exact finding-code集合与ordered typed evidence；size checks统一发布subject kind/identity、rule、actual、threshold、unit，heading check统一发布subject identity、rule、actual、expected、unit。Catalog明确required/kind/order/identity/redaction，Product validator拒绝任何漂移；message/suggestion只从同一normalized finding渲染，不成为机器语义source。`requireFirstHeadingH1`作为第四个heading leaf独立于single-H1，并与其余十六个leaves同样可override。

## Risks / Trade-offs

- [GFM parser 的实现差异或升级] → 固化产品观察语义与 fixture corpus，隔离第三方 AST，并在升级时运行语义回归。
- [Unicode word/character 边界与读者预期不同] → 用 spec 的 text-node/Unicode 定义和覆盖中英文、emoji、链接文字的测试样例公开证明。
- [feature fragment/evidence 与共同composition实现漂移] → tasks 1.1逐项核对十七个leaves、check/metric/evidence catalogs与foundation/file-policy最终挂点，随后用schema/editor/example/validator drift tests证明单一source。

## Migration Plan

1. 完成tasks 1.1的阻塞审计，确认两个依赖change与本feature fragment/catalog无冲突。
2. 在产品 runtime注册config fragment/descriptor并添加内部解析与observation/finding管线，同步schema、owner docs和示例。
3. 用 fixture、产品 CLI 和跨边界 workspace 验证证明 observation 与 gate 下的结果一致；发生回退时移除该新 check 的接入而不更改既有检查。

## Open Questions

无未回答开放问题；tasks 1.1仍须完成，审计前不得实现。
