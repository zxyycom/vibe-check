# Manual CR: 主指南专项使用者审查

## 对象与结论

- 审查者：非实施代理 `guide_consumer_review`；日期：2026-11-02。
- 结论：**通过本次专项审查，无影响正确使用的遗留问题。** 首次接入、按问题扩展与性能排查均可仅凭包内材料完成；不把本结论扩大为发布前全包文档验收或性能收益证明。
- 候选版本：`@zxyycom/vibe-check@0.0.0-local.a0a106e40b39`。
- 工作区基线 HEAD：`56fd71e4a8a3d026ab29ee3fb351b4814ac16693`；候选包含本次未提交改动，并非该 HEAD 的纯净发布。
- actual unpacked：`/workspace/vibe-check/build/package`。
- tarball：`/workspace/vibe-check/build/artifacts/zxyycom-vibe-check-0.0.0-local.a0a106e40b39.tgz`。
- SHA-256：`ab6f919690628b0c51a36c641bd7199b1b5083bf21e37fe5fa86b4a7017dd10b`；审查前后独立读取一致。
- installed public entry：`/workspace/vibe-check/scripts/project/node_modules/@zxyycom/vibe-check/index.mjs`；审查前后 `bun run package:status` 均报告 current。

## 阅读范围与方法

第一遍仅从 actual package 的 README 与主指南全文出发，不用内部源码补齐使用说明。随后沿公开引用读取：

- `docs/checks/json-validation.md` 全文。
- `docs/guides/command-check.md`、`check-dependencies.md`、`run-outputs.md` 全文。
- `docs/api-mechanics.md` 的 RunControls、aggregation 与 RunResult 分支。
- `docs/guides/extending-check-lifecycle.md` 的 execution、取消、flags、依赖传播与 quiet-pass 条件。
- `docs/guides/scheduling.md` 的工具选择和资源约束，`cache-results.md` 与 `selecting-checks-by-git-changes.md` 全文。
- actual package declarations 的 package-root export 路由，以及 `run`、RunControls、RunResult、JSON constructor、command constructor 的相关签名与 JSDoc。

完成消费者阅读后才读取维护 owner、实际 diff、示例源、projection registry、测试与 Case。README、主指南及三篇改锚点的公开专题均核对 workspace、unpacked 与 installed bytes 一致。

## 代表任务与答案位置

| 使用者任务 | 包内答案位置 | 判断与缺口 |
| --- | --- | --- |
| 第一次接入真实 JSON，而非固定值玩具规则 | README「首次接入项目 Gate」；主指南「首次接入：检查真实 JSON 文件」 | 安装、输入、文件关系、完整入口、合法/非法对照、退出码和不写 machine files 都完整。JSON 文档完整性与 Schema 业务约束有明确区分；无阻断缺口。 |
| 本地与 CI 调用同一检查入口 | 「固定本地与 CI 的同一入口」 | 同一 package script、开发依赖安装、lockfile、根目录与非零退出义务明确；不要求仓库内部 Gate 或特定 CI 平台。 |
| 已有命令或函数应怎样接入 | 「先选接法」「接入已有检查」及 command/Check lifecycle 专题 | 区分 executable/argv、exact environment、timeout、输出限额、failed/unavailable；直接调用要求可 import 且无 CLI 副作用，并保留 signal、清理及隔离义务。 |
| 按需要扩展，不照抄整页 | 「按问题扩展」「运行本页深入示例」 | 原有任务选择、增量、测试输入、共享准备、缓存、资源、观察和两种诊断适配路径均可找到；各片段明确独立，非逐段累计配置。 |
| 重复准备能否共享、何时必须隔离 | 「准备一次，分别验收」「先查重复构建与安装」「保留每项独立证明目的」 | 共享事实和只读材料而非通过判决；provider 失败阻断、消费者独立判决、材料 identity、最后消费者后清理均明确。冷安装、不同环境、破坏性和失败注入保留独立边界。 |
| 反馈慢时先做什么 | 「性能排查：先找成本，再选能力」 | 先端到端基线与分段成本，再检查重复准备/纯转发包装，最后选择增量、缓存或资源调整并复测。明确不能隐藏准备耗时、降低覆盖或把短等待示例当 benchmark。 |
| 怎样解释失败而不泄露材料 | 「成功依赖与终态观察」「把工具输出转换为结构化诊断」及输出专题 | 观察不覆盖上游失败；先完整验证再 report；拒绝未知协议/外部路径仍保留失败；discard、transcript opt-in 和 preview 非脱敏边界均保留。 |
| 最低交付条件是什么 | 「验收清单：只核对实际采用的能力」 | 基础项与可选项分离，不强迫首次集成实现缓存、调度或全部高级能力。 |

## 独立实际入口演练

使用 mise 锁定的 Node `24.18.0` 与 pnpm `11.1.3`。从实际包主指南首个 TypeScript fence 直接提取代码，不运行仓库 `src`，不以 acceptance support 替代教学入口。
审查者自有 `/tmp/vibe-check-guide-consumer-review-*` fixture 通过临时 `node_modules` 路由复用 package lifecycle 已安装的 exact candidate 与依赖树；`import.meta.resolve` 独立确认落到上述 public `index.mjs`。
这证明实际代码和 script 接线，不是第二次隔离安装验收。全部临时 fixture 已在 `finally` 清理。

