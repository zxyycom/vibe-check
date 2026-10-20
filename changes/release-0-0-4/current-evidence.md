# 0.0.4 发布证据

当前阶段：本地正式包准备、同包一次完整 Gate 43/43、独立复核、发布与分发核验均完成；npm `0.0.4/latest` 的下载 bytes 与已验收产物一致。`v0.0.4` 已绑定冻结 S 并推送，发布记录已合回并推送 main，远端身份读回一致；发布后交接 evidence 已按固定槽位归档并核对。所有工作区、旧产物与 Change 保留，不执行清理或 finalize。严格 JSON 优化不在交付范围内。
网络专项排查已停止，正式包仍按原门禁验收。新 detached 工作区固定在 `4e3294a9a481e554340cecdbe63d222992720bae`；原 `95488448` 工作区与更早正式包保留，不作为本轮输入。

固定约定由 [Package release](../../docs/tooling/package-release.md) 拥有；本页保存当次身份、授权、结果与剩余条件。形成时实验细节见下方调查，不作为当前实施指令。

## 输入、工作区与授权

发布目标为 `@zxyycom/vibe-check@0.0.4`，tag `latest`，canonical registry `https://registry.npmjs.org/`，access `public`。

| 工作区 | 身份与用途 |
| --- | --- |
| `/workspace/vibe-check` | main 已从 `357fb7c4061c3f576d0b70c8594e458c2941ce39` 快进合入发布交接提交 `4d20ce88b61fa3896e708551f7703b2fc261598f`；后续收尾记录仍按授权快进同步。 |
| `/home/dev/.codex/worktrees/package-release-preparation/vibe-check` | `release-0-0-4` 实现工作区；本轮审查起始 HEAD `954884483d7e566d87bc49393f0402cc818e07c4`。当前记录只在此维护。 |
| `/home/dev/.codex/worktrees/release-0-0-4-4e3294a9/vibe-check` | 本轮获授权新建的 detached 工作区；冻结 S 为 `4e3294a9a481e554340cecdbe63d222992720bae`，承接新的正式包与验收。 |
| `/home/dev/.codex/worktrees/release-0-0-4-final/vibe-check` | 用户授权从 `95488448` 新建的 detached 工作区；`bun run env:setup` 已成功，准备了 local candidate，尚无新正式 receipt。 |
| `/home/dev/.codex/worktrees/release-0-0-4-frozen/vibe-check` | 原 detached S `fca819d8511642f8887d149441a5d336369caf44`；旧正式包及归档保持不变。 |

当前授权与先后顺序：

1. 用户确认采用测试证明重分工，保持 5 秒红线；严格 JSON 优化独立保留，不捆绑采用。已授权的提交依次为文档 `b8cf54f4`、测试 `8a503b16`、调查与准备记录 `95488448`。
2. 用户决定停止网络专项排查并继续发布准备。网络根因闭合不再是准备前置；不改变安装语义或正式验收要求。
3. 用户明确授权以 `95488448` 新建上述 detached 工作区、标准环境准备、`0.0.4/latest` 正式打包、一次完整验收、独立复核及本地归档；旧工作区和产物保留。实际已执行到标准自举。
4. 随后用户要求先用 `ai-ready-docs` 再审文档、按完整编码规范审查本次代码，并允许任意次必要提交及 hook 导致的推送。本轮先完成该审查；新增发布输入需重新选定冻结 S，原 `95488448` 不冒充修改后的源码身份。
5. 2026-10-20 用户明确同意以 `4e3294a9` 新建 detached 工作区，完成 `0.0.4/latest` 正式打包、receipt 验证、同包一次完整 Gate、独立复核和本地归档。保留旧工作区及产物；不执行 publish、tag、push、merge 或清理。本轮只在实现工作区更新非敏感记录，不进行 Git add/commit。
6. 本地准备交付后，用户明确表示“可以开始发布了”，授权按固定机制将本页已验收的 `@zxyycom/vibe-check@0.0.4` tarball 发布到 canonical npm registry，使用 `latest` 和 `public`，并核验分发结果。发布前身份、权限与认证条件仍须满足；不由此推导 Git add/commit、tag、push、merge 或清理授权。
7. 分发核验成功后，用户明确同意继续完成 Git 交接：提交当前发布记录，将 `v0.0.4` 绑定冻结 S，合回并推送 main、推送版本标签，补齐交接证据与归档。保留所有工作区、旧产物和 Change；不运行 finalize、不删除分支或工作区、不清理归档。推送限于 `origin` 的 main 与 `v0.0.4`，不强推。

