# 0.0.4 发布证据

当前阶段：本轮文档与代码规范审查、独立复核均通过，优化后的 local candidate 完整 Gate 43/43 通过；代码、随包说明及调查优化已本地提交。此前文档优化、材料测试重分工及调查已本地提交；严格 JSON 优化不在交付范围内。
网络专项排查已停止，正式包仍按原门禁验收。新 detached 工作区已完成标准环境自举，但仍固定在审查前的 `95488448`，尚无新正式包；本轮变更须另行绑定最终冻结提交。

固定约定由 [Package release](../../docs/tooling/package-release.md) 拥有；本页保存当次身份、授权、结果与剩余条件。形成时实验细节见下方调查，不作为当前实施指令。

## 输入、工作区与授权

发布目标为 `@zxyycom/vibe-check@0.0.4`，tag `latest`，canonical registry `https://registry.npmjs.org/`，access `public`。

| 工作区 | 身份与用途 |
| --- | --- |
| `/workspace/vibe-check` | main 保持 `357fb7c4061c3f576d0b70c8594e458c2941ce39`，本轮不在此实施或合入。 |
| `/home/dev/.codex/worktrees/package-release-preparation/vibe-check` | `release-0-0-4` 实现工作区；本轮审查起始 HEAD `954884483d7e566d87bc49393f0402cc818e07c4`。当前记录只在此维护。 |
| `/home/dev/.codex/worktrees/release-0-0-4-final/vibe-check` | 用户授权从 `95488448` 新建的 detached 工作区；`bun run env:setup` 已成功，准备了 local candidate，尚无新正式 receipt。 |
| `/home/dev/.codex/worktrees/release-0-0-4-frozen/vibe-check` | 原 detached S `fca819d8511642f8887d149441a5d336369caf44`；旧正式包及归档保持不变。 |

当前授权与先后顺序：

1. 用户确认采用测试证明重分工，保持 5 秒红线；严格 JSON 优化独立保留，不捆绑采用。已授权的提交依次为文档 `b8cf54f4`、测试 `8a503b16`、调查与准备记录 `95488448`。
2. 用户决定停止网络专项排查并继续发布准备。网络根因闭合不再是准备前置；不改变安装语义或正式验收要求。
3. 用户明确授权以 `95488448` 新建上述 detached 工作区、标准环境准备、`0.0.4/latest` 正式打包、一次完整验收、独立复核及本地归档；旧工作区和产物保留。实际已执行到标准自举。
4. 随后用户要求先用 `ai-ready-docs` 再审文档、按完整编码规范审查本次代码，并允许任意次必要提交及 hook 导致的推送。本轮先完成该审查；新增发布输入需重新选定冻结 S，原 `95488448` 不冒充修改后的源码身份。

当前未执行 npm publish、版本 tag、手动 push、merge 或旧材料清理。必要提交使用正常 hook；已读取的 hook 仅对 main 尝试 auto-push，发布分支不适用。不采集认证配置、token、OTP 或认证会话。

## 本轮审查与优化

审查范围是 `357fb7c4..95488448` 的完整发布变更，加上本轮产生的修改；近邻代码用于理解接口，质量裁决以 [编码规范](../../docs/development/coding-style.md) 为准。

- 随包文档：重新全文审查本次修改的 15 页，按用户任务检查主线、负向边界、迁移表达、篇幅与 Markdown 组织；不机械删减安全和协议要求。
- 代码与测试：审查本次三个 TypeScript 文件的完整职责、类型、控制流、异步和错误归属；既有已确认的证明分工和预算保持不变。
- 调查与计划：四份报告保留形成时证据，当前 Change 聚焦当前范围、授权和下一步；压缩重复实验叙述，以直接引用连接证据 owner。

实际改进：

- 六篇随包文档明确 Run 读取、selection、输出失败优先级及终态样本保存顺序，澄清 string dependency read 与 handoff 的返回分支；去掉无任务价值的实现细节。其余九篇本次修改页经全文审查保持原样，历史 changelog、必要安全边界、全部标题和 fenced examples 保留。
- 两份测试分别观察 library reporter 与 CLI stdout，将非法输入与对应错误一一配对，按数组核对真实 links 的逐条诊断。生产 workflow 审查通过，未因行数或风格偏好重构；Case 与证明职责保持。
- 四份调查将建议标明为形成时判断、改善分节并改用自身证据入口；frontmatter、数据表和六份资源 JSON bytes 保持。Change 将当前状态、授权、证据与下一步放在主线，协调页只引用实际授权 owner。

