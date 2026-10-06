# Release 0.0.3 Evidence

本文件记录当前发布输入和分阶段证据。流程由 [Package release](../../docs/tooling/package-release.md)拥有，授权见 [design](design.md#当前授权)，进度见 [tasks](tasks.md)。

## 当前结论与输入

**`@zxyycom/vibe-check@0.0.3` 已发布且分发验收通过，`latest=0.0.3`；合入 `main` 及版本标签推送已完成。** 两次同包正式 Gate 均 43/43 通过；从 canonical registry 下载的 tarball 与已授权正式产物逐字节一致，隔离安装后的 1420 个包文件及随包示例运行均通过。原始产物、两次正式日志与非敏感 evidence 快照按固定位置归档；合入后完整 local Gate 43/43 通过。下文 local candidate 与中间认证/processing 结果均为分阶段证据，不代表当前阻塞。当前按新增授权保存最终记录，随后通过公开入口结项并清理短期工作物；持久归档保留。

| 输入 | 已确认事实 |
| --- | --- |
| 版本 | 用户选择 `0.0.3`；changelog 标题是版本内容索引，不证明 registry 已发布。 |
| 准备工作区 | `/workspace/vibe-check-release-0-0-3`，branch `release-0-0-3`；Plan 基线 `8d522ebf21ccca3a55a01d5a8df439d4c0116861`，不是 frozen `S`。 |
| 冻结输入 | `S=4a830ef3dfd1aadde7219455760a27394040e812`；独立 detached worktree `/workspace/vibe-check-release-0-0-3-frozen`。 |
| package / registry / access | release manifest：`@zxyycom/vibe-check` / `https://registry.npmjs.org/` / `public`。 |
| 规则与权限 | 精确授权的同一 tarball 已交互发布；用户随后依次授权本地标签/合入与远端推送/结项/清理。精确边界由 design 的当前授权集中说明。 |

## 前轮本地准备证据

本节保存形成时事实，覆盖前轮最终公开材料及其随后治理记录；本轮审查发现或材料改动需要新的验证。其它 checkout、旧 waiver Change 的 Gate 和 finalize preflight 不是本 Change 的验收或授权。

### 环境与只读观察

- 准备 worktree 的 `bun run env:setup` 和 `bun run env:check` 均退出 0。复用 lockfile 中 151 项依赖，无升级；CodeGraph 索引 1078 文件后 up-to-date。固定环境：Node `24.18.0`、Bun `1.3.14`、SCC `4.0.0`、jscpd `5.1.1`。
- 首次完整 Gate 在 candidate preparation 前因 ignored 本机预算缺失退出 1，尚未执行 Check。按 Project Gate owner 原样复制同机原工作区预算，两份 SHA-256 均为 `4e4e2dca26dfd8b3c869d2a1522dd1ea0a13ea9e04c2997612b44749209bfd80`；required/all `30000/90000 ms`、mean `2000 ms`、P95 `5000 ms` 阈值保持不变。
- ambient Bun 为 `1.4.2`，mise pin 为 `1.3.14`。ambient `package:status` 因 Bun 参与 fingerprint 报 `receipt-input-mismatch`；未据此重建或手改 receipt。`mise exec -- bun run package:status` 确认前轮最终 candidate `current`、installed entry 可用。复现和本轮验证采用 mise 工具链。
- canonical registry 只读观察，均为 2026-10-06 北京时间（UTC+08:00）：14:20:31.793，`/@zxyycom%2Fvibe-check/latest` 为 HTTP 200、version `0.0.2`；14:20:32.152，`/0.0.3` 为 HTTP 404；14:20:59.856，完整 metadata 的 versions 仅 `0.0.1`、`0.0.2`，`latest=0.0.2`。只证明观察时结果，不预留版本或证明 publisher 权限；临发布须重核。

### 机械与语义验证

- Change `plan/check/check-all`、Decision check 和 diff 检查通过；当时 14 个 Change valid，Decision 353 项（120 active、233 archived）。Plan 基线为上述 HEAD，Git 距离为 0；没有据此刷新基线或删除 Change。
- `bun run docs:api`、`bun run validate` 和 `bun run test-evidence -- check --root .` 退出 0；Case 检查为 671 个 current test entities、161 个 Cases、15 个 topics。前轮未新增或改写测试/Case。
- 非实施代理从 `v0.0.2..HEAD` 产品 diff、公开 owner 与声明反查净变化、迁移和代表性阅读路径。旧 aggregation 字段误写 `statuses` 已更正为 tag 实际的 `checks` / `mode` / `unavailable` / `notApplicable` / `empty`，复核闭合；最终中性版本标题和依赖指南数量更正定向复核通过。
- 安装后 documentation acceptance 执行随包示例，types/runtime 验收与迁移反查共同覆盖代表性消费路径。没有实际下游项目输入，未证明所有旧项目均能无改动升级。

### 完整 local Gate：中间结果与前轮最终结果

两次已执行的完整 Gate 均退出 0，43/43 passed，failed/not-applicable/unavailable 均为 0，包含 package artifact 与隔离安装后的 types/documentation/runtime。首次预算缺失失败已在环境记录中说明，不计为通过的 Gate。

| 时点与覆盖 | Exact local candidate | Summary / 非阻断预算 warning | 日志目录 |
| --- | --- | --- | --- |
| 中间：补齐预算后；尚未覆盖后来版本标题和指南数量更正 | `0.0.0-local.eaebd90530f8` | 47 秒；mean 2606.3 ms、P95 9150.9 ms 超预算 | `.log/project-gate/2026-10-06T06-24-10.857Z-1741649-005c7026-4712-4cbe-9e7a-c0c238519cf9/` |
| 前轮最终：覆盖最终产品与随包材料；另通过 `bun run validate`，随后只补写治理记录并补跑相应检查 | `0.0.0-local.caa82d4f3bde` | 29.6 秒；mean 1690.1 ms 低于预算、P95 5091.6 ms 略高于预算 | `.log/project-gate/2026-10-06T06-27-21.456Z-1748796-00fba42f-e279-4f8d-a1ca-ec03c87fd5a7/` |

保留实际 warning，未提高预算或删减 Check，也不从两次单点运行推断性能改善。前轮未暂存/提交；原 main checkout 未修改。

## 文档审查、验证与提交

本节保存正式冻结前的阶段结果；当时尚未授权正式准备，当前状态以下节为准。

- 文档按 `ai-ready-docs` 重排为升级动作、净变化和必要引用；`0.0.3` 内容精简约 20%，保留真实 `0.0.2` 迁移、默认与拒绝语义、安全和资源责任。版本内容不承担本轮运行状态，当前权限集中在 design，证据按形成时点分层。`0.0.2` 已核对的历史内容在本轮保持原样。
- 实施与非实施代理均完整读取编码规范。实际差异仅为三份既有 Markdown 与本 Change 的五个 artifacts；无 `src/**`、`scripts/**`、测试实现或受管示例改动。适用的中文对外说明、owner、局部语义和风险验证要求通过审查，没有必须整改项或规范例外；未将该结论外推为全产品历史代码审计。
- 独立 AI 阅读验证通过：仅持 changelog 及其可达随包指南可恢复升级操作、聚合拒绝、Git 证据退化、命令敏感材料责任和 handoff 授权/释放；仅持本 Change 可恢复本轮权限、前轮证据时点和正式发布剩余门禁。随后以源码与历史 tag 定向核对语义。采纳审查建议，将 audit 分支表述改为当前 API 结构，去掉内部演进比较词。
- 使用 mise 固定工具链的 `docs:api`、`validate`、`test-evidence -- check --root .`、Change `check-all` 和 Decision `check` 均通过：671 test entities / 161 Cases / 15 topics、14/14 Changes、353 Decisions。`git diff --check` 通过；未增加测试或改变验证规则。
- 最终公开材料的 `bun run check -- --all` 退出 0：exact candidate `0.0.0-local.b76cfa4b04ac`，43/43 passed，failed/not-applicable/unavailable 均为 0，包含 artifact 及隔离安装后的 types/documentation/runtime。日志：`.log/project-gate/2026-10-06T06-41-53.635Z-1766506-f461db77-ebf2-4aa3-a110-322f65fde1bf/`。执行 summary 47 秒；mean 2735.1 ms、P95 6586.4 ms 超出 2000/5000 ms 告警预算，保持非阻断 warning，未放宽阈值。
- 当前证据支持进入正式发布准备，不支持直接 publish：尚需授权后选定 clean `S`、冻结工作区中正式 prepare/verify、临发布 registry/authority 核验与精确发布授权。本轮验证覆盖当前 Linux 环境和仓库代表性消费者；没有实际下游项目或 Windows 真机回归输入。
- 公开材料提交 `b89d7e4e72718c5871678b708abb0d8a0666d303`（`docs：收敛 0.0.3 变更日志与升级说明`）仅包含 changelog 与依赖指南；规划提交 `87c91c2146014024126a67286ba75ab4128bb522`（`plan：建立 0.0.3 发布准备计划与验收记录`）保存本 Change 与协调入口。第二次提交后工作树干净；本条及任务勾选是随后补写的交接记录。提交钩子均因当前分支为 `release-0-0-3` 跳过推送，未发起远端请求。
- 提交后按 mise 工具链核对 candidate 为 `current`，已验产品与随包材料保持不变；原 main checkout 未修改。当时的准备提交没有被自动选为正式 `S`，该阶段未执行正式冻结、prepare/verify、publish、tag、push、merge 或清理。

## 正式冻结与同包验收

### 冻结与环境

- 用户确认正式准备三步范围后，从干净的准备树选择 `S=4a830ef3dfd1aadde7219455760a27394040e812`，通过 `git worktree add --detach` 创建 `/workspace/vibe-check-release-0-0-3-frozen`。它包含此前已验收产品和随包材料，本轮只在准备工作区更新治理记录；原 main 不变。
- 冻结前的第三次本地提交为 `4a830ef3`。该提交后完整 local Gate 43/43 通过，日志位于准备工作区 `.log/project-gate/2026-10-06T06-45-40.591Z-1786599-55721513-5125-4f15-aec2-8249f5fff943/`，本轮正式验收不复用该结论。
- 标准 `bun run env:setup` 在冻结 worktree 退出 0：复用锁定的 151 个依赖，CodeGraph 索引 1078 文件，并按自举约定构建 local candidate。随后 `mise exec -- bun run env:check` 退出 0。prepare/verify 均使用 mise 固定环境：Node `24.18.0`、Bun `1.3.14`；local candidate 不是正式发布输入。
- 同机 ignored 性能预算从准备工作区原样复制到冻结工作区，源/目标 SHA-256 均为 `4e4e2dca26dfd8b3c869d2a1522dd1ea0a13ea9e04c2997612b44749209bfd80`；required/all `30000/90000 ms`、mean/P95 `2000/5000 ms` 均未调整。
- 首次 setup 调用实际位于准备工作区，仅复用其已安装环境和 current candidate，退出 0；随后才在冻结工作区执行上述完整 setup。没有把前者当作冻结自举证据。

### 正式产物身份

`mise exec -- bun run package:release:prepare -- --version 0.0.3 --tag latest` 退出 0；以下路径相对冻结工作区：

| 字段 | 本次结果 |
| --- | --- |
| package / tag | `@zxyycom/vibe-check@0.0.3` / `latest`。 |
| source commit | `4a830ef3dfd1aadde7219455760a27394040e812`。 |
| input fingerprint | `b76cfa4b04ac88379eaa6be7298a1269c3b97062effd8dc317f45c78932e1b6b`。 |
| 展开目录 | `build/release-package/`。 |
| tarball | `build/artifacts/zxyycom-vibe-check-0.0.3.tgz`；1,334,388 bytes，1420 个包内文件。 |
| tarball SHA-256 | `32eed3b269da054383ec24f23dc1d237ceb36751064ed3ce69b975b8f930a1e6`。 |
| tarball SRI | `sha512-ftoxzMCFeOBCZe/3e06GxSP517WNdjDwfR3p969AThDf1ADnZkxSdu23CvtZ+KuroXxvulzsM0rDbyTutVjPFQ==`。 |
| receipt | `build/releases/zxyycom-vibe-check-0.0.3.release.json`，schema version 3。 |
| receipt SHA-256 | `cf2b146bcc3176d9293452de0cc98ec0e1aff2ba7e090a544693867ae792e961`。 |

从 tarball 读取的 manifest 再次确认 package/version、`public` access 与 canonical registry，SHA-256 和 SHA-512 SRI 与 receipt 一致。没有改名 local tarball 或改写 receipt。

### Same-tarball 完整 Gate

- 命令：`mise exec -- bun run package:release:verify -- --receipt build/releases/zxyycom-vibe-check-0.0.3.release.json`，退出 0。
- 正式日志目录：冻结工作区 `.log/project-gate/2026-10-06T07-20-29.268Z-1864561-7e83060a-44c3-4ce7-93a8-dedf295e754b/`。`gate.log` 确认 `candidate=0.0.3`、`source=release-receipt`、`selection=all`、`RESULT:PASSED` 与 `EXIT:0`。
- 43/43 passed，failed/not-applicable/unavailable 均为 0；覆盖正式 artifact 与隔离安装后的 types、documentation、runtime。执行 summary 41.9 秒；含候选准备的总反馈时间 `44781.3 ms`，低于 `90000 ms` 告警预算。
- Check mean `2314.0 ms`、P95 `7219.4 ms` 超过 `2000/5000 ms` 告警预算。按 Gate owner 属于非阻断 warning，保留在原始日志；未调整阈值、减少 Check 或将其表述为无告警通过。
- 验收后冻结 HEAD 仍为 `S`，tracked/index/untracked 状态为空；tarball 和 receipt 摘要保持上述身份。本轮没有 source 或随包材料修改，不需要重选 `S`。

### 归档与剩余边界

- 公共 Git 目录为 `/workspace/vibe-check/.git`。本次固定槽位为 `/workspace/vibe-check/.git/vibe-check/releases/0.0.3/cf2b146bcc3176d9293452de0cc98ec0e1aff2ba7e090a544693867ae792e961/`。
- 2026-10-06T07:22:15.519Z，tarball、receipt 与上述完整正式日志目录共 38 个文件已按原相对路径复制并逐文件核对 SHA-256；同时复核 tarball SRI、包版本和 receipt 摘要槽位，全部一致。槽位冲突仅允许相同 bytes 复用，不覆盖异内容。
- 归档前检查 36 个日志文件，未发现 npm/GitHub token、私钥、auth 配置、Bearer 或 OTP 值模式；未执行登录、认证或发布命令，也未复制 `.npmrc`、认证配置或会话 transcript。该检查不代替通用秘密审计。非敏感 evidence 快照使用同槽位 `evidence/<snapshot-sha256>.md`，保存本文件原始 bytes。
- 冻结 worktree 和归档均保留，不执行清理；归档是本地持久证据，不表示跨机器备份。准备工作区仅追加本轮治理记录，本轮不新增提交；这些记录不进入已冻结产物。
- 准备工作区的治理记录已通过 `validate`、`test-evidence -- check --root .`、Change `check-all`、Decision `check` 和 `git diff --check`：671 test entities / 161 Cases / 15 topics、14/14 Changes、353 Decisions。Plan 基线保持不变，累计距离为 2 个 Change 外提交、205 行；本次仅新增当前发布进度，不改变产品或随包材料范围。
- 正式验收归档阶段尚未核验本次 publisher/authority 或刷新 registry；后续核查见下节。未执行 publish、registry 分发安装验收、tag、push、merge 或 Change finalize，仍须补齐发布门禁和精确授权；registry 观察不预留 `0.0.3`。
- 本次验收覆盖当前 Linux 环境和仓库代表性消费者；未取得实际下游项目升级或 Windows 真机证据。

## 临发布核查与认证交接

用户要求继续推进后，只读检查冻结输入、正式产物与 canonical registry；没有把本轮指示作为已完成 publisher 核验或远端发布的事实。

| 检查时间（UTC） | 操作 | 结果与边界 |
| --- | --- | --- |
| 2026-10-06T07:28:54.211Z | GET `https://registry.npmjs.org/@zxyycom%2Fvibe-check/latest` | HTTP 200，version `0.0.2`。 |
| 2026-10-06T07:28:54.902Z | GET `https://registry.npmjs.org/@zxyycom%2Fvibe-check/0.0.3` | HTTP 404；仅证明观察时未返回该版本。 |
| 2026-10-06T07:28:57.474Z | GET `https://registry.npmjs.org/@zxyycom%2Fvibe-check` | HTTP 200，versions 为 `0.0.1`、`0.0.2`，`latest=0.0.2`；maintainer name 为 `zxyycom`，不据此推断当前终端身份。 |
| 2026-10-06T07:28:59.865Z | `npm whoami --registry=https://registry.npmjs.org/ --json --loglevel=error --logs-max=0` | npm `11.16.0` / Node `24.18.0`，退出 1、`E401`；没有取得 username，未继续查询账号包权限。 |

- 初次核查时冻结 worktree 仍为 clean detached `S`，receipt SHA-256、tarball SHA-256 和 SRI 均与上节相同；没有 rebuild 或修改冻结输入。该时点尚未重复运行完整 Gate，先交接发布者恢复登录，后续重新验收结果见下节。
- `E401` 只证明此次认证未通过，不能区分账号未登录、会话失效或其它认证问题，也不能据此断言某个账号没有发布权限。没有读取或输出 `.npmrc`、token、OTP 或认证配置；本次只保留非敏感错误码。
- 已请发布者在可访问冻结工作区的本地交互终端执行 `mise exec -- npm login --registry=https://registry.npmjs.org/ --logs-max=0`，自行完成登录并只回复完成状态。登录链接、凭据及验证码不进入聊天或 evidence；若该终端无法访问冻结目录，先确认实际发布环境，不默认重建或搬运产物。
- 上述认证失败时点 Task `0.7` 保持未完成，没有执行 publish 或后续 tag/合入。后续解除门禁不改写这次失败观察。

### 登录恢复与最终发布交接

用户回复登录已完成后，重新执行只读核验：

| 检查时间（UTC） | 操作 | 结果 |
| --- | --- | --- |
| 2026-10-06T07:31:54.636Z | canonical registry `npm whoami` | 退出 0，username `zxyycom`。 |
| 2026-10-06T07:31:57.083Z | `npm access list packages zxyycom @zxyycom/vibe-check` | 退出 0，目标 package 权限 `read-write`；只记录目标包，不保存其它 package 权限。 |
| 2026-10-06T07:31:58.176Z | `npm access get status @zxyycom/vibe-check` | 退出 0，目标包为 `public`。 |
| 2026-10-06T07:33:28.526Z | canonical registry `/latest` | HTTP 200，version `0.0.2`。 |
| 2026-10-06T07:33:29.196Z | canonical registry `/0.0.3` | HTTP 404。 |

- 登录恢复后再次运行同一 `package:release:verify` 命令，仍绑定上述 receipt，退出 0、43/43 passed，failed/not-applicable/unavailable 均为 0。日志为冻结工作区 `.log/project-gate/2026-10-06T07-32-35.796Z-1876268-61098789-3c0e-484c-ac86-e93672f23868/`，明确 `candidate=0.0.3`、`source=release-receipt`、`selection=all`、`RESULT:PASSED`、`EXIT:0`。
- 此次执行 summary 29.2 秒；总反馈 `42703.7 ms`、mean `1710.0 ms`、P95 `4316.4 ms`，均在原告警预算内。首次正式验收的 warning 保留，不从两次运行推断已优化性能。
- 新增正式日志目录的 36 个文件已按原相对路径归档到同一 receipt 摘要槽位，逐文件 SHA-256 一致；归档前秘密模式检查未发现凭据材料。原 tarball、receipt 和历史证据快照不覆盖。
- 发布交接前再次核对 clean detached `S`、tarball SHA-256 与 receipt SHA-256 均不变；未从源码重新打包，展开 manifest 无 lifecycle scripts。
- 用户明确确认发布对象：`@zxyycom/vibe-check@0.0.3`、tarball SHA-256 `32eed3b269da054383ec24f23dc1d237ceb36751064ed3ce69b975b8f930a1e6`、canonical registry、`public` / `latest`，由本人执行本地交互发布及 2FA。Task `0.7` 据这些实际事实勾选，不代表发布或分发已经成功。
- 已交接指向精确 `.tgz` 的 `npm publish` 命令，显式指定 registry/access/tag，并设置 `--ignore-scripts --logs-max=0`。没有执行源码目录 publish、收集认证材料或提前创建 Git tag；发布者随后提供接受回执，分发与安装验证见下节。

## 发布接受回执与分发观察

- 发布者在本地交互执行已交接命令后，提供 `+ @zxyycom/vibe-check@0.0.3` 与 npm processing notice。该信息是用户提供的发布接受证据，不是代理直接读取的命令 exit code，也不证明版本已可安装。
- 首轮有界观察为 2026-10-06T07:37:01.777Z 至 07:39:11.371Z，共 7 次；canonical registry 的 `/0.0.3` 均 HTTP 404，`/latest` 均 HTTP 200、version `0.0.2`。观察命令因等待窗口内尚未可用退出 1；不是 package Gate 失败，没有重复 publish、修改 dist-tag 或重新打包。
- [npm 官方发布时扫描说明](https://github.blog/changelog/2026-07-28-npm-publish-time-malware-scanning-and-dual-use-metadata/)说明新版本会先扫描，再变为可安装；通常约 5 分钟，可能 15 分钟或更久，且不是时效保证。本次接受 notice 与暂不可用现象符合等待窗口，但仅凭 404 不能证明实际扫描结论或内部队列状态。
- 延长为每分钟一次的有界观察后，2026-10-06T07:39:47.922Z 仍为 `/0.0.3` HTTP 404、`latest=0.0.2`；2026-10-06T07:40:54.045Z 两者均 HTTP 200、version `0.0.3`，无需再次 publish 或变更 dist-tag。

### Registry 分发身份

2026-10-06T07:40:58.370Z，从 canonical metadata 的受限 HTTPS npm tarball URL 读取 bytes，确认：

| 字段 | 实际结果 |
| --- | --- |
| package / version / latest | `@zxyycom/vibe-check` / `0.0.3` / `0.0.3`。 |
| metadata publisher | `zxyycom`，与临发布身份一致。 |
| tarball URL | `https://registry.npmjs.org/@zxyycom/vibe-check/-/vibe-check-0.0.3.tgz`。 |
| bytes / SHA-256 | `1334388` / `32eed3b269da054383ec24f23dc1d237ceb36751064ed3ce69b975b8f930a1e6`。 |
| integrity | `sha512-ftoxzMCFeOBCZe/3e06GxSP517WNdjDwfR3p969AThDf1ADnZkxSdu23CvtZ+KuroXxvulzsM0rDbyTutVjPFQ==`，版本 metadata 与 latest metadata 均匹配 receipt。 |
| legacy shasum | `40d1f5b7f45bcab62075b12045663da6c7871e01`，与下载 bytes 的 SHA-1 一致；不替代 SHA-256/SRI。 |

下载 bytes 与本地正式 tarball 完全相同，不只是版本名或 manifest 相同；下载只在内存中核对，没有额外复制另一份分发 tarball。

### Registry 隔离安装与运行

- 创建仓库外临时 consumer `/tmp/vibe-check-release-0.0.3-registry-consumer-14p5ze`，使用独立 pnpm store、private manifest 和 canonical registry，通过 `pnpm add --save-exact --ignore-scripts @zxyycom/vibe-check@0.0.3` 按 registry 包名安装，退出 0；未使用本地 `.tgz` 作为安装参数。
- Node `24.18.0` 的 ESM `import.meta.resolve` 解析到该 consumer 的 `.pnpm/@zxyycom+vibe-check@0.0.3/node_modules/@zxyycom/vibe-check/index.mjs`，确认不从仓库祖先 node_modules 回退。实际 manifest 为 `@zxyycom/vibe-check@0.0.3`。
- 按 receipt inventory 核对全部 1420 个安装后 package 文件，与冻结 `build/release-package/` 对应文件 bytes 一致。
- 从已安装 README 原样提取“自定义 Check 快速开始”现有示例到 consumer 的 `quality.ts`，Node 执行退出 0；示例自身断言 `Run` completed、`bundle-size` passed、`actualBytes=82_000`。示例源码 SHA-256 为 `a41abd917f6c4a253a7c8ab0e978ddf3f73380c377cdd6a5540ac1c0401999c1`，没有新增仓库测试或 Case。
- 首次临时解析探针误用 CommonJS `require.resolve`，得到 `ERR_PACKAGE_PATH_NOT_EXPORTED`，与已声明的 ESM-only 公开面不符；改为 ESM resolution 后完整验收通过，未修改、重建或重发 package。该探针失败不冒充产品缺陷或成功运行。
- 最终结果时间为 2026-10-06T07:44:18.391Z；临时 consumer 的 `result.json` 保存非敏感摘要，`artifact-note.md` 记录用途与保留边界。本轮保留以供复核，系统临时目录不是正式归档；持久发布证据由本文件摘要快照承接，清理另行授权。
- Task `1.5` 与 `2.6` 按发布接受、registry 同包身份及真实安装后运行证据勾选。该阶段未新增 Git 提交，未创建 `v0.0.3` tag，未 push、merge 或清理；后续 Git 交接的独立授权与结果见下节。

## 本地 Git 交接

本节记录先前仅本地交接阶段；后续新增授权与远端结果见下节。

- 用户先授权合回 `main`，随后明确确认创建本地 `v0.0.3` 标签再合并；本轮不推送远端，不清理 worktree/分支或执行 Change finalize。
- 合入前 main 为 clean `8d522ebf21ccca3a55a01d5a8df439d4c0116861`，准备分支为 `release-0-0-3`、HEAD `4a830ef3dfd1aadde7219455760a27394040e812`，仅有本 Change 和协调入口五份治理记录未提交，index 为空。main 是准备分支祖先，允许 `--ff-only`，无需改写历史或处理冲突。
- 按既有版本的 annotated tag 方式创建本地 `v0.0.3`；解引用精确指向 `S=4a830ef3dfd1aadde7219455760a27394040e812`。标签说明包含正式 tarball/receipt 摘要，没有指向后续准备提交或 main 的移动位置；未推送标签。
- 冻结 worktree 仍为 clean detached `S`，本轮只补写治理记录，产品与随包材料不变。后续提交继续在准备分支完成，main 仅快进接收；未改变 hook 配置或绕过 hook。
- 合入前准备工作区的 `validate`、Case、Change `check-all` 与 Decision `check` 均通过；完整 `bun run check -- --all` 退出 0，local candidate `0.0.0-local.b76cfa4b04ac`，43/43 passed、failed/not-applicable/unavailable 均为 0。日志为准备工作区 `.log/project-gate/2026-10-06T07-53-15.770Z-1887311-efabbb4b-6e71-4639-846f-19151872f8dc/`；summary 29.6 秒，总反馈 `30528.0 ms`、mean `1813.1 ms`，P95 `5295.7 ms` 高于 `5000 ms`，保留非阻断 warning。
- 准备分支提交 `3581a62edd6dd585dcba5ce5b79fc5e82affe989`（`plan：记录 0.0.3 发布与分发验收`）保存五份治理记录；正常 post-commit hook 因非 `main` 明确跳过推送。再次核对 main 干净且未漂移后，执行 `git merge --ff-only release-0-0-3`，main 从 `8d522ebf` 快进到该提交，无冲突、无历史改写。
- 在实际 main checkout 运行 `bun run check -- --all`，退出 0；同一 local candidate、43/43 passed，failed/not-applicable/unavailable 均为 0，包含 artifact 及安装后的 types/documentation/runtime。日志为 `/workspace/vibe-check/.log/project-gate/2026-10-06T07-57-08.450Z-1891160-4c02fda7-d677-4c33-8388-ea0ef4d55515/`。summary 32.3 秒，总反馈 `37507.2 ms`、mean `1968.5 ms`，P95 `5271.2 ms` 略高于 `5000 ms`，保留非阻断 warning；此 local Gate 不冒充新的正式 receipt 验收。
- 2026-10-06T07:57:22.156Z 复核固定归档槽位：74 个原始文件（tarball、receipt、两轮正式日志）与 frozen 对应文件逐字节相同，三个既有 evidence 快照各自匹配文件名 SHA-256。交接记录沿用同槽位 `evidence/<sha256>.md` 另存新快照，旧快照不覆盖；不归档认证材料。
- 复核 proposal 成功标准：净变化与迁移由 changelog 和公开 owner 承接，代表性阅读/消费证据、正式同包验收、精确授权、分发身份和 Git 交接均有上述记录。`S..3581a62e` 仅五份治理记录变化，不含产品或随包输入；协调入口仅同步本 Change 的交接边界，不修改长期发布规则或其它 Change。
- 剩余保存动作只把本节合入验证、任务闭合和协调摘要提交后快进同步到 main，不重打包、不移动版本 tag。Plan 基线保持 `8d522ebf`，后续 Change 外距离增量来自协调入口；已逐项复核，不阻断当前 Plan。未推送、未执行 Change finalize，也未清理准备/冻结 worktree、分支、临时 consumer 或归档；这些操作仍需独立授权。

## 远端同步与结项交接

- 本地收尾提交 `41cd200def60244b86421df5bf43c3a82664741e`（`plan：完成 0.0.3 本地 Git 交接`）已快进合回 main；三个 worktree 均干净。最终 main 完整 Gate 43/43 通过，日志为 `/workspace/vibe-check/.log/project-gate/2026-10-06T08-00-05.205Z-1898480-617d02f0-3b3e-4ecb-acdb-c5f753d6b9c1/`；summary 26.4 秒，总反馈 `27259.7 ms`、mean `1757.4 ms`、P95 `4494.0 ms`，均在原告警预算内。
- 用户对前轮未推送、未清理、未删除 Change 的边界明确回复“都可以去推进了”；此次新增授权包含 origin/main、原 annotated tag、Change finalize 及本次短期工作物清理，不包含持久归档删除。
- 推送前 `git ls-remote` 确认 origin/main 为 `0569f40dcefd2a5ac284932777d1348fb0308075`，远端不存在 `v0.0.3`；该 main 是本地 HEAD 祖先。执行显式 main/tag refspec 的 `git push --atomic --no-force --no-follow-tags` 退出 0，没有推送其它分支或标签。
- 2026-10-06 16:04（北京时间）再次核对远端：main 为 `41cd200def60244b86421df5bf43c3a82664741e`，`v0.0.3` tag object 为 `5cc5b217475303a1243f51e949b379942bd1646d`，解引用仍为 `S=4a830ef3dfd1aadde7219455760a27394040e812`。后续结项提交继续非强制同步 main，不移动已发布 tag。
- 本轮清理目标仅为 `/workspace/vibe-check-release-0-0-3`、`/workspace/vibe-check-release-0-0-3-frozen`、本地 `release-0-0-3` 分支及 `/tmp/vibe-check-release-0.0.3-registry-consumer-14p5ze`；核对无未提交或外来文件，ignored 内容为环境依赖、构建产物、缓存、索引和日志。正式产物与两轮正式日志已在公共 Git 目录归档，临时 consumer 的验收结果由本文件持久摘要承接。
- 结项前先保存本次证据快照并核对原始 bytes，再由 `finalize --preflight` 给出当前 HEAD recovery revision；实际 `finalize` 成功后移除协调入口，验证、提交并快进 main。只有远端确认最终 main 且持久归档核对通过后才释放 worktree 和本地分支；当前 main、其它 Change、认证配置与共享工具状态不在清理范围。
