# 0.0.4 发布证据

当前阶段：本地发布准备完成，等待发布者及精确写入授权；尚未正式发布。固定约定由 [Package release](../../docs/tooling/package-release.md) 拥有。

## 输入与授权

- package：`@zxyycom/vibe-check`；version：`0.0.4`；tag：`latest`；registry：`https://registry.npmjs.org/`；access：`public`。
- 用户同意按已说明的发布准备流程推进。本轮执行分支/worktree、本地必要提交、构建验收与证据保存；不执行 publish、tag、push、merge 或清理。
- 实现工作区：`/home/dev/.codex/worktrees/package-release-preparation/vibe-check`；分支：`release-0-0-4`；起点：`357fb7c4061c3f576d0b70c8594e458c2941ce39`。
- main 工作区：`/workspace/vibe-check`，保留原 HEAD；末笔结项提交未手动推送。

## Registry 观察

2026-10-19T06:09:26Z 通过 canonical registry HTTPS GET 只读查询 package metadata：latest 为 `0.0.3`，已存在版本为 `0.0.1`、`0.0.2`、`0.0.3`；`0.0.4` 不存在。
该观察不预留版本，不证明 publisher authority；临发布必须重新查询。不采集或保存认证材料。

## 准备期审查基线

- 用户文档：此前独立审查覆盖全部 29 篇随包页，修复和复核见 [readiness Change](../repair-release-documentation-readiness/design.md)；审查者 `second_pass_public_readiness`。
- 对外 JSDoc：`audit_jsdoc_core_api`、`audit_jsdoc_package_checks`、`audit_jsdoc_scheduler_tools` 分别覆盖 60、115、52 个包根导出族及必要辅助声明；22 项问题已修复并独立复核。完成态可从提交 `cc9c4d1dd63d48365c7c97c07e6ddca6618ffef1` 的 `changes/repair-package-jsdoc-usability/` 恢复。
- 最终旧候选：`0.0.0-local.ce99cf444ac9`；SHA-256：`a384e106b2af99e1fffc6eca6bcd79c0845062c811d0f5fc82874fa80001f077`；原 tarball 位于 `/workspace/vibe-check/build/artifacts/zxyycom-vibe-check-0.0.0-local.ce99cf444ac9.tgz`。
- 旧候选最近完整 Gate 为 43/43 passed：`/workspace/vibe-check/.log/project-gate/2026-10-19T05-52-35.046Z-705370-5e692449-e5de-4b4a-b717-491847d2e719/`。这不是正式发布验收。
- 本轮包内容仅改变 changelog 的版本归属和 manifest version；正式材料清单、bytes、相关行为与阅读结论适用性的核对结果见下文。

## 当前验收与产物

冻结 source S 为 `fca819d8511642f8887d149441a5d336369caf44`（`build：准备 0.0.4 版本说明与发布计划`）。
独立 detached 工作区为 `/home/dev/.codex/worktrees/release-0-0-4-frozen/vibe-check`；创建后已核对 HEAD=S、index/worktree 干净。
正式 prepare 与同 receipt 完整验收均已完成；以下正式身份不由 local candidate 或工作树状态代替。

- 实现工作区已通过标准 `bun run env:setup`：锁定依赖安装、CodeGraph 初始化与候选构建完成；没有修改 lockfile 或项目工具 pin。
- 版本说明变更后的候选为 `0.0.0-local.ba3c585d2a0f`，SHA-256 为 `b6bbb41b76943057ddff58d7688ce7fd1dbcd3e3536047bcb453770f76da11d9`。
- 与上述旧候选逐文件比较，1537 项文件清单相同，仅 `package.json` 的版本字段和 `docs/changelog.md` 的标题/版本边界两行变化；运行时、公开声明、JSDoc、示例和其余用户页面 bytes 一致。
- 已运行 `docs:api`、`validate`、`test-evidence -- check --root .`、`change-plan -- check-all changes`、`decisions -- check` 和 `git diff --check`，全部通过；756 test entities / 188 Cases / 16 topics、17 Changes、372 Decisions。
- 上述 S 提交后已核对实际范围和中文正文；post-commit hook 因分支不是 main 跳过，没有尝试 push。main 仍位于起始提交。

### 正式包身份

以下路径均相对冻结工作区：

