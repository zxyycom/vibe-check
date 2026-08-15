---
title: 在配置与运行操作旁公开内置 Check 值
status: active
alignment: unaligned
createdAt: 2026-08-14T13:50:34Z
purpose: 让项目直接组合 Vibe Check 提供的三个内置 Check，而不重述内置目录或私有执行绑定。
background: 内置 Check 是稳定的项目 authoring 起点；仅公开配置定义函数和运行函数会迫使项目以字符串目录再次声明同一能力。
decision: 目标 Package 保留两个 callable operations，并额外导出三个 frozen non-callable built-in Check descriptor values。
relations:
  - type: 修订
    target: product-contract/expose-config-definition-and-project-run-operations.md
---

## 目的

- 让项目配置能直接导入并组合 Product-owned 的 duplicate detection、file metrics 与 function metrics Check，而无需重复内置目录、选中列表或执行实现。
- 保持 package 的运行入口仍然最小：项目以配置定义函数形成值，并以 Package Run 执行该值；项目 Run 继续由使用项目拥有。

## 背景

- 本决策形成时，三项内置能力已经有稳定的产品语义、Check identity 与记录 surface，但项目 authoring 仍需要用字符串把它们重新登记、选择和排程；current definition-facing source 现已由上游 tree Change 改为直接组合 values。
- Project Definition 是可信 TypeScript，能够直接组合普通冻结值；这种组合不要求 package 新增 loader、registry lifecycle、CLI 或第三个执行操作。
- 内置 scanner binding、applicability 和 operational dependency resolution 依赖 invocation context，不能作为 project 可替换的 executable object 公开。
- Current definition-facing source 已提供三个 descriptor values，但 repository root 仍是 private workspace，尚无可安装 `vibe-check` package entry。本记录中的 Package surface 是下游 `establish-api-only-npm-product-boundary` 必须投影并以 exact tarball 证明的未来方向；当前 source availability 不等于 npm availability。

## 决策

- 采用: 目标 Package runtime surface 保持恰好两个 callable operations：配置定义函数与 Package Run。它另外导出三个 frozen、non-callable built-in Check descriptor values：`duplicateDetection`、`fileMetrics` 与 `functionMetrics`。
- 采用: 这三个 descriptor 是 Project Definition Check tree 的直接可组合 leaf inputs；它们表达稳定 identity、public metadata、该 built-in 已允许的 typed options 与 authoring defaults，不要求项目再写 built-in catalog 或 selection。
- 采用: Package Run 依据已验证并冻结的 built-in identity 在 invocation 内解析私有 binding、applicability 与 external dependency snapshot。descriptor 不公开、替换或接受 scanner adapter、command arguments、内部 ports、scheduler state 或 executable binding。
- 采用: 支撑 descriptor authoring 和结果使用所必需的 public types 可以导出；它们不把 Core、manager、scheduler、Task、binding 或 internal module path 提升为 supported import。
- 不采用: 将三个内置 Check 设计为第三个 callable operation、builder/registration API、全局 mutable registry，或让项目以同名 custom declaration 覆盖内置执行语义。
