# 0.0.4 发布证据

当前阶段：文档优化及已确认采用的测试证明重分工均已本地提交；严格 JSON 优化已从交付工作树分离。去除该草案后的目标与回归测试、竞争验证及完整 Gate 均通过，保持原 5 秒预算；后续诊断重现安装阻塞，综合证据指向 registry 元数据网络等待，具体网络责任仍未知，不能称可靠性已修复。**未重新冻结、推送或发布；旧正式包不包含本轮文档改动，不能用于交付新材料。**
固定约定见 [Package release](../../docs/tooling/package-release.md)。本页优先保存当前结论，旧轮完整证据从下方已归档快照恢复。

## 输入、工作区与授权

- package：`@zxyycom/vibe-check`；目标 version：`0.0.4`；tag：`latest`；registry：`https://registry.npmjs.org/`；access：`public`。
- 实现工作区：`/home/dev/.codex/worktrees/package-release-preparation/vibe-check`，分支 `release-0-0-4`，本轮起始 HEAD `10491179`。
- main：`/workspace/vibe-check`，保持 `357fb7c4061c3f576d0b70c8594e458c2941ce39`；旧 frozen worktree 保持下述 clean S。
- 初次准备按用户同意的方案完成本地提交、双 worktree、构建、验收与归档。随后用户要求先继续按 ai-ready-docs 复查；该阶段只修改文档、更新计划、构建并验收 local candidate，未自动提交、重新冻结或发布。
- 用户随后授权先提交再定位测试问题：20 个文档文件已提交为 `b8cf54f4801397002b739c7945bf83e2ae6806ac`；提交后 clean。下述调查及当前证据更新尚未提交。
- 前序授权允许尝试修改和优化，但最终定稿方案须先向用户说明；试验不授权提交、重新冻结或发布。最新要求明确 5 秒是红线，先证明测试必要性，再讨论保留或优化；加时建议已撤回，未实施。
- 必要性审查后，用户授权继续尝试修改和优化，最终定稿方案仍须说明；本轮试改针对测试证明分工，不改变上述 5 秒约束，也不自动采用、提交、重新冻结或发布。
- 试改结果交付后，用户确认“可以按照你的这个方向调整”：本轮采用测试证明重分工，严格 JSON 优化不捆绑。该确认授权收敛和验证工作树，不自动授权提交、重新冻结、发布或清理。
- 用户随后要求“你可以继续推进，有什么需要我决策的就再说”：继续调查安装可靠性，保持已确认测试方案；本轮不自动扩大为提交、冻结、发布、网络配置或验收语义变更。
- 本轮说明调查结果后，用户明确选择“允许本地提交”：授权将材料测试重构、owner/Case、调查及发布 Change 记录整理为 `release-0-0-4` 上的本地提交；不含 JSON 草案，不冻结、不推送、不发布。
- 未执行 npm publish、Git tag、手动 push、merge 或历史材料/工作区清理；本轮只清理 probe 独占临时安装根。不采集认证配置、token、OTP 或会话 transcript。

## 本轮安装可靠性调查

2026-10-19 17:54–17:59（Asia/Shanghai）的[独立调查](../../docs/investigations/diagnose-external-consumer-install-timeout.md)
使用下节同一 current candidate 与 Bun 1.3.14；本轮未修改源码、测试、依赖、timeout 或网络配置。

- 单独运行真实 provider，在外层 30 秒诊断保护下仍未完成；安装 child 最后采样累计 CPU 650 ms，主线程持续处于 epoll wait。没有 full Gate 的本任务测试/compiler 竞争，足以排除“必须并发才会发生”的前提。
- 对同一 tarball 的 verbose 安装约 411 ms 完成提取，随后观察到 56 条 registry metadata GET、50 条 304；29.57 秒仍有 11 个任务待完成。两轮有 3.17 秒重叠，仅用于阶段诊断，不作受控速度比较。
- 对同一公开 metadata URL 的四个串行独立请求为：curl 304 / 18.689 秒，Bun fetch 304 / 14.655 秒，curl connection timeout / 30.002 秒，Bun fetch 304 / 13.518 秒。没有安装或依赖图解析仍慢/失败；结合前两轮证据，本轮主要阻塞指向 registry 网络等待，不仅是 Bun installer 开销。元数据日志来自第二轮，不能冒称第一轮 provider 的同进程直接观测。
- 尚不能区分宿主网络设施、转发路径或远端责任，也不能反推两次历史失败或全部 candidate preparation 66 秒的根因。未读取认证配置、未改变代理/TLS/registry，未放宽预算、切换离线/lockfile、复制旧安装或盲重试直到绿。
- 最近完整 Gate 仍是下节 17:22 开始的 43/43 通过；本轮两次诊断 timeout 不是新 Gate 结果，也不抹去旧成功。没有“已修复安装”或新正式验收事实。本轮只保存调查与计划，不必为此修改 Product 或安装策略。
- 下一步条件：相同有界公开请求不再出现显著等待/连接失败后，再运行一次真实 provider 和完整 Gate；若网络小请求恢复而安装仍超时，再定位未完成阶段。提交、冻结和发布继续分别等待授权。