代理未执行或重试 npm publish；发布按固定约定交给发布者的交互式终端，结果已由 registry 分发核验确认。本轮 Git 交接按第 7 项授权推进，普通提交沿用已启用的正常 hook；发布分支不适用 main 的 auto-push，不绕过 hook。不采集认证配置、token、OTP 或认证会话。

## 新正式包与同包验收

2026-10-20 在 `/home/dev/.codex/worktrees/release-0-0-4-4e3294a9/vibe-check` 执行；下列 build 与日志路径均相对该冻结工作区。

- S：`4e3294a9a481e554340cecdbe63d222992720bae`，detached；prepare 前后及完整 Gate 后 tracked/index 均干净。
- 标准 `bun run env:setup` 成功；从同机实现工作区原样复制既有 performance baseline，SHA-256 仍为 `4e4e2dca26dfd8b3c869d2a1522dd1ea0a13ea9e04c2997612b44749209bfd80`，未重设预算。
- 正式 prepare：`mise exec -- bun run package:release:prepare -- --version 0.0.4 --tag latest`，exit 0。
- tarball：`build/artifacts/zxyycom-vibe-check-0.0.4.tgz`；SHA-256：`a99f0139beefd2b6a71ff44e192b8486d57c8d985da32109a9d57afddf13477d`。
- SRI：`sha512-jwEIc4GX/8YMX6cJoluTj9FzbM7K3e6GMUoqL+tqByAVmhd2OhqlqkzHLwa3rSUvKqZKT0uuG6CSNT8Q51+Scw==`。
- receipt：`build/releases/zxyycom-vibe-check-0.0.4.release.json`；SHA-256：`09c622dd59d5b71557d7ced987115e4f16ce3aa535b258ee556eba0bc3ee0bdb`；input fingerprint：`e3c17b6dca27db7bb6015dbca012ac12e0d4cc149aea5d60528e9cd022283315`；1537 项文件。
- 正式验证：`mise exec -- bun run package:release:verify -- --receipt build/releases/zxyycom-vibe-check-0.0.4.release.json`，exit 0。该公开入口内部调用唯一 Gate process entry 的 `--all --release-receipt`；本轮未另跑第二次完整 Gate，也未重试。
- 09:46（Asia/Shanghai）的正式 Gate 为 `source=release-receipt`、`selection=all`、43/43 passed，execution 42.4 秒；真实 external consumer 准备约 1.3 秒，artifact 与 types/docs/runtime 验收均通过。日志为 `.log/project-gate/2026-10-20T01-46-15.606Z-2276-f36711c1-e1b2-4e12-ad7f-0e4f45a9e5c6/`。
- 总反馈 44756.1 ms（candidate 1543.3 ms、adapter/setup 514.9 ms、Product Run 42697.8 ms），在原 90000 ms 告警预算内；Check 均值 2219.2 ms、P95 6204.1 ms 超过原 2000/5000 ms，仍有分布 warning。成功不证明网络或长期安装可靠性已修复，不外推其它平台。

### 本轮归档

固定槽位为 `/workspace/vibe-check/.git/vibe-check/releases/0.0.4/09c622dd59d5b71557d7ced987115e4f16ce3aa535b258ee556eba0bc3ee0bdb/`。
已保存 tarball、receipt 与本次正式 invocation 的 36 项日志，共 38 项原始文件，逐文件摘要一致。receipt 摘要、tarball SHA-256/SRI、版本与 S 均已核对；复制前对日志及 receipt 的凭据模式筛查无发现，没有纳入认证配置或登录 transcript。
准备期 evidence 快照为槽位中的 `evidence/c2c584dcff29f7299d91963e375158e4f258a3762a0c325e49e8e11f68567521.md`，文件名与快照 bytes 的 SHA-256 一致；它保存本页发布前预检更新之前的状态。新槽位共 39 项文件经独立复核通过。旧槽位的 74 项原始文件与一份 evidence 快照已逐项复核；`95488448` 工作区的原 local tarball 摘要仍为 `b00b89a4dbfa8c66e2c0e8ce971874f36448e9f42416479fbe692abe131f2fd2`，旧材料不覆盖或清理。

### 临发布预检与交互发布

2026-10-20 10:02（Asia/Shanghai）执行只读预检，没有重跑 Gate、prepare 或 release verify：

