# Proposal

本 proposal 是为 TypeScript Project Definition 增加声明式文件政策覆盖的可改写实施计划。

## Why

现行配置与扫描管线只为整个项目解析一份 checks policy；README、长篇设计文档、生成示例和普通源码无法在保留同一全局 inventory 的同时使用不同政策。活动方向已经确定运行时 Check、TypeScript Project Definition 与显式文件覆盖，但若直接使用任意对象合并，覆盖顺序、数组行为、owner、输入资格和 cache identity 都无法可靠解释。

## Outcome

在 Check/Record Core 与 TypeScript Project Definition 的接入 seam 就绪后，项目可以按 normalized project-relative path 声明有序、类型化的文件政策。公共 resolution 只执行匹配、closed patch 合并、冻结和 provenance；每项 Check 继续拥有自己的 base policy、可覆盖 leaves、语义校验和结果相关投影。文件政策只能保持或缩小全局 inventory，并让 current 与显式 reference 对同一路径使用同一 invocation policy snapshot。

## Scope

### Intended Change

- 在 normalized Project Definition 中加入完整 base Check policies 与有序 file policy declarations；每项 declaration 具有稳定名称、非空 project-relative globs 和按 `checkId` 归属的 closed partial patches。
- 从各 Check 拥有的 serializable policy schema 派生可覆盖 patch：object 递归到声明 leaves，array 整体替换，后匹配声明只覆盖自己提供的 leaves；拒绝 unknown key、`null` 删除、函数、backend/tool 字段和 base-only leaf。
- 在任何 Check work 前完成 glob 校验、owner 路由、patch 合并、Check-owned semantic validation、深冻结与 provenance；缺失的 optional base policy 不能由 override 创建。
- 在全局 inventory 形成后为每个 normalized path 解析政策；override 不能重新纳入被 scope、generated、vendor 或 VCS 边界排除的路径。
- 让 current 与显式 reference 共用当前 invocation 加载的一份 Project Definition、声明顺序和 normalized path 语义；cache consumer 只投影会改变自身结果的 resolved leaves。
- 增加复用正式 resolver 的人读 `explain-config [project-root] <path>` operation，解释 source、ordered matches、winning leaves 与 inventory-membership 边界，但不运行 Check、baseline、cache、artifact 或网络工作。
- 不在本 Change 中定义 Markdown、JSON、路径、secret、network 或其它 Check 的专属政策字段；不建立 JSON config v2、双读、通用可执行 policy function、第二套 scope collector 或 feature-local merge engine。

### Resulting Impacts

上述解析方案要求 scope、current/reference、cache 与 `explain-config` 共用同一冻结的 resolved policy snapshot，并保持 override 不能扩大 global inventory 的边界。

## Success Criteria

- Project Definition 中的 base policy 与 file patches 在 Check work 前完成 owner、shape、glob、范围和语义校验；非法或无 owner 的数据以可定位错误停止，不被静默忽略或补默认值。
- 多个 declaration 对同一路径的匹配和合并具有唯一、可测试的 document-order 结果；object、array、base-only、absent optional section 与 provenance 语义均有契约测试。
- Global inventory 外路径永不因 override 进入 Check input；current/reference 临时目录差异不改变同一 project-relative path 的 resolved value。
- Built-in 与 custom Check 都只消费自己拥有且冻结的 resolved policy；相关 cache identity 不因 override 名称或其它 Check 的无关政策变化而失效。
- `explain-config` 使用与执行相同的 resolver，清楚区分“政策匹配”与“路径实际属于 inventory”，且没有 scanner、cache、artifact 或网络副作用。
- Configuration、Scan Scope、CLI、Architecture 与测试证据 owner 已同步，目标产品检查、文档验证和 required workspace verification 通过。

## Affected Owners

- `docs/configuration.md`：Project Definition 取代现行 JSON 后的 authoring、normalization、validation、freeze 与 policy provenance。
- `docs/scan-scope.md`：global inventory 与 per-Check exact-input handoff，及 override 不能扩大 scope 的边界。
- `docs/cli.md`：`explain-config` routing、参数、可信输出和 failure mapping。
- `docs/architecture.md`：Project Definition、Check policy resolution、Core 与 Check owner 的调用方向。
- `src/product/**`：Project Definition normalization、policy schema/patch derivation、resolver、scope handoff、cache projections、CLI 与对应测试。
- `docs/testing/cases/**`：新增或调整的配置、scope、reference consistency、cache 与 CLI 可观察证据。
