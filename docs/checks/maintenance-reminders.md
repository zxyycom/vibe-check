# `maintenanceReminders`

返回 [README 的随包 Check 概览](../../README.md#随包提供的-check)。

## 用途

本页说明 `maintenanceReminders` 的输入、terminal effects 与安全边界。`maintenanceReminders(entries)` 创建一个固定
ID 为 `maintenance-reminders` 的 Check，用 Git first-parent history 提醒定期复核维护事项。

## 参数与默认配置

构造函数接收 `entries`。每项需要唯一的短横线 `id`、完整 40 或 64 位十六进制 `baseCommit`、至少一个正 `limits.commits` 或 `limits.changedLines`、非空 `message`，并可选 `mode: "advisory" | "enforcing"`；默认模式为 `advisory`。构造出的 options 还固定 `git: { executable: "git" }`。

## 工作原理

measurement source 是从 `baseCommit` 到 `HEAD` 的 committed first-parent history 与 Git `numstat`。维护者完成
真实复核后，把 `baseCommit` 推进到新的复核基线。

## 效果与结果

每条 entry 都出现在该 Check 的最终数据中。到期条目会附加 message：`advisory` 仍使 Check `passed`，`enforcing` 使其 `failed`；不可测量条目也保留评估数据和提醒。

按 [README 的 Run / Check 结果规则](../../README.md#读取-run-和-check-结果)，先缩窄
`RunResult.kind`，再按 `maintenance-reminders` checkId 读取 outcome。

## `not-applicable` 与 `unavailable`

空 entries 形成一个完成且无提醒的 Check。Run preflight 按构造函数建立的完整 shape 验证 replacement options；
验证失败结算为 `unavailable` / `invalid-options`。通用语法见
[options preflight 与 execution](../api-mechanics.md#options-preflight-与-execution)。cancellation 或 evaluation
无法形成完整可信数据时结算为 `unavailable`。

## I/O 与安全边界

I/O boundary 是本机 Git 对 committed first-parent history 的 read-only 查询。workspace、staging area 与 network
request 数为零，baseline 更新由维护者提交。

## 最小用法

```ts
import { defineConfig, maintenanceReminders, run } from "vibe-check";
const check = maintenanceReminders([
  {
    id: "docs",
    baseCommit: "0123456789abcdef0123456789abcdef01234567",
    limits: { commits: 40 },
    message: "Review docs."
  }
]);
const result = await run(defineConfig({ checks: [check] }));
```

## 适用边界

该 Check 适用于按 commit count 或 changed-line count 提醒维护复核。是否把 `enforcing` failure 转为调用级阻断，
由 `RunControls.checkAggregation` policy 决定。
