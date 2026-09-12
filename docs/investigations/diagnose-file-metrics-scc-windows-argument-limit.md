---
title: "fileMetrics 的 SCC Windows argv 失败诊断"
id: "260912-diagnose-file-metrics-scc-windows-argument-limit"
formedAt: "2026-09-12T10:08:33Z"
question: "fileMetrics 为什么会在 Windows 上因 SCC 精确路径 argv 过长而失败，并应在哪一边界引入分批传输与完整汇合？"
tags:
  - "file-metrics"
  - "process-boundaries"
  - "scc"
  - "windows"
relations: []
---

## 形成时背景

代码拆分后，调用方观察到 `fileMetrics` 选中的文件增至约 620 个，Vibe Check 把全部项目根相对精确路径放入同一次 SCC measurement argv，Windows 上形成约 34,941 个字符并超过进程创建边界。该失败阻断 `file-metrics` 形成可信结果与后续正式 Records；调用方已排除“扫描本身太慢”和 Node 版本变化，并要求在随包实现收口后把修复作为独立 Change 处理。

形成时的稳定实现边界是：[`fileMetrics` 指南](../checks/file-metrics.md)要求 owning Check 先形成全部 area 的 exact-path 去重并集，[scanner dependency owner](../development/scanner-dependencies.md)要求 SCC 不重新发现或扩大输入；[`scanner.ts`](../../src/package-checks/file-metrics/scc/scanner.ts)则把固定 `--no-config --by-file --format csv` 参数和完整 `includePaths` 一次性交给 `runProcessSync`。因此症状发生在“逻辑 exact input → OS process argv”的 adapter transport 边界，而不是 area selection、SCC measurement 或 Record conversion。

本轮只调查根因、SCC 4.0.0 可用输入通道和修复责任。对应实施范围由 [`batch-file-metrics-scc-exact-input`](../../changes/batch-file-metrics-scc-exact-input/proposal.md) Change 拥有；本报告保存形成时依据和建议，不证明修复已经实现。

## 调查目的

本轮回答以下问题：

1. SCC 4.0.0 是否只能接收一个路径，是否能自行解释 glob、response file 或 stdin 文件清单，从而在一个进程中绕开 argv 上限？
2. 当前 Vibe Check 在哪一层把 file selection 转换为 SCC 输入，Windows 长度为什么会在文件数增长后才显现？
3. 在继续保持 exact-path ownership、SCC 私有协议和完整结果语义的前提下，最小可维护修复应由哪个 owner 承担？
4. 分批传输后，哪些顺序、资源、失败和汇合边界必须作为一个逻辑 measurement 继续成立？

area、阈值、waiver、SCC 版本和 public scanner surface 继续由现有 owner 承接；本轮只回答 transport compatibility 问题。

## 调查范围与依据

**调用方现场。** 调用方提供约 620 个选中文件、Windows argv 约 34,941 字符及超过进程上限的观察，并说明问题不是性能或 Node 版本。当前 Linux 工作区不能直接重放 Windows `CreateProcessW` 失败，因此本报告把该数值标为调用方现场，而不是本机复测结果。

**Windows 一手边界。** Microsoft 的 [`CreateProcess` 文档](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw)规定 command line 最长 32,767 个字符且包含终止 NUL。Node/Execa 接收参数数组并不改变 Windows 最终需要形成一条 process command line 的事实；实际安全预算还须包含 executable、固定参数、分隔和 quoting/escaping，不能把 32,767 直接全部分配给路径。

**仓库实现。** 实际读取了以下 owner 与调用链：

- [`collection.ts`](../../src/package-checks/project-files/collection.ts)从 filesystem 或 `git ls-files` 枚举候选，并由 Vibe Check 自己应用 include/exclude glob；
- [`execution.ts`](../../src/package-checks/file-metrics/execution.ts)保存 path → area membership，并形成稳定排序、去重的 `approvedExactPaths`；
- [`measurement.ts`](../../src/package-checks/file-metrics/measurement.ts)执行一次 SCC availability probe，调用 scanner 后以完整 approved set 做 exact-input acceptance；
- [`scanner.ts`](../../src/package-checks/file-metrics/scc/scanner.ts)当前用一次 `runProcessSync` 承载固定参数与全部路径；
- [`parser.ts`](../../src/package-checks/file-metrics/scc/parser.ts)只消费 SCC 4.0.0 by-file CSV 的逐文件 `Code` 与 `Complexity`，不依赖跨文件 aggregate row；
- [`records.ts`](../../src/package-checks/file-metrics/records.ts)在 measurement 完整返回后拒绝重复 path，再应用 area policy 和形成 Records。

**SCC 4.0.0 本机探针。** 使用仓库 mise 锁定的 `scc version 4.0.0` 和临时 `a.ts`、嵌套 `b.ts`、`c.js` 文件，实际执行：

