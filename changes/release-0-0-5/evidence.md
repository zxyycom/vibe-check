# 0.0.5 发布证据

当前阶段：0.0.5 发布、分发核验及 Git 交接已完成，保存完成态后结项。固定约定由 [Package release](../../docs/tooling/package-release.md)拥有。

## 当次输入与授权

- 目标：`@zxyycom/vibe-check@0.0.5`，canonical registry `https://registry.npmjs.org/`，public，tag `latest`。
- 用户确认开始既定准备流程；main 已从 `fba271ec` 同步到 origin/main。发布实现工作区 `/workspace/vibe-check-release-0-0-5`，分支 `release-0-0-5`。
- `2026-11-02T09:22:25.472Z` 只读 registry 观察：latest=0.0.4，已有版本 0.0.1–0.0.4，0.0.5 尚不存在。
- `2026-11-02T09:36:21.679Z` 再次只读观察：latest 仍为 0.0.4，0.0.5 尚不存在；不替代实际发布前的 freshness/authority 核验。
- npm 认证和发布由用户交互执行；agent 未读取 token/OTP/认证配置，也未代为执行 publish。
- 用户在公开分发核验通过后明确授权：补齐证据，创建并推送 `v0.0.5 -> S`，合回并推送 main，保存完成态并 finalize 本 Change。两个发布 worktree 与 `release-0-0-5` 分支暂时保留。

## 发布与公开分发结果

- 首次交互 publish 返回 E404，随后只读 `whoami` 返回 E401，10:03 UTC registry 仍无 0.0.5。该轮没有发布成功；未将原始认证 transcript 或登录链接写入仓库/归档。
- 用户之后在交互终端完成认证并收到 `+ @zxyycom/vibe-check@0.0.5`，服务提示异步处理。
- `2026-11-02T10:12:19.459Z`：独立 version endpoint 可读，实际 publisher=`zxyycom`；匿名下载 tarball 为 1,534,498 bytes，与已验收本地文件逐字一致。
- `2026-11-02T10:12:42.766Z`：独立 dist-tags endpoint 的 latest 与 latest-version endpoint 均为 0.0.5。此前包总览短暂仍显示 0.0.4，不能据此重复 publish。
- `2026-11-02T10:22:12.977Z`：收尾前再次确认 name/version/latest/publisher 及匿名分发 bytes 全部相同。该轮初次只读下载遇到 TLS EOF，未产生有效新证明；不改 TLS 信任的随后完整读取通过。
- 分发 SHA-256=`35578f8abf829dfd934544bf45cbaaaa885e7ce3c45b8a93c64e013e229c5c9f`，SHA-1=`86eeeda06afe3f2e4636d3c05b6072084bd5f3d5`；SHA-512 SRI 与下方 receipt 相同，registry dist.shasum/integrity、本地原件和 receipt 均一致。
- 只读来源为 canonical registry 的版本、dist-tag 和 tarball endpoints；没有重新 publish、修改 npm dist-tag、变更认证或创建 GitHub Release。

## 文档审查基线

- `fd930556:changes/prepare-0-0-5-documentation/evidence.md` 与同目录 inventory、core/checks/tools 报告：31 篇用户页面、139 个声明、5 个机器材料的完整独立阅读及修正复核。
- `90217c36:changes/rework-project-gate-guide/` 的四份 review：随后主指南重构与专题接线、实际包对照、AI-ready 两轮复核。
- 上述只证明准备期审查已完成；最终正式包的 receipt、实际清单和差异由下节独立确认，不单凭历史记录声明发布放行。

## 最终正式包文档确认

Manual CR: **通过，无文档发布阻断。** 非实施代理 `/root/release_docs_confirm` 的
[独立报告](review-final-package.md)与[逐项清单](review-final-inventory.json)将完整阅读结论绑定到下列正式 tarball/receipt。

