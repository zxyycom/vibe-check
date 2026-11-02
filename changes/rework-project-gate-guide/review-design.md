# 第三轮 Gate 指南：独立设计任务与消费者审查

## 结论

Manual CR: **通过本次专项审查，无阻断发现。** 审查者为非实施代理 `guide_design_review`，日期为 2026-11-02；最终绑定候选为 `0.0.0-local.531434cda253`。

通过依据不是篇幅减少或示例运行成功，而是读者可从主指南恢复一条连续设计过程：明确要阻止的缺陷和证据缺失策略，按独立结论划分 Check，安排共享准备与隔离，接通严格出口，再按实际成本选择优化并保留失败对照。主指南自身完成这些决定；专题承担具体 API 与局部演练，并非让读者自行从能力目录拼出设计方法。

本记录不替代前两轮记录，不修改被审材料，不是全包 JSDoc、完整 Gate 或正式发布验收。代表项目的实际构建/安装工作流是本次阅读任务的设计答案，未为一个真实业务项目实施完整 Gate。

## 候选身份与阅读顺序

审查先读取项目要求的消费者方法与 AI-ready skill，然后仅使用实际包 README、任务专题及公开声明完成设计任务和动态演练。完成后才读取仓库 diff、投影 registry、相关测试与 Case；内部验收辅助代码未用于补全消费者用法。

| 对象 | 身份 |
| --- | --- |
| 首轮实际阅读及 23 项消费者演练 | `0.0.0-local.95039eeb5caf`，1,534,608 bytes，SHA-256 `826b5d3f4f1987deee0229ae16a2e0f76b00e2dedc7aeb7025d14682515bc45e` |
| 最终候选 | `0.0.0-local.531434cda253`，1,534,635 bytes，SHA-256 `c4cc16f344733fbf3f3ffcf14fab2de85443183ca1f6fe9a7aac81e21742c1dc` |
| 最终 tarball | `/workspace/vibe-check/build/artifacts/zxyycom-vibe-check-0.0.0-local.531434cda253.tgz` |
| 解包阅读位置 | `/workspace/vibe-check/build/package` |
| 实际 runtime 安装位置 | `/workspace/vibe-check/scripts/project/node_modules/@zxyycom/vibe-check` |
| 源码基线 | `main`，HEAD `56fd71e4a8a3d026ab29ee3fb351b4814ac16693` 加工作区未提交改动；不能将该 HEAD 单独当作候选完整来源身份。 |

首轮对八篇目标 Markdown、根声明及 manifest 核对了 tarball、解包与安装 bytes。最终重新解包并逐字比较全部 **1,559 个普通文件**，确认最终 tarball = unpacked = installed；该一致性不代表已语义审查全部文件。

最终八篇目标材料身份如下，路径均相对于上述实际包根：

| 文件 | bytes | SHA-256 |
| --- | ---: | --- |
| `README.md` | 13152 | `e6a76c7f02b00c6f491f70e8922b6aa2351deb3a3d576e723531a03ea629eb5a` |
| `docs/guides/building-project-gate.md` | 14400 | `77532dbd3b6b3bd8415fe2a64c78df40dc24d9f6433c1cd09c3929f874d94b09` |
| `docs/guides/command-check.md` | 24560 | `c72cef8fac46eed0be7dd740e74ff75d53f1448309265b4b7efde4fdf648a9a0` |
| `docs/guides/check-dependencies.md` | 17948 | `9313a197c565d9da30577a4dc6cdf58fb17155236d81b8bc53c26b01b41f3426` |
| `docs/guides/extending-check-lifecycle.md` | 18232 | `da911de0da78cceb302dd0031a76873ec5622b9ad33239988384ad9a46a3c7b6` |
| `docs/guides/selecting-checks-by-git-changes.md` | 8313 | `da5ad73e46a07c68023c65d54bb886c0f19b32eb942e997940eb844e21ffbce4` |
| `docs/guides/cache-results.md` | 8184 | `4a5d4a8b9ad274aa7865926dc60bb55a7f1cd6fc188a7c8c3637c41a4b6d7b8f` |
| `docs/guides/scheduling.md` | 19985 | `0ff6b014edcf695adc5afa86c896b9c84e31f882b771746fa008bcfba470029b` |