原始诊断、脚本与旁注保留在 `tmp/external-consumer-install-20261019/`；首份脚本形成于
`2026-10-19T17:54:17.181+08:00`。正式资源仅保留白名单事件、进程摘要和请求结果，省略 header、
cookie、网络地址及无关进程。各轮 probe 自建 `/tmp` 安装根已按其生命周期清理；未清理任何旧材料。
诊断目录用于复核，报告保存后再按授权确认精确清理范围，不属于测试或发布材料。

### 本轮本地提交与收尾验证

- 测试修复提交为 `8a503b1697668d4f76c40e94ca37e15faf80a013`，仅包含 workflow、两份测试、内部 owner 和原 Case 五文件；没有 Product、package lifecycle、Gate、依赖或预算变更。后提交 hook 确认发布分支不适用 auto-push，未发起推送。
- 四份 Investigation 及其资源、索引和当前 Change 作为单独的本地证据提交保存；严格 JSON 代码草案和 ignored 诊断目录不纳入。提交对象和最终身份以本分支 Git 记录为准，不改写既有历史。
- 本轮实际重跑两文件目标测试 9/9（整组 689 ms）、scripts typecheck/lint、format、`validate`（495 JSON / 5 schemas / 1 current artifact set / 4 reports / 579 Markdown）、Case 全量闭合（759 entities / 188 Cases / 16 topics）、Investigation（91 reports，index current）及 diff 检查，均通过。
- 独立 reviewer `review_install_timeout_evidence` 对照原始 probe、正式白名单资源和四份 Change，核实跨轮推断、重叠窗口、事件计数、SHA 及既有 43/43 Gate，没有剩余阻断。旧三报告关系分别承接定位、算法试改和测试必要性，保留独立形成时认识；此前“前序未进入 HEAD”提示不构成合并或删除历史证据的理由。
- 新任务 2.9 只完成有界调查、证据审阅与恢复条件，当前 Plan 为 13/21；不声明网络已修复、长期可靠性或新正式包已验证。此次没有重跑完整 Gate：正式实现与已验收 candidate 不变，当前网络小请求已展示失败，重复 Gate 不能补足根因证据。

## 采用确认与最终输入验收

已采用的实现是下节五文件测试重分工，不增加新 Product 行为。严格 JSON 的实现、相邻测试和
`warning-generation.md` 中的连续 rename 已精确还原为 `b8cf54f48` 的 bytes；`src/**` 净 diff 为空。
原私有实现 SHA-256 为 `588923857c2c2ff95fabff66694233547d98c02c0b2cc107ef2ba97232a1c1d6`。
原样副本、三文件精确 patch 与摘要保存于 `tmp/validation-proof-adoption-20261019/`，不会随本次修复采用；
独立试验的历史结果保留，不推翻其局部收益，也不把它作为测试可靠性的前提。

### 去除 Product 草案后的直接验证

- `mise exec -- bun test` 使用显式 `./` 文件清单运行两个材料测试及 JSON document/Check/schema/工作区 strict-JSON 回归，37/37 通过；当前材料测试为 9 个实体。
- Bun 1.3.14、6 logical CPUs / cgroup quota 4 核下，三个两文件测试进程分别与两个冷 tsgo 并发，均 9/9，六个 compiler 均 exit 0。测试整组 wall 为 3270.23 / 3466.52 / 3372.70 ms，最慢实体为 13.88 / 54.66 / 15.10 ms；正式源码前后摘要不变，无 signal 或 watchdog 触发。
- 5 秒实体预算不变，30 秒 probe 外层保护只用于诊断，不修改测试配置。这里验证最终分工不依赖 JSON 优化，不把前后不同工作树或不同证明集合的耗时称作算法加速，也不外推所有机器的可靠性。
- 首次汇总 probe 使用目录子串 filter，误发现 `tmp` 中原样保存的草案测试：37 个目标实体通过，额外副本因缺近邻模块产生 import error。随后仅将备份改为 `.snapshot` 后缀并使用显式 `./` 文件清单，37/37 通过；正式测试与预算未改。原失败输出保留在 `verification.json`，修正后的结果在 `restored-regressions.json`，不隐去这次命令选取错误。

### 当前候选与完整 Gate

