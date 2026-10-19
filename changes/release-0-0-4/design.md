# Design

把可变的发布记录与不可变的正式源码分开，以 receipt、同包验收和独立阅读结论交接发布。

## Context

- 起点 main 为 `357fb7c4061c3f576d0b70c8594e458c2941ce39`，工作区干净，相对本地 origin/main 领先一笔 Change 结项提交。
- 2026-10-19 用户同意按已说明的发布准备方案推进；初次准备授权包含创建发布分支、双 worktree、必要的本地提交、构建、验收与证据保存。
- npm registry 只读观察为 latest 0.0.3，0.0.4 不存在。按现行 `0.0.<patch>` 契约选择 0.0.4，tag 为 latest；观察不是版本预留或发布权限证明。
- 候选 `0.0.0-local.ce99cf444ac9` 已通过完整 Gate 和 JSDoc 修复复核；此前全部 29 篇用户页审查与修复完成。具体适用性在本次最终包上独立确认。
- 固定流程与理由沿用 Decisions `260909-standardize-package-release-procedure`、`260908-isolate-package-release-source-from-change-work`、`260908-use-unprefixed-project-branch-names` 和 `261019-require-consumer-oriented-package-documentation-review`，不修改长期方向。
- 初次正式验收完成后，用户要求继续按 ai-ready-docs 复查重心、负向描述、迁移残留、篇幅与 Markdown 结构；当前先交付文档改动和新 local candidate 的复核，不自动提交、重新冻结或发布。
- 文档随后按授权提交为 `b8cf54f48`；[超时调查](../../docs/investigations/investigate-validation-cli-timeout.md)仍只确认五秒实体预算与并发变慢。用户进一步授权尝试修改优化，最终定稿方案须先说明；本阶段不提交、重新冻结或发布。
- 用户随后明确拒绝 child 10 秒 / entity 15 秒建议：当前 5 秒是红线，必须先证明测试尤其是真实进程测试的必要性，再讨论保留或优化。该加时建议撤回，未实施。
- 必要性审查交付后，用户授权尝试修改与优化测试证明分工，最终定稿方案仍须先说明；本轮可试改并验证，不自动采用、提交、重新冻结或发布。
- 试改与独立审查交付后，用户确认“可以按照你的这个方向调整”：采用测试证明重分工，严格 JSON 优化不捆绑。当前只收敛工作树和验证，不扩张为提交、重新冻结或发布授权。
- 用户随后允许继续推进并在需要决策时报告；当前延续安装可靠性调查，不自动授权提交、冻结、发布或调整宿主网络配置。
- 安装调查收敛后，用户另行明确授权本地提交已验证测试、owner/Case、调查与 Change 记录；不包含 JSON 草案，不冻结、不推送、不发布。

## Goals / Non-Goals

目标是形成可交给发布者的精确产物与完整证据。当前不执行 npm publish、Git tag、手动 push、合并或清理，也不新增产品功能、修改依赖与门禁。

## Decisions

### Intended Change