### 具体阅读范围

- 完整阅读实际包 README、185 行主指南、command-check、check-dependencies、extending-check-lifecycle、selecting-checks-by-git-changes、cache-results。
- scheduling 阅读资源/准入介绍与基础约束、终态观察边界和新增并发片段；本次不覆盖高级 prepared strategy 的完整教学审查。
- 按主线问题补读 JSON Check 的输入、结果与失败说明，API 机制的有效列表/aggregation/RunResult，输出指南的输出失败与 Promise rejection。
- 沿实际根导出核对 `defineCheck`、`defineConfig`、`run`、`defineContextCallback`、`jsonValidation`、`commandCheck`、flags 与 `cacheJsonByKey` 的入口；重点读取 `types/check/check.d.ts` 的直接依赖与结果、`types/check/flag-enablement.d.ts`、`types/project-run/controls/contract.d.ts`、`types/project-run/result.d.ts`、command contract、cache contract 及相关 Definition 声明。不是 public inventory 的逐项全面审查。

## 代表设计任务：配置、测试、同包大小与干净安装运行

以下是仅凭包材料形成的项目方案，不声称文档里的固定清单已经执行真实构建。页码采用最终包行号，文中专题名称均指实际包页面。

### 1. 从质量目标恢复证据与 Check 边界

| 项目要回答的问题 | 具体设计答案 | 答案来源 |
| --- | --- | --- |
| 正式配置是否可读取？ | 用 `jsonValidation` 选择 `config/**/*.json`。语法错误阻断；空输入不是通过。若项目实际要求字段/关联正确，再加入 Schema/业务检查，不能拿合法 JSON 代替语义验收。 | 主指南 9–18、55、130–132；JSON Check 的用途/效果。 |
| 已知行为是否成立？ | 独立 `tests` Check 调用项目已有稳定测试入口，固定 Node、依赖与必要环境。断言失败是质量失败，无法启动或超时是无法取得可信证据，两者均不放行但保留不同原因。 | 主指南 14、20–29；command-check 354–373、392–427。 |
| 可交付材料是否已准备好？ | 一个 `prepare-package` provider 执行项目拥有的构建/打包流程并形成清单。其通过只证明材料就绪，不表示大小或安装验收通过。没有第二个消费者时，不为每个 shell 操作机械拆 Check。 | 主指南 20、33–48；check-dependencies 182–259。 |
| 包大小是否合预算？ | 独立 `package-size` 读取同一 tarball 的大小，按当前项目预算判决，保留测量值与阈值。本任务选择阻断；若作为提醒，必须明确状态/aggregation 策略，不能靠 warning message 改变结论。 | 主指南 16–20、42；缓存专题 149–153。 |
| 真正交付的包能否运行？ | 独立 `package-runtime` 在全新安装根中安装上述 tarball，运行公开入口 smoke；不直接 import 源树，不把大小或文件数量成功冒充运行验收。安装命令、依赖可用性、运行时和网络/offline 条件由项目明确。 | 主指南 15、42、46。共享片段明确只演示关系，真实验收由项目替换。 |

这里五个节点中只有 provider 是共享准备。若测试实际消费正式配置，可让相关测试依赖配置成功；若没有这种输入关系，不因流程表的先后顺序强加依赖，避免配置失败吞掉原本独立的测试证据。这是将主指南“按真实结论和材料关系设计”应用到代表项目的判断，不是框架默认依赖。

### 2. 执行图、直接授权与观察

配置、测试和准备包可按真实依赖并行；大小与运行两个 Check 都直接 `dependsOn: [preparePackage.checkId]`，彼此不依赖。大小超标时运行验收仍应执行；准备失败时两者应为 `unavailable / dependency-not-passed`，不能读取旧包补成成功。

