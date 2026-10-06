# Release 0.0.3 Evidence

本文件记录当前发布输入和分阶段证据。流程由 [Package release](../../docs/tooling/package-release.md)拥有，授权见 [design](design.md#当前授权)，进度见 [tasks](tasks.md)。

## 当前结论与输入

本轮文档优化、完整编码规范审查、独立 AI 阅读验证、最终材料的完整 local Gate 与本地语义提交已完成。当前证据支持进入正式发布准备，正式发布门禁仍待完成。下文的 `0.0.0-local.caa82d4f3bde` 是**前轮最终**准备树的记录，当前结果见本轮章节。

| 输入 | 已确认事实 |
| --- | --- |
| 版本 | 用户选择 `0.0.3`；changelog 标题是版本内容索引，不证明 registry 已发布。 |
| 准备工作区 | `/workspace/vibe-check-release-0-0-3`，branch `release-0-0-3`；Plan 基线 `8d522ebf21ccca3a55a01d5a8df439d4c0116861`，不是 frozen `S`。 |
| package / registry / access | release manifest：`@zxyycom/vibe-check` / `https://registry.npmjs.org/` / `public`。 |
| 规则与权限 | 固定流程沿用发布 owner；本轮本地审查、验证和 Git 保存权限由 design 的当前授权集中说明。 |

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

## 本轮审查、验证与提交

- 文档按 `ai-ready-docs` 重排为升级动作、净变化和必要引用；`0.0.3` 内容精简约 20%，保留真实 `0.0.2` 迁移、默认与拒绝语义、安全和资源责任。版本内容不承担本轮运行状态，当前权限集中在 design，证据按形成时点分层。`0.0.2` 已核对的历史内容在本轮保持原样。
- 实施与非实施代理均完整读取编码规范。实际差异仅为三份既有 Markdown 与本 Change 的五个 artifacts；无 `src/**`、`scripts/**`、测试实现或受管示例改动。适用的中文对外说明、owner、局部语义和风险验证要求通过审查，没有必须整改项或规范例外；未将该结论外推为全产品历史代码审计。
- 独立 AI 阅读验证通过：仅持 changelog 及其可达随包指南可恢复升级操作、聚合拒绝、Git 证据退化、命令敏感材料责任和 handoff 授权/释放；仅持本 Change 可恢复本轮权限、前轮证据时点和正式发布剩余门禁。随后以源码与历史 tag 定向核对语义。采纳审查建议，将 audit 分支表述改为当前 API 结构，去掉内部演进比较词。
- 使用 mise 固定工具链的 `docs:api`、`validate`、`test-evidence -- check --root .`、Change `check-all` 和 Decision `check` 均通过：671 test entities / 161 Cases / 15 topics、14/14 Changes、353 Decisions。`git diff --check` 通过；未增加测试或改变验证规则。
- 最终公开材料的 `bun run check -- --all` 退出 0：exact candidate `0.0.0-local.b76cfa4b04ac`，43/43 passed，failed/not-applicable/unavailable 均为 0，包含 artifact 及隔离安装后的 types/documentation/runtime。日志：`.log/project-gate/2026-10-06T06-41-53.635Z-1766506-f461db77-ebf2-4aa3-a110-322f65fde1bf/`。执行 summary 47 秒；mean 2735.1 ms、P95 6586.4 ms 超出 2000/5000 ms 告警预算，保持非阻断 warning，未放宽阈值。
- 当前证据支持进入正式发布准备，不支持直接 publish：尚需授权后选定 clean `S`、冻结工作区中正式 prepare/verify、临发布 registry/authority 核验与精确发布授权。本轮验证覆盖当前 Linux 环境和仓库代表性消费者；没有实际下游项目或 Windows 真机回归输入。
- 公开材料提交 `b89d7e4e72718c5871678b708abb0d8a0666d303`（`docs：收敛 0.0.3 变更日志与升级说明`）仅包含 changelog 与依赖指南；规划提交 `87c91c2146014024126a67286ba75ab4128bb522`（`plan：建立 0.0.3 发布准备计划与验收记录`）保存本 Change 与协调入口。第二次提交后工作树干净；本条及任务勾选是随后补写的交接记录。提交钩子均因当前分支为 `release-0-0-3` 跳过推送，未发起远端请求。
- 提交后按 mise 工具链核对 candidate 为 `current`，已验产品与随包材料保持不变；原 main checkout 未修改。当前准备提交没有被自动选为正式 `S`，未执行正式冻结、prepare/verify、publish、tag、push、merge 或清理。

## 后续正式证据

尚无 frozen `S`、正式 tarball/receipt、正式 same-tarball Gate、publisher/authority 核验、publish/分发成功、Git tag/合入或正式归档事实。后续授权阶段按发布 owner 记录真实输入、产物摘要与结果；敏感材料和冻结 worktree 释放遵循其归档边界。