| 对照 | 实际结果 |
| --- | --- |
| 合法 `config/app.json`，直接 `node quality.ts` | JSON validation passed，进程退出 0。 |
| 同一合法输入，`pnpm run quality` | 执行同一入口，退出 0。 |
| 非法 `{"name": }`，直接执行及 package script | 两者退出 1；终端保留 `config/app.json` 与 `invalid-json` Record。 |
| 非法输入存在时仅 import `quality.ts` | 无 Gate stdout、退出 0，证明 main guard 不自动运行检查。 |
| 从不含输入的另一个 cwd 启动脚本 | `not-applicable / no-eligible-input`，退出 1。 |
| 修复 JSON 后重跑 | 恢复 passed、退出 0。 |
| 按正文仅把最后调用改为明确 absolute root，从另一个 cwd 启动 | passed、退出 0。 |
| 已有 `type: commonjs`，按正文改用 `quality.mts` 和对应 script | passed、退出 0。 |
| 输出副作用 | fixture 和空输入目录均未生成 machine artifacts；未生成 diagnostic 目录。 |

辅助 harness 初次错误假定进度文字为 `1 passed`，第二次把 Node 的模块识别 warning 也视为 Gate 输出；修正审查断言后完整重跑通过，候选包未因这两次调整而修改。

## 实际 diff 与测试证据复核

- 改动集中在阅读路径、真实 JSON 示例及其投影目标；没有 Product API、依赖、调度或选择行为变更。自定义固定值教学移为单独 source/region，不再占据主指南第一步。
- `gate-minimal.ts` 的 region 外 acceptance 真实创建合法/非法文件，读取 outcome、aggregate、Record path/reason 与 exitCode；空输入、异 cwd 显式 root 和 machine output 关闭均有可证伪断言，finally 恢复 cwd/exitCode 并清理 fixture。
- 新 `gate-custom-rule.ts` 保留原有固定值教学与正向断言；registry 对真实入门、自定义教学和其它独立场景分别定位。projection renderer 仍检查原样 payload，不把验收 setup/assertions 投影进用户代码。
- 已读取 external documentation runner：由 installed public import 执行所有 runtime example source，顺序稳定，失败保留 source identity；不是只检查 Markdown 字符串或仅执行 Product 源码。
- 已查询并核对 `AUX-PACKAGE-API-DOCUMENTATION-001` 与 `AUX-PACKAGE-API-EXTERNAL-EXECUTION-001`。本次只更新证明文本，Case ID、owner 和实体映射保持连续；新增 JSON 断言与 Proves 一致，无需按示例数量新建名义 Case。
- 已静态核对共享准备与已有命令的相邻 acceptance，以及共同诊断 acceptance；独立消费者、provider 失败阻断、command pass/fail/timeout 和整组诊断拒绝等原有证明目的仍保留。
- `repository-quality.ts`、配对测试和 `gate-repository-quality.md` 各一行 rationale 同步仅去掉过时场景/片段数量；waiver identity、metric、path、阈值与检查范围未改，未扩大例外。
- 最终局部 `git diff --check` 通过；审查未暂存、提交、推送、重建或发布候选包。

本次复用了主线程记录的已执行证据：projection tests 3 pass，installed docs/types 4 pass，materials 通过，Test Evidence 796 entities / 193 Cases / 17 topics 闭合，documentation scope 10 selected checks 通过，以及 waiver 配对 tests 3 pass。
这些执行记录与本审查的独立语义/入口演练分开，不声称由本审查者重新运行了上述全套检查。

## 发现、处理与剩余边界

- **阻断或实质准确性问题：无。** 无需正式文档整改后再复核。
- **保留的非阻断观察：** package.json 未声明 type 时，Node 24.18.0 会产生 `MODULE_TYPELESS_PACKAGE_JSON` warning，但 ESM 代码正常执行、失败退出正确；明确 CommonJS 项目采用正文的 `.mts` 路径通过。该 warning 不影响首次接入，无需为消除它强制改变整个项目模块语义。
- 本轮没有运行远端 CI、网络安装、所有支持 Node 版本、全部未改 package 页面/JSDoc、全量 Gate 或正式 receipt 验收；真实隔离安装的 docs/types 证据来自同一候选的既有 owner 验收。
- 取消、输出失败和 Promise rejection 的严格拒绝通过现有公开契约、声明与入口表达式核对；本轮独立 fixture 没有逐一注入这些未改 Product 分支。
- 性能段是方法与安全边界，不是已测加速结论；没有执行 benchmark，也不批准任何削减测试覆盖或改变仓库 Gate 策略。
- 结论仅适用于上述 candidate 与本次专项范围。相关文案、示例、声明或行为再变更时，须评估影响并按变化范围复核；正式发布仍需针对最终包完成发布 owner 要求的验收。