需要失败后汇总时另设 `audit`，以 `observes` 显式列出所需节点，读取 `dependencies.list()` 的四态事实。审计通过只说明汇总工作完成，不改写上游失败或默认 aggregate。读取 provider data 先处理 `get(id).ok`，再调用 producer parser；传递依赖不能自动读取。来源：主指南 42–46，check-dependencies 5–18、173–180、261–314，实际 `CheckDependencies` 声明。

### 3. 同一材料、隔离和清理

准备 owner 交付 canonical 清单，例如 `{ version, artifactPath, sha256, sourceIdentity, byteLength }`：路径定位材料，摘要标识实际 bytes，source identity 说明来源。版本号或固定 `dist` 名称不能单独防止两个消费者拿到不同材料。provider parser 验证形状与领域约束，消费者在实际使用边界核对 identity；共享目录只由准备 owner 写，验收不能重建或覆盖其中的包。

大小只读取共享只读包；干净安装使用独立安装目录，并消费/复制经过 identity 核对的同一包。破坏性或失败注入场景拥有各自副本，不把可变 `node_modules`、安装缓存或 fixture 当成可随意共享的准备结果。顶层调用者创建临时根，`try/finally` 包住已等待的 `run(...)`，在所有消费者结束或取消后的 drain 完成后清理；Check 启动的工作必须被等待并连接取消，不能留 detached child 后提前删除材料。

普通路径/摘要使用 canonical data 足够；本任务没有必须保留 `Map` 或资源句柄 identity 的理由，因此不用 handoff。handoff store 的清空也不负责 disposer。来源：主指南 42、46、48；check-dependencies 99–111、257–259；extending-check-lifecycle 9、128、134–136。具体 SHA-256 清单是代表项目对文中“摘要/身份”的落实，不是文档强制 schema。

### 4. 函数/命令、项目入口与本地 CI

- 对已有独立、无 CLI 副作用的函数可直接 `await` 并映射结果；需要进程隔离或强制回收边界时保留命令。不 import 自动启动 CLI、调用 `process.exit` 或改全局环境的模块。来源：主指南 24–29、48，command-check 417–425。
- 真实测试/安装工作流通过项目脚本承接多步骤；`commandCheck` 用绝对 executable 与独立 argv，显式环境、timeout 和输出限额。安装验收可由 `resolveEnvironment` 从直接 provider 清单取得包路径/摘要，交给固定脚本读取；无需编造不存在的动态 argv API。来源：command-check 48–59、77–112 及公开 command contract。
- 保留主指南的 `quality.ts`、`runGate(projectRoot)`、`import.meta.main` 和严格出口；CommonJS 项目使用 `quality.mts`。运行目录与 `projectRoot` 明确绑定，不能用错 cwd 得到空集合后成功。来源：主指南 57–110、128–132。
- 本地与 CI 都调用项目 `quality` script；CI 固定 Node/pnpm、安装 dev dependency 并使用 lockfile，安装或 Gate 非零立即失败。仅 `completed && aggregate === "passed"` 退出 0；output failure、取消、configuration/planning/execution failure 和异常均不放行。来源：主指南 128–153；README 99–104；输出指南“输出状态与失败处理”。
- 快速任务只证明其实际选择的目标。任务名先校验再映射 flags；选下游时补齐 `dependsOn` closure，`observes` 不传播选择。保留显式完整任务；未知任务不得静默变成空选择。来源：主指南 171，extending-check-lifecycle 219–227、252–291。

### 5. 成本演进与不会误放行的对照

