# Design

按消费者所需信息选择公开 API、安装身份读取或目录定位，在既有 owner 内修复解析边界。

## Context

markdownlint `0.42.0` 的 exports 不包含 manifest；本轮所测 Node `24.18.0`、`26.8.2` 拒绝该路径，Bun `1.4.4` 接受。
缓存消费者只需后端版本，公开 `getVersion()` 可提供；候选安装验收则消费实际 manifest 的 name/version 和路径。
形成时因果链与红绿回归见[调查报告](../../docs/investigations/261105-diagnose-markdownlint-cache-module-resolution.md)。

## Goals / Non-Goals

目标是恢复 Node 缓存和候选解析，同时保持现有身份、隔离与指纹契约。
范围限于本仓库的读取及其验证；上游 Skill、发布布局与通用包解析抽象不在本轮调整范围。

## Decisions

### Intended Change

1. 缓存使用 markdownlint 公开 `getVersion()`，保留版本不可用时 fresh lint 的策略。
2. 候选 child 从 consumer cwd 解析 candidate 根入口，再由同 owner 的类型化模块解析依赖。
   markdownlint 从公开入口向上查找最近 manifest，仅缺失时继续；其他读取错误、解析或身份失败即停止并报告具体路径。
3. 其余读取按下节审计结果保留；动态执行边界继续由各功能 owner 承接。

### Resulting Impacts

- 缓存回归直接断言 Node 的 `computed` / `cache`、findings 一致与落盘，避免依赖 Bun 的结果作为 Node oracle。
- 候选探针的解析、未知值校验和错误处理进入 TypeScript 检查；eval 只保留 consumer cwd 入口解析与调用胶水。
- 验证最近 manifest 的失败边界和子进程终态；保留 parent 的 name/version、containment、jscpd bin 验收及真实安装证据。
- 稳定 owner 记录版本来源与候选边界；Case `AUX-PACKAGE-CANDIDATE-001` 的 owner 引用覆盖 lifecycle 和安装探针，身份与粒度保持不变。

## Risks / Trade-offs

运行时资格以实际 Node/Bun 证据为准。候选入口解析与 manifest 身份、containment 分别证明依赖选择和安装隔离，须共同保留。
jscpd 当前未声明 exports，现有 manifest 定位在 Node 可用；上游若新增 exports 限制，需重新核对该定位方式。

## Open Questions

无待决的范围或方案问题。本轮追加复核的完成状态由 tasks 2.3 记录。

## 读取消费者与处理结果

### 版本与安装身份

- `findings-cache.ts`：findings cache key 只消费 backend 版本，已改用公开 `getVersion()`；cache format、adapter 版本和结果解释保持不变。
- `candidate/installation-probe.ts` 与 `dependency-probe.ts`：child 以实际 candidate 入口为 anchor 定位依赖，parent 消费 Ajv、markdownlint 的 name/version、jscpd 的 name/version/bin 与 containment。markdownlint 改从公开入口定位最近 manifest，其余身份验收保留。
- `duplicate-detection/jscpd/command-resolution.ts`：消费 manifest 的 `bin` 来选择声明的可执行入口，并限制目标位于包内；以当前 runtime 执行该入口。保留此读取以维持入口选择和隔离契约。
- `compiler-toolchain.ts`：实际 alias 包的 name/version 验证安装身份，`bin.tsc` 定位 runner，`optionalDependencies` 关联平台包版本。manifest 字节、runner、平台 executable、TS6 实现和声明共同进入指纹，分别提供安装身份、平台关联和内容变化信号，均保留。
- `artifact/compiler-cache.ts`：已安装 `@types/node` manifest 是配置指纹的附加内容输入，保留其自身变化信号。它不承担编译启动，也不足以证明全部声明内容未漂移。

### 目录定位与动态执行

- `external-consumer/type-acceptance.ts`：以实际 `@types/node` 为 anchor 定位并复制 `undici-types` 目录，为 fetch 声明建立隔离类型闭包；不读取 manifest 字段。保留从实际依赖位置解析的方式，兼容非 hoist 安装图。
- Decision/Investigation 的非字面量 URL import：消费独立 Skill 的声明，保持项目严格编译边界。改为字面量的 TS6 实验额外纳入 241 个实现文件并产生 44 项严格错误；本轮保留，上游正式分离 types/runtime exports 后可重新评估。
- Gate 的延迟 import：先准备 exact candidate，再绑定并验证 installed entry；保留该执行次序。Jiti `evalModule` 执行实际示例源码，两个 Worker 的动态入口承担隔离执行，也按原功能边界保留。

### 文档与抽象边界

公开缓存指南已承诺 backend 版本失效与显式缓存，修复兑现既有行为，不改变选项、输出、I/O 或失败承诺，因此无需修改用户文档。
内部 Scanner dependencies 与 Package lifecycle 同步实现职责。各读取的字段、身份和定位责任不同，继续由各自 owner 承接；
Node `findPackageJSON` 在当前 Bun 不可用，本轮不建立跨 runtime 的通用 manifest 层。

## Verification Observations

上一轮（2026-11-05）证据如下；本轮调整后的验证与独立审查另列于后，旧结果不代替新验收。

- Bun markdown-lint 17 项和 candidate fixture 4 项通过；独立审查者在 Node `24.18.0` PATH 下复跑合计 21/21。Node 原生 keys 目标 1/1 通过，包含真实 Node child 的 cold/warm 回归。
- Node 原生试跑整个缓存文件为 4/5：reference-capability 场景的 child 使用 `bun:test` mock。该 runner 专属场景不构成 Node 原生全套支持证据。
- 真实 `bun run package:candidate:integration` 独占重跑 6/6 通过；首次与多项检查并行时，cold case 在既定 20 秒限制内超时于 pack。两次结果并存，尚未隔离超时的唯一原因。
- Product/scripts typecheck、lint、format 和 Test Evidence 闭合通过（797 entities、193 Cases、17 topics）。独立审查覆盖 Case owner、probe 接线、最近 manifest 失败边界、原有身份/containment/bin 检查与公开文档无变更理由；未重复重负载 integration。
- 调查报告已发布；Investigation 全量检查 127 份、materials links 639 文件通过。

本轮复核（2026-11-05）已将生产 probe 移入类型化模块，增强错误原因、路径及子进程终态断言，
缓存 Node 回归改用独立契约预期，另新增版本 API 抛错/空版本时 fresh lint 且无缓存目录的实体。
实施者、主线程和独立审查者均取得 Node `24.18.0` PATH 下 Bun 目标 22/22、Node 原生 keys 1/1 通过证据。
Product/scripts typecheck、lint 与 format（1,036 文件）经主线程复跑通过；Test Evidence 闭合为 798 entities、193 Cases。
独立审查按编码规范和 Test Design 核对最终代码、测试、Case、fingerprint 与文档，无剩余实质阻断。
本轮真实 cold integration 在 probe 前的 `bun pm pack` 阶段触发既定 20 秒 case 超时（20.44 秒，0/6）；
单独 `preparePackageCandidate` 的隔离 cold rebuild/install/reuse 成功，digest 与 entry 一致，
但该观察不替代六项 integration 或其预算验收。

文档复核确认可分别恢复当前规则 owner、报告形成时因果与证据、Change 范围和验收边界。
本轮 Investigation 全量检查 127 份且索引 current、materials links 639 文件、Change 结构与局部 diff 检查通过。

## 当前交接

本轮 Git 提交及适用 hook 推送已获授权，由主线程执行。Change finalize/delete 尚未授权，保留本目录。
