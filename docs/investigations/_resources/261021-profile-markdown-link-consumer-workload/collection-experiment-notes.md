# 文件收集切面的隔离方法

本附件承接 2026-10-22 深度 10/30/60 实验的文件收集变换、计数模型及局部验证；完整 Run 的性能和安全结论见主报告。

## 切面与候选

`collection-experiment.ts` 导出：

```ts
transformCollectionExperiment(source, absoluteSourcePath, {
  memoizePolicies: false,
  memoizePrefixes: false,
  profile: false,
  safetyObserve: false
});
```

在 Bun 虚拟 `onLoad` 中对 TS 正文调用，处理范围为 `project-files/collection.ts` 和 `filesystem-collection.ts`；可接在其他 mdlink 变换之后。四项开关均关闭时返回原正文。

候选分两档：

- `collection-local`：启用 `memoizePolicies`，在一次 `createCollectionFilesystem` 内缓存 `noDemand(path)`、`selectedPath(path)` 的成功布尔结果；原调用点保留。
- `collection-prefix`：再启用 `memoizePrefixes`，每份 policy 独立缓存纯 `excludes.some(matches(prefix))` 布尔结果，复用不同完整路径共有祖先的排除判断。

输入来自固定 selections，Map 随该次 collection 的 filesystem adapter 释放。目录成员、类型、存在性、授权、正文观察和最终完整列表选择保留原执行路径。
当前实现已有目录/entry 观察共享、同名 entry 索引、预备默认 matcher 和字面 selection Set；候选仅增加纯 policy 结果复用。

## 计数模型与读法

设访问目录集合为 `V`，root-relative 深度为 `d(v)`，必要 policy 路径集合为 `P`，排除 matcher 数为 `X`。

- 物理 `readdirSync` 对应必要目录数 `|V|`。Bun byte-name overload 依赖 entry 的 lazy `lstat`；Node byte Dirent 可提供类型，必要目录的 inspection 仍保留。
- `targetEntry` 从 root 遍历已缓存的祖先 entries，组件访问量可随 `∑ d(v)` 增长；单链目录数随深度增长，逻辑访问的深度二次项可与单次物理枚举并存。
- 原 `noDemand` 的 matcher 上界与 `X × ∑请求路径深度` 有关。local 将同路径完整判断的计算次数限制到 `|P|`，跨路径的共同祖先仍重复计算。
- prefix 将每份 policy 对同一 prefix 的排除计算限制为一次；实际 prefix 集为 `U` 时，matcher 工作上界约为 `X × |U|`。ancestor 循环、字符串处理和 targetEntry 遍历另计；附加 Map 空间随本次访问的 path/policy-prefix 增长。
- 最终 `selectConfigPaths` 保留完整正/负列表、默认防呆层、规范化、稳定排序和去重；各 selection 输出数相加可能大于候选数。

profile 接现有 `globalThis.__batchCount`、`__batchRecord` 回调，key 均以 `collection.` 开头：

| key 组 | 证明范围 |
| --- | --- |
| `collectProjectFileSets`、`setup.*`、`backend.fastGlobAndNormalize`、`final.*` | 同步收集总时长及获取/最终匹配阶段 |
| `physical.readdirSync`、`physical.lstatSync` | 真实宿主调用计数和累计调用时长 |
| `directory.requests/hits/misses` | 逻辑目录请求与既有目录缓存命中 |
| `entry.*`、`targetEntry.componentVisits`、`validatedEntry.*` | byte-name 处理、lazy stat 与祖先遍历工作量 |
| `noDemand.*`、`selectedPath.*` | 请求、实际计算、候选缓存命中和输入字符量 |
| `prune.prefix.*` | 各 policy 的祖先判断请求、计算、prefix 缓存命中及输入字符量 |
| `prune.matcherCalls/matcherPathChars`、`default.matcherCalls` | 真正执行的 matcher 工作量；不把 Map 命中计为 matcher 调用 |

timer 包含子区间：`backend.fastGlobAndNormalize` 包含 adapter、FS、policy 和排序，物理 I/O 包装包含同步绑定及宿主调用。profile 仅用于归因，正式性能比较使用 plain bundle。

## 安全与取消边界

byte-name fidelity、真实 root、逐目录 no-follow、必要 inspection/read 错误、完整匹配和默认防呆层保持原执行路径；selectedPath/noDemand 只缓存纯选择结果。

collection 是同步、无 AbortSignal 的 API，mdlink 在原 lifecycle 边界检查取消。局部 smoke 验证收集结果，完整 Run 另验证收集中 abort 后的 Check 收束、后续正文操作数和普通 Records/data 发布。主线程取消延迟上限另待测量。

仅安全构建启用 `safetyObserve`：真实 `lstatSync`、byte-name `readdirSync` 前后同步调用 `globalThis.__collectionObserve?.({ stage, op, path })`，保留 string/Buffer path；after 仅在宿主成功返回后触发。
hook 可 abort 或 throw；throw 进入原 FS 错误包装，Promise 返回值被拒绝。它保留同步语义；plain/profile 默认无 observer，安全时间独立于性能比较。

## 局部验证与复跑

`collection-experiment-smoke.ts` 将三份回归源打包为 baseline/local/prefix，在 Bun/Node 各运行一次（6 组 × 13 tests），另以三份 selections 的小目录比较 paths 和有序 `lstat/readdir` trace。原测试源码及 Product 保持原样。

```sh
mkdir -p .cache/vibe-check/performance-investigation
owned=$(mktemp -d .cache/vibe-check/performance-investigation/collection-smoke-XXXXXX)
mise exec -- bun run docs/investigations/_resources/261021-profile-markdown-link-consumer-workload/collection-experiment-smoke.ts "$owned"
```

归档 smoke 使用 Bun 1.3.14、Node 24.18.0，6 组回归均通过；三版 paths/FS trace 一致，均为 11 次 `lstat`、7 次 `readdir`、36 次组件访问。Bun 小 fixture 计数用于验证缓存行为：

| 计数 | baseline | local | prefix |
| --- | ---: | ---: | ---: |
| noDemand 请求 | 25 | 25 | 25 |
| noDemand 计算 | 25 | 11 | 11 |
| policy-prefix 请求 | 71 | 35 | 35 |
| policy-prefix 计算 | 71 | 35 | 13 |
| 排除 matcher 调用 | 1266 | 618 | 222 |

另有 Bun baseline/local/prefix × profile 开/关的 6 组 observer smoke：无 hook 结果一致；首个 readdir 前 abort 后仍完成同步收集；4 个操作/阶段注入错误保留 FS 失败映射；异步 hook 被拒绝。完整 Run 的取消映射见安全附件。

回归源为 `collection.test.ts`、`collection-path-identity.test.ts`、`public-collection.test.ts`，覆盖完整列表、默认层、剪枝、必要失败、symlink/root、byte identity 和公开快照。

复跑的 bundle、fixture 和输出为独占目录内的中间物；核对并保留必要结果后清理该精确目录。2026-10-22 的实验目录已清理，方法和结果保存在本资源池。