- 全部 175 项范围闭合：21 篇页面、139 个声明、5 个机器材料共 165 项与完整审查最终内容相同；九篇后续指南/README 由专项审查链与本轮差异复核承接，本轮另审 changelog。
- 正式包 1,559 个文件与 staging 全等；相对最新已审候选只有 manifest version 和 changelog 四行不同。公开声明闭包、227 个导出/49 个 runtime value、381 个 Product 源文件与相关行为输入无漂移。
- 313 个本地 Markdown 引用无缺口；Node 24.18 下真实 JSON 入口的合法/非法输入、错误 cwd 与仅 import 四项对照通过。
- 报告 SHA-256：`e1203916f3a59e20966bc42df287b9fcf6b58eecfac28ded6a127ee6d5844a58`。
- 清单 SHA-256：`1248b3659072747f77000fdd43f720634f11a35f273c26f3fcc8bdce95eb7a3d`。

这是完整审查链在一致性证明后的正式包确认，不冒称本轮重新全文阅读全部材料；具体已读、复用及动态边界见报告。

## 正式产物身份

| 项目 | 值 |
| --- | --- |
| 冻结提交 S | `a2737ff47b457e178f32fa1d89b435067c39ddf1` |
| 冻结工作区 | `/workspace/vibe-check-release-0-0-5-frozen`，detached、clean |
| source inputFingerprint | `1289550d018c7e720bfc5271c7505b0bc5ea1a49c7502362cb298c224648a9ec` |
| tarball | `build/artifacts/zxyycom-vibe-check-0.0.5.tgz` |
| tarball SHA-256 | `35578f8abf829dfd934544bf45cbaaaa885e7ce3c45b8a93c64e013e229c5c9f` |
| tarball SRI | `sha512-mWKYJKElhs/MEJH4PEkLMr6CSkcDt46rXuRCAhCy5kB9Y1nkvX4spWqzlshFcF5IhVd7/0B8AZ4q/HMImYXlYQ==` |
| receipt | `build/releases/zxyycom-vibe-check-0.0.5.release.json` |
| receipt SHA-256 | `16b33c49c840a1315acbcfbc76c7f2d509032f0400ef6c526a97a52e0e1b025d` |

两个新 worktree 均通过 `bun run env:setup` 完成标准自举；冻结工作区从 S 执行
`bun run package:release:prepare -- --version 0.0.5 --tag latest` 成功。未重命名 local candidate 或修改 receipt。

## 正式验收与性能观察

命令：在冻结工作区执行 `bun run package:release:verify -- --receipt build/releases/zxyycom-vibe-check-0.0.5.release.json`。

首轮日志：`.log/project-gate/2026-11-02T09-26-27.459Z-33398-5848ceef-ab67-4d53-9fee-34f891e56c17/`。

- 42 项执行检查全部通过，1 项按 all routine 规则未选择；包括 artifact 与 installed types/docs/runtime。
- 最终 Gate **failed / exit 1**：总反馈 39,363.8 ms 在 90,000 ms 内，但平均 Check 2,169.0 ms > 2,000 ms，P95 7,158.3 ms > 5,000 ms。
- 最慢三项：Product typecheck 12,019.7 ms、scripts typecheck 11,168.2 ms、installed types 7,158.3 ms。
- 环境：Linux x64，4 logical processors，Bun 1.4.4，mise-bound Node 24.18.0，新冻结工作区；两项 TypeScript incremental cache 的生成时间位于首轮运行内。
- 随后在同工作区串行运行公开 `bun run typecheck -- product` 与 `-- scripts`，均通过，shell wall 0.369 s / 0.304 s。该对照支持首次增量缓存缺失影响耗时，但不证明所有成本仅来自缓存或不存在竞争。
- 不改源码、阈值、选择或并发；同 S/receipt 的完整复验另行记录。首轮失败保留，不宣称修复冷启动性能或以局部结果代替发布验收。

第二轮日志：`.log/project-gate/2026-11-02T09-29-04.109Z-40071-6b13158f-c40d-494d-a1b3-d3d5e66739bb/`。

- 同一正式 receipt 完整验收 **passed / exit 0**：42 项执行检查全部通过，1 项 admission workbench 非 routine lane 未选择，无 failed/unavailable。
- installed consumer 每次重新隔离安装，types/docs/runtime 均通过；没有复用上一轮 consumer 安装或跳过类型检查。
- 使用既有工作区增量/扫描缓存，总反馈 23,428.5 ms，mean 1,309.7 ms，P95 3,421.6 ms，全部预算达标；精确分阶段事实见该轮 gate.log。
- 两轮之间冻结 HEAD、tarball SHA-256 和 receipt SHA-256 均未变化。该结果证明本机暖缓存下同包完整验收通过，不承诺无缓存新工作区达标或跨机器性能。

