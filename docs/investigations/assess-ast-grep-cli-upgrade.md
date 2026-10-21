---
title: "@ast-grep/cli 0.51.0 升级价值"
id: "261021-assess-ast-grep-cli-upgrade"
formedAt: "2026-10-21T03:30:43Z"
question: "ast-grep 0.45.0 至 0.51.0 对测试证据静态发现是否值得升级？"
tags:
  - "ast-grep"
  - "dependency-upgrades"
  - "test-evidence"
relations: []
---

## 形成时背景

调查时，根 devDependency、lockfile 与安装精确为 `0.45.0`。[command.ts](../../scripts/test-evidence/ast-grep/command.ts)另有版本常量及预期 version line；[scan.ts](../../scripts/test-evidence/ast-grep/scan.ts)与 rule-tests 使用仓库 YAML 规则发现 Bun 测试实体。它是仓库证据工具，不是 Product runtime。

## 调查目的

比较当前补丁线和最新候选，保护测试发现完整性，不因 outline/新语言功能扩张项目用途。

## 调查范围与依据

2026-10-21 UTC 读取 [npm latest](https://registry.npmjs.org/@ast-grep/cli/latest)、[0.45.1](https://github.com/ast-grep/ast-grep/releases/tag/0.45.1)、[0.45.3](https://github.com/ast-grep/ast-grep/releases/tag/0.45.3)、[0.50.0](https://github.com/ast-grep/ast-grep/releases/tag/0.50.0)、[0.51.0](https://github.com/ast-grep/ast-grep/releases/tag/0.51.0)。最新稳定 `0.51.0`、Node `>=12`；`0.45.3` 是较窄补丁候选。

## 调查结果与边界

**建议：可选维护升级；先比较 0.45.3，若要采用新发布线再验证 0.51.0，没有当前迫切功能缺口。**

0.45.1 修复 root metavariable 对 comment 匹配，0.45.2 修复 broken pipe，0.45.3 更新 tree-sitter 并提供 min-severity；这些可能影响规则发现/解析但尚未在当前规则中观察到误判。0.50 加 custom-language loading opt-in/trust/revoke policy，0.51 修复 update-all 写入失败的文件保护并更换 YAML backend；本项目只用内置 TypeScript 静态 scan/rule-test，未使用 rewrite update-all、自定义 native grammar 或 outline，新能力不构成直接收益。

实施需同步 pin/lockfile、version 常量/精确 version evidence，运行 ast-grep rule tests、static scan adapter tests、完整 test-evidence check，以既有 entity inventory 对照漏报/误报。YAML backend 与 tree-sitter 更动使“version probe 通过”不足以证明发现完整；不要通过更新 ledger 掩盖新版漏发现。未安装运行候选，规则行为和发现数量待验证。
