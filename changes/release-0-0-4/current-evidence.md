# 0.0.4 发布证据

当前阶段：文档优化及新候选验收完成，等待按授权保存并重新冻结。**旧正式包不包含本轮文档改动，不能用于交付新材料；尚未发布。**
固定约定见 [Package release](../../docs/tooling/package-release.md)。本页优先保存当前结论，旧轮完整证据从下方已归档快照恢复。

## 输入、工作区与授权

- package：`@zxyycom/vibe-check`；目标 version：`0.0.4`；tag：`latest`；registry：`https://registry.npmjs.org/`；access：`public`。
- 实现工作区：`/home/dev/.codex/worktrees/package-release-preparation/vibe-check`，分支 `release-0-0-4`，本轮起始 HEAD `10491179`。
- main：`/workspace/vibe-check`，保持 `357fb7c4061c3f576d0b70c8594e458c2941ce39`；旧 frozen worktree 保持下述 clean S。
- 初次准备按用户同意的方案完成本地提交、双 worktree、构建、验收与归档。随后用户要求先继续按 ai-ready-docs 复查；本轮只修改文档、更新计划、构建并验收 local candidate，不自动提交、重新冻结或发布。
- 未执行 npm publish、Git tag、手动 push、merge 或清理；不采集认证配置、token、OTP 或会话 transcript。

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

## 当前验证

- `docs:api`、`validate`、`test-evidence -- check --root .`、`change-plan -- check-all changes`、`decisions -- check` 和 `git diff --check` 已通过；756 test entities / 188 Cases / 16 topics、17 Changes、372 Decisions。
- 最终候选：`0.0.0-local.1cbe23f0f7d6`；tarball：实现 worktree 下 `build/artifacts/zxyycom-vibe-check-0.0.0-local.1cbe23f0f7d6.tgz`；SHA-256：`b00b89a4dbfa8c66e2c0e8ce971874f36448e9f42416479fbe692abe131f2fd2`。installed root 为 `scripts/project/node_modules/@zxyycom/vibe-check/`。
- 与旧正式 installed 包逐文件比较，1537 项清单不变，仅 15 篇 Markdown 和 manifest version bytes 不同；runtime、全部 declarations/JSDoc、示例与 schema bytes 不变。
- 最终 `bun run check -- --all` 通过：43/43 passed、exit 0，selection=all、source=local，artifact 和 external consumer types/docs/runtime 均消费该候选。日志 `.log/project-gate/2026-10-19T06-55-39.956Z-744608-1a54842a-fc39-4341-8d21-6ffd3d21cf8c/`，execution 44.1 秒。
- 该次有 Check 耗时告警：均值 2582.2 ms、P95 5826.5 ms，超过原 2000/5000 ms 告警预算。按现有 owner 规则不改变 passed/exit；本轮未处理性能问题，也不据此声明性能改善。
- 实现 worktree 使用同一机器 main 的既有 ignored `performance-baseline.json`，独占复制后 bytes 相同，SHA-256 为 `4e4e2dca26dfd8b3c869d2a1522dd1ea0a13ea9e04c2997612b44749209bfd80`。未修改 required/all 30000/90000 ms、均值 2000 ms、P95 5000 ms 告警预算。

### 本轮验证中的失败与环境边界

首轮完整 Gate 在中间候选 `0.0.0-local.db97a6230b0e` 上为 42/43：`scripts/validation/workspace.test.ts` 的默认 validate CLI 测试耗时 5078.99 ms，超过原 5000 ms timeout。日志 `.log/project-gate/2026-10-19T06-53-17.296Z-737251-b38a5100-be37-40a4-ac1c-7d927ca47eec/` 保留；包产物与 external consumer 验收当次均通过。
隔离复跑在宿主 Bun 1.4.2 下 3/3 通过；随后在 Gate 锁定的 Bun 1.3.14 下重跑 3/3 通过，原超时项 2154.34 ms。再修正 changelog 的旧 API 归属并重建最终候选，完整 Gate 如上通过。未修改 runtime、测试、timeout 或豁免；超时成因未进一步定位，不能据此宣称已修复测试稳定性。

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

### 最终候选适用性

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

1. 文档优化完成后，按授权保存新的 clean source S，建立对应 frozen worktree，重新正式 prepare/verify 与最终包独立确认，并保存新 receipt 槽位。
2. 临发布重新核验 freshness、registry、publisher authority 和精确外部写入授权。2026-10-19T06:09:26Z 的只读观察仅为 latest 0.0.3、0.0.4 不存在，不是版本预留或权限证明。
3. 发布者交互完成 2FA；发布与分发 bytes 核对成功后，才按授权 tag、合回 main 并保存最终证据。工作区、Change 与归档清理另行确认。
