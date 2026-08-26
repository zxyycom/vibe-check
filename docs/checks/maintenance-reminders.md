# `maintenanceReminders`

## 用途

`maintenanceReminders(entries)` 创建一个固定 ID 为 `maintenance-reminders` 的 Check，用 Git first-parent 历史提醒定期复核维护事项。

## 参数与默认配置

构造函数接收 `entries`。每项需要唯一的短横线 `id`、完整 40 或 64 位十六进制 `baseCommit`、至少一个正 `limits.commits` 或 `limits.changedLines`、非空 `message`，并可选 `mode: "advisory" | "enforcing"`；默认模式为 `advisory`。构造出的 options 还固定 `git: { executable: "git" }`。

## 工作原理

Check 只测量从 `baseCommit` 到 `HEAD` 的已提交 first-parent history 和 Git `numstat`；维护者在真实复核后手动推进基线。

## 效果与结果

每条 entry 都出现在该 Check 的最终数据中。到期条目会附加 message：`advisory` 仍使 Check `passed`，`enforcing` 使其 `failed`；不可测量条目也保留评估数据和提醒。

## `not-applicable` 与 `unavailable`

空 entries 可以完成且无提醒，不作为自动子 Check。无效完整 options 为 `unavailable` / `invalid-options`；取消或 callback 无法形成完整可信的评估数据时，整个 Check 也为 `unavailable`。

## 外部工具与安全边界

只执行本机 Git，且不读取工作区或暂存区，不访问网络，也不会自动修改或推进任何基线。

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

## 非目标

它不替代 Git policy、不会自动创建提交，也不决定项目是否必须停止；聚合策略仍由调用方的 Run controls 决定。
