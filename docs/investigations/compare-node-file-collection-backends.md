---
title: "Node 文件收集后端选型：社区、依赖体积与失败边界"
id: "261006-compare-node-file-collection-backends"
formedAt: "2026-10-06T09:46:40Z"
question: "在不绑定 Bun、允许破坏性变更且不能静默漏检的约束下，哪种 Node 文件收集后端更适合替换现有遍历器？"
tags:
  - "dependency-policy"
  - "file-collection"
  - "nodejs"
  - "software-selection"
relations: []
---

## 形成时背景

其他项目反馈：文档去重与链接检查先进入临时测试目录，再应用部分排除规则，因目录访问失败而中断。反馈缺少工具版本、完整配置和现场日志，具体根因待核实。

本项目的 [Project files](../development/project-files.md)与[公开收集指南](../guides/collecting-project-files.md)规定显式 `filesystem` / `git-worktree` 来源，使用 include/exclude 选择路径，来源失败须明确报告。当前 filesystem 实现为手写 `readdirSync` 遍历加 `minimatch` 过滤；提前剪枝仅覆盖全部同源 selection 共同声明的 `**/<literal-directory>/**`。

用户目标是：可证明范围外的目录在进入前跳过；可能包含目标的目录、或已选中文件读取失败时明确报告。允许破坏性变更，旧匹配语法不作为兼容要求；后端使用标准 `node:*` API 或第三方库，运行时不绑定 `Bun.*`。

调查初期优先考虑原生 glob；权限复现暴露静默漏检风险，促使本轮转向比较库的错误策略、目录剪枝、社区与依赖成本。

## 调查目的

比较 `fast-glob`、`glob`、`tinyglobby`、`globby` 与标准 `fs.globSync` 的社区采用、维护、同步用法、依赖体积及失败语义，为后端选型提供主候选与接入验证条件。范围限定为调查与集成建议。

## 调查范围与依据

### 时点、版本与证据类型

资料与复现于 **2026-10-06** 取得。随附快照供复核动态指标、依赖解析版本和包级大小；正式版本以当日 npm `latest` 与 registry 发布时间为准，master 仅用于观察未发布维护活动。

| 对象 | 实际检查范围 | 证据边界 |
| --- | --- | --- |
| 本项目 | `src/package-checks/project-files/{collection,configuration,public-collection}.ts`、host filesystem walker、共同 config-glob matcher；owner、README 与 package artifact 文档 | 源码阅读与 in-memory 文件系统模拟 |
| 标准 glob | Bun 1.4.2 与 Node v26.8.2 的 `node:fs.globSync` 权限/缺失目录复现；Node v24.18.0 已发布源码 | Bun 只是一个受测宿主，不是建议绑定的 API；项目最低 Node 24.18 只做源码核对，未在该版本执行复现 |
| 第三方库 | fast-glob 3.3.3、glob 13.0.6、tinyglobby 0.2.17、globby 16.2.4；对应依赖版本的源码和正式文档 | 未安装或执行这些新库；行为判断来自固定版本源码，部分边界仍是推断 |
| 社区与维护 | npm registry / downloads API、GitHub repository API、固定 commit、官方消费者源码 | 查询快照，不证明未来维护或独立用户数量 |
| 依赖成本 | 必要运行时依赖图和发布包 `dist.unpackedSize` | 体积估算，不是本项目安装、bundle、内存或速度测量 |

子代理调查库资料；主线程独立核对四库的版本、发布日期、直接依赖、自包大小、同窗下载、stars/forks，并复算固定依赖版本的体积之和。

### 热度与体积口径

