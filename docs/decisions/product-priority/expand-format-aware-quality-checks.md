---
title: 扩展格式感知的非代码质量检查
status: active
alignment: unaligned
createdAt: 2026-08-04T15:02:11Z
purpose: 让 Vibe Check 对文档和结构化资料执行与文件类型匹配的质量检查。
background: 非代码文件不适合进入代码指标，但其链接、结构、格式和敏感内容具有独立质量风险。
decision: 将 Markdown、路径引用、JSON、JSON Schema、秘密与网络外链作为可独立选择的产品能力。
relations: []
---

## 目的
- 让 Vibe Check 检查文档和结构化资料中真实存在的质量风险，同时避免仅因文件进入统一 inventory 就把它交给不理解该格式的代码 scanner。
- 让确定性内容检查、敏感内容检查和有外部副作用的网络检查各自由匹配其语义与风险的产品边界承接。

## 背景
- Markdown 的结构、本地链接和路径引用，JSON 的语法与 schema 适配，以及凭据泄露都具有独立于代码行数、函数复杂度和重复代码的质量含义。
- 网络外链可达性需要 DNS 和 HTTP，不能与离线 Markdown 分类合并，否则普通扫描会获得隐式网络副作用和不稳定结果。
- 仓库脚本中的局部文档校验只服务当前仓库，不能代替 `src/product/**` 拥有的通用产品能力。

## 决策
- 采用: 把 Markdown 结构、Markdown 本地链接、文本路径引用、严格 JSON、JSON Schema、秘密检测和网络外链验证作为各自拥有输入资格、配置、完成状态和 finding 语义的产品能力。
- 采用: Product 先形成统一 normalized inventory，再由每个 capability 选择 exact inputs；adapter 不重新遍历项目，也不因为支持读取某种文件就把该文件自动加入所有 scanner。
- 采用: 离线 Markdown 链接检查只负责确定性分类、本地目标和锚点；网络可达性由独立且显式启用的能力负责。
- 不采用: 把 JSON、Markdown 或 schema 文件重新纳入通用代码指标，或用单一“非代码扫描器”抹平不同格式的输入、失败和安全语义。