实际验证：目标测试 9/9（828 ms），scripts typecheck/lint、format（983 files）、docs:api、材料验证、Case、Investigation 和 diff 检查通过；完整 Gate 结果见下节。独立代码、文档与实际包复核均通过。

已完成的本地提交：

| 提交 | 范围 |
| --- | --- |
| `6055355c` | 两份测试的输出归属、输入错误配对与逐条诊断断言。 |
| `5b9a765b` | 六篇随包说明的使用顺序与依赖读取分支。 |
| `81cc47b2` | 四份调查的形成时表述、证据入口与派生索引。 |

准备记录与协调摘要作为独立语义单元保存，提交身份以本分支 Git 记录为准。上述提交均正常执行 hook；因当前是发布分支，hook 明确跳过 auto-push，没有推送尝试。

## 当前候选与完整 Gate

### 本轮优化后的验收

- candidate：`0.0.0-local.e3c17b6dca27`；tarball：`build/artifacts/zxyycom-vibe-check-0.0.0-local.e3c17b6dca27.tgz`；SHA-256：`6f13ea8277b2b6fc6b47b9c27229eadf7423df075db8323b8b72f9d26a64b400`。路径相对实现工作区；`package:build` 和只读 `package:status` 均确认 current。
- 2026-10-19 18:28（Asia/Shanghai）正常运行一次 `mise exec -- bun run check -- --all`，exit 0、43/43 passed，execution 46.2 秒；真实 external consumer 准备约 3.9 秒，types/docs/runtime 与 artifact 均通过。未先做网络探针，也未重试。
- 日志：`.log/project-gate/2026-10-19T10-28-18.657Z-835962-4e923d76-13c2-4841-8948-db1ae2cd9f07/`。总反馈 47387.6 ms（candidate 151.8 ms、adapter/setup 578.4 ms、Product Run 46657.4 ms），在原 90000 ms 告警预算内；Check 均值 2645.4 ms、P95 7180.2 ms 超过原 2000/5000 ms，仍有分布 warning。
- 本次只证明该输入完成同包验收，不证明网络已修复或长期安装可靠性；本轮没有生成正式 receipt。

### 审查前基线与保留的失败事实

- candidate：`0.0.0-local.1cbe23f0f7d6`；tarball：`build/artifacts/zxyycom-vibe-check-0.0.0-local.1cbe23f0f7d6.tgz`；SHA-256：`b00b89a4dbfa8c66e2c0e8ce971874f36448e9f42416479fbe692abe131f2fd2`。该原样 candidate 现保留于 `release-0-0-4-final/vibe-check` 工作区的上述相对路径；实现工作区的标准重建已替换旧 local artifact。
- 2026-10-19 17:22（Asia/Shanghai）运行 `mise exec -- bun run check -- --all`：exit 0，43/43 passed，execution 39.7 秒。artifact 与外部消费者 types/docs/runtime 消费同一 candidate。
- 日志：`.log/project-gate/2026-10-19T09-22-46.622Z-808946-5df7b4b2-03d6-42e7-9712-edb31ff8b235/`；原始命令输出另存 `tmp/validation-proof-adoption-20261019/full-gate.log`。
- candidate preparation 66110.1 ms，总反馈 107082.0 ms；Check 均值 2241.4 ms、P95 6079.1 ms。超过原 90000 / 2000 / 5000 ms 告警预算，仅产生 warning；未调预算或豁免。
- 前序两次 Gate 为 39 passed / 4 unavailable，external provider 超过 30 秒，三项依赖验收未执行。后续独立诊断也超时；43/43 是有效的同包验收，不证明网络或长期安装可靠性已修复。

上一轮收尾另通过：目标测试 9/9、scripts typecheck/lint、format、validate（495 JSON / 579 Markdown）、Case（759 entities / 188 Cases / 16 topics）、Investigation（91 reports，index current）、Change 与 diff 检查。
本机 performance baseline SHA-256 为 `4e4e2dca26dfd8b3c869d2a1522dd1ea0a13ea9e04c2997612b44749209bfd80`，required/all 总预算 30000/90000 ms、均值 2000 ms、P95 5000 ms，保持原值。

## 已采用的测试分工与草案边界

真实 workflow 保有生产 task map、wrappers 和错误翻译，仅替换八项 leaf 依赖，直接证明五项默认任务的分发、顺序等待、focused selection、去重及失败汇总；workspace 保留真实 links 小 fixture。
全量内容由现有 Gate/material/artifact 验收负责。薄 main 的 argv、await、输出、OS exitCode 和默认 leaf 绑定由明确 Manual CR 承担，不宣称自动化 OS 退出码覆盖。

