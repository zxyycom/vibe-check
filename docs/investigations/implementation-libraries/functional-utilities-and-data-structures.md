# TypeScript 函数式工具与专用数据结构库调查

## 调查信息
- 核心问题: Vibe Check 应预置哪些函数式数据转换与专用数据结构能力，才能减少重复实现而不引入重叠代码风格？
- 状态: 已结束
- 最新报告时间: 2026-08-11T07:54:34Z

## 调查报告

### 采用 Remeda 与 Mnemonist，保留原生集合默认
- 形成时间: 2026-08-11T07:54:34Z

#### 形成时背景

Vibe Check 是 Bun/Node TypeScript 工具工作区。编码规范需要支持连续无状态数据转换，也需要在
真实复杂度或访问模式出现时使用可靠的专用数据结构；与此同时，简单集合处理仍应保持原生，
同一职责不应在多套 utility API 之间随机切换。

#### 调查目的

本轮需要回答两个问题：

1. Remeda、es-toolkit、Radash/Radashi、Ramda/Rambda 中，哪个候选适合作为连续数据转换的
   默认可选能力。
2. 专用数据结构是否值得预装，以及 Mnemonist 是否比窄用途包或其他综合库更适合承担该职责。

#### 调查范围与依据

外部指标观测于 2026-08-07（Asia/Shanghai）：版本、发布时间、发布文件数、unpacked size、
生产依赖、内置类型、ESM/exports 和 `sideEffects` 来自 [npm registry](https://registry.npmjs.org/)；
下载量使用 2026-07-07 至 2026-08-05 共 30 个自然日的
[npm downloads API](https://github.com/npm/registry/blob/main/docs/download-counts.md)；stars、默认分支
活动和 release 来自官方 GitHub 仓库。下载量可能包含 CI 和传递依赖，unpacked size 也不等于
最终 bundle；两者只用于候选横向比较。

函数式与通用工具比较了 [Remeda](https://github.com/remeda/remeda)、
[es-toolkit](https://github.com/toss/es-toolkit)、[Radash](https://github.com/sodiray/radash)、
[Radashi](https://github.com/radashi-org/radashi)、[Ramda](https://github.com/ramda/ramda) 和
[Rambda](https://github.com/selfrefactor/rambda)。数据结构比较了
[Mnemonist](https://github.com/Yomguithereal/mnemonist)、
[@datastructures-js/priority-queue](https://github.com/datastructures-js/priority-queue)、
[js-sdsl](https://github.com/js-sdsl/js-sdsl) 和
[data-structure-typed](https://github.com/zrwusa/data-structure-typed)。

本地核对覆盖根依赖、lockfile、TypeScript 配置和编码规范，并在 Bun 1.3.14 与当前 TypeScript
native preview 下运行 `remeda@2.39.0` 的 `pipe`/`map` 和 `mnemonist@0.40.4` 的 `Heap`
运行时与类型样例。未执行浏览器 bundle、工作负载性能或供应链安全测量。

#### 调查结果与边界

根 `devDependencies` 精确锁定 `remeda@2.39.0` 与 `mnemonist@0.40.4`：

- Remeda 只用于连续无状态数据转换是主要结构，并且组合后比原生调用更清楚的流程。简单数组
  操作继续使用原生方法；复杂分支、副作用或 `await` 使用结构化循环。
- Mnemonist 只用于访问模式、复杂度或专用语义明确需要 Heap、Deque、Trie、LRU 等结构的
  场景。普通集合继续使用 `Array`、`Map` 与 `Set`。
- 不安装第二套通用 utility 库。es-toolkit 虽是可用的互补候选，但当前没有与 Remeda 明确分离
  的稳定职责；其他候选的维护、类型适配、生态或安装面也没有形成更强理由。

#### 函数式与通用工具对照

| 候选 | 安装面快照 | 采用与维护快照 | TypeScript 与风格边界 | 项目判断 |
| --- | --- | --- | --- | --- |
| [Remeda 2.39.0](https://registry.npmjs.org/remeda/2.39.0) | 2.71 MiB、706 文件、0 生产依赖；`sideEffects: false` | [30 日 37,819,481 次下载](https://api.npmjs.org/downloads/point/2026-07-07:2026-08-05/remeda)；5,410 stars；2026-07-28 仍有默认分支提交 | 内置类型，支持 data-first、data-last、`pipe`、惰性求值与 tree-shaking | **采用**：连续无状态数据转换；简单操作仍用原生方法 |
| [es-toolkit 1.50.0](https://registry.npmjs.org/es-toolkit/1.50.0) | 3.70 MiB、3,958 文件、0 生产依赖；`sideEffects: false` | [30 日 155,443,952 次下载](https://api.npmjs.org/downloads/point/2026-07-07:2026-08-05/es-toolkit)；11,279 stars；2026-08-07 仍有提交 | 内置类型，按函数 tree-shake，覆盖对象操作、clone、debounce 等通用工具 | **不预装**：当前没有独立于 Remeda 的稳定职责，避免第二套集合 API |
| [Radash 12.1.1](https://registry.npmjs.org/radash/12.1.1) | 299 KiB、44 文件、0 生产依赖 | [30 日 7,421,424 次下载](https://api.npmjs.org/downloads/point/2026-07-07:2026-08-05/radash)；4,836 stars；发布和默认分支提交停在 2025-06-18 | 内置类型，API 简单，维护已转向社区 fork | **不预装**：轻量优势不足以抵消维护停滞 |
| [Radashi 12.9.1](https://registry.npmjs.org/radashi/12.9.1) | 448 KiB、7 文件、0 生产依赖 | [30 日 596,740 次下载](https://api.npmjs.org/downloads/point/2026-07-07:2026-08-05/radashi)；945 stars；2026-05-12 发布 | 内置类型、文档完整，是 Radash 的活跃 fork | **不预装**：采用证据与现有候选有明显差距 |
| [Ramda 0.32.0](https://registry.npmjs.org/ramda/0.32.0) | 1.15 MiB、744 文件、0 生产依赖 | [30 日 60,526,801 次下载](https://api.npmjs.org/downloads/point/2026-07-07:2026-08-05/ramda)；24,061 stars；2026-07-26 仍有提交 | 类型外置，自动 curry 与 data-last 会显著塑造调用风格 | **不预装**：生态成熟，但不是当前 TypeScript 工作区的低摩擦选项 |
| [Rambda 11.2.0](https://registry.npmjs.org/rambda/11.2.0) | 703 KiB、151 文件、0 生产依赖；`sideEffects: false` | [30 日 12,554,655 次下载](https://api.npmjs.org/downloads/point/2026-07-07:2026-08-05/rambda)；1,755 stars；2026-05-15 发布 | 内置类型，多参数方法以 curry 和 `pipe` 为主路径 | **不预装**：与 Remeda 重叠且风格锚定更强 |

#### 专用数据结构对照

| 候选 | 安装面快照 | 采用与维护快照 | 能力边界 | 项目判断 |
| --- | --- | --- | --- | --- |
| [Mnemonist 0.40.4](https://registry.npmjs.org/mnemonist/0.40.4) | 375 KiB、104 文件、1 个生产依赖；`obliterator` 约 38 KiB | [30 日 57,374,076 次下载](https://api.npmjs.org/downloads/point/2026-07-07:2026-08-05/mnemonist)；2,432 stars；2026-04-30 发布 | 内置类型；覆盖 Heap、Deque、Trie、LRU、索引和概率结构，可按模块导入 | **采用**：专用结构能力；普通集合仍用原生结构 |
| [@datastructures-js/priority-queue 6.4.0](https://registry.npmjs.org/%40datastructures-js%2Fpriority-queue/6.4.0) | 自身约 15 KiB，连同 heap 依赖约 35 KiB | [30 日 1,095,556 次下载](https://api.npmjs.org/downloads/point/2026-07-07:2026-08-05/%40datastructures-js%2Fpriority-queue)；682 stars；2026-07-30 发布 | 只负责基于 Heap 的优先队列 | **不预装**：职责过窄，已被 Mnemonist 覆盖 |
| [js-sdsl 4.4.2](https://registry.npmjs.org/js-sdsl/4.4.2) | 1.05 MiB、159 文件、0 生产依赖 | [30 日 18,011,752 次下载](https://api.npmjs.org/downloads/point/2026-07-07:2026-08-05/js-sdsl)；800 stars；npm 最新发布为 2023-07-21 | 类型内置，重点覆盖 STL 风格容器 | **不预装**：发布新鲜度和覆盖面弱于 Mnemonist |
| [data-structure-typed 2.6.4](https://registry.npmjs.org/data-structure-typed/2.6.4) | 10.54 MiB、393 文件、0 生产依赖 | [30 日 115,028 次下载](https://api.npmjs.org/downloads/point/2026-07-07:2026-08-05/data-structure-typed)；204 stars；2026-07-30 发布 | TypeScript 原生，结构覆盖广，支持子路径导入 | **不预装**：安装面和采用证据未达到当前门槛 |
| 原生 `Array` / `Map` / `Set` | 无依赖和安装开销 | JavaScript 标准生态 | 承担普通集合、索引、去重和排序 | **默认**：没有专用复杂度或语义要求时使用 |

#### 使用边界与复核条件

1. 先判断问题是连续无状态转换、结构化副作用流程还是专用数据结构需求，再选择对应表达。
2. Remeda 链中的每一步必须仍能用领域语言识别；回调开始包含分支、mutation、错误映射或
   副作用时，改用具名阶段或结构化循环。
3. Mnemonist 的使用必须能指出所需操作、复杂度或专用语义；“库已经安装”不是使用理由。
4. 出现当前能力不能覆盖的稳定通用工具或数据结构需求时，由依赖 owner 重新调查，不在实现
   任务中增加重叠库。
5. 候选持续停止维护、主版本改变模块或类型契约、工作负载转向浏览器 bundle，或性能测量改变
   当前取舍时，重新调查本主题。
