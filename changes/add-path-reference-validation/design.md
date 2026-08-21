# Design

本设计用封闭 token grammar 和 inventory-only lookup 实现文本路径引用检查，避免复制 link 或 dependency owner。

## Context

当前 [`docs/scan-scope.md`](../../docs/scan-scope.md) 只允许 scanner 消费 Product Core 已收集的 exact paths；Configuration 与 Quality Metrics owner 已建立 ordinary Check、Project Definition 和 Check/Record Core facts。活动决策 [`expand-format-aware-built-in-checks`](../../docs/decisions/expand-format-aware-built-in-checks.md) 将 path reference 保留为独立 future built-in Check；未来 Record 边界由 [Check-local Record data](../../docs/decisions/report-check-owned-record-data-with-local-identities.md) 规定。

本 Plan 形成时列出的 Check/Core 与 Project Definition foundation 已由当前 owner 取代；恢复实施前必须按 [Active Change Portfolio](../active-change-portfolio.md#这些-plan-的恢复边界) 重新映射实际 seam。仍未完成的直接依赖是 `add-file-policy-overrides`；Markdown segment 与 destination ownership 依赖 `add-markdown-link-validation`。本 Check 的旧 Record catalog、comparison 与 generic policy 设计必须迁移为 Check-owned local data、author ID 和 Check verdict，不能要求最小 Record foundation 恢复这些概念。

## Goals / Non-Goals

**Goals:**

- 用足够窄、确定且跨平台一致的 grammar 识别高置信度 project-local references。
- 只用 approved source segments 和 global inventory index完成验证，不读取或扫描目标。
- 保持 Markdown link、path reference 与 source dependency 各有唯一 occurrence owner。
- 发布可行动但不泄露宿主路径、且与 current line 无关的 records。

**Non-Goals:**

- 不尝试理解任意自然语言中的所有 path-like 字符串。
- 不解析 Markdown destination/anchor、import/module/package、源码字符串或语言注释。
- 不证明 target 内容正确、可构建、可导入或属于某个 architecture layer。
- 不以 filesystem existence probe 绕过 inventory，也不增加 path-specific cache 或输出格式。

## Decisions

### Decision 1: Source segmentation 先于 token classification

Markdown owner 从同一 canonical parse 提供 visible prose 与 inline-code segments，并排除 destination、GFM autolink、reference definition target、image target、fenced code 与 front matter。Visible link/image label 仍是 prose。Plain-text source 只有在 resolved Project Definition 明确分配给本 Check 且通过 UTF-8/no-NUL classification 时才作为一个或多个 bounded segments 输入。

首版不自行解析 source-language comments。未来格式 owner 可以贡献新的 approved segment kind，但必须通过独立 Change 确定 extraction 与 occurrence ownership；本 Check 的 path grammar 与 target resolver 无需因此改变。

### Decision 2: Grammar 只接受明确 project-local token

Classifier 在 segment token boundary 上接受以下 forms：

1. 以 `./` 或 `../` 开头、由非空 path segments 组成的 relative reference；
2. 不以 slash 开头、至少包含一个 `/` 的 project-root-relative reference；
3. inline code 中不含 slash、但具有非空 basename 与 extension 的 project-root-relative filename；
4. 上述 forms 可有 trailing `/` 表示目录，或有 `:line` / `:line:column` positive-integer suffix 作为人读 target hint；suffix 不参与 target membership。

Path segments 统一使用 `/`；`.` 和 `..` 只在 lexical normalization 中处理，matching case-sensitive 且不按 host OS case-fold。包含 scheme、leading `/`、Windows drive/UNC、userinfo、query/fragment、glob metacharacter、template marker、控制字符、空白或语言 import 语法的 token 不属于本 grammar。Classifier 不对 unsupported token 产生“可能路径”record，避免把低置信度猜测提升为质量事实。

### Decision 3: Resolution 只查询 inventory-derived index

`./` 和 `../` 以 source path 的目录为 base，其它 forms 以 project root logical namespace 为 base。Resolver 在访问任何 filesystem API 前做 lexical normalization：越出 root 得到 `out-of-scope`；留在 root 内则查询 global inventory 的 exact file set与从这些 file paths 派生的 ancestor-directory set。

未命中集合得到 `unresolved`，但不声称宿主文件一定不存在，因为它也可能被 global policy 排除。Target lookup 不 lstat、realpath、follow symlink、读取内容或重新收集；global policy 外 target 不能由 file policy 或 reference 恢复。

### Decision 4: Markdown destination 与 path text 的 occurrence owner 不重叠

Canonical Markdown parse 中的 destination、reference definition target 和 GFM autolink 只交给 Markdown Link Check；Path Reference Check 永不从 raw Markdown 重新发现它们。Visible label/prose 或 inline-code 中独立出现的 path token由本 Check 拥有。该结构边界优先于“两个 detector 后置去重”，从输入上防止同一 token 获得双 owner。

### Decision 5: Check 和 Record 使用独立稳定身份

Check 拥有稳定 `checkId`；`path-reference-unresolved` 与 `path-reference-out-of-scope` 是独立 `recordTypeId`，两者都表达本 Check 拥有的领域缺陷。每条 record 的 semantic identity由 source normalized path、reference form、safe normalized target或escape classification，以及同一 segment 语义下的 deterministic equal-key occurrence ordinal组成；line、column、range、message、arrival order和host root不参与。

Producing Check 单独附加 current source location供展示和annotation。Out-of-scope record只保留 escape direction/depth等安全分类，不复制 raw absolute target；unresolved record可以保留已经规范化且仍在project namespace内的target。

### Decision 6: Producing Check 拥有结果与失败语义

正常完成时，Path Reference Check 按 deterministic source/occurrence order 提交 final records，并按自己的 domain outcomes 返回 closed verdict：无 `path-reference-unresolved` 或 `path-reference-out-of-scope` 缺陷时 `passed`，存在任一上述缺陷时 `failed`。Unsupported grammar token 在 classification 时被排除且不是记录；如果未来 catalog 引入 non-defect informational record，producing Check 必须按 record type/domain outcome 显式分类，不得从总 record count 推断 verdict。

Source read、segment contract、binding 或 result/protocol normalization 失败由所属 CheckRun 表达，`result = null`；失败前已由 RecordManager 验证并提交的 records 继续存在，Core 不撤销或重新解释它们。

Resolved Project Definition 只提供 closed、serializable source-kind与 enabled policy；file policy 可以缩小 source inputs，不能改变 grammar、恢复 global scope 或把 unsupported token变成accepted path。Acceptance/gate由通用声明式 DecisionPolicy消费稳定 records，本 Check 不建立 message-based suppression engine。

## Risks / Trade-offs

- **Narrow grammar 会漏掉自然语言中的模糊引用。** 首版优先可解释性与低误报；新 grammar form 需要独立证据和 contract 更新，不能静默扩张。
- **Inventory miss 不能区分 absent 与 excluded。** Record 使用 `unresolved` 而非“file missing”，并在 action 中提示检查 target 与 global scope。
- **Equal occurrence ordinal 可能因新增同类引用变化。** 使用 segment-local、equal-key order 限定影响；不退回 line-based identity。
- **Plain text whole-file segmentation 可能成本较高。** 仅消费明确分配且通过 bounded text classification 的 inputs；不增加 project-root traversal。
- **Markdown handoff seam 漂移。** 实施前用依赖 Change 的实际 candidate/segment contract核对字段，但保持 destination owner与本 Change grammar不变。

## Open Questions

无。源码注释、更多格式和更宽 grammar 明确不在首版范围内，不构成实施阻塞。