- 实现工作区位于 `/home/dev/.codex/worktrees/package-release-preparation/vibe-check`，分支 `release-0-0-4`；main 留在 `/workspace/vibe-check`。
- 版本说明与准备期审查稳定后提交，选择 clean S，在另一 detached worktree 执行正式 prepare/verify。
- `current-evidence.md` 保存当次身份、registry 观察、`Manual CR:`、验证结果与操作授权，持续更新只发生在实现工作区。
- 三名非实施 reviewer 重新全文阅读 29 篇随包 Markdown，实施者据此调整正文，再由原 reviewer 对新候选复核。仅整理本次发布直接相关维护材料，不批量重写历史 Decision/Investigation。
- 正式验收后按固定公共 Git 目录归档原始 tarball、receipt、Gate 日志及 evidence 摘要快照。
- 前序优化试验以阶段计时和 CPU 采样缩小成本，形成严格 JSON 私有值的等价遍历草案；局部测量、等价性和独立审阅已完成，但不纳入本轮采用项。已保存精确 patch、三个原样文件及摘要，随后只反向应用这三个已审查文件的 diff；Product 实现、测试和原 Case 映射均恢复为 HEAD bytes。
- 试验已证明两宿主真实 corpus 的局部收益，也复现旧版与候选的五秒并发超时；收益不能反过来证明测试应保留。必要性审查已发现全量真实进程测试的重复材料校验与证明缺口，详见 current evidence。
- 已确认采用的证明分工：默认五项任务的完整分发、顺序等待、focused selection、去重及失败汇总，在真实 workflow 中仅替换八个 leaf 依赖来证明；生产 task map、wrappers 与错误翻译不替换。删除 workspace 的两个 child 测试，不搬移全量扫描，保留真实 links 小 fixture。5 秒预算不变。
- 全量内容正确性仍由既有 Gate/material/artifact 验收承担；薄 main 的 argv、await、console、OS exitCode 与默认真实 leaf 绑定由明确 Manual CR 承担。已实际审查，不声称有自动化 OS exit status 覆盖，也不为测试新增 CLI/env 开关或扩张共享 process API。

### Resulting Impacts

- 版本说明变化进入 package fingerprint，不能直接把旧候选称为正式发布证据；包内差异需独立复核。
- 若正式包材料或关联行为需修正，重新提交、冻结、prepare、完整验收和语义确认，不手改 receipt 或冻结工作区。
- 本轮定稿只包含内部 workflow、两个测试文件、owner 与两个原 Case，不改变 Product、公开签名、schema、timeout 或性能预算。对外 JSDoc 结论按实际包材料复核适用性；前序 JSON 草案的候选身份不能代替还原后的 candidate。
- repository-material-validation owner 与两个原 Case 已同步，九个实体及六个应失败反例证明真实分发路径；原预算下的整组并发对照与独立语义审查完成。用户已确认采用测试重分工；去除 Product 草案后的验证另记录，不把此前混合工作树的计时直接当作最终输入结果。
- 新工作区通过标准 `bun run env:setup` 自举锁定依赖、CodeGraph 和 local candidate；只使用标准环境，不选择会清除用户工作的 clear 环境。
- 本地准备通过不授权发布；交互式认证由用户完成，不读取或保存 token、OTP、认证配置及会话 transcript。

## Risks / Trade-offs

registry 在观察后可能变化，临发布须重查；publisher authority 尚未核验。旧阅读结论只在实际材料和相关行为一致时复用。
本地归档独立于临时 worktree，但不等同跨机器备份。正式包验收运行当前平台，不新增其它平台认证。
局部 CPU 收益不等于原超时根因闭合或所有环境更快；若候选需要大改 Product/调度架构，则停止扩大本轮范围并交用户判断。
前序试改后两次完整 Gate 均为 39 passed / 4 unavailable：目标材料测试通过，外部消费者准备在原 30 秒预算超时，三项依赖验收未执行。最终输入后来取得完整 Gate 43/43，但不证明安装可靠性已修复。后续同包有界诊断在无测试/compiler 竞争时仍超时，verbose 和 curl/Bun fetch 独立请求将本轮阻塞定位为 registry 元数据网络等待；具体链路责任仍未知，不反推历史根因，不提高预算或改变安装语义。

## Open Questions

实际 publisher、临发布 freshness/registry 核验与外部写入授权留待本地验收完成后的交接；不阻断本地准备。
测试证明重分工已获用户确认；严格 JSON 优化本轮不采用，未来单独取舍。本轮安装阻塞已定位到网络元数据等待，宿主、转发路径与远端的具体责任尚未确定；小请求恢复后才继续一次真实 provider 与完整 Gate 验证。加时不是候选方案，离线/固定依赖图需另行确认目标，不能以旧 Gate 或重试通过宣称可靠性闭合。

## Implementation Observations

当次可核对事实、失败尝试和剩余步骤统一记录在 [current evidence](current-evidence.md)，不以计划勾选替代证据。