- 实际运行一次最终输入的 `mise exec -- bun run check -- --all`：exit 0，43/43 passed，execution 39.7 秒；包括材料测试、全部 Product/scripts、typecheck/lint/format、artifact 和外部消费者 types/docs/runtime。材料测试 lane 约 2.8 秒，是整组 Check 耗时而非单实体时长。
- 当前 local candidate：`0.0.0-local.1cbe23f0f7d6`；tarball：`build/artifacts/zxyycom-vibe-check-0.0.0-local.1cbe23f0f7d6.tgz`；SHA-256：`b00b89a4dbfa8c66e2c0e8ce971874f36448e9f42416479fbe692abe131f2fd2`。公开 `package:status` 确认 current，installed entry 位于 `scripts/project/node_modules/@zxyycom/vibe-check/index.mjs`。该 tar 与前序文档候选精确相同，但本轮测试脚本以当前树单独验收。
- Gate 日志：`.log/project-gate/2026-10-19T09-22-46.622Z-808946-5df7b4b2-03d6-42e7-9712-edb31ff8b235/`。命令原始输出另存 `tmp/validation-proof-adoption-20261019/full-gate.log`。
- 独立 reviewer `review_validation_evidence_rewrite` 逐字确认还原三文件与 HEAD 一致、备份与 patch 摘要一致、三个材料脚本仍是前轮已审 bytes；实际 tar 摘要与原文档候选一致，29 篇注册 Markdown 及 strict-document/public index 的 source/tar 对照一致。此前同包阅读结论可复用，无需重读未变正文；本次并未替代未来新正式包的身份确认。
- 本次候选准备耗时 66110.1 ms，总反馈 107082.0 ms，超过原 90000 ms 告警预算；Check 均值 2241.4 ms、P95 6079.1 ms，超过原 2000/5000 ms 告警预算。按 owner 规则只告警，不改变 passed/exit；没有提高预算或新增豁免。
- 前序两次 external consumer 30 秒超时仍是有效失败记录。本次该 provider 与三个消费者验收通过，只证明本轮同包验收完成，不证明安装变慢的原因已定位或可靠性已修复。没有本轮重试直到绿，也没有扩大到安装流程修复。
- 该采用阶段收尾材料、Case、Investigation 与 diff 检查通过：494 JSON / 578 Markdown、759 entities / 188 Cases / 16 topics、90 reports 且 index current。当时 Change 为 plan、12/20，2.6 当前包验收和 2.8 用户采用确认完成；Git 基线距离为已核对的 2 commits / 284 lines，提交、重新冻结和发布尚未执行。后续本地提交及新增调查另见上节。

### 保留物与授权边界

`tmp/validation-proof-adoption-20261019/strict-json-draft.patch` 的 SHA-256 为
`c8d6cdd0ae264c0ebaf2f3bedff53b155492493c45177cb9feea3271ac6f075b`；manifest 记录源 HEAD、草案与还原后摘要，
`draft/` 中三份副本采用 `.snapshot` 后缀且 bytes 不变。备份形成于 09:17:51 UTC，命名调整和验证的实际时间在
manifest、旁注与结果中；仅本次副本改名，没有清理历史材料。重新采用 JSON 草案须单独确认并先 `git apply --check`，
不能整树覆盖当前工作。方案明确采用或放弃、必要证据保存后再按授权清理该精确临时范围；它不属于 current test surface 或包材料。
该采用阶段没有新的 clean S、正式 receipt 或发布事实；采用确认本身不授权提交、冻结或发布，后续本地提交另按本页新增明确授权执行。

## 已分离的严格 JSON 优化草案（历史结果）

以下记录前序试验形成时的范围和证据；本轮已从交付工作树分离，不是当前采用项。

- 只改严格 JSON 私有值的迭代遍历：数组按索引处理，对象置 null prototype 后枚举读取，仅将容器压栈；全部冻结、native grammar、decoded duplicate keys、字节/错误顺序和公开结果保持。
- 扩展既有测试的根/混合数组、空容器、特殊/数字键和 4096 层数组，保留深对象与负零证明；同一 Case 仅同步连续 rename。没有改公开 API、schema、依赖、loader、调度、timeout 或性能预算。
- [复查报告](../../docs/investigations/evaluate-validation-cli-optimization.md)保存阶段、CPU、两宿主和 72 个 command samples。收尾 helper 变体的私有边界在固定 490 文件 / 34.8 MB corpus 上，Bun 中位数 524.92 → 428.43 ms（约 -18.4%），Node 219.33 → 203.07 ms（约 -7.4%）；这不是完整 CLI/Gate 收益。代价是 Bun 25,000 属性宽对象单份约 +0.87 ms，4096 层对象约 +0.07 ms。报告逐轮区分 corpus/index bytes 和源码摘要；计时后的唯一 helper 注释变化经反向替换摘要验证。
- 旧版与初稿交错时各有 2/3 并发超时；测量第二版串行 3/3 通过、配两个冷 compiler 时 3/3 超时。该阶段收尾只收拢共同入栈逻辑，没有解决测试可靠性，不以当时最终 Gate 或单独首组通过消项。该 P2 风险后来按下节测试证明重分工处理，不是已发现 Product 错误或错误放行。
- 原 child 10 秒 / entity 15 秒建议已被用户否决并撤回，不再是待确认方案；报告保留形成时认识，本页承接当前决定。局部性能草案是否采用，与该测试是否必要分开判断。
- 最窄 JSON/document/schema/workspace-strict 测试 28/28 通过；`lint`、`typecheck`、`format -- check` 与 Case 全树闭合通过（756 entities / 188 Cases / 16 topics）。Bun 1.3.14、Node 24.18.0 同输入 verdict/值/冻结/prototype 对照均通过。
- 独立 reviewer `review_validation_optimization_boundary` 已审查实现、测试与原 Case，确认无公开文档/JSDoc 行为变化；又核对最终 tar/installed/source 的源码、emitted implementation 与 source-map 关联，29 篇 Markdown 与三者及 `b8cf54f48` 四方 bytes 一致，因此此前阅读结论继续适用，无需重读未变化的页面。
- 辅助 probe、原始计时、CPU profile 和精确源码回退副本暂留 `tmp/validate-cli-optimization-20261019/`，不属于发布材料；采纳/放弃方案并保存正式证据后再复核清理，不自动删除。