| 优化 | 代表项目的设计与失败对照 | 答案来源 |
| --- | --- | --- |
| 基线与共享 | 固定 source/artifact identity、工具链、机器和并发，测入口到退出，安装和入口前准备也计入；冷/热分开重复测量。移出计时区间不算优化。先证明共享仍使用同一包且单消费者失败互不污染，再比较成本。 | 主指南 159–161、175–181。 |
| 增量选择 | 配置、测试、构建分别列出实际读取的源、fixture、共享 reader、配置、生成器和 lockfile。共享 reader 变化触发所有真正消费者；全源 identity 审计仍覆盖整棵源树。删除/新增输入也触发；未知依赖保守运行。未建模反向链接依赖时链接检查完整运行。 | 主指南 165、169；changes 专题 99–107、149–165。 |
| Git evidence | 本地 `HEAD` 用于未提交工作区；PR 使用已取得的正确基准。可信零命中只说明没有匹配，不等于 Git 不可用；不可用时配合正向条件保守选择。设置 `force`，对照共享输入变化、删除、无 Git 和完整运行；不使用会让“注入全部 change flags”反而不匹配的否定/恰一条件。 | 主指南 169；changes 专题 12–25、147、161–167。 |
| 缓存 | 只缓存昂贵事实，key 纳入同一份实际 bytes、实现版本、工具链/库版本与计算参数，parser 验证 payload；当前阈值每次重新判决。命中后降低阈值必须失败；改 bytes 必须重算；损坏缓存可重新计算，计算或新 payload 校验失败不能当成通过。构建复用是另一责任，不由 gzip key 自动证明。 | 主指南 166；cache-results 43–69、75、108–125、145–164。 |
| 并发 | 对重测试/安装 runner 设置静态 units，对共享可变 fixture 写入用同名 mutex；无 claim 的轻任务保留空闲总槽位。互斥不替代干净安装隔离。比较不同并发的总耗时/资源峰值，并保留准备失败、单消费者失败、取消及清理对照；不能把逻辑 units 当 CPU 核数或峰值承诺。 | 主指南 167、181；scheduling 20–53、291–338。 |

主指南末尾的五个验收问题可直接用于该方案验收；它们要求检查证据、独立责任、identity/清理、入口以及优化后的负向行为，而非只勾选使用过哪些 API。

## 实际消费者演练与验证

### 独立执行：23 项对照

使用 Node `v26.8.2`，在自有 `/tmp/gate-guide-design-review-*` 目录创建真实输入；依赖链接到已审计安装候选。代码直接抽取包内 Markdown 的 TypeScript fence：仅有 Definition 的片段按主指南 183–185 补 `run` 导入与 `runGate`，已有入口的片段保留其入口；加入结果 readback 以断言 kind、aggregate、outcome 和 OS exit。未调用仓库 example acceptance support，未新增依赖或联网安装。

| 对照组 | 实际结果 |
| --- | --- |
| 最小 JSON 入口：合法、非法、空输入、修复 | 退出码 `0/1/1/0`；非法为 failed，空输入为 `not-applicable / no-eligible-input` 且 aggregate failed。 |
| 共享准备：正常、仅大小超限、provider 失败 | 正常三项 passed；大小超限时 contents 仍 passed；provider 失败时两消费者均 dependency-not-passed。 |
| 终态观察 | config failed，consumer unavailable，audit passed；aggregate failed，退出 1。 |
| 已有命令：退出 0、退出 1、超时、启动失败 | 分别 passed、failed、command-timeout、command-start-failed；后三者退出 1。 |
| 任务选择：local、ci、docs | local 只选配置，ci 选两项，docs 只选文档；未选项保留 not-applicable 而不进入有效列表聚合。 |
| 缓存：首次、命中、降低阈值、改内容、破坏 entry | `computed → cache`；相同 46 bytes 的缓存测量在阈值 1 下 failed；改内容重算为 50 bytes；损坏 entry 后重新计算。 |
| 并发片段 | 四项正常结算，严格出口 0；此消费者 smoke 本身未测并发峰值。 |
| Git 不可用与 force | 非 Git 临时根中 daily 保守选择三项；force 同样选择三项并通过。未在本轮临时目录创建 Git commit。 |

这组对照证明专题片段可以按公开运行约定落地，并检验关键失败不会被入口吞掉；它不单独证明本节全部工程设计或性能收益。所有自有临时演练和重绑定目录已清理。

### 完成阅读后的真实性、投影与 Case 审计