| 输入                         | 观察                                                     |
| ---------------------------- | -------------------------------------------------------- |
| 两个精确文件位置参数         | exit 0，一份 CSV 含两个逐文件 row                        |
| 一个目录位置参数             | exit 0，SCC 自行递归并包含目录内三个文件                 |
| quoted `src/*.ts` 字面量     | exit 1，报告该字面路径不可读                             |
| shell 展开的 `src/*.ts`      | exit 0，但实际进入 SCC 的仍是 shell 展开后的精确位置参数 |
| `@files.txt`                 | exit 1，被当作普通路径而非 response file                 |
| stdin 写入路径且不传位置参数 | exit 0，但 SCC 扫描 cwd，未把 stdin 当作文件列表         |

`scc --help` 同样只声明 `scc [flags] [files or directories]`；官方 README 说明可传多个文件或目录。本轮没有修改或重新编译 SCC，也未调查未发布分支是否计划增加 manifest 协议。

## 调查结果与边界

### 已确认根因

SCC 一次进程可以接受多个文件或目录；stock SCC 4.0.0 的精确文件输入通道只有位置 argv。本轮探针没有发现可用的 response-file、stdin file-list 或自解释位置 glob 通道。目录输入会让 SCC 重新枚举 workspace，不能替代 Vibe Check 已批准的 exact-path union。

当前故障的直接原因是 SCC owner 把“一个逻辑 exact-input measurement”实现成“一个 OS process 必须携带全部位置参数”。文件拆分增加路径数量并使这个潜在边界显现；当前 exact selection 和逐文件 metric 模型仍然有效，修复只需重划 process transport。

### 方案比较

| 方案                             | 单 SCC 进程 | 保持 exact paths | 形成时判断                                                                                      |
| -------------------------------- | ----------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| 直接传目录或压缩为 glob          | 是          | 否               | SCC 会重新发现或由 shell 展开；前者扩大输入，后者仍回到长 argv，不采用                          |
| `@file` / stdin manifest         | 是          | 是               | SCC 4.0.0 不支持；只有修改/fork upstream protocol 后才成立，不作为本次小修复                    |
| 临时 mirror tree 后传一个目录    | 是          | 可近似           | 增加 hardlink/symlink/copy、路径反向映射、Windows 权限和 cleanup 边界，比结果汇合更复杂，不采用 |
| SCC adapter 内有界分批、最后汇合 | 否          | 是               | 不改变 public API 或 selection owner，能够直接消除 argv 风险，作为本次 Change 的推荐方向        |

### 推荐的分散传输与完整汇合边界

形成时建议采用以下边界，精确实现规格与开放问题由对应 Change 维护：

1. `fileMetrics` 继续先形成稳定、去重的完整 `approvedExactPaths`；SCC adapter 再按保守的 Windows
   command-line 编码成本划分有序非空批次。预算按 executable、固定参数、分隔、UTF-16 code units 和
   quoting 上界计算，不使用固定文件数。
2. 一次 logical measurement 只做一次 availability probe，随后顺序执行采用同一固定协议的 batches；普通
   小输入仍是一批。平台共用同一 planner，使 Linux 能直接验证 partition contract。
3. 每批分别检查 process、CSV 和 batch-local source scope。所有批次成功后才拒绝重复 path、稳定排序并形成
   一个 `SccScanResult`，随后由现有 measurement 层对完整 union 做最终 exact-input acceptance。
4. 任一批失败都拒绝完整 logical measurement，前序候选不形成 metric、Finding、waiver audit 或 Record；
   timeout 与 output bound 按一次 logical measurement 审阅，避免资源上限随批次数倍增。
5. batching planner、预算与汇合状态保持 SCC adapter 私有，不进入 constructor options、fingerprint、cache、
   Record、machine output 或共享 scanner abstraction。

### 验证与不可外推边界

最窄自动证据应构造总 command-line 成本超过 Windows 上限的约 620 条可移植路径，证明 planner 产生多个受限 invocation、每个路径恰好传输一次、合并结果稳定完整，并证明第二批失败时没有部分成功结果。测试应独立覆盖 executable/固定参数/quoting 成本和单一路径过长分支；Case 账本复用 SCC adapter 的现有语义目的。

本轮未在 Windows runner 上执行修复后的真实 SCC，因此不能宣称 Windows 已验收。若项目没有可用 Windows 环境，Plan 应以纯 partition contract 加 Linux fake-scanner integration 作为可执行证据，并把真实 Windows `fileMetrics` Run 保留为明确未验证边界；取得 Windows runner 后应以超过安全预算的真实 exact-path set 复核。SCC 升级、增加原生 manifest 输入、改变 CSV schema、改用 shell 或放宽 exact scope 时须重新调查，不能从本报告直接外推。