### 前序严格 JSON 草案的候选验收

- 最终 local candidate：`0.0.0-local.eb98142b323f`；tarball：`build/artifacts/zxyycom-vibe-check-0.0.0-local.eb98142b323f.tgz`；SHA-256：`dd6db28571624a8b0c68a4361a299d7fdff47433669c910325ece0ceefb8acaa`。最终 source SHA 为 `36d186fa3dd68e6cf5b8b545244e8572b505dcb926ee956460f66713c127d171`，均位于实现 worktree。
- `bun run check -- --all`：43/43 passed、exit 0，execution 30 秒；selection=all、source=local，artifact、external consumer types/docs/runtime 消费同一 candidate。日志 `.log/project-gate/2026-10-19T08-01-35.215Z-775202-47beacb1-d8dc-43a0-a885-476cf1fc08c6/`。
- 前一候选 `0.0.0-local.ec190fa255cd` 为 42/43，唯一失败是新增遍历函数 CCN 14 > 10、ND 8 > 7。将两分支共同的仅容器入栈不变量收拢到私有 helper 后，原门限下通过；未增豁免。失败日志 `.log/project-gate/2026-10-19T07-58-48.142Z-768125-c8cdd327-63ba-450e-9172-9b37c6f12a92/` 保留，不把该失败归为五秒 timeout。
- `validate`、Case、Change、Investigation 与 diff 检查另行覆盖收尾报告/记录。Investigation 的前序未进入 HEAD 警告已按报告边界复核：前轮是只定位的形成时快照，本轮是获授权试改与新竞争复现，保留独立复查关系；警告不授予提交权限。
- 此处只证明未提交 local candidate；没有新的 formal receipt、clean S 或正式发布。须先确定必要测试及其证明分工，在原预算内完成相应验证，另行确认局部优化取舍，再按授权更新发布说明、提交/冻结/验收。

## 已确认采用的测试证明重分工

详细依据、反例、整组采样与前序 Gate 结果在[调查报告](../../docs/investigations/reassess-validation-test-boundaries.md)。实现范围仅为 workflow、两份测试、内部 owner 与两个原 Case；workspace 入口、Gate、依赖和任何 timeout 不变。下列试改测量当时仍含 JSON 草案，最终不含该草案的验证见上节。

- 删除 workspace 的默认全材料 child 与退休入口 child，改为 adapter 参数/返回值证明；保留真实 links 小 fixture 的内容失败诊断。没有把全仓库扫描搬到别处。
- workflow 仅开放八个内部 leaf 依赖供替换，保留真实默认五任务选择、task map、wrappers、顺序等待、reporter 与错误翻译。新增精确分发/参数、focused selection/去重、controlled Promise 等待及失败聚合断言；原 reporting 实体不再生成真实 examples 两次。
- 材料内容仍由现有 Gate/material/artifact 验收与 validator fixtures 覆盖。`Manual CR:` 实际检查 workspace/workflow 的 main、package script、argv、await、stdout/stderr、process.exitCode 及默认真实 leaf 绑定；自动测试只证明 CLI 返回值，不冒称 OS 退出码覆盖。
- 两文件 9/9；六项应被自动发现的变异全部失败：漏 package API、task 错接、不等待、漏 reporter、丢 diagnostics、失败返回 0。对照 9/9；删除 main 的 exitCode 赋值仍 9/9，准确标记为人工边界。所有变异无 watchdog 或 signal 干扰。
- Bun 1.3.14 下按旧/新交错，每组各三次单独及两个冷 compiler 竞争。旧整组 wall 2.93–3.83 秒 / 5.54–7.56 秒；新整组 0.74–0.92 秒 / 1.70–2.95 秒。竞争下最慢实体为旧 3212.99–4750.24 ms、新 21.27–90.82 ms。12 个测试进程及 12 个 compiler 均通过；本批未重现旧超时，不改变前序失败事实。证明集合不同，不称等价算法加速比例。
- scripts typecheck/lint/format、Case 闭合通过；当前 759 entities / 188 Cases / 16 topics。独立 reviewer `review_validation_evidence_rewrite` 审查实际 diff、Case、Manual CR 与测量资源，无阻断；本轮不影响公开 API、随包文档或 JSDoc。
- 前序试改收尾 `validate` 通过（494 JSON / 5 schemas / 1 machine artifact set / 4 reports / 578 Markdown），Case、Change 和 diff 检查通过；当时 Change 为 plan、10/20，Git 基线距离为已核对的 2 commits / 284 lines。Investigation 全量检查为 90 reports、index current；两条前序未进入 HEAD 的提示已按问题与证据条件独立审阅，保留定位、算法试改、证明必要性三轮关系，不自动暂存或提交。