- 冻结 HEAD 仍为 S，tracked/index 干净；tarball 与 receipt 的 SHA-256 仍分别为本节的 `a99f0139…` 与 `09c622dd…`。
- 10:02:49 查询 canonical registry 的 package metadata：`latest=0.0.3`，`versions` 不含 `0.0.4`。此为当时观察，不预留版本，实际发布前仍须保持 freshness。
- 当前 npm CLI 为 `11.16.0`。首次显式指定 canonical registry 的 `npm whoami` 返回 exit 1、`E401`，当时无法确认 publisher，未运行账号权限查询或 publish。
- 未读取认证配置或保存原始认证输出；只保留 identity 检查的退出码与错误码。发布者需在运行此工作区的机器上，使用交互式终端完成 `npm login` 与所需认证，不能将 token、OTP 或会话 transcript 发送给代理。
- 发布者确认完成登录后，10:05:45 的 `npm whoami` 成功返回 `zxyycom`。随后权限查询发生一次 20 秒超时，Bun registry metadata 请求发生证书验证错误；保留失败事实，不绕过 TLS、不修改网络配置或恢复专项网络调查。
- 10:07:09 改用 npm 原生只读查询，`npm access list collaborators @zxyycom/vibe-check zxyycom --json` 与 `npm view @zxyycom/vibe-check dist-tags versions --json` 均 exit 0：账号权限为 `read-write`，`latest=0.0.3`，版本列表不含 `0.0.4`。这次成功解除本次权限与版本核验缺口，不证明此前网络异常已修复。
- 交付 publish 命令前，再次确认 frozen clean S、tarball 与 receipt 摘要均未变化。交互命令使用冻结工作区的正式 tarball 绝对路径，显式 `--registry=https://registry.npmjs.org/ --tag=latest --access=public --ignore-scripts --logs-max=0`；不从源码重新打包，不运行发布生命周期脚本，也不在代理端采集认证会话。发布者自行完成所需 2FA，成功后继续 registry 与下载 bytes 核验。
- 发布者反馈“已发布”后，首次 `npm view @zxyycom/vibe-check@0.0.4 ... --json` 返回 `E404`，未进入 tarball 下载。等待 30 秒后再次只读核验：10:13:34 npm 原生 package index 查询成功，但仍为 `latest=0.0.3`、版本列表不含 `0.0.4`；10:13:37 直接访问 canonical version endpoint 返回 HTTP `404`，curl exit 0、未发生 transport error。
- 当时证据只说明这两轮查询尚未观察到目标发布，不能据此断言发布命令已失败或网络根因。随后请求发布者核对最后的成功行、dry-run 提示或非敏感错误码；未索取完整日志或认证会话，未重复 publish，也未将用户反馈单独当作 registry 分发证明。
- 发布者随后确认看到 `+ @zxyycom/vibe-check@0.0.4`，但已关闭终端、未留意其它提示。当前代理进程的有效 `dry-run=false`，这不能恢复或证明当时交互式 shell 的配置；10:15:45 带独立 freshness query 的 canonical package index 返回 HTTP 200，仍为 `latest=0.0.3` 且不含 `0.0.4`。
- 按用户要求尝试恢复终端结果：当前 Codex 会话没有附着的 terminal，Paseo terminal 列表为空；仅查询 npm 的非敏感 cache/logs-dir 配置，实际 `/home/dev/.cache/npm/_logs` 中没有本次时间段的 debug log。此前交付命令显式使用 `--logs-max=0`，不会保留 npm debug 日志；当前可访问渠道没有可恢复的发布输出。未读取认证配置、认证会话或其它任务历史，也未重复 publish。

### 发布后分发核验

用户随后要求再次检查 npm 状态；以下为 2026-10-20 的只读观察，时间均为 Asia/Shanghai：