- 采用前的九个实体、六个应失败反例及独立语义审查通过；owner 与原两个 Case 已同步。严格 JSON 草案分离后，37/37 回归通过。
- 最终输入与两个冷 compiler 并发的三轮两文件测试均 9/9，六个 compiler 均 exit 0；测试整组 wall 为 3270.23 / 3466.52 / 3372.70 ms，最慢实体 13.88 / 54.66 / 15.10 ms，原 5 秒实体预算不变。这不外推所有机器的可靠性。
- 首次回归命令误发现 `tmp` 草案测试副本并发生 import error；随后副本改为 `.snapshot`，以显式 `./` 文件清单得到 37/37。原失败与修正结果保留在 `tmp/validation-proof-adoption-20261019/`。
- 草案三文件已精确还原为 `b8cf54f48` bytes；Product 净 diff 为空。原私有实现 SHA-256 为 `588923857c2c2ff95fabff66694233547d98c02c0b2cc107ef2ba97232a1c1d6`。备份 patch SHA-256 为 `c8d6cdd0ae264c0ebaf2f3bedff53b155492493c45177cb9feea3271ac6f075b`；重新采用须单独确认。

## Manual CR:

### 已有阅读结论与适用范围

前轮三名非实施 reviewer 全文审查 29 篇随包 Markdown，并对 `1cbe23f0f7d6` 包内修正独立确认：

| reviewer | 覆盖与已确认结果 |
| --- | --- |
| `polish_release_entry_docs` | 10 页入口/API/输出/扩展专题；README 阅读顺序、普通依赖路径、changelog 历史归属和 JSDoc 引用保真。 |
| `polish_release_tool_guides` | 10 页工具专题；prepared 与终态 measurement、多 selection 及其它工具用法的包内路径和 anchors 有效。 |
| `polish_release_check_guides` | 全部 9 篇 Check 指南；修正受限读取与 binary 分类说明，保留取消、安全、预算及结果边界。 |

与旧正式包相比，1537 项清单不变，仅 15 篇 Markdown 和 manifest version bytes 不同；runtime、declarations/JSDoc、示例及 schema bytes 相同。上述结论针对实际修改后的阅读路径，不是仅凭声明 bytes 相同推定可用。

对外 JSDoc 的三名基线 reviewer 为 `audit_jsdoc_core_api`、`audit_jsdoc_package_checks`、`audit_jsdoc_scheduler_tools`，分别覆盖 60、115、52 个包根导出族及必要辅助声明，22 项问题已修复并独立复核。完成态可从提交 `cc9c4d1dd63d48365c7c97c07e6ddca6618ffef1` 的 `changes/repair-package-jsdoc-usability/` 恢复。
`review_validation_evidence_rewrite` 另核对草案还原、source/tar bytes 与测试 Manual CR；`review_install_timeout_evidence` 核对原始诊断、白名单资源及推断边界，均无剩余阻断。

### 本轮独立复核

- `review_polished_validation_code` 全文审查三个 TypeScript 文件及完整发布 diff，按编码规范核对职责、类型、控制流、错误和副作用归属，结论通过；两个 Case 与薄 main 的 Manual CR 边界保持。单个 workflow 测试只截获其声明范围的 console/reporter，不能单独冒称完整进程输出证明；相邻 Gate 集成测试另有真实 stdout/stderr 观察。
- `review_polished_release_docs` 已核对 selection 的新增步骤顺序、六页 source/tar/installed 一致性及新旧 1537 文件清单：无增删，只有六篇 Markdown 和 manifest version bytes 变化；29 篇注册 Markdown 与 source 一致，runtime、declarations/JSDoc、示例和 schema 不变。原 candidate 从保留工作区取得，并核对为上述旧 SHA；独立语义结论通过，既有整包阅读结论适用于本轮 candidate；另核对新 Gate machine 的 43/43 与同包绑定、旧正式包和归档摘要及保留物入口。

新正式包仍须按 receipt、清单与内容确认结论适用性。本轮未新增 GUI hover、跨平台认证或对未变化公开 JSDoc 的重复全文审计。

## 形成时调查

四份报告各自保存一轮问题、原始依据、结论和限制；当前采用与任务状态由本页和 tasks 承接。

