# Proposal

本 proposal 是实现高置信度 project-local 文本路径引用检查的可改写实施计划。

## Why

项目说明和生成文本经常用普通文本引用源码、目录或其它项目资料；文件移动后，这些引用不会获得 Markdown link 或 module resolver 的专用验证，容易长期失效。把所有 path-like 字符串都解释为引用会产生大量误报，并可能越过 scan scope 打开宿主路径，因此需要一个独立、语法封闭且只使用项目相对信息的 built-in Check。

## Outcome

Path Reference Check 只消费 Project Definition 与 file policy 批准的文本 segments，识别明确的 project-local path token，并只在当前 normalized inventory 及其目录索引中解析目标。无法解析或词法越出 project root 的引用产生安全、line-independent 的 defect `QualityRecord`；正常完成时无本 Check 领域缺陷则 CheckResult `passed`，存在任一所属缺陷则 `failed`。Markdown destination/autolink、import/module/package 语义和目标内容扫描仍由其它 owner 承接。

## Scope

### Intended Change

- 初始 source 支持 Markdown owner 提供的 visible prose 与 inline-code segments，以及 Project Definition 显式分配的 UTF-8 plain-text inputs；Markdown destination、GFM autolink、fenced code、front matter 与 image/link target metadata 不进入本 Check。
- 支持边界清楚的 `./`、`../`、project-root-relative path、目录尾 `/` 和可选 `:line[:column]` 定位 suffix；统一为 `/` 分隔、case-preserving 的 normalized project-relative target。
- `./` / `../` 相对 source 文件目录解析，其它受支持 token 相对 project root 解析。URL、absolute host path、drive/UNC、glob、template、import specifier 和含控制字符或空白的 token 不进入 target lookup。
- Target lookup 只使用 global normalized inventory 的文件路径和由这些路径派生的目录集合；不打开目标、不 follow symlink、不递归收集，也不因引用扩大 scope。
- 产生 `path-reference-unresolved` 与 `path-reference-out-of-scope` 两种 defect record 语义；前者只发布安全 normalized target，后者只发布安全 escape classification，不包含 raw host path。Unsupported grammar token 被 classifier 排除且不产生 informational/defect record；未来若增加 informational record type，verdict 必须按明确 record type/domain outcome 映射，不能以总 record count 推断。
- Stable identity 使用 Check/Record 类型、source path、reference kind、normalized safe target 或 escape classification 与 line-independent occurrence ordinal；当前位置仅用于本次定位。
- 不在本 Change 中实现 Markdown link destination/anchor、URL reachability、source-language comment extraction、import/module/package resolution、架构依赖图、宿主绝对路径审计或目标内容扫描。

### Resulting Impacts

上述 token 解析方案要求 source segmentation、inventory-derived lookup、owner 去重、安全输出与 CheckResult 语义共同保持 project-local 边界。

## Success Criteria

- 受支持 segments 中有效 file/directory reference 无 record；inventory 中不存在的安全 target 产生可定位 unresolved record；词法 escape 在任何 filesystem access 前产生 out-of-scope record。
- Markdown destination 与 GFM autolink 只由 Markdown Link Check 拥有，同一 occurrence 不产生重复 path record；visible link label 仍按普通 visible text 处理。
- Global excluded/generated/vendor/uncollected path 不会被引用重新纳入或打开；产品输出不暴露 project root、reference checkout root 或其它宿主绝对路径。
- Record identity 不使用 line、column、message 或宿主位置；仅发生行移动时 identity 保持稳定，同一 source/target 的重复 occurrence 可确定地区分。
- 正常完成时，无 unresolved/out-of-scope defect outcome 返回 `passed`，存在任一上述缺陷返回 `failed`。Input read、segmentation、binding 或 protocol failure 如实产生 failed `CheckRun` 与 `result = null`，已经提交的合法 records 不被撤销，Core 不重新解释 path 语义或从 records 推断 CheckResult。
- Scan Scope、Architecture、Configuration、Output 和测试证据 owner 已同步；受支持语法、ownership、scope、identity 与安全输出矩阵均有自动化证据。

## Affected Owners

- `docs/scan-scope.md`：approved source inputs、global inventory 与 target index 不得扩大 scope 的边界。
- `docs/architecture.md`：Path Reference Check、Markdown segment handoff、CheckManager/RecordManager 与 Core 的职责分工。
- `docs/configuration.md`：Project Definition 中的 built-in Check 选择、closed policy 与 file policy resolution。
- `docs/output.md`：安全 project-relative record、current location 与 public machine/human projection。
- `src/product/**`：segment consumer、token classifier、inventory index、Check binding、record catalog、结果与测试。
- `docs/testing/cases/**`：语法、owner 去重、scope、identity、安全输出和失败语义的 Case 证据。
