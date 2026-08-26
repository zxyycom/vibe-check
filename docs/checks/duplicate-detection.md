# `duplicateDetection`

## 用途

使用 jscpd 在该 Check 自己选择的项目文件中发现重复代码片段，适合把重复实现作为可审计 finding 管理。
它是普通 Check value；Definition 和 Core 不识别其 ID 或参数。

## 参数与默认配置

```ts
{
  files: {
    include: ["**/*"],
    excludeDirs: [
      ".git", ".vibe-check", ".cache", ".venv", "artifacts", "build", "dist",
      "node_modules", "target", "vendor"
    ],
    generatedFiles: ["**/generated/**", "**/*.generated.*"]
  },
  codeAreas: {
    project: {
      description: "This project",
      globs: ["**/*"],
      excludeGlobs: [],
      warningPolicy: "moderate"
    }
  },
  scanner: {
    executable: "vibe-check-package-jscpd",
    args: [],
    availabilityArgs: ["--version"],
    maxConcurrency: 4
  },
  defaultMinimumTokens: 75,
  minimumTokensByCodeArea: {}
}
```

- `files` 完整定义本 Check 的 project-file selection，不来自 `ProjectDefinition` 的全局 scope。
- `codeAreas` 按声明顺序对 selected paths 分组，并为 finding policy 提供 area metadata。
- `scanner` 只由 `duplicate-detection` 消费；default marker 由其私有 jscpd adapter 解析为随 package 安装的 jscpd。
- `defaultMinimumTokens` 是未覆盖 area 的最小 token 数；`minimumTokensByCodeArea` 的每个 key 必须存在于本 Check
  的 `codeAreas`。

项目可先定义一个普通 `repositoryFiles` 或 `metricCodeAreas` value，再以 object spread 显式组合；替换完整
`options` 或 nested branch 时不会自动深度合并。

## 工作原理

Check 验证完整 options，收集 `files` 选中的 paths，按自己的 `codeAreas` 建立 exact input groups 和 fingerprints，
再调用位于 `duplicate-detection/jscpd` owner 内的 adapter。adapter 不重新发现项目文件；每个 scanner measurement 的
source paths 都必须属于对应 exact group。每个接受的重复片段形成一条 supplemental Record，Check-local cache 以 backend、
commit、area、options 与 exact-input fingerprint 定位。

## 效果与结果

无 finding 时为 `passed`，final data 是 `{ findingCount: 0 }`；有 finding 时为 `failed`，`findingCount` 等于已报告
Records 数量。

## `not-applicable` 与 `unavailable`

没有合格 exact input 时为 `not-applicable` / `no-eligible-input`。非法 replacement options 的共享组合、Run
preflight 与 direct execution 边界见[组合与 options preflight](index.md#组合与-options-preflight)。合法 Check 遇到
jscpd 不可用、调用失败、输出无效、越界 measurement 或取消时才返回 `unavailable`，且不发布 partial scanner
result。

## 外部工具与安全边界

只启动本机配置的 jscpd，不请求网络。只有本 Check `files` 与 `codeAreas` 批准的 exact paths 会交给工具；显式替换
`scanner.executable`/arguments 等同于授权执行该项目配置中的命令。

## 最小用法

```ts
import { defineConfig, duplicateDetection, run } from "vibe-check";
const result = await run(defineConfig({ checks: [duplicateDetection] }));
```

## 非目标

它不判断重复是否一定应消除，不自动改写代码，也不替代人工架构判断。
