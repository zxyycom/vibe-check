本 change 的核心目标是把现有 TypeScript quality tooling 提升为 Vibe Check 的自包含产品核心，并以 Bun 控制面、内建混合 scanner 和便携目录形成正式产品架构；本文只在本 change 下形成待审计临时计划，不影响现有其它文档或主规范。

## 1. 实现前架构审计门禁

- [ ] 1.1 回答 `design.md` 的四个 Open Questions：函数指标正式语义、Bun control-plane packaging、profile 对 baseline/threshold/accepted-warning 的隔离范围，以及 portable resource budgets；把每个答案写入连续编号 Decision 和对应 spec，清空所有未回答问题。
- [ ] 1.2 阻塞级审计：确认 proposal、design、五个 capability deltas 和 tasks 都围绕“现有 TS tooling 是产品核心”这一核心句；capability ID 使用长期 owner 名称；当前 change 仍只是待审计临时计划；尚未修改其它 docs/specs/code；受影响主 specs 与新架构的冲突已完整列出；验证路径足以证明 source ownership、backend semantics 和 portable closure。审计未完成前不得执行第 2 节及之后的任何实现任务。

## 2. 现有 TS 产品原型基线

- [ ] 2.1 固定 `quality-core`、foundation 和 parallel-task-runner 当前 gitlink revisions，记录来源、许可证、当前 checkout 差异及未推送修改保护方式；不得覆盖用户已有 submodule worktree。
- [ ] 2.2 建立 product runtime import inventory，区分 `quality-core`、运行期必需 helpers、仅开发期 validators/verifier/release scripts，并用调用搜索证明边界完整。
- [ ] 2.3 运行或补齐现有 TS quality-core characterization，固定 scan planning、code area、baseline、cache、scc/Lizard/jscpd parsing、warning 和 artifact report 的迁入前行为证据。
- [ ] 2.4 审计现有 docs/specs/code 与 TS product behavior 的差异，把本 change 必须调整的 owner boundary、实现缺口和后续独立功能决策分开。

## 3. 单仓 Product Core

- [ ] 3.1 建立 Vibe Check-owned product module 边界，使正式入口、core、scanner adapters、domain model 和 artifact projection 不依赖 `scripts/tools/*` gitlinks。
- [ ] 3.2 按固定 revisions 一次性迁入 `quality-core` 和实际使用的 runtime helpers，保留来源与许可证记录，不在迁入任务中改写业务行为。
- [ ] 3.3 将开发期 quality entry 改为消费正式 product API / CLI，证明 product core 不导入 workspace verifier、docs validators 或 release scripts。
- [ ] 3.4 移除已迁入 toolkit 的 `.gitmodules` entries、gitlinks、submodule initialization docs 和 package scripts，确认新 checkout 不再依赖跨仓源码。
- [ ] 3.5 为 product core 运行 typecheck、lint 和完整迁入 characterization，确认源码所有权变化未改变已批准行为。

## 4. TS/Bun 控制面与 Backend Registry

- [ ] 4.1 建立正式 TS/Bun product entry 和模块化单体调用链，复用迁入后的 scan planning、baseline/cache、warning、gate 和 report pipeline。
- [ ] 4.2 定义内部 scanner capability / adapter / normalized result / diagnostic 边界，确保 JS、native process、Python 和未来 WASM 类型不越过 adapter。
- [ ] 4.3 实现内建 backend registry 和 manifest-derived resolution，移除 production PATH、目标项目 `node_modules` 和全局 runtime fallback。
- [ ] 4.4 定义 semantic profile identity 与 cache/result metadata 接线，覆盖 backend version、固定选项和 normalization rule version。
- [ ] 4.5 将现有 scc、jscpd 和 Lizard wrappers 接入正式 registry，并用现有 fixtures 证明迁入前后 normalized behavior。

## 5. Function Metrics Production Backend 与 Sidecar Spike

- [ ] 5.1 根据审计后的正式语义扩展 backend-neutral `FunctionMetric`，覆盖 function identity/location、NLOC、cyclomatic complexity 和 parameter count。
- [ ] 5.2 固定 Lizard 与 Python runtime versions、平台来源、许可证和调用协议，建立四语言 source audit 与 checked-in fixtures。
- [ ] 5.3 实现 Lizard production adapter，将原生输出归一化为已批准 semantic profile，并覆盖成功、无发现、partial、fatal 和 deterministic ordering。
- [ ] 5.4 组装不依赖系统 Python 的 bundled Python/Lizard backend，并验证安装目录、项目目录和临时目录分离。
- [ ] 5.5 制作独立 Rust `function-metrics` sidecar spike，复用现有 structural adapter 中有价值的 parser/normalization 能力，但不接入 production profile。
- [ ] 5.6 在同一组四语言 fixtures 上比较 Lizard 与 sidecar 的 normalized results、冷启动、扫描延迟、峰值内存和产物大小；差异进入显式评估，不自动修改 production backend。

## 6. Portable Distribution Spike

- [ ] 6.1 根据审计决策实现 control-plane release build：compiled Bun executable 或 pinned Bun runtime + bundled JS；记录 Bun version 和可复现 build inputs。
- [ ] 6.2 定义 portable directory layout 和 release manifest，包含 product、platform、control plane、Python/Lizard、scc、jscpd、semantic profiles、schema、checksums 和第三方许可证材料。
- [ ] 6.3 生成 Windows x64 portable package，并确认 production runtime 只从 install manifest / fixed layout 解析组件。
- [ ] 6.4 在无 Node、Bun、Python、npm 和全局 scanner、无网络、只读安装目录以及空格/Unicode 路径条件下运行端到端 scan。
- [ ] 6.5 测量并对照已批准预算记录压缩包/解压体积、冷启动、代表性扫描延迟、峰值内存和 cache 命中表现。
- [ ] 6.6 验证 backend 缺失、损坏、版本/profile 不匹配和子进程失败产生可行动诊断，不发生 PATH 或网络回退。

## 7. Owner 文档与契约同步

- [ ] 7.1 更新 `AGENTS.md`、architecture、navigation、script-tooling、scanner dependencies 和 coding/testing owner，使 TS/Bun product core、模块化单体和内建混合 backend 成为唯一长期架构。
- [ ] 7.2 同步 quality metrics 与 structural scanning owner，记录正式 function metric semantics、production profile、sidecar experimental status 和替换流程。
- [ ] 7.3 按实现审计 CLI、config、output schema/examples、scan-scope、duplicate 和 release contract：只同步本 change 已确定的边界，未确定功能进入后续 change。
- [ ] 7.4 更新 toolkit checkout、product build 和 release 文档，使其只描述单仓自包含源码与便携产品架构；保留必要来源与许可证记录。
- [ ] 7.5 根据 portable spike 和产品 owner 切换结果，另行决定 Rust CLI 源码删除、历史保留或仅保留 sidecar implementation 的范围。

## 8. 最终验证

- [ ] 8.1 运行 product core unit/integration/characterization tests、TypeScript typecheck、lint 和 backend fixture suites。
- [ ] 8.2 运行 Windows x64 portable acceptance 与 function-metrics backend comparison，保存 resource budget 和 semantic difference evidence。
- [ ] 8.3 运行受影响 docs、schema、examples、OpenSpec、case ledger、whitespace 和 workspace required/full validation。
- [ ] 8.4 运行 `openspec validate "productize-typescript-quality-tooling" --type change --json --strict --no-interactive`、`git diff --check`、局部 diff 和 gitlink audit，确认只包含经审计范围并记录无法执行的验证与残余风险。