准备记录另通过 Change 单项/集合检查、repository materials、Decision 检查、最终链接与 JSON 身份检查及局部 whitespace 审查。
这些记录位于实现工作区，不影响 frozen source；没有为记录提交再次运行全仓 Gate。

## 产物和日志归档

固定槽位为 `/workspace/vibe-check/.git/vibe-check/releases/0.0.5/16b33c49c840a1315acbcfbc76c7f2d509032f0400ef6c526a97a52e0e1b025d/`。

- 已按原相对路径保存 tarball、receipt 及上述两轮 `.log/project-gate/<invocation>/`；共 74 个普通文件、3,297,793 bytes，逐文件 bytes 核对相等。
- receipt SHA-256 与槽位名相同；tarball SHA-256、SHA-512 SRI、manifest name/version/public access/registry 均与 receipt 相符。
- 复制前检查认证文件名及高置信度凭据/private-key 标记，零命中；未读取或归档 `.npmrc`、token、OTP 或登录 transcript。此检查不是全面秘密审计。
- 已有槽位文件仅 bytes 相同时复用，冲突即停止；本次全部为新增复制，没有覆盖历史产物。
- 非敏感 evidence 快照按内容 SHA-256 命名保存于槽位 `evidence/`，组合本记录、独立报告与逐项清单，供脱离临时缓存复核。该本地归档不表示跨机器备份。
- 首份完整审查快照为 `evidence/ec3d4ba546644a86a638c348015065cd1e0bce9ce3e196e041658067d8a834aa.md`，118,644 bytes；摘要与文件名一致，复制 bytes 核对通过。后续记录提交后可新增快照，不覆盖该份。
- 发布与 Git 交接后新增 `evidence/d15a5a7f63eab0ded561041ed5ac16940e65bbbff892873b8bd2f376536da917.md`，128,364 bytes，摘要/bytes 核对通过；覆盖实际 publisher、分发结果、tag 与 main 交接。最终完成态及结项出口另追加快照，保留各阶段原件。

## Git 交接

- 已创建并向 origin 显式推送 annotated tag `v0.0.5`，没有 force 或推送其它 tag。
- Tag object 为 `e98ff7e4a1607d8c65b5594b5c3b11b6e214b584`；本地及远端 peeled target 均为冻结 S `a2737ff47b457e178f32fa1d89b435067c39ddf1`。
- main 已从 `fba271ec` fast-forward 合入 `release-0-0-5` 至 `fe787ef044c39c268649d70efff8b8b5a8886ba7`，并显式 non-force 推送；远端 main 已核对相等。
- 合入后的 Change 与链接检查、局部 whitespace 审查通过；S 之后 Product、package scripts、依赖和已发布 changelog 无 drift。没有为纯记录交接重复完整发布 Gate，也不把后续证据提交当作已发布源码。
- 最终完成态与结项清理提交将继续 fast-forward 到 main 并显式同步；其实际 revision 由归档的最终交接快照记录。

## 本次人工发布命令与后续边界

下列命令已由用户在交互终端执行，发布的是**同一份**正式 tarball，不从源码目录重新打包；此处为形成时记录，不是重试指令：

```sh
npm publish /workspace/vibe-check-release-0-0-5-frozen/build/artifacts/zxyycom-vibe-check-0.0.5.tgz --registry=https://registry.npmjs.org/ --access=public --tag=latest
```

认证由用户交互处理，不归档 OTP/token、登录链接或会话 transcript。已有发布验收依赖本机工作区缓存；
后续任何新发布输入须使用新的正式身份按 owner 重新构造与验收，不能手改已发布 receipt 或重新使用 0.0.5。

## 结项与留存

交互发布、公开分发、Git tag/push 与合回/推送 main 均已完成，无未决产品或发布条件。保存完整完成态和最新归档快照后，按授权通过预检及 finalize 退出本 Change。
两个发布 worktree 与发布分支按用户确认暂留；冻结目录只用于核验，不更新其中的历史 Change 快照。