- tarball：`build/artifacts/zxyycom-vibe-check-0.0.4.tgz`。
- SHA-256：`6b0bd4b82ba650440e0fa0bfc1a54a342c8a202e2ba41697ec4f0f34ed5f59e7`。
- SRI：`sha512-DM3PFXAjrfeiEAFA6AdTCBzQUQWmIHy5GxcJ5I0RfVAHUtjPCY1uj+lt11J0b4U3aAnwjQuHj4Mq39P0VHEnGg==`。
- receipt：`build/releases/zxyycom-vibe-check-0.0.4.release.json`；SHA-256：`b1a5014c49eda1343d35ece74361e113ef3d864fc15a520b7b2abdad8592454d`。
- receipt source commit=S；input fingerprint：`ba3c585d2a0f176cd97ad6a3856e7546ff1aeee2cff3fdd8c396ccd6f1852eec`；1537 项文件。
- 与准备期候选逐项比较，清单不变，唯一 bytes 差异为 `package.json` 的 version 从 local identity 改为 `0.0.4`；tarball 的 SHA-256/SRI 与 receipt 完全相符。

### 验收尝试

- 首次 `package:release:verify` 因新工作区缺少本机 `performance-baseline.json`，在 candidate preparation 前失败；未进入 Product Run，不是 Check 测试失败，也未形成正式 Gate 通过证据。
- 按 [Gate 告警预算](../../docs/tooling/project-gate.md#性能预算与-check-耗时分布)，将同一机器 main 工作区的既有预算原样复制到冻结工作区对应 ignored 路径，采用独占创建且复制后 bytes 相同。SHA-256：`4e4e2dca26dfd8b3c869d2a1522dd1ea0a13ea9e04c2997612b44749209bfd80`。
- runtime 实测为 Linux/x64、Bun 1.3.14；required/all 总预算仍为 30000/90000 ms，均值 2000 ms、P95 5000 ms。不调整阈值、豁免或正式包，重跑同 receipt 验收。
- 首次进入 Product Run 的正式 Gate 为 42 passed / 1 failed（49.5 秒），日志 `.log/project-gate/2026-10-19T06-19-48.596Z-720570-b6e2009d-7fde-4bbf-973f-fd6d40464c50/`。失败为 `scripts/validation/workspace.test.ts` 的 `root validate CLI runs every material task by default` 超过现有 5000 ms timeout；artifact 和 external consumer 的 types/docs/runtime 均通过。该失败记录保留，不能作为正式验收通过证据。
- 在源码、receipt、tarball、测试和阈值均不变的条件下，独立运行 `bun test scripts/validation/workspace.test.ts`：3/3 passed，原超时项 1713.39 ms；没有复现失败。
- 最终 `package:release:verify -- --receipt build/releases/zxyycom-vibe-check-0.0.4.release.json` 为 43/43 passed、exit 0，含 artifact 和 external consumer types/docs/runtime；selection=all、source=release-receipt、candidate=0.0.4。日志 `.log/project-gate/2026-10-19T06-21-24.042Z-727142-3b2be102-c5cd-4b1a-a71e-e426300b4cd9/`。
- 最终 execution elapsed 为 29.9 秒；Gate 总反馈 32619.4 ms，Check 均值 1709.0 ms、P95 4458.8 ms，均在原告警预算内。没有据此宣称性能优化，也不隐去此前一次超时。

## Manual CR:

准备期审查对象为上述 `ba3c585d2a0f` 候选及其实际安装包。四名非实施 reviewer 分别确认旧结论可复用，无新增阻断：

| 审查者 | 覆盖与代表性任务 | 独立结果 |
| --- | --- | --- |
| `second_pass_public_readiness` | 全部 29 篇公开页、5 项 schema/机器示例；首次集成、Check 配置、回调扩展、结果及失败处理 | tar/installed/source bytes 一致；README 直达其余 28 页。相对已审材料仅 changelog 顶部两行变化，版本边界准确，没有冒称发布完成；原全文结论可复用。 |
| `audit_jsdoc_core_api` | 60 个根导出及必要辅助声明；Check/facts/Record、typed dependency、Run 分支、输出、flags 与数据工具 | 核心声明与相关行为材料不变；抽核 25 份 tar/installed 声明、12 处公开专题链接通过；原 8 项修复关闭。 |
| `audit_jsdoc_package_checks` | 115 个根导出及必要 supporting declarations；九项 Check、文件规则、schema identity、command、lint 与 ranges | 1537/1537 tar/installed 文件一致，373 份声明含 202 份 Check 声明与旧包不变；原 7 项关闭，command 安全说明仍准确区分默认行为与自动发布。 |
| `audit_jsdoc_scheduler_tools` | 52 个根导出及必要辅助声明；admission/wait、prepared 收尾、learned identity/observation、模拟分叉、cache、waiver 与 Finding 预算 | 清单/顺序及相关声明、源码、runtime、指南不变；重读关键修复，原 7 项关闭。 |

本轮先依据实际包与原独立阅读确认使用路径，再用来源与行为一致性核实复用。26 个 JSDoc 修复源文件去除注释/空白后的 TypeScript token 序列未变；没有借内部材料补齐用户说明。
准备期确认未重跑旧行为演练；正式包另完成以下身份与适用性确认。

### 正式包独立结论

四名 reviewer 均已只读核对上述正式 S、receipt 和 tarball，分别明确通过，合计覆盖全部 29 篇用户页、随包示例及 227 个公开根导出和正确使用所需的辅助声明：

- `second_pass_public_readiness`：29 篇公开页及 5 项 schema/机器示例在正式 tar、installed 与 frozen source 中一致；README 的 28 篇直接入口、版本/升级与结果处理路径保持准确，无影响正确使用的遗留问题。
- `audit_jsdoc_core_api`：60 个导出及必要支持声明、相关行为和专题不变；正式 tar/installed 的 25 份直接声明抽核一致，原 8 项修复关闭，核心切面通过。
- `audit_jsdoc_package_checks`：115 个导出及必要支持声明结论继续有效；1537/1537 正式 tar/installed 文件一致，原 7 项及 command 安全措辞补充关闭，Check 切面通过。
- `audit_jsdoc_scheduler_tools`：正式根声明重新清点仍为 52 个导出，相关声明、源码、runtime 与引用材料不变；原 7 项修复关闭，Scheduler/tools 切面通过。

独立核对均确认：正式包与已审准备候选清单一致，唯一内容差异为 manifest version；receipt 的 S、fingerprint、1537 项清单及 artifact 摘要对应实际对象。故复用前述完整阅读与使用任务结论，而非仅凭机械 Gate 或版本 diff 作语义通过声明。
最终语义结论绑定 tarball SHA-256 `6b0bd4b82ba650440e0fa0bfc1a54a342c8a202e2ba41697ec4f0f34ed5f59e7`。未新增 GUI hover 或跨平台验证，未重跑旧审查中的全部手动行为演练；正式 Gate 已另外执行当前平台的真实消费者验收。后续发布输入改变须重选 S、重建与复核。

## 归档与保留

- 公共 Git 目录实测为 `/workspace/vibe-check/.git`，固定槽位为 `/workspace/vibe-check/.git/vibe-check/releases/0.0.4/b1a5014c49eda1343d35ece74361e113ef3d864fc15a520b7b2abdad8592454d/`。
- 已独占复制并逐文件核对 74 项原始文件：正式 tarball、receipt、失败与通过两次 Gate 的完整日志目录，保持原相对路径。已复核 receipt 摘要等于槽位名，tarball 的 SHA-256/SRI 与 receipt 一致，没有覆盖冲突文件。
- 归档输入为当前任务生成的普通文件，未包含认证配置、token/OTP 或认证会话 transcript；归档前的凭据标记扫描未命中。没有执行登录或采集认证材料。
- 本文非敏感准备结果按自身 bytes 的 SHA-256 命名保存到槽位 `evidence/`，与原始产物共同保留；未来发布及 Git 交接结果使用新的摘要快照，不覆盖旧证据。该本地保存不等同跨机器备份。

## 交接检查

- 本轮没有修改 Product runtime、API、依赖、锁文件、测试或验收阈值；main 保持 `357fb7c4061c3f576d0b70c8594e458c2941ce39`。
- 冻结工作区继续保持 clean detached S，不在其中更新本 Change；当前记录仅由实现工作区维护。
- 尚未执行实际 publisher authority 核验、npm publish、分发下载验证、tag、push 或合回 main。发布前重新核对 clean S、receipt/bytes、registry 版本与 latest、publisher 权限及精确授权，再由用户在本地交互终端完成 2FA。

## 后续执行边界

正式发布由用户交互完成 2FA；发布前重新核验权限和状态。发布成功后才进行分发核验、tag、合回与最终归档。
两个工作区、本 Change 和本地归档均保留，清理须另行确认。
