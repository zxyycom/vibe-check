---
title: "定位 markdownlint findings 缓存的 Node/Bun 模块解析差异"
id: "261105-diagnose-markdownlint-cache-module-resolution"
formedAt: "2026-11-05T07:37:10Z"
question: "为什么显式启用 markdownLint 缓存后在 Node 中持续返回 uncached，而 Bun 测试仍通过？"
tags:
  - "cache-design"
  - "markdown-lint"
  - "module-resolution"
  - "runtime-compatibility"
relations: []
---

## 形成时背景

消费者反馈：显式启用 `markdownLint` 逐文件缓存后，连续两次检查均返回 `uncached`，指定缓存目录没有建立。
原版本探测使用 `createRequire(import.meta.url)("markdownlint/package.json")`；失败被转换为 `undefined`，lint 本身继续工作。

本轮已安装 markdownlint `0.42.0`，用不依赖 reference 能力的 `no-missing-space-atx` 规则也能观察缓存失效。
[此前 MD052 依赖实例错配](./diagnose-markdownlint-core-instance-mismatch.md)仅为背景材料，关系保留为空。

## 调查目的

解释为何缓存配置合法却完全不进入读写路径，以及为什么既有 Bun 测试未发现；选择不绕过 package exports、
不硬编码依赖版本且保留缓存身份的修复方式。其他包元信息读取的审计与实施由当前 Change 承接。

## 调查范围与依据

证据取得于 2026-11-05，Linux x64。本轮实际可用运行时为 Node `24.18.0`、Node `26.8.2` 与 Bun `1.4.4`；
不据此推断其他 Node/Bun 版本的表现。检查了
[缓存实现](../../src/package-checks/markdown-lint/findings-cache.ts)、
[回归测试](../../src/package-checks/markdown-lint/findings-cache.test.ts)、
[适配器](../../src/package-checks/markdown-lint/adapter.ts)、已安装 markdownlint 的 manifest、公开 exports 和 `getVersion()` 实现。

### 版本读取与缓存行为分开取证

相同旧写法在 Node `24.18.0` 和 `26.8.2` 中抛出 `ERR_PACKAGE_PATH_NOT_EXPORTED`；Bun `1.4.4` 则返回版本 `0.42.0`：

```js
import { createRequire } from "node:module";
createRequire(import.meta.url)("markdownlint/package.json");
```

已安装 manifest 的 `exports` 开放根入口、`./promise` 等路径，但没有 `./package.json`。公开根入口明确导出 `getVersion()`，
本轮调用返回 `0.42.0`。两种写法针对同一安装，排除了依赖未安装或版本文件缺失的解释。

在修复前用 Node `26.8.2` 直接调用 `lintMarkdownWithCache`，输入为同一个 `source.md`、文本 `#missing\n`、
`["no-missing-space-atx"]`，缓存为隔离临时目录下的绝对路径；两次均为 `uncached`，目录不存在。
原 Bun 缓存文件的五项测试同时通过，说明只有 Bun 正向证据不足以覆盖该模块解析边界。

### 回归测试先失败，修复后再验证

在既有 per-file identity 测试中加入真实 Node child，使用独立缓存目录，验证 cold/warm 与实际落盘。
在旧实现下，该测试明确因 Node 的 `uncached/uncached` 与预期 `computed/cache` 不同而失败；没有放宽原断言。
同轮测试复核后，Node 分别断言预期的 `computed/cache`、findings 一致与落盘，不再用 Bun 结果作为 oracle。
另补充版本 API 抛错或返回空版本时的隔离回归，验证 fresh lint 仍产生预期 finding，且不创建缓存目录。

初次修复后，Markdown lint 全目录由 Bun 执行的 17 项测试通过。另一次验证将 Node `24.18.0` 的 bin 显式放到 PATH，
由 Bun 执行五项缓存测试，新增 child 使用受支持 Node；这不是 Node 原生执行全部五项测试的证明。
Node 原生试跑中，reference-capability 场景的 child 使用 `bun:test` mock，不能把该 runner 专属场景误判成缓存修复失败或宣称 Node 全套通过。

本轮主线程又以 Node `24.18.0` 直接调用修复后缓存 API，得到以下独立观察摘要；临时目录在 `finally` 清理：

```json
{
  "runtime": "v24.18.0",
  "backend": "0.42.0",
  "privateMetadata": "ERR_PACKAGE_PATH_NOT_EXPORTED",
  "first": "computed",
  "second": "cache",
  "cacheDirectoryExists": true,
  "sameFindings": true
}
```

同轮 Product typecheck、lint、format 与局部 diff 检查已取得通过证据；这些工程检查不替代上述真实运行时观察，
也不构成全仓或发布验收。

## 调查结果与边界

### 根因是版本探测把包内文件误当作公共入口

旧请求经过模块解析，而不是直接文件读取。Node 在解析未导出的 `./package.json` 时拒绝请求；`createRequire()` 不绕过 exports。
异常转换为 `undefined` 后，模块初始化时保存的 `backendVersion` 始终缺失，
`!cache.enabled || backendVersion === undefined` 每次都进入 fresh lint，根本不会调用缓存工具，因此也不建立目录。

backend 版本用于区分不同 backend 的 findings，应保留在缓存身份中。
本轮问题是入口选择错误被吞掉，触发了版本不可用时的缓存退化；source 读取和 lint 本身仍正常。

### 最小修复使用公开版本 API

版本读取改为静态导入 markdownlint 的 `getVersion()`，保留非空字符串校验及版本不可用时 fresh lint 的原有策略。
findings 解释、cache format 与版本身份保持不变，因而不为此提升 adapter 契约版本。
当前行为规范仍由 [Markdown lint findings cache](../development/scanner-dependencies.md#markdown-lint-findings-cache) 和
[公开缓存承诺](../checks/markdown-lint.md#逐文件-findings-缓存)拥有。

### 适用范围与重新调查条件

已证明的是当前安装、所测运行时及逐文件缓存入口，不是所有 Bun 解析行为、所有消费者安装图或跨平台性能收益。
本轮没有证明 Findings 曾因该版本探测问题出错，也没有实施正式发布；现有消费者不会因本地修复自动获得更新。

更新 markdownlint 的公开入口、修改支持的 Node/Bun 版本、改变构建或安装布局时，应重新核对真实入口与冷/热缓存行为。
对其他依赖的 manifest 读取必须分别判断实际消费者，不把本轮结论扩展为“一律禁止元信息读取”或“所有动态加载均应静态化”。