### 前序试改的完整 Gate 缺口

两次均以 `mise exec -- bun run check -- --all` 运行，使用同一 `0.0.0-local.eb98142b323f` 和上述 tar SHA；每次 exit 1、39 passed / 0 failed / 4 unavailable。材料测试分别 842.8、950.3 ms 且 passed；其它测试、材料、类型/lint/format 与 artifact 验收通过。

- 首轮日志：`.log/project-gate/2026-10-19T08-50-34.665Z-793736-973de4d5-38b5-4f58-ac86-dbb4acce5d7f/`。
- 唯一一次带观测复查：`.log/project-gate/2026-10-19T08-52-38.293Z-800046-9434ba9d-1014-4a9a-9f55-4c5dd636baa5/`。
- `prepared-external-package-consumer` 在原 30 秒预算下 command-timeout；runtime/docs/types 三项消费者验收因 dependency-not-passed 未运行。第二次 2、10、20、28 秒快照中 provider 与其 Bun install 子进程持续存在，未完成阶段可定位为安装，但具体原因尚未证明。

这不是新测试的 5 秒超时，不能归因于网络、机器或本次改动，也不以此前同包通过覆盖当时缺口。该阶段没有提高预算、继续盲目重试、读取认证配置或扩大修复范围，任务 2.6 曾撤回完成勾选。用户后续已确认仅采用测试重分工，去除 JSON 草案后的新 candidate 与验收另记于上节，不覆盖这两次失败事实。

### 辅助物与恢复边界

`tmp/validation-evidence-rewrite-20261019/` 保留根代理的四源码基线副本、imports/cwd 重定位脚本、变异与竞争 probe、原始输出及两次 Gate 日志；基线来自 `tmp/validation-evidence-worker-20261019/baseline/` 的 08:29:20 UTC 原样副本。基线 manifest 记录原始摘要，当前 workflow/两测试可据此对照恢复，workspace 原文件未改；不能整树覆盖其它工作。前述旧测试必要性 probe 仍在自己的独立目录。
根代理材料实际形成于约 08:30–08:57 UTC，详细命令、结果和摘要已保存到报告资源；临时目录不是 current test surface 或发布材料。方案确定且正式证据保存后再按授权核对精确范围清理，本轮不自动删除。

## 前序全量真实进程测试必要性审查

08:13 UTC 审查对象是当时 `scripts/validation/workspace.test.ts` 的 `root validate CLI runs every material task by default`，及同文件两个相邻实体。结论是**没有充分依据原样保留“真实子进程 + 全仓库材料扫描”的形式，应重写证明分工；不能仅因它已有 Case 或优化后更快而保留。** 这不等于没有任何独立证明义务，也不直接授权删除；获后续授权的试改见上节。

### 义务与重复覆盖

- 该实体直接运行 `workspace.ts materials`，断言成功状态、空 stderr 和五条输出；并未调用 package script，也未走无参数时的 layout/git-diff 分支。五条输出并不对应五种 task，`package-api-documentation` 没有独立断言。
- JSON、schema、机器示例、历史 report 和链接的真实材料校验已由 Gate 的 material Checks 直接执行；package API 投影由 artifact documentation audit 独立比对。相关 validator 的坏输入语义另有小 fixture 测试。重复整个材料集不是这些内容义务所独有的证明。
- Gate 不经过默认 CLI dispatcher，因此“默认确实选中并完成五项任务”仍有独立价值，不能以 Gate 已扫描为由裸删。这个义务发生在 workflow 分发层，不要求再启动子进程或扫描全仓库。
- 真实进程才可直接观察的剩余边界是实际入口、argv、输出通道和 OS 退出状态；相邻退休入口用例已覆盖部分入口/拒绝路径。当前重型成功用例没有证明普通材料失败返回值到 `process.exitCode` 的映射。