- 10:23:33 向 canonical package index 发出带独立 freshness query 与 `Cache-Control: no-cache` 的请求，HTTP 200、curl exit 0：版本列表包含 `0.0.4`，`latest=0.0.4`，registry 记录发布时间为 `10:22:59.338`。
- 10:23:35 独立 version endpoint 返回 HTTP 200，身份为 `@zxyycom/vibe-check@0.0.4`；registry SRI 与本页正式 receipt 一致，SHA-1 为 `235c5fbcfb4ea7f818fc099842852cb94265644b`。
- 10:24:27 首次 curl tarball 下载发生 TLS unexpected EOF、exit 35，未绕过 TLS 或改变网络配置。10:24:57 改用 Node HTTPS 做一次有界只读核验，HTTP 200，取得 1500651 bytes。
- 下载地址为 `https://registry.npmjs.org/@zxyycom/vibe-check/-/vibe-check-0.0.4.tgz`。下载 bytes 与 frozen worktree 的 receipted tarball 逐字节一致；SHA-256 为 `a99f0139beefd2b6a71ff44e192b8486d57c8d985da32109a9d57afddf13477d`，SRI 为 `sha512-jwEIc4GX/8YMX6cJoluTj9FzbM7K3e6GMUoqL+tqByAVmhd2OhqlqkzHLwa3rSUvKqZKT0uuG6CSNT8Q51+Scw==`，SHA-1 也与 registry 一致。
- 本地 receipt SHA-256 仍为 `09c622dd59d5b71557d7ced987115e4f16ce3aa535b258ee556eba0bc3ee0bdb`；其 package identity 为 `0.0.4/latest`，source 仍绑定 S `4e3294a9a481e554340cecdbe63d222992720bae`。下载仅在内存中核验，不覆盖本地产物。
- 这些证据确认目标包已发布且分发 bytes 正确，不再将发布状态标记为未确认。此前不可见的原因与交互命令的完整过程仍未知，不据此宣称网络问题已修复；代理未执行或重试 publish。此轮查询时尚未执行 Git tag、提交或合入，后续结果见下节；清理始终未执行。

### Git 交接

2026-10-20 10:30:46（Asia/Shanghai）预检确认 `origin` 为 `github.com:zxyycom/vibe-check.git`，远端 main 为 `cc9c4d1dd63d48365c7c97c07e6ddca6618ffef1`，远端没有 `v0.0.4`。本地 main 干净、起点为 `357fb7c4`，与发布分支无分叉；本地也尚无该版本标签。四份 Change Markdown 均属于本轮发布记录，没有其它 staged 或工作树改动。

- 发布证据保存为提交 `4d20ce88b61fa3896e708551f7703b2fc261598f`（`plan：保存 0.0.4 发布成功与分发核验证据`），只含四份 Change Markdown。正常 post-commit hook 因发布分支不适用而跳过 auto-push，未绕过 hook。
- annotated tag `v0.0.4` 的 tag object 为 `6d65e1a42aae94a09407f7b333a765a74f8d07c7`，peeled commit 为 S `4e3294a9a481e554340cecdbe63d222992720bae`；标签不绑定后续发布记录提交。
- main 从 `357fb7c4` 以 `git merge --ff-only release-0-0-4` 合入到 `4d20ce88`。相对冻结 S 只有上述四份记录变化，没有新的 source 或 packaged-material 变更；合入后 validate、759 实体/188 Case/16 Topic 检查、当前 Change 检查与 diff 检查通过，工作树干净。未重跑正式 prepare、release verify 或完整 Gate，沿用同一冻结产物已有的 43/43 与独立结论。
- 显式非强制、`--no-follow-tags` 的 atomic push 仅更新 `origin` 的 `refs/heads/main` 和 `refs/tags/v0.0.4`，成功。10:33:48 远端读回 main 为 `4d20ce88b61fa3896e708551f7703b2fc261598f`，tag object 与 peeled S 均与本地一致；没有推送发布分支或其它标签。
- 10:34:25 再次逐字节核对固定归档槽位的 38 项原始文件与 frozen 工作区，全部一致；既有准备期 evidence 文件名与 bytes SHA-256 一致。receipt、tarball SHA-256/SRI、版本和 S 均未变化。

### 发布后归档与保留

- 10:36:08 将包含发布、分发验证、Git 标签与交接提交的本页快照保存为固定槽位下的 `evidence/eb06dec7c1d4787d56b5b6ef3befc222bfe42b6538242633a4bc3a6dbcaececf.md`，29985 bytes；文件名为原始 bytes 的 SHA-256，复制后读回逐字节相同。复制前凭据模式筛查无发现，没有复制认证配置或登录会话。
- 该快照在本页补记归档路径与完成态之前形成，不回写或覆盖；与 38 项原始文件、准备期快照一起构成可复核交接。后续收尾记录仍按内容摘要新增快照，不覆盖既有材料。
- 发布分支与 main 的交接只增加 Change 记录及协调状态；本轮 validate、Case、17/17 Change 集合、Decision 与 diff 检查均通过。源代码、随包材料及正式包 bytes 不变，不重新打包、发布或重跑完整 Gate。
- 已明确保留实现工作区、三个 detached 工作区、发布分支、旧正式包、local candidate、调查保留物及全部归档。Change 任务完成不等于 finalize 已授权；本轮不运行 finalize，不删除或清理任何上述材料。

