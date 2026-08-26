# Design

本设计以稳定 owner 而非文件类别或历史容器组织实现，并把 package 指南作为与运行时、声明和源码同版本交付的 consumer 材料。

## Context

`docs/coding-style.md` 规定目录是模块所有权边界：每层必须增加可识别 owner 含义，只有形成独立 owner、变化原因、消费边界或内部职责集合时才建立目录；多个消费者不足以证明共享职责。`align-source-layout-and-naming-with-module-owners.md` 已确立 `src/checks` 拥有 package-provided Check implementation，并要求移除缺少上下文的容器。第一轮实施虽移除了 `checks/builtins/` 和 `definition/default-checks.ts`，却仍以 `builtin-option-validation`、`scanner-adapters`、`scan-scope`、`metric-model` 与 `metric-analysis` 形成隐性集中层，并让通用 Definition 按 package-provided Check 身份及 metric policy 解释 options。

`publish-readable-esm-package-layout.md` 要求 package 按模块树同时交付 ESM、declarations 与 `src`，但只公开根路径；物理文档或源码路径不能成为 subpath API。`use-chinese-as-primary-language-for-public-documentation.md` 要求 consumer 说明用中文承载主要语义。首次 package guide 需与这些边界一致，但不在本 Change 内决定后续完整文档系统。

## Goals / Non-Goals

### Goals

- 把单项 package-provided Check 变为独立完整实现 owner，使其源码、测试和文档能以同一领域名称被发现。
- 让 scripts 只修正其内部和跨 owner 的实际归属，而不制造新的顶层重构。
- 交付可随 candidate 发布、可从 README 找到的七项 package-provided ordinary Check 初版指南，并验证文档与 artifact 同步。
- 将并行实现的写入面切开，保留可审计的集成阶段。

### Non-Goals

- 改变 four-state Check/Core/Record、scheduler、effect、网络授权、CLI/bin/subpath 或 runtime host contract；本轮允许在首发前修正 Check options 与 Project Definition authoring surface。
- 新增 package CLI/bin、subpath export、Node/CJS/browser 运行时或手工第二运行时。
- 将所有内部开发文档翻译或一次性建立自动生成的完整 TypeDoc/文档站；后续方案另行讨论。
- 因简单移动而停下征求确认；只有发现真实语义冲突、无法保留 contract 或需要扩大公开/外部写入范围时才阻塞。

## Decisions

### Intended Change

1. **Ordinary Check core。** `src/definition/**` 与 Check execution core 只闭合 ordinary Check grammar、canonical opaque options、trusted callback、scheduling 与 uniform result boundary；不得 import package-provided Check owner、按 Check ID 分支或集中注册 Check-local validator。package-provided Check 与外部 Check 使用同一对象和 callback contract；每项 `src/checks/<check-owner>/` 自己验证 options 并映射为 owning `unavailable`，core 不承诺其业务 shape。

2. **Check-local scanner 与 model。** jscpd、scc、lizard 分别是 duplicate-detection、file-metrics、function-metrics 的下级模块；各自拥有 command resolution、availability、process lifecycle、parser、raw/result model、failure mapping 与测试。不同工具只因都启动进程不构成共同 adapter owner。FileMetric、FunctionMetric 与 DuplicateFragment 等 measurement 类型各归 owning Check；不建立跨 Check metric model。确定性文本排序进入 foundation 的明确能力，不保留 metric-analysis 包装目录。

3. **Project files 是真实共同能力。** 多项 ordinary Check 对同一项目相对文件 identity、Git-aware collection、slash normalization、code-area classification 和 exact-input acceptance 依赖相同不变量，因此该能力从 `checks/scan-scope` 提升为独立 `src/project-files/**`，而不是伪装为一个 Check 或 scanner adapter。它不拥有任何 scanner 协议或 Check final-data shape。

4. **Check-owned authoring policy。** 删除 `ProjectDefinition.quality`、`ProjectQualityConfiguration` 与 `CheckProjectContext.files`。需要 project file selection 的 package-provided Check 在自己的 options 中携带完整 file selection；需要 code-area policy 的 metric Check 同样携带完整 code-area options。repository dogfood 通过普通 TypeScript values 将同一 policy 显式组合进多个 Check，Product core 不保存 hidden operational map，也不提供旧字段兼容层。