- **热度**：npm **2026-09-28 至 2026-10-04** 七天下载请求，含所有版本、CI 和传递安装，不代表独立用户或直接采用项目数；stars/forks 为查询当日累计值。
- **维护**：结合正式发布时间与实际代码变更，区分运行时修复、构建、CI 和文档活动。
- **依赖**：固定 root，递归解析查询时满足声明范围的最高稳定版本，按 `name@version` 去重；纳入必要运行时依赖与非 optional peer，排除开发和可选依赖。本次各闭包没有同名多版本。
- **体积**：包数不含 root，体积含 root，累加 registry `dist.unpackedSize`；缺失该字段的 `is-extglob@2.1.1` 由子代理按[官方 tarball](https://registry.npmjs.org/is-extglob/-/is-extglob-2.1.1.tgz)普通文件长度之和计为 **6,217 B**，主线程据此复算。
- **解释边界**：独立闭包估算不是实际安装、bundle、内存或速度测量。本项目[发布依赖规则](../tooling/package-artifact.md#依赖与发布清单)保留第三方 imports；普通依赖不 bundled 进产品 tarball，真实安装增量还取决于已有依赖共享、lockfile 和平台。

### 本轮复现与观察

本项目收集器的 in-memory 模拟替换 `fs.readdirSync`，对虚拟 `.tmp` 注入 EACCES，保留可读的 `docs/guide.md`；结束后恢复原方法。`include` 固定为 `docs/**/*.md`：

| exclude | 观察 |
| --- | --- |
| `.tmp/**` | 尝试进入 `.tmp`，模拟 EACCES 导致收集抛错 |
| `**/.tmp/**` | 提前跳过 `.tmp`，返回 `docs/guide.md` |
| 当前默认 exclude | 提前跳过 `.tmp`，返回 `docs/guide.md` |

结果定位了本项目剪枝形式的限制；默认 `.tmp` 排除在该模拟中有效，外部项目配置仍未知。

标准 glob 复现使用真实临时普通目录，将存有 Markdown 的子目录设为权限 `000`。Node v26.8.2 结果如下，Bun 1.4.2 得到同类结果；结束后恢复权限并精确清理 fixture。

| 场景 | Node v26.8.2 `fs.globSync` 观察 |
| --- | --- |
| `**/*.md` 可能匹配不可读子目录 | 返回可读部分 `guide.md`，不抛 EACCES |
| `private/*.md` 只指向不可读目标目录 | 返回 `[]`，不抛 EACCES |
| project root 不存在 | 返回 `[]`，不抛 ENOENT |

[Node v24.18.0 的 readdir cache](https://github.com/nodejs/node/blob/v24.18.0/lib/internal/fs/glob.js#L219-L231)也在 `catch` 后返回空 entries。读取失败可能呈现为合法空结果，因此原生 glob 尚不能直接承担严格收集。

## 调查结果与边界

### 核心结论

**fast-glob 是热门、仍有维护的主候选，建议以薄适配继续验证。** 选型优先级是可信失败、范围感知、Node 独立运行，再比较维护与体积。tinyglobby 更小且同期下载更多，但默认吞错；glob 和原生 glob 也有静默漏检风险。globby 适用于需要 Gitignore、ignore-files 或目录展开的场景，本项目目前没有这类必要性。

### 社区采用与维护

| 库 | npm latest / 正式发布日期 | 七天下载请求 | GitHub stars / forks |
| --- | --- | --- | --- |
| [fast-glob](https://api.github.com/repos/mrmlnc/fast-glob) | [3.3.3 / 2025-01-05](https://registry.npmjs.org/fast-glob) | [190,002,087](https://api.npmjs.org/downloads/point/2026-09-28:2026-10-04/fast-glob) | 2,824 / 146 |
| [glob](https://api.github.com/repos/isaacs/node-glob) | [13.0.6 / 2026-02-19](https://registry.npmjs.org/glob) | [483,346,591](https://api.npmjs.org/downloads/point/2026-09-28:2026-10-04/glob) | 8,711 / 540 |
| [tinyglobby](https://api.github.com/repos/SuperchupuDev/tinyglobby) | [0.2.17 / 2026-05-30](https://registry.npmjs.org/tinyglobby) | [258,096,458](https://api.npmjs.org/downloads/point/2026-09-28:2026-10-04/tinyglobby) | 544 / 30 |
| [globby](https://api.github.com/repos/sindresorhus/globby) | [16.2.4 / 2026-08-19](https://registry.npmjs.org/globby) | [108,793,443](https://api.npmjs.org/downloads/point/2026-09-28:2026-10-04/globby) | 2,645 / 141 |

- **fast-glob**：2026-09-07 [目录标记路径修复](https://github.com/mrmlnc/fast-glob/commit/01e56a0395fc7b20491904642d5a57a7b17c5b8d)、09-01 [错误过滤接口改造](https://github.com/mrmlnc/fast-glob/commit/7d65909db7d17b35dc351e8e2f5aa3ee2ac9f324)显示仍在维护；master 的 `errorFilter` 尚不属于正式 3.3.3。
- **glob**：2026-02-17 [brace expansion 限制变更](https://github.com/isaacs/node-glob/commit/c8574ebb3f9fd543b8fc97bfe18ca91ef0c5c78b)与 09-19 [构建维护](https://github.com/isaacs/node-glob/commit/3386a2aca38d36db71500d10df68d34c14d92013)分别说明行为与工程维护。
- **tinyglobby**：2026-04-12 [Windows drive-relative 路径修复](https://github.com/SuperchupuDev/tinyglobby/commit/678c5bf4ea4d35bfa8ae335963b6633a17d8979c)、04-15 [公开 adapter 类型变更](https://github.com/SuperchupuDev/tinyglobby/commit/4242ba95b2dcddc34a66aeaf529fd3dde67747aa)提供实际代码维护证据。
- **globby**：2026-08-19 有[ignore 与 Gitignore 交互修复](https://github.com/sindresorhus/globby/commit/19e1fce28f0fd2cf95b973d772009ba9a74786c6)，07-15 有[忽略目录剪枝改进](https://github.com/sindresorhus/globby/commit/8bf8f54fc3e088cbf5ce833c00671811a92b7b1c)，近期存在明确行为维护。

查询时的采用例子包括 [Vite → tinyglobby](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugins/importMetaGlob.ts)、[npm CLI → glob](https://github.com/npm/cli/blob/latest/package.json)、[globby → fast-glob](https://github.com/sindresorhus/globby/blob/v16.2.4/package.json)、[del → globby](https://github.com/sindresorhus/del/blob/main/package.json)。未固定 commit 的链接会变化；这些例子只证明采用。

### 接口、许可与体积

| 库 | Node engine / license | 模块 / 同步入口 | 直接 / 全部依赖包数 | 自包 unpacked | 含自身的闭包 unpacked |
| --- | --- | --- | --- | --- | --- |
| [fast-glob 3.3.3](https://registry.npmjs.org/fast-glob/3.3.3) | >=8.6 / MIT | CJS；`fg.sync`、`fg.globSync` | 5 / 17 | 98,396 B | 517,961 B，约 506 KiB |
| [glob 13.0.6](https://registry.npmjs.org/glob/13.0.6) | `18 \|\| 20 \|\| >=22` / BlueOak-1.0.0 | ESM + CJS；`globSync` | 3 / 6 | 1,607,230 B | 6,482,889 B，约 6.18 MiB |
| [tinyglobby 0.2.17](https://registry.npmjs.org/tinyglobby/0.2.17) | >=12 / MIT | ESM + CJS；`globSync` | 2 / 2 | 39,288 B | 186,338 B，约 182 KiB |
| [globby 16.2.4](https://registry.npmjs.org/globby/16.2.4) | >=20 / MIT | ESM；`globbySync` | 7 / 23 | 115,569 B | 780,890 B，约 763 KiB |
| Node `fs.globSync` | 项目最低 Node 24.18 已提供 | 标准 `node:fs` | 0 / 0 | 无新增第三方包 | 无新增第三方包 |

四库的最低 Node 要求均覆盖项目 README 的 Node >=24.18。许可来自正式 metadata，完整传递依赖法律材料审计待接入时完成；体积含声明、源码、source map 等材料，本轮没有性能 benchmark。

### 文件选择与失败策略

| 后端 | 排除目录 / include 行为 | 错误策略 | 默认 dot / symlink / Gitignore |
| --- | --- | --- | --- |
| fast-glob 3.3.3 | include partial matcher 与 ignore deep filter；整目录剪枝写作 `**/dir/**`，不是 `**/dir/**/*` | 默认保留 EACCES，只忽略 ENOENT；`suppressErrors:false` | dot=false；follow=true；不自动读 Gitignore |
| glob 13.0.6 | 支持 ignore 与 `childrenIgnored()` | path-scurry 的目录读取 catch 清空结果，裸用不满足 strict collection | dot=false；globstar 不全面跟随链接，但具体模式有例外；不自动读 Gitignore |
| tinyglobby 0.2.17 | partial matcher 与 fdir exclude；默认展开目录 | fdir 默认 `suppressErrors:true`；公开 GlobOptions 没有关闭该行为的选项 | dot=false；follow=true；不自动读 Gitignore |
| globby 16.2.4 | 基于 fast-glob，另提供 ignore-files / Gitignore 和目录展开 | 普通扫描继承 fast-glob；启用 ignore-file 能力还会增加读取路径 | dot=false；follow=true；Gitignore 默认关闭 |
| Node 24.18 `fs.globSync` | 支持 pattern 数组与 exclude | readdir cache 把读取失败转为 `[]`，没有公开 strict-errors 开关 | 没有公开 dot 开关；followSymlinks=false；不自动读 Gitignore |

表中语义来自固定版本源码 / 文档，原生 glob 另有本机复现：[fast-glob 目录排除](https://github.com/mrmlnc/fast-glob/blob/3.3.3/README.md#how-to-exclude-directory-from-reading)与[错误过滤](https://github.com/mrmlnc/fast-glob/blob/3.3.3/src/providers/filters/error.ts)、[glob 的 path-scurry](https://github.com/isaacs/path-scurry/blob/v2.0.2/src/index.ts)、[tinyglobby crawler](https://github.com/SuperchupuDev/tinyglobby/blob/0.2.17/src/crawler.ts)与 [fdir 配置](https://github.com/thecodrr/fdir/blob/v6.5.0/src/builder/index.ts)、[globby 正式文档](https://github.com/sindresorhus/globby/blob/v16.2.4/readme.md)、[Node 24.18 实现](https://github.com/nodejs/node/blob/v24.18.0/lib/internal/fs/glob.js)。

### 使用建议与仍需处理的边界

主候选为 **fast-glob 3.3.3 + 显式 micromatch**。以下是未执行的同步 API 示意，接入时还需补足适配：

```ts
import fg from "fast-glob";

const paths = fg.sync(include, {
  cwd: projectRoot,
  ignore: exclude,
  dot: true,
  onlyFiles: true,
  followSymbolicLinks: false,
  suppressErrors: false
});
```

适配需要解决四组边界：

- **root 与错误**：显式验证 project root，将范围内读取失败与合法无匹配区分。fast-glob 默认忽略 ENOENT；root 预检仍不能覆盖遍历期间目录消失。
- **扫描起点（源码推断）**：[任务生成](https://github.com/mrmlnc/fast-glob/blob/3.3.3/src/managers/tasks.ts)和[同步入口](https://github.com/mrmlnc/fast-glob/blob/3.3.3/src/providers/sync.ts)提示 `include: ["private/**/*.ts"]`、`ignore: ["private/**"]` 可能先读取被排除的 glob-parent 起点，静态 include 先 stat 后过滤；`followSymbolicLinks:false` 也不约束 symlink 起点。三者需实测后确定前置控制。
- **来源与结果**：Git collector 继续枚举 tracked、非忽略 untracked 与安全初始化 submodule；收集层保留普通文件、相对 `/` 路径、排序、去重、冻结及显式来源。内容读取与失败结算归 owning Check，不增加隐式回退。
- **共同匹配规则**：fast-glob 无公开纯路径 matcher，Git candidates 可用显式依赖 [micromatch 4.0.8](https://github.com/micromatch/micromatch/blob/4.0.8/README.md)，如 `micromatch(paths, include, { dot: true, ignore: exclude })`；filesystem、Git 和 changed-path matching 需验收同一新 grammar。同版本直接声明不会增加本次已去重闭包，但不能依赖偶然 hoist。

其它方案的最小接口形状是 glob 的 `globSync(patterns, { cwd, ignore, nodir: true })`、tinyglobby 的 `globSync(patterns, { cwd, ignore, expandDirectories: false })`、globby 的 `globbySync(patterns, { cwd, ignore, expandDirectories: false, gitignore: false })`。相似调用形状不代表相同错误策略。

体积优先时，可再评估 tinyglobby 的公开 fs adapter 加错误记录 / 最终抛错；其适配成本与有效性尚未验证。

### 证据边界与后续验证

本轮产物是报告与证据快照，完成了资料调查、源码审查、原生权限复现和指标复算。第三方后端尚未安装或接入，建议仅表达形成时认识，不替代长期 Decision 或实施授权。

接入前在支持的 Node 版本上验证上述四组边界，至少覆盖范围外 / 范围内不可读、缺失 root、dot paths、静态 include、symlink 起点与后代、重叠 selection 和跨来源匹配一致性；选中文件读取失败由 owning Check 报不可用。

新正式版本、错误策略或 Node 支持范围变化，真实目录 / Windows / symlink 反例，以及实际安装增量或性能问题，均需按新条件重新取证。

## 随附资源

- [动态指标、固定依赖闭包与原生复现结果快照](./_resources/261006-compare-node-file-collection-backends/evidence-snapshot.json)