## 冻结前审查与优化

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

## 冻结前候选与完整 Gate

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

### 冻结前独立复核

- `review_polished_validation_code` 全文审查三个 TypeScript 文件及完整发布 diff，按编码规范核对职责、类型、控制流、错误和副作用归属，结论通过；两个 Case 与薄 main 的 Manual CR 边界保持。单个 workflow 测试只截获其声明范围的 console/reporter，不能单独冒称完整进程输出证明；相邻 Gate 集成测试另有真实 stdout/stderr 观察。
- `review_polished_release_docs` 已核对 selection 的新增步骤顺序、六页 source/tar/installed 一致性及新旧 1537 文件清单：无增删，只有六篇 Markdown 和 manifest version bytes 变化；29 篇注册 Markdown 与 source 一致，runtime、declarations/JSDoc、示例和 schema 不变。原 candidate 从保留工作区取得，并核对为上述旧 SHA；独立语义结论通过，既有整包阅读结论适用于本轮 candidate；另核对新 Gate machine 的 43/43 与同包绑定、旧正式包和归档摘要及保留物入口。

以上结论原先只绑定 local candidate；新正式包的适用性见下节。未新增 GUI hover、跨平台认证或对未变化公开 JSDoc 的重复全文审计。

### 新正式包独立确认

非实施 reviewer `review_formal_004_4e3294a9` 对本页记录的新正式 tarball、receipt 与 Gate 进行只读复核，结论通过，无新增阻断；没有重跑 Gate、prepare 或 release verify，也未创建辅助文件。

- 以独立内存 tar 解析核对 header checksum、成员唯一性、1537 项清单及 receipt 的排序契约；tarball SHA-256、SHA-512 SRI、receipt SHA-256、版本和 S 均一致。
- 与已审 `e3c17b6dca27` local candidate 比较，唯一差异为 `package/package.json` 的 version；全部 1537 项 tar/staging/installed bytes 相同，无增删。29 篇注册 Markdown、全部 34 项注册材料与冻结 source 一致。
- 373 项声明、373 项 runtime `.mjs`、376 项 source、3 项 artifact examples 和 2 项 schema 与已审包不变；包根 227 个导出保持。JSDoc 修复完成提交 `cc9c4d1` 至 S 的 `src` diff 为空，33 处声明 Markdown 引用及其中 32 个 anchor 均可达。
- 实际阅读 README、0.0.4 changelog、包根声明并恢复上方整包阅读与修正链；依据清单、bytes、关联阅读路径和行为一致性，确认全部用户文档、示例及对外 JSDoc 的既有独立结论适用于新正式包，不冒称本次重复全文审读全部声明。
- Gate machine 中 43 项均 passed，prepared candidate 与 external consumer 绑定同一 `a99f0139…` tarball；candidate version/fingerprint 与 receipt 一致，`gate.log` 确认 `release-receipt`、`all` 和 exit 0。旁边 `2026-10-20T01-46-48.022Z-8064-d0c6fed8-e241-4b3b-a9dd-a9a41468152a` 目录为空，不作为第二次完整 Gate 或发布证据。

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

## 完成态与保留边界

1. 本地准备保持固定 S、正式 tarball/receipt、一次同包完整 Gate 与独立结论；本轮不再调整发布输入。网络根因排查不作为前置。
2. 发布写入授权、publisher authority 与临发布源码/产物核验已闭合；canonical registry 的 `0.0.4/latest` 身份和下载 bytes 也已核对成功，不重复发布或覆盖既有版本。
3. `v0.0.4` 已绑定 S，main 合入、main/tag 推送及远端读回已成功；发布后 evidence 快照已归档并核对，准备期快照不冒充发布后证据。收尾记录随授权提交与 main 同步保存，不移动版本标签。
4. 当前 Change 记录在实现工作区维护并按授权提交；冻结工作区保持 clean S，不在其中维护活动记录。所有工作区、旧产物、分支与 Change 保留，结项删除和清理不在本轮范围；后续如需执行，须另行确认精确目标及恢复边界。
