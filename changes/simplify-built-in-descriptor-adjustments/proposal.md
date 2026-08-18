# Proposal

本 Change 将内置 Check 表示收敛为普通 Check 数据，并用顶层 `replace(check, replacement)` 与 `append(check, additions)` 辅助函数提供字段感知的配置调整。

## Why

项目作者应能直接导入 Product 提供的内置 Check，把它与自定义 Check 一样放入 Project Definition 的 Check tree，并只调整该内置 Check 允许配置的 options 或叶子排程字段。

本 Change 实施前，调整能力位于对象自身的 `.replace()` / `.append()` methods，并为复制后的对象维护私有签发身份、receiver 恢复和 materialization。该实现把“由 Product 预先提供默认值”误建模为“必须由 Product 签发的特殊对象”，使普通数据复制、公开 API、校验路径和下游 package surface 都承担了不必要的特殊规则。

本 Change 保留真正需要的产品能力：Product 拥有内置 Check 的 `checkId`、metadata、默认 options 与字段调整语义；项目作者通过普通数据与独立辅助函数完成配置；Package Run pre-work 在开始任何项目工作前校验完整 Check tree，并按已选 `checkId` 构造私有 runtime binding。

## Outcome

- `duplicateDetection`、`fileMetrics` 与 `functionMetrics` 是预先构造的普通内置 Check 数据，可直接放入统一的 Check tree。
- current definition-facing contract 提供 `replace` 与 `append` 两个纯配置辅助函数；下游 package Change 必须投影它们。每次调用返回新的同类内置 Check 数据，不修改输入或共享默认值。
- `replace` 根据具体 `checkId` 提供字段感知的替换；`append` 只追加 owner 明确声明为可追加的集合。
- 内置 Check 的合法性由公开数据结构、受支持的 `checkId`、canonical metadata 与对应 options contract 决定，不依赖对象来源、私有 brand、methods 或 frozen state。
- Check tree normalization 使用统一的普通记录入口，再分别校验 group、built-in 和 custom variants；`defineConfig` 仍只构造 Project Definition value，完整运行前校验仍由 Package Run pre-work 承担。
- 现有 value-owned methods、签发身份、materialization 和复制恢复路径退出当前契约；长期 decisions、Configuration、current public contract、tests、semantic Case 与下游 package Plan 同步到新模型。

## Scope

纳入范围：

- 调整 `src/product/definition/**` 中的内置 Check 数据类型、内置定义表、字段调整逻辑和 Check tree parser。
- 新增顶层 `replace` / `append` 辅助函数，并让 TypeScript 根据传入内置 Check 的 `checkId` 推导合法 patch 与返回 variant。
- 保持 scalar 与固定嵌套字段替换、未提供 branch 保留、open map 整字段替换、叶子排程字段替换，以及 `dependsOn` / `mutex` 追加后按首次出现顺序去重。
- 删除 value-owned methods、`descriptorData`、只用于来源恢复的 `descriptorInputs`、dynamic receiver、`materializeBuiltInDescriptor` 和 descriptor copy reconstruction。
- 演进直接冲突的 Configuration 与 Product Contract decisions，并同步 `src/product/public-contract/current.ts`、Configuration、目标 tests、`WB-PROJECT-DEFINITION-001` 和下游 `establish-api-only-npm-product-boundary` Plan。

不纳入范围：

- 不把 `replace` / `append` 扩展为任意自定义 Check 的通用编辑器；自定义 Check author 继续拥有其完整数据、functions、binding 和 options policy。
- 不新增 generic deep merge、mutable registry、builder lifecycle、Check registration API 或 executable built-in object。
- 不改变 group inheritance、Task/Core architecture、scanner binding、Package Run、Project-owned Run 或 package 发布流程。
- 不把 runtime freeze、serialization round-trip、module instance 来源或 exact object identity 设为公开契约。

## Success Criteria

- 直接导入的内置 Check、辅助函数返回值及其普通数据副本，只要满足同一个闭合公开结构，就按相同规则被接受或拒绝；校验不查询对象来源或 frozen state。
- `replace` / `append` 对三个内置 Check 都保持精确的 TypeScript patch inference、字段语义和确定性结果；`append(replace(fileMetrics, patch), additions)` 是受支持的普通函数组合。
- 两个辅助函数不修改输入、嵌套默认值或 module-shared defaults。实现可以 freeze 值，但 tests 和调用方不得把 freeze 作为合法性或兼容性条件。
- `replace` 拒绝 owner 未声明的字段和非法值；`append` 当前只接受叶子自有的 `dependsOn` 与 `mutex`，并按首次出现顺序去重。
- Check tree parser 直接解析普通闭合记录；declarative normalization 只按 `checkId` 验证 canonical metadata/options。Package Run pre-work 再按已选 `checkId` 构造私有 runtime binding，并在任何 project function、dependency preparation、cache、scanner、reporter 或 output work 前拒绝非法 tree。
- 当前 source、tests 和非历史 docs 不再把 value-owned `.replace/.append`、签发身份、materialization、dynamic receiver 或 copy recovery 描述为受支持行为。
- current definition-facing contract 与目标 package projection 一致表达四个顶层 functions 的不同责任：`defineConfig` 构造 Project Definition，`run` 执行 Product Run，`replace` / `append` 调整内置 Check；另有三个普通 non-callable 内置 Check values，公开数据类型名为 `BuiltInCheck`。
- 目标 tests、Case evidence、decision validation、docs validation、typecheck、lint 和 workspace required verification 全部通过。

## Affected Owners

- Configuration decisions：`docs/decisions/archive/use-standalone-built-in-check-adjustment-functions.md` 拥有普通内置 Check 与字段调整语义；`docs/decisions/archive/use-composable-check-tree-with-run-owned-bindings.md` 拥有统一 Check tree 与 runtime binding 责任边界。
- Product Contract decisions：`docs/decisions/archive/expose-built-in-check-values-and-adjustment-functions.md` 拥有 runtime export surface；`docs/decisions/archive/confirm-built-in-check-and-adjustment-names-before-publication.md` 拥有公开名称。
- 稳定说明与 current contract：`docs/configuration.md`、`src/product/public-contract/current.ts` 及其相邻 tests。
- Product implementation：`src/product/definition/adjustments.ts`、`adjustment-patches.ts`、`built-ins.ts`、`check-tree/**` 和相邻 Project Definition / Package Run tests。
- 测试证据：`docs/testing/cases/scan-configuration.md` 中的 `WB-PROJECT-DEFINITION-001`。
- 下游交接：`changes/establish-api-only-npm-product-boundary/**` 的 runtime entry、declarations、inventory、examples 与 exact-tarball acceptance。