### 隔离反例实测

在 Bun 1.3.14 下复制 workspace/workflow/test，重定位 imports 与 cwd，其余测试正文和断言不变；每个变体仅加下表一项改动。正式三文件前后摘要相同，Bun 默认 5 秒实体预算未改。

| 隔离变体 | 同文件三个实体结果 | 能支持的判断 |
| --- | --- | --- |
| 无语义改动对照 | 3/3 通过 | 隔离运行保留原测试结果。 |
| 默认任务中移除 `package-api-documentation` | 3/3 通过 | 现有测试不能证明它声称的全部默认任务完成。 |
| 默认任务中移除 `json` | 2/3 通过，目标实体失败 | 反例能被当前断言观察；测试有部分集成价值，不是完全无效。 |
| 删除 main 的 `process.exitCode =` 赋值，保留 await | 3/3 通过 | 真实进程形式仍没证明普通失败返回码映射；不是已在正式实现发现此 bug。 |

最后一项对真实坏材料退出行为的影响来自源码推导，本轮没有另造坏材料 child 实测；退休入口会抛错，由 `runAsyncMain` 的 catch 处理，所以仍非零。以上反例说明当前证明缺口；“全量进程形式不必要”的判断还依赖前述责任分层与重复覆盖，不单凭 mutation 存活推出。

### 调整建议与边界

默认五项任务的精确分发、等待完成、失败汇总与 focused selection，应在真实 workflow 路径用受控动作直接证明；实际材料内容继续由既有 Gate/material 验收及 validator fixtures 承担。进程测试逐项说明仅在进程边界可观察的风险、现有证据缺口和最小输入后，才决定是否保留；不预设增加新的 smoke，也不把全量扫描简单搬到另一测试。

该阶段只做审查与当前计划修订，未修改正式 CLI 测试、workflow、owner、Case 或 timeout；先前严格 JSON 草案保持不变。当时 owner 中的真实 CLI 分工是待评估的既有契约，不作为必要性的循环论据。后续试改、owner/Case 同步及反例验证见上节。

辅助脚本、四组隔离副本和原始结果保留在实现工作区 `tmp/validation-cli-necessity-20261019/`，`results.json` 形成于 `2026-10-19T08:13:16.600Z`；不属于 current test surface 或发布材料。其用途是复核上述反例，方案定稿且必要证据已保存后再按授权清理。该阶段未重跑完整 Gate，不把反例中预期的一项失败算作项目回归，也不据此宣称可靠性已修复。

## 本轮文档整理

范围是全部 29 篇随包 Markdown，以及本次发布的流程入口和当前记录；未批量重写历史 Decision/Investigation，也未重新展开全量 JSDoc 审计。
三名非实施 reviewer 重新全文阅读实际 `0.0.4` 包的 29 篇 Markdown，逐页比较与实施树 bytes 一致后给出建议。实施者完成：

- README 先完成最小运行和结果读取，再展开高级项目声明；普通依赖路径先于可选 handoff。
- changelog 分开正式版本迁移与开发期 API，将函数指标的结果变化、升级复核和读取优化集中到同一主题。
- scheduler 终态 measurement 提升为适用于任意 policy 的独立章节；prepare 风险归回准备生命周期。
- Markdown lint 最小用法前移；函数指标细节集中；cache 长节增加阅读路标；混合长段按责任拆分。
- 修正 secret detection 的 binary I/O 零承诺：先受限读取，再判断 NUL/UTF-8，只有 approved text 交给 detector。
- 收敛“初版”“保留旧形式”“既有 bytes”等现态说明中的历史措辞；保留实际兼容、安全、权限、取消与资源清理限制。

未修改 Product runtime、公开签名/JSDoc、示例源码、schema、依赖、锁文件、测试或阈值。长篇 Gate 指南具有场景索引和独立示例，保留原结构；旧版本 changelog 和必要协议否定句具有独立职责，不机械删短。

## 前序文档候选验证（不覆盖本次实现）

