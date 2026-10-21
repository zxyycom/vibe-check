---
title: "ts-pattern 5.9.2 升级价值与实际消费缺口"
id: "261021-assess-ts-pattern-upgrade"
formedAt: "2026-10-21T03:31:48Z"
question: "ts-pattern 5.9.0 至 5.9.2 的类型性能修复是否值得本项目现在升级？"
tags:
  - "dependency-upgrades"
  - "ts-pattern"
  - "utility-libraries"
relations: []
---

## 形成时背景

调查时，根 devDependency、lockfile 与安装固定 `5.9.0`。对 `src/**`、`scripts/**` TypeScript 文件按包名检索未发现活跃 import/require，[发布 manifest](../../scripts/package/artifact/release-manifest.json)未携带该包；当前确认的是开发依赖声明，而非可定位的 match 调用。

## 调查目的

判断官方 type-check 改进能否成为当前收益，不用上游重型 union benchmark 代替本项目消费证据。

## 调查范围与依据

2026-10-21 UTC 核对 [npm latest](https://registry.npmjs.org/ts-pattern/latest)、官方 [5.9.1](https://github.com/gvergnaud/ts-pattern/releases/tag/v5.9.1)、[5.9.2](https://github.com/gvergnaud/ts-pattern/releases/tag/v5.9.2)。最新稳定 `5.9.2`。检索仅说明本次受管源码范围未找到包名引用，不证明仓库外/动态加载完全不存在。

## 调查结果与边界

**建议：暂缓单独升级；有真实 match consumer 后再采用 5.9.2。**

5.9.1 对大型 `.exhaustive()` literal/discriminated union 降低 type instantiations，并改变无效两参数 `.with()` 的错误形式/位置；5.9.2 使错误中的类型名更可读、进一步减少其 benchmark 的 instantiations。官方量化结果只属于上游样本，本项目没有发现相应消费者，不存在可确证的本地编译收益。错误位置变化也可能影响未来的负向类型测试，不能一概说没有兼容成本。

如果选维护升级，更新 pin/lockfile，跑两个 typecheck scope；若发现外部 consumer，应增加对真实 pattern 与负向类型诊断的针对性验收，而不是为追版本重写现有 switch。删除依赖不属本次动作。未安装运行 5.9.2，未证明本地性能或任何未检索消费者兼容性。
