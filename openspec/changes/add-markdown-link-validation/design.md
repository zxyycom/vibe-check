本 design 仅说明离线 Markdown 链接feature fragment、解析验证与外链handoff；它是临时未审计 artifact，不表示方案已获准实现。

## Context

本临时 change artifact 设计离线 Markdown 链接验证；动机见 `proposal.md`，可观察契约见 `specs/markdown-link-validation/spec.md`。现有 `scripts/**` validator 以 regex 只检查部分相对路径、跳过 anchors 和 URL，不能代表产品行为。实现依赖 `introduce-content-quality-foundation` 与 `add-file-policy-overrides`，但不依赖 `add-markdown-structure-validation`。

## Goals / Non-Goals

**Goals:**

- 在 `src/product/**` 以 parser-adapter、URL 分类、project-root-aware local resolver 和 anchor index 组成单向管线。
- 对每个链接给出确定类别及 source location；所有本地读取在 root containment/symlink 检查后才发生。
- 固定 `gfm-heading-slug-v1`，使本地/跨文件 anchor 验证可复现且与 structure threshold 无关。

**Non-Goals:**

- 不执行 HTTP/DNS/TLS、重定向、重试、缓存或任何 external reachability 检查。
- 不把本 change 与结构检查的 parser package、阈值、finding 或启用状态耦合，也不采用 repo script 的 regex 作为产品实现。

## Decisions

### Decision 1: 链接解析、分类与验证分层

先从 Markdown AST 提取 link occurrences，再按 URL 语义分类，最后只对 project-local/same-document 类做 filesystem 或 heading 验证。选择分层可使无网络情况下 external 值仍可观察且每条链接恰有一个结果。替代的“未知链接直接跳过”会掩盖 policy 风险；网络验证会引入不确定性并越出范围。

### Decision 2: 本地解析以 project root 和 realpath 双重约束

relative target 先以引用文件所在目录词法归一化，再在存在目标时检查 realpath 是否仍在 project root 内；任何 lexical escape、绝对路径或 symlink escape 都不读取。替代的简单 `exists` 检查存在 traversal/symlink 漏洞，且会让扫描越过用户批准的项目边界。

### Decision 3: Heading slug 固化为独立产品 dialect

实现建立按 `gfm-heading-slug-v1` 生成的每文件 heading index；该版本化算法与 Markdown structure check 共享必要的文本语义但不共享政策或阈值。替代的 parser 默认 id 或浏览器默认 id 随实现变化，不能作为稳定的跨文件链接契约。

### Decision 4: `introduce-content-quality-foundation` 只提供共同接点

本change拥有`checks.markdownLinks`完整schema、neutral contribution、override metadata与stable capability/check IDs；`introduce-content-quality-foundation`只拥有descriptor/Finding/machine common shape，`add-file-policy-overrides`只拥有typed patch/resolution。本feature descriptor从normalized inventory和resolved section选择exact inputs并投影结果。替代的foundation-owned feature fields或link-only merge/output旁路会破坏owner与tool-neutral contract。

### Decision 5: 网络检查只消费外链候选而不反向影响离线结论

本change向`add-network-link-validation`交付唯一 sanitized `ExternalLinkCandidate`：source path、link kind、external classification、closed safe URL shape、同shape occurrence ordinal与由这些safe fields派生的semantic identity。Location与closed raw/canonical request material分别保存在identity-keyed bounded ephemeral lookups，不属于candidate；network request boundary按identity读取后释放。Query value、userinfo、fragment和location均不参与identity，raw/full URL不进入log、cache、artifact、public DTO或persistent derived key。替代的candidate内嵌request material或canonical full URL identity会让两侧exact DTO漂移、query value轮换制造regression并把credential material带入持久边界；source start也会让空行移动制造新identity。

### Decision 6: Complete policy leaves控制finding而不删除classification

`checks.markdownLinks`用enabled和closed local/anchors/boundary booleans表达全部可配置政策；neutral contribution完整启用deterministic checks。Nested rule关闭只禁止owning finding，不删除链接分类或enabled capability的external handoff；只有section absent/effectively disabled/profile quick才skip整个capability。替代的partial section或按finding开关删除candidate会让network handoff、no-input与config provenance不可解释。

### Decision 7: Catalog注册改变semantic fingerprint而不改变machine schema

注册link capability、三个check IDs及其finding-code/evidence catalogs必须进入foundation的sorted canonical registry projection并更新expected `semanticRegistryFingerprint`、examples与producing-revision validators。Immutable machine-v2 schema bytes/shape保持不变；external candidate仍是internal handoff，不加入public evidence catalog或DTO。替代的在portable schema枚举check/evidence IDs或公开candidate会错误扩大transport contract。

### Decision 8: Evidence与changed membership由descriptor拥有

三个checks各自注册exact codes和ordered typed evidence，sanitized target/path/anchor提供机器语义，message只负责人读；raw query/userinfo/absolute host path永不进入finding。Descriptor为local/anchor finding形成source+actual/intended target causal path set，boundary finding只用source；changed取causal set与resolved changed scope的交集，regressions保持changed的order-preserving subsequence且要求显式baseline。替代的source-only changed判断会漏报只修改目标文档导致的broken anchor。

## Risks / Trade-offs

- [不同平台 URL/path 边界不一致] → 以 OS 无关的 URL 分类和显式 POSIX/Windows/file URI fixture 覆盖，再在 filesystem boundary 处理平台路径。
- [GFM slug 与用户预期不符] → 固化版本名、算法和重复 heading 规则，并加入 Unicode/encoded fragment 回归样例。
- [sanitized shape仍意外携带secret material] → fixture覆盖userinfo/query values/fragments并对logs/cache/artifacts/public DTO执行canary byte search，identity只断言query-key shape。
- [feature fragment 与共同composition/handoff漂移] → tasks 1.1核对section/check/evidence catalogs、causal paths、override metadata、foundation mapper与`add-network-link-validation` candidate字段，禁止临时兼容字段。

## Migration Plan

1. 完成tasks 1.1，对`introduce-content-quality-foundation`、`add-file-policy-overrides`与`add-network-link-validation` handoff做阻塞审计。
2. 注册config fragment/descriptor并实现AST提取、classification、受控local resolution、heading index、typed evidence、causal path set与sanitized external candidate，为每个类别建立fixtures。
3. 同步最终 config/schema/examples/docs，运行产品 CLI、契约与 workspace 验证；回退时撤销本 check 接入，保留既有扫描能力。

## Open Questions

无未回答开放问题；tasks 1.1仍须完成，审计前不得实现。