- `docs:api`、`validate`、`test-evidence -- check --root .`、`change-plan -- check-all changes`、`decisions -- check` 和 `git diff --check` 已通过；756 test entities / 188 Cases / 16 topics、17 Changes、372 Decisions。
- 最终候选：`0.0.0-local.1cbe23f0f7d6`；tarball：实现 worktree 下 `build/artifacts/zxyycom-vibe-check-0.0.0-local.1cbe23f0f7d6.tgz`；SHA-256：`b00b89a4dbfa8c66e2c0e8ce971874f36448e9f42416479fbe692abe131f2fd2`。installed root 为 `scripts/project/node_modules/@zxyycom/vibe-check/`。
- 与旧正式 installed 包逐文件比较，1537 项清单不变，仅 15 篇 Markdown 和 manifest version bytes 不同；runtime、全部 declarations/JSDoc、示例与 schema bytes 不变。
- 最终 `bun run check -- --all` 通过：43/43 passed、exit 0，selection=all、source=local，artifact 和 external consumer types/docs/runtime 均消费该候选。日志 `.log/project-gate/2026-10-19T06-55-39.956Z-744608-1a54842a-fc39-4341-8d21-6ffd3d21cf8c/`，execution 44.1 秒。
- 该次有 Check 耗时告警：均值 2582.2 ms、P95 5826.5 ms，超过原 2000/5000 ms 告警预算。按现有 owner 规则不改变 passed/exit；本轮未处理性能问题，也不据此声明性能改善。
- 实现 worktree 使用同一机器 main 的既有 ignored `performance-baseline.json`，独占复制后 bytes 相同，SHA-256 为 `4e4e2dca26dfd8b3c869d2a1522dd1ea0a13ea9e04c2997612b44749209bfd80`。未修改 required/all 30000/90000 ms、均值 2000 ms、P95 5000 ms 告警预算。

### 本轮验证中的失败与环境边界

首轮完整 Gate 在中间候选 `0.0.0-local.db97a6230b0e` 上为 42/43：`scripts/validation/workspace.test.ts` 的默认 validate CLI 测试耗时 5078.99 ms，超过原 5000 ms timeout。日志 `.log/project-gate/2026-10-19T06-53-17.296Z-737251-b38a5100-be37-40a4-ac1c-7d927ca47eec/` 保留；包产物与 external consumer 验收当次均通过。
隔离复跑在宿主 Bun 1.4.2 下 3/3 通过；随后在 Gate 锁定的 Bun 1.3.14 下重跑 3/3 通过，原超时项 2154.34 ms。再修正 changelog 的旧 API 归属并重建最终候选，完整 Gate 如上通过。未修改 runtime、测试、timeout 或豁免；当时尚未进一步定位超时成因，不能据此宣称已修复测试稳定性。

提交后的[定向调查](../../docs/investigations/investigate-validation-cli-timeout.md)确认直接机制为 Bun 的 5 秒实体 timeout。
同 Bun 串行目标实体为 1.50–2.28 秒，与两个冷 compiler 并发为 3.47–4.67 秒；完整四文件 lane 与 direct CLI 的并发对照也通过，未再次触发 timeout。
当前暂定 P2 仓库验证可靠性问题：并发资源竞争是首要假设，但原次具体瓶颈尚未闭合；未发现 Product 错误、数据损坏或错误放行证据。
本轮仅定位与记录，不修改 runtime、测试、调度、超时或预算；没有重跑完整 Gate，不把此前的重试通过当成修复。

直接调用宿主 Bun 1.4.2 曾产生 `ec3f8f3f1a9b` 候选；Gate 通过 mise 固定为 Bun 1.3.14，Bun version 参与 fingerprint，因此自动重建为 `db97a6230b0e`。最终构建统一使用 `mise exec -- bun run package:build`，后续同 runtime Gate 复用最终候选。中间候选不作为本轮交付身份。

## Manual CR:

### 本轮 Markdown 重新阅读与修正

初次阅读对象为下述旧正式包，其实际安装材料与实施树一致。三名 reviewer 未参与实施，各自全文阅读并按以下任务检查：

| reviewer | 范围 | 代表性任务与发现 |
| --- | --- | --- |
| `polish_release_entry_docs` | README、changelog、API、output，及 Gate、callbacks、Check lifecycle、dependencies、command、Run outputs，共 10 页 | 首次集成、普通数据交接、命令安全、结果及失败处理；定位高级配置前置、迁移归属混排、重复及混合长段。 |
| `polish_release_tool_guides` | scheduling、learned、simulation、collector、file-region index、cache、waiver、presentation、debug flags、data boundaries，共 10 页 | 硬约束与 policy 选择、prepared/terminal 生命周期、单/多 selection、immutable 分叉与缓存；定位终态标题归属、多 selection 范围和“初版”措辞。 |
| `polish_release_check_guides` | 全部 9 篇 Check 指南 | Check 配置、parser/waiver、N/A/unavailable、安全和预算；定位 binary I/O 过强表述及四项入口/层级调整。 |

最终候选的包内差异、相关引用路径及修正保真性由上述 reviewer 独立复核，结论绑定本页最终 tar SHA；完整结果见下节。

### 前序文档候选适用性

