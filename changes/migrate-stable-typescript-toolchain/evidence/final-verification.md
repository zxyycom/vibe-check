# 四组升级的最终验收

本页保存四组实施与提交前复审的验收证据，不是发布收据。取证基线为 `main` 的
`a36600da4aa2e4d3f4dcebb87722e56d1200ee9d` 加当时未提交实现；Git 保存和结项结果由后续版本历史承接。

## 交付与边界

| 组 | 最终结果 |
| --- | --- |
| 命令进程 | Execa 10.2.0；原始完整性独立于默认 cause，超限不进入完成回调；复用底层软终止/强杀，保留近似文本限额。 |
| 检测 | csv-parse 7.0.3、markdownlint 0.42.0、jscpd 5.4.2；发布 jscpd 范围为 ^5.4.2。MD052 在 direct/cache 前验证能力，失败闭合，cache 契约 v2。 |
| Lint | Oxlint 1.89.0 + oxlint-tsgolint 7.0.2004；原规则配置不变，唯一既有源码新诊断以等价 optional-chain 修复。 |
| Compiler | 原 preview 退出；稳定 TS7 7.0.2 与官方 compatibility 6.0.2 / 实际 TS6 API 6.0.3 并存，明确解析 bin 和实际工具链身份。 |

必要兼容项为精确 Execa 声明补丁、workspace-only markdown-it 15.0.2 类型来源及窄 micromark override；
它们不关闭严格类型检查、不新增 Product runtime 依赖或公开配置。候选包的 public types/runtime 在不继承根 patch/override/devDependency 的 consumer 中验收。

## 完整 Gate

两次均使用公开入口 `bun run check -- --all`，入口自行绑定 mise Bun 1.3.14 / Node 24.18.0。

- 首轮：42/43，通过所有 installed acceptance；仅新语言计量回归使原 scanner 测试文件达到 320 code lines，超过 300。
  按证明职责移入 `scanner.measurement.test.ts`，原协议测试恢复至 HEAD 内容；全部输入、断言、阈值、Case ID 保持。
  原文件/新文件实测 247/82 code lines，没有新增 waiver 或放宽政策。
- 重验：**43/43 passed，0 failed / unavailable / not-applicable**，elapsed 61.3 秒，进程退出 0。
  artifact、installed public types、documentation 与 Node runtime acceptance 均通过。
- 同一最终候选：`0.0.0-local.2b1720941546`；tarball SHA-256
  `4e5e0aa1f430d7b8bd1aed5efc5e510ff8f5d5cc879e90a920803e0906243d6a`。
  input fingerprint 为 `2b17209415462977efc64bbbbd60c2f4af896025c3db3c58748e6c4eb1c897ca`。
- 首轮日志：`.log/project-gate/2026-10-21T07-54-00.953Z-2096385-0fe2c36e-1724-4027-95b6-ca28f6dd4875/`。
- 成功日志：`.log/project-gate/2026-10-21T07-57-57.344Z-2113484-0d6f31a1-c067-415d-94cf-c1f0874c4180/`。
  直接读取成功 `machine/run.json` 核对 43 个 outcome 均 passed，并核对 preparation receipt 的 version/hash。

成功轮仍有非阻断耗时 warning：Check mean/p95 约 4.016/12.117 秒，超过 warning budget 2/5 秒；
consumer preparation 约 22.7 秒。未调整 deadline，不从两次耗时推断升级收益或瓶颈根因。

## 独立审查与局部证据

- 非实施代理完成实际源码/依赖 diff、测试证明义务、Case 和公开/内部文档反查，无剩余阻断。
- 独立 process/command 15/15、adapter/cache 8/8、scanner/SCC 11/11、compiler/cache/ESM 9/9、manifest 3/3；
  拆分增量两文件 8/8。全树账本为 766 entities / 190 Cases / 16 topics；注册完整性不代替测试执行。
- TS6 6.0.3 与 TS7 7.0.2 的 Execa 正负类型矩阵通过，六项 soundness 配置保持。
- Node 内存 loader 构造真实混合 core 图：上游 MD052 为零，Product direct/cache-disabled 均 backend-failed；
  普通 MD018 仍工作。测试 mock 另覆盖可信 warm cache 不可绕过、冷缓存不写入及一次并发 probe。
- 两个后继/独立调查已正式建立：`261021-verify-upgraded-command-result-integrity`、
  `261021-diagnose-markdownlint-core-instance-mismatch`；旧报告与起始十九份升级调查保留。

## 提交前规范复审

按 ai-ready-docs 与完整编码规范复审全部变更，包括 test support、fixture 内脚本及 Change-local TypeScript。
整改 PID 清理竞争、child 边界校验/超时、bin 普通文件和真实路径 containment；跨 Node 的成功 child 显式传入 eval。
临时对照脚本使用自有目录并在 finally 清理；保留原始 JSON，区分历史跨安装 cache 与当前 clean rerun。
文档改为当前行为先行、明确工具链角色及兼容措施，校准 process Case 的行为 owner。独立审查结论为符合，无需例外。

复审后 `bun run check -- --all`：43/43 passed、退出 0，elapsed 36.8 秒；candidate 为
`0.0.0-local.c56b3d96080c`，SHA-256
`f6238c5bb82fc7d9195b99d289b0baa35e6f6ee2f009992b1e6332e2f144d7f9`。
日志为 `.log/project-gate/2026-10-21T08-33-30.250Z-2241977-b9906be4-a49f-418c-8d97-62841010f813/`；
artifact 和 installed types/docs/Node runtime 验收全部通过。耗时 mean/p95 warning 仍非阻断，没有修改其预算。

## 未覆盖与交付边界

Linux x64 证据不能外推 Windows/macOS、任意后代持管道进程树或所有时序；输出限额不是严格 UTF-8 字节预算或副作用回滚。
Execa patch 是本地声明兼容处理，后续升级须以同一类型矩阵验收移除条件。
本轮已获准提交、运行提交 hook 并在保存完成态后正常 finalize 四项 Change；不创建正式版本或 tag。
