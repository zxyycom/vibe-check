# Non-core 随包工具实现

本文拥有 Non-core 随包工具的内部职责、私有支撑与生命周期。工具的分类、目录准入和 Core 独立性由
[架构](architecture.md#能力分层与扩展方式)定义，依赖的机械限制由[工作区工具](../tooling/workspace.md#package-tools-依赖边界)定义。
各工具的公开用法与失败契约从[文档导航](../navigation.md#随包用户材料)进入。

## 工具职责

以下路径相对于 `src/package-tools/`，每项工具维护自己的算法和公开编写或呈现语义：

- `finding-presentation/finding-presentation.ts` 拥有 `presentCheckFindings(...)`、其私有
  `appendCheckMessages` 与 Finding message 投影；Finding facts、明细位置和 terminal outcome 由 Check owner 定义。
- `admission-policy/define-admission-policy.ts` 拥有 `defineAdmissionPolicy(...)` 的 exact authoring types、
  inference 与声明 JSDoc；defaults、validation、normalization 与 fingerprint 由 Project Definition 定义。
- `cache/cache-json-by-key.ts` 拥有 caller-keyed JSON 的本地缓存机制，见[缓存边界](#caller-keyed-cache-boundary)。
- `finding-waivers/reconciliation.ts` 拥有按调用方语义 identity 对账 Finding waiver 的纯函数，使用公开 Core 数据工具
  规范化和比较身份；Record 发布和 Check outcome 由采用方负责，工具不拥有 Run 或 Gate 生命周期。
- `learned-critical-path/**` 拥有 learned strategy、私有时长模型与 critical-path ranking，见[策略实现](#learned-critical-path-helper-owner)。

## Learned critical-path helper owner

`src/package-tools/learned-critical-path/**` 拥有 exported `createLearnedCriticalPathStrategy(...)` 与其 caller-owned
duration-history model：factory 验证调用方提供的绝对 state directory、identity projection 和有界 model controls，在普通
public prepared-strategy lifecycle 中准备 immutable prediction/critical-path selection closure，并在 terminal Hooks 完成后
记录下一次 Run 可用的样本。它不读取 Product options、flags、project root 或 diagnostic channels，也不改变 Scheduler 的
legality owner；`duration-model/**` 只承接该 helper 的 bounded history、prediction、recording 与 storage mechanics，
`critical-path-ranking.ts` 只承接此 helper 的 ranking。

helper 从 frozen public graph 的 `dependsOn` / `observes` 形成 critical-path score。history identity 由调用方的
canonical projection 与 model settings 组成；持久材料保留 digest、admitted-to-settled duration、settlement kind 与
observation sequence。missing、malformed、incompatible 或 read-failed history 形成 empty model；invalid identity、
setup、prediction 或 score construction failure 使用 static decision fallback。record/write failure 与并发 last-writer
只影响后续样本；observer failure 由 helper 包含。参数、安全与使用方法由[调度指南](../guides/learned-scheduling.md)拥有。

## Caller-keyed cache boundary

`src/package-tools/cache/**` 拥有 caller-keyed canonical JSON object 的 identity、untrusted disk envelope、
read/compute/write observation 与 atomic local publication。调用方负责 key 的正确性、payload 含义以及如何采用缓存结果。

缓存工具使用 `src/data-boundary/**` 的公开数据能力 materialize payload 与 identity，数据能力保留 Core owner。
它不发现项目输入，也不获得 project root、scanner、Check facts、diagnostic logger、output 或 Run lifecycle capability；
cache hit 不跳过 execution 或重放 Check settlement。完整 public contract 由[缓存计算结果](../guides/cache-results.md)拥有。

cache directory 是 caller-trusted disposable local state。atomic temporary publication 只保护完整 target，不引入 lock、single-flight、cleanup、remote sharing、tamper resistance 或 secret protection。duplicate detection 的 Check-local raw fragment cache 及其 unavailable mapping 由该 Check 的 scanner/availability owner 定义。

## 验证

修改工具时运行相邻目标测试和两向依赖门禁；公开契约变化同步指南、声明与 consumer 验收。
learned history/model tests 证明读写、prediction、recording 与 failure containment，策略测试与 Run 集成测试共同证明
工具通过普通 prepared-strategy lifecycle 使用 Scheduler。测试与文档验证入口见[测试策略](../testing/strategy.md)。