- `polish_release_entry_docs`：10 页 source/tar/installed 一致；补查 `v0.0.3` 后关闭 changelog 中“缺省 needs”的历史归属问题；README 顺序、普通依赖路径、quiet-pass 与相关 JSDoc 引用均保真。另复核发布流程和当前计划/evidence，旧/新证明及授权边界清楚。
- `polish_release_check_guides`：9 页 source/tar/installed 与已读材料一致，五项修正关闭；以安装包实现核对先受限读取再分类，342 个关联 runtime/types 文件不变，示例、固定标题和 JSDoc 引用有效。
- `polish_release_tool_guides`：最终 10 页 source/tar/installed 与已读材料一致；三项修正关闭，其余七页及相关声明/运行时未变，prepared 与终态 measurement 的包内路径和 anchors 有效。

这些结论覆盖 29 篇 Markdown 及关联声明的阅读路径，不是重新开展全部公开 JSDoc 阅读，也不替代新正式包的最终身份确认。未新增 GUI hover、跨平台验证或重复全部手动行为演练；本轮完整 Gate 另行执行当前平台的实际消费者验收。

### 对外 JSDoc 既有基线

此前 `audit_jsdoc_core_api`、`audit_jsdoc_package_checks`、`audit_jsdoc_scheduler_tools` 分别覆盖 60、115、52 个包根导出族及必要辅助声明，22 项问题已修复并独立复核。
完成态可从提交 `cc9c4d1dd63d48365c7c97c07e6ddca6618ffef1` 的 `changes/repair-package-jsdoc-usability/` 恢复；下述旧正式包已取得三者的适用性确认。
本轮声明与运行时未变，引用页面有组织和表述调整；复核必须覆盖关联阅读路径，不能仅因 `.d.ts` bytes 相同便跳过。

## 旧正式包：仅证明原冻结材料

- source S：`fca819d8511642f8887d149441a5d336369caf44`；detached worktree：`/home/dev/.codex/worktrees/release-0-0-4-frozen/vibe-check`。
- tarball：`build/artifacts/zxyycom-vibe-check-0.0.4.tgz`；SHA-256：`6b0bd4b82ba650440e0fa0bfc1a54a342c8a202e2ba41697ec4f0f34ed5f59e7`。
- SRI：`sha512-DM3PFXAjrfeiEAFA6AdTCBzQUQWmIHy5GxcJ5I0RfVAHUtjPCY1uj+lt11J0b4U3aAnwjQuHj4Mq39P0VHEnGg==`。
- receipt：`build/releases/zxyycom-vibe-check-0.0.4.release.json`；SHA-256：`b1a5014c49eda1343d35ece74361e113ef3d864fc15a520b7b2abdad8592454d`。
- input fingerprint：`ba3c585d2a0f176cd97ad6a3856e7546ff1aeee2cff3fdd8c396ccd6f1852eec`；1537 项文件。路径均相对旧 frozen worktree。
- 原正式包与已审候选仅 manifest version 不同；四名 reviewer 独立确认 29 篇用户页、示例与全部对外 JSDoc 的结论适用，绑定上述 tar SHA。本轮新文档不在该结论内。

旧验收过程保留失败与成功两类事实：缺本机预算时在 Product Run 前失败；补齐原样预算后首次 Gate 为 42/43，`scripts/validation/workspace.test.ts` 一项超过原 5000 ms timeout；隔离复跑 3/3 通过，随后同 S/receipt/tarball 正式验收 43/43 通过，未改测试或阈值。
最终通过日志为 `.log/project-gate/2026-10-19T06-21-24.042Z-727142-3b2be102-c5cd-4b1a-a71e-e426300b4cd9/`，含同包 artifact 与 external consumer types/docs/runtime；execution 29.9 秒，总反馈 32619.4 ms。

### 归档与恢复

固定槽位为 `/workspace/vibe-check/.git/vibe-check/releases/0.0.4/b1a5014c49eda1343d35ece74361e113ef3d864fc15a520b7b2abdad8592454d/`。
已独占复制并逐文件核对 74 项原始文件，含 tarball、receipt、两轮 Gate 日志；完整准备证据快照为槽位内
`evidence/58f1a3704b01048378fbaa7a13df5a714aa919a260e7b7ae810d2ef227ce70ca.md`，摘要与文件名相符。
版本库中的旧完整记录位于提交 `10491179` 的本文件。原归档和 frozen worktree 保留不变，本轮不覆盖或删除；本地归档不等同跨机器备份。

## 后续发布条件

1. 先明确上述测试可靠性风险的后续处理；随后按授权保存新的 clean source S，建立对应 frozen worktree，重新正式 prepare/verify 与最终包独立确认，并保存新 receipt 槽位。
2. 临发布重新核验 freshness、registry、publisher authority 和精确外部写入授权。2026-10-19T06:09:26Z 的只读观察仅为 latest 0.0.3、0.0.4 不存在，不是版本预留或权限证明。
3. 发布者交互完成 2FA；发布与分发 bytes 核对成功后，才按授权 tag、合回 main 并保存最终证据。工作区、Change 与归档清理另行确认。
