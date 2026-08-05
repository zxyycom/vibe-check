本 design 仅说明文本路径reference feature fragment、分段分类与脱敏finding；它是临时未审计 artifact，不表示方案已获准实现。

## Context

本临时 change artifact 设计文本路径引用检查；动机见 `proposal.md`，可观察契约见 `specs/path-reference-validation/spec.md`。用户所称“核心路径”存在与 import/dependency graph 混同的风险，本 design 已将它收敛为文本 absolute/workspace path 与配置化 forbidden literal。本feature descriptor拥有exact-input selector与config/check catalog，并消费`standardize-quality-capability-contract`的registry/finding/output挂点及`add-file-policy-overrides` resolver。

## Goals / Non-Goals

**Goals:**

- 在 `src/product/**` 建立输入文本分段、路径-token 分类、有效政策判定和脱敏 finding 投影的单向管线。
- 把 Markdown 代码/示例是否检查作为公开、tool-neutral 的内容政策，而不靠检测器猜测。
- 在任何报告与机器输出前去除 project root 的真实绝对路径。

**Non-Goals:**

- 不解析 import、resolve module、读取候选路径、构建 dependency graph 或检查文件存在性。
- 不检测秘密内容本身、相对路径的一般有效性，或把 Markdown link validation 的本地文件语义复制进来。

## Decisions

### Decision 1: 将核心路径定义为文本 literal

初始检查对象是文本 token 中的 POSIX/Windows/file URI absolute form 和显式 forbidden literal，不赋予 import 或 package string 路径含义。选择该边界可直接解决硬编码环境路径，同时保持结果可解释、低成本且不侵入架构分析。替代的依赖图检查是不同 owner 与不同误报模型，不能以“路径”名义混入。

### Decision 2: 先分段再检测，代码示例由政策显式控制

Markdown 由 parser adapter 分成 prose、code、front matter 等语义区段；token classifier 只消费政策批准的区段。默认不扫 inline/block code、front matter，默认扫描 prose/list/table；代码示例必须由有效政策明确开启。替代的整文件 regex 无法稳定排除示例和 metadata，且会反复产生无行动价值的 finding。

### Decision 3: 所有项目内呈现值在 projection 前脱敏

分类可在内部保存 root-relative 关系，但 warning/metric projection 使用 `<project-root>` token 和相对后缀，任何真实 root 不穿过 output boundary。替代的事后字符串替换不可靠，容易在 error detail、accepted finding key 或测试 fixture 中泄露绝对路径。

### Decision 4: 例外属于 file policy，而不是 detector special case

`allowedLiterals`、`forbiddenLiterals`、absolute reporting与code/example inclusion由本change的完整`checks.pathReferences` schema拥有，通过Product Config/`add-file-policy-overrides` resolver形成effective policy；detector返回事实与匹配理由。`standardize-quality-capability-contract`只拥有common descriptor/finding/output shape。替代的foundation-owned feature fields、硬编码仓库路径或parser/tool name开关会混淆owner并违背tool-neutral决策。

### Decision 5: Markdown destination metadata由link owner独占

Semantic segmentation排除Markdown link destination和autolink metadata，不受inline/block-code开关影响；可见link/image label仍按普通可见文本检查。Destination中的absolute path、root escape或file URI只由canonical `add-markdown-link-validation`分类，防止同一source occurrence产生path与link双finding。替代的原始文本token扫描无法建立这一ownership boundary。

### Decision 6: Catalog注册改变semantic fingerprint而不改变machine schema

注册path-reference capability、两个check IDs及其finding-code/evidence catalogs必须进入foundation的sorted canonical registry projection并更新expected `semanticRegistryFingerprint`、examples与producing-revision validators。Immutable machine-v2 schema bytes/shape保持不变；opaque finding fingerprint与generic typed evidence不新增check-specific machine field。替代的把IDs或literal evidence keys加入portable schema会使revision catalog与transport shape耦合并扩大泄露面。

### Decision 7: Evidence在normalized model boundary完成脱敏

两个checks都发布closed orderedclassification/policyRule/sanitizedDisplay/ordinal evidence；display使用project-root或classification token，raw absolute/forbidden literal不进入normalized finding、message、fingerprint、cache或output。Classification、policy与ordinal形成line-independent identity，display只负责人读/机器呈现。替代的先保存raw evidence再在Output字符串替换会让accepted finding、cache或error detail提前泄露。

## Risks / Trade-offs

- [POSIX、Windows 与 URI 词法重叠] → 用明确优先级和跨平台 fixture 矩阵验证分类，不通过 host OS 默认猜测。
- [默认排除代码示例遗漏真实 hardcode] → 使用显式政策开关，使需要扫描 snippets 的项目可审阅地选择更严格行为。
- [forbidden literal 过宽造成误报] → 在 token boundary 后匹配，并以 `allowedLiterals` 与 source location 支持项目级收敛。
- [feature fragment/evidence 与共同composition/redaction漂移] → tasks 1.1核对section/check/code/evidence catalogs、array precedence、override metadata、foundation finding projection与`add-markdown-link-validation`排除边界。

## Migration Plan

1. 完成tasks 1.1，对`standardize-quality-capability-contract`、`add-file-policy-overrides`和`add-markdown-link-validation` destination ownership做阻塞审计。
2. 注册config fragment/descriptor并添加Markdown/text segmentation、path classifier、policy evaluation和redacted result projection，以POSIX/Windows/file URI/code-example fixtures覆盖。
3. 同步产品 config/schema/examples/docs，运行产品与 workspace 验证；回退时撤销此 check 的接入，不触碰 import/dependency 功能。

## Open Questions

无未回答开放问题；tasks 1.1仍须完成，审计前不得实现。