5. **Scripts owner 模型。** 保持 `scripts/{development,environment,foundation,validation,docs,package,project,decision-records,test-evidence}` 顶层结构。跨 workflow 的 command/process boundary 归 `foundation`；machine-artifact 的 example/projection 与独立 validation 对称归属到 `docs/machine-artifacts/**` 与 `validation/machine-artifacts/**`；ast-grep programs/rules/rule tests 归 `test-evidence/ast-grep/**`；package third-party licenses 归 `package/artifact/third-party-licenses/**`。facade 为跨 owner 入口，消除 deep import；不改变 `project/quality` 和 Gate 的入口及行为。

6. **首版 package guide。** package consumer 文档以可编辑 Markdown 的 Check guide 为主，README 给出可发现索引。每页固定写明用途/适用范围、完整 options 和默认值、工作原理、效果（final data/Records/messages）、状态与失败边界、外部工具/文件/网络边界、最小及完整配置示例和明确不负责的内容。指南中文为主，保留 identifiers、code、schema 字段和命令原文。无需首期从 JSDoc 自动生成整页文档；以 source contract 与可运行 example 交叉审阅防漂移。

7. **交付绑定。** documentation registry 要求每个 public package-provided Check 恰有一份 guide，README 索引可达。projection/manifest/fingerprint/candidate audit 确认 tarball 包含完整文档树且链接、examples、public inventory 与 runtime/declarations/source 相符。最终 candidate 必须由最终源码重新生成，旧 candidate 不能作为证据。

8. **Implementation boundary。** 后续 review correction 由单一集成序列修改 Product、dogfood Definition、文档、Cases 与 package evidence，避免在同一共享 worktree 并发移动相同路径。原有 A/B/C 并行边界只记录第一轮实施方式，不继续约束修正阶段。

### Resulting Impacts

- **First-release contract correction：** 移除 `quality` 与 `ProjectQualityConfiguration`、把 file/code-area policy 加入 Check options，并把 malformed package-provided options 从 Definition identity branch 改为 owning Check `unavailable`。所有 public docs、types、examples、fingerprint tests 与 dogfood Definition必须同步，不建立 compatibility alias。
- **Test Evidence：** A/B/C 如移动、拆分或重命名原生测试节点，均需遵循 `test-evidence-review`，更新直接 Case materials；全局 Case index/闭合验证留给 integration。
- **Artifact consistency：** C 只能准备 guide sources 和 package-local tests；integration 在所有 source changes 后再更新 shared projection/manifest/fingerprint 并重新生成 candidate，以防投影/receipt 对旧模块树取证。
- **Conflict handling：** Check-local code 若实际被多个 Check 调用，A 需先以 import/call evidence 判定为真实 shared owner，再放进现有明确共享模块；不能把 `builtins` 改名保留。其他任务不得删除或覆盖其它切面正在移动的路径，发现 destination 名称冲突或循环依赖无法不改 public contract 时报告协调者。

## Risks / Trade-offs

- 大量纯移动会让 import、test path 与 Case owner 断裂；分组执行和每组最窄测试降低该风险，但最终 full verification 仍不可省略。
- 首版手写指南存在与 options 漂移的风险；registry coverage、可运行 example、artifact audit 与后续方案评审是当前有意选择的低复杂度防线，不把它伪装成生成式单一事实源。
- package 可读 ESM 会反映重组后模块树；这提高诊断性，但不能被写成新 subpath contract。
- project-files 若吸收 scanner parser、Check-local measurement 或只因路径相似而存在的 helper，会重新形成错误共享层；验收需按每个文件的共同不变量而非消费者数量复核。

## Open Questions

无。用户已确认 package-provided Check 不应在 core 中特殊化、scanner 不应集中；首发前 authoring contract 可按该方向修正。首版指南后续是否扩展为自动 API 参考、站点或更完整文档体系仍留待独立方案。