| 调查 | 可恢复的证据与边界 |
| --- | --- |
| [材料 CLI 超时定位](../../docs/investigations/investigate-validation-cli-timeout.md) | 5 秒实体超时、串行/并发对照；当时只定位，未声称修复。 |
| [局部 JSON 优化评估](../../docs/investigations/evaluate-validation-cli-optimization.md) | 两宿主局部收益、等价性、并发超时及完整 Gate 补证；历史加时建议已被用户否决，草案本轮未采用。 |
| [测试必要性与证明分工](../../docs/investigations/reassess-validation-test-boundaries.md) | 独立义务、重复覆盖、反例及试改；采用确认与草案分离见本页。 |
| [外部安装网络等待](../../docs/investigations/diagnose-external-consumer-install-timeout.md) | 真实 provider、verbose 安装、四次 curl/Bun 请求；综合指向元数据网络等待，具体链路责任未知。 |

网络调查发生于 2026-10-19 17:54–17:59（Asia/Shanghai），不是新的 Gate 结果，也不反推历史失败根因。用户随后选择停止专项排查；正式包正常验收时若再超时，记录该次阻塞，不自动改配置、预算或安装语义。

## 旧正式包与归档

以下仅证明原冻结材料，不包含后续文档优化：

- S：`fca819d8511642f8887d149441a5d336369caf44`；tarball：`build/artifacts/zxyycom-vibe-check-0.0.4.tgz`；SHA-256：`6b0bd4b82ba650440e0fa0bfc1a54a342c8a202e2ba41697ec4f0f34ed5f59e7`。
- SRI：`sha512-DM3PFXAjrfeiEAFA6AdTCBzQUQWmIHy5GxcJ5I0RfVAHUtjPCY1uj+lt11J0b4U3aAnwjQuHj4Mq39P0VHEnGg==`。
- receipt：`build/releases/zxyycom-vibe-check-0.0.4.release.json`；SHA-256：`b1a5014c49eda1343d35ece74361e113ef3d864fc15a520b7b2abdad8592454d`；input fingerprint：`ba3c585d2a0f176cd97ad6a3856e7546ff1aeee2cff3fdd8c396ccd6f1852eec`；1537 项文件。路径相对旧 frozen 工作区。
- 原过程保留缺本机预算、42/43 测试超时及随后同包 43/43 三类结果。成功日志：`.log/project-gate/2026-10-19T06-21-24.042Z-727142-3b2be102-c5cd-4b1a-a71e-e426300b4cd9/`；execution 29.9 秒，总反馈 32619.4 ms。
- 固定归档槽位：`/workspace/vibe-check/.git/vibe-check/releases/0.0.4/b1a5014c49eda1343d35ece74361e113ef3d864fc15a520b7b2abdad8592454d/`，74 项原始文件已逐项核对。准备证据快照为其中 `evidence/58f1a3704b01048378fbaa7a13df5a714aa919a260e7b7ae810d2ef227ce70ca.md`；Git 记录为 `10491179` 的本文件。

## 保留物与恢复边界

下列目录均在实现工作区 `tmp/` 下，只供复核，不属于测试或发布材料：

| 目录 | 保留用途 |
| --- | --- |
| `validate-timeout-20261019-0706/` | 原 CLI 超时定位的阶段计时、并发对照与现场依据。 |
| `validate-cli-optimization-20261019/` | 局部优化 probe、计时、CPU profile 与原样回退副本。 |
| `validation-cli-necessity-20261019/` | 必要性审查的隔离反例与原始结果。 |
| `validation-evidence-rewrite-20261019/`、`validation-evidence-worker-20261019/` | 证明重分工试改及实现者的辅助验证材料。 |
| `validation-proof-adoption-20261019/` | 三文件草案 patch/manifest/`.snapshot`、还原后回归、竞争验证与 Gate 输出。 |
| `external-consumer-install-20261019/` | 网络等待 probe、串行请求与白名单资源生成依据。 |

临时目录、旧 frozen 工作区和归档的清理须独立确认精确范围；不整树覆盖或删除。原始诊断自建的 `/tmp` 安装根已随 probe 清理，本地归档不等同跨机器备份。

## 后续发布条件

1. 完成本轮文档/代码优化、独立复核、受影响验证与必要提交，选择新的 clean S；重新冻结的精确目标按当前授权确认。
2. 从最终 S 生成正式 tarball/receipt，运行 receipt verify、同一 tarball 完整 Gate 与正式包独立确认，保存新的归档槽位。网络根因排查不作为前置。
3. 临发布核验 freshness、registry、publisher authority 和精确外部写入授权。2026-10-19T06:09:26Z 的 latest 0.0.3 / 0.0.4 不存在只是历史观察，不是版本预留。
4. 发布者交互完成 2FA，发布及分发 bytes 核对成功后，再按授权 tag、合回 main 并保存交接证据。