- 通过 CodeGraph 读取投影 registry 及其被引用关系，再核对实际 diff：十个原有示例 region 仍有唯一投影，主指南只投影真实 JSON 入口，其余进入各行为专题；文本/JSON adapter 在 command-check 的自然标题下注册。没有新增发布页面或把内部 support 当作用户隐含前提。
- `gate-minimal.ts` 的教学 region 与验收区域分离；后者用真实文件验证合法/非法、Record path/reason、空输入、无关 cwd 下显式根、无 machine 输出，并在 finally 恢复 cwd/exitCode 和删除临时目录。通过检查不是由 callback 内被框架吞掉的 assert 产生。
- 已审查相关 Case：`AUX-PACKAGE-API-DOCUMENTATION-001` 继续拥有投影一致性，`AUX-PACKAGE-API-EXTERNAL-EXECUTION-001` 拥有实际安装材料及执行；两者实体身份未变，Proves 更新为分布到主/专题的真实布局，不再宣称主指南拥有十个 region。
- 并发 example 的现有独立验收在 region 外观察 active/peak runner 和 metadata overlap，未将短等待本身当作性能收益。真实 Git 变化矩阵与诊断整组拒绝继续由既有 external consumer 验收承担，不因迁移丢掉测试来源。
- 旧单页指南 file-metrics waiver 已移除。实现 diff 只将该 Finding waiver 改为空；配对测试仍断言主指南被扫描，并断言空 waiver。阈值、area 和扫描范围未因重写放宽；`AUX-PROJECT-GATE-CATALOG-001` 的 Proves 与当前行为一致，owner 的旧例外说明同步删除。
- 本审查独立运行 `bun test scripts/docs/package-api/render.test.ts`：**2 pass，0 fail**；本次相关路径 `git diff --check` 通过。有界 Case 查询成功。没有自行重新运行全树 Test Evidence 或完整 Gate。
- 主线程另提供：首轮 actual external documentation acceptance 2 项、repository-quality 3 项、docs scope Gate 10 项、Test Evidence 796 entities / 193 Cases / 17 topics、docs:api 通过；最终候选 external documentation acceptance 两项再次通过且 package status current。这些是主线程验证记录，本记录不冒充审查者亲自重复执行。

## 四处收尾与最终重绑定

首轮发现的 README 旧摘要和三处本页无锚点自链不阻断设计任务恢复，但不如明确目标/定位易用。实施方只做局部收尾后重新构建；审查者在最终实际包确认：

| 最终位置 | 收尾结果 |
| --- | --- |
| README 137 | 摘要现在对应质量目标/证据、判决/执行图、项目入口和实测演进。 |
| check-dependencies 259 | 指向“先选择读取契约”，不再泛指本页。 |
| selecting-checks-by-git-changes 149 | 指向“按文件变化选择 Check”的精确规则。 |
| scheduling 338 | 指向“限制 named resource 并发”。 |

对四篇变化页逐项反向替换这四处文本后，其 SHA-256 恰与首轮记录一致；其余四篇页面原样 hash 一致。因此全部教学 fence、185 行主指南、关键契约和设计推导都未变化，可以沿用首轮消费者阅读与 23 项动态对照。最终包的安装执行另有主线程重跑证据，未仅凭文件名或 local version 推定沿用。

## 未覆盖边界

- 未在本轮从公网重新安装依赖；自有 consumer 使用已审计安装包，独立外部安装边界由主线程的实际 external consumer 验收承担。
- 未新增完整业务构建/干净安装系统；该部分验证的是读者能否设计正确责任、材料 identity 与失败对照，不是某业务交付物已通过验收。
- 未复测所有 Git 变更矩阵、取消/输出失败注入、CPU/内存峰值、真实并发性能；已区分公开契约、具体设计判断、本轮实际执行与既有自动化证据。
- 未运行完整 Gate、发布验收或全包 JSDoc 审查，也未进行 Git add/commit/push、Change finalize/delete 或远端写入。若主线、示例、公开契约或相关 runtime 再变化，须按影响重新绑定审查，不能直接沿用本结论。
