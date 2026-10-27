# 声明 callback context

需要在 Check、Scheduler 或 command 回调中读取框架提供的字段时，先选择回调位置，再声明该回调实际需要的字段。

1. 按[回调位置](callbacks.md)选择扩展点，并在下方对应的 phase 指南中确认合法字段与生命周期。
2. 不需要框架字段时使用普通 function；需要字段时，在 TypeScript 中用 `defineContextCallback` 声明 phase 和 `contextNeeds`。
3. 在 callback 中读取所声明的字段。先看[自定义 Check 示例](extending-check-lifecycle.md#定义-check)或[自定义准入示例](scheduling.md#自定义准入-policy)，再按下文核对类型、固定时机和权限边界。

Check、Scheduler 与 command 的框架注入 callback 接受普通 function 或 closed `{ contextNeeds?, callback }`。
有业务输入时调用 `callback(input, context)`；Scheduler 没有业务输入，调用 `callback(context)`。
function、缺省或自有 `undefined` 的 `contextNeeds`、`[]` 都表示**零需求**，照常获调用并得到冻结空 context。
业务 options、完整 command 等直接输入不属于需求字段；parser、aggregation、formatter 和纯工具 callback 保持其直接业务签名。
合法字段与生命周期分别由[Check](extending-check-lifecycle.md#callback-声明与字段)、
[Scheduler](scheduling.md#声明-callback-的-context-需求)和[command](command-check.md#callback-声明与输入)拥有。

## 声明与类型

需要框架字段时，TypeScript 使用 `defineContextCallback(phase, { contextNeeds: [...], callback })`；
helper 返回原 descriptor，不执行 callback、不固定 needs；phase 只帮助推导合法字段、参数和结果，不写入 descriptor，实际槽位决定运行时 schema。

推荐 literal tuple；宽化数组、union token 与 tuple union 只保证每种可能声明都确定请求的字段，不能静态读取可能缺失的字段。
helper 保留业务 input、prepared options、typed data/handoff 和返回 literal；独立编写 Check helper 时可标注业务 options 参数类型，
不需手写 context `Pick` 或断言。普通 function 的 context 类型为空；原始 TypeScript descriptor 的 context 为 `never`，
需要字段应使用 helper。JavaScript 可以直接编写 descriptor；所有路径仍接受相同 runtime validation。

具体 helper descriptor 可直接调用 `.callback`，但调用方必须自己提供符合选中类型的 input/context；
这不创建 Run、不授予能力、不自动生产字段。广义 callback 槽位是 function/descriptor 存储接口，必须收窄后调用，
不能用断言绕过 raw descriptor 的 `never` 边界。工具返回值的具体调用形状见对应工具契约。

package root 提供以下命名类型；精确泛型与签名以安装包声明为准：

| 类型 | 用途与边界 |
| --- | --- |
| `ContextCallbackInput<Args, Context, Result>` | 广义 function/descriptor 槽位；`Args` 是业务参数 tuple，context 是最后一个参数。它用于存储，不承诺 descriptor 可直接调用。 |
| `DeclaredContextCallback` / `EmptyContextCallback` | 分别表达显式需求与缺省需求的具体 descriptor，保留业务参数及结果；显式 `[]` 也属于前者，选中字段为空。 |
| `SelectedCallbackContext<Context, Needs>` | 从确定的 needs 推导只读字段；不能用宽化或 union needs 承诺可能缺失的字段。 |
| `CallbackContextByPhase` / `CallbackContextPhase` | helper 的阶段字段 schema 与阶段标识；完整 schema 不表示 callback 默认获得全部字段。 |

## 固定、生产与精确交付

descriptor 接收边界只接受自有 data 字段 `callback` 与可选 `contextNeeds`；callback 必须为函数，needs 必须为 dense 合法顶层 key 数组。
拒绝未知/跨阶段 key、accessor、symbol 扩展、空洞、非数组或需求函数。边界复制、去重、按阶段固定顺序冻结 needs；
随后修改原对象或数组不影响本 Run。Definition 在 author work 前固定声明，command constructor 固定下游，
prepared strategy 返回后、Scheduler 启动前固定其 decide/effect；执行中不增删需求或回补历史。

生产者合并所有消费者需求、真实依赖与内部固定执行/诊断义务，在生产前关闭可选工作，
再在调用边界交付每个消费者的精确视图：**只含自身声明的 own data fields，外层冻结**，不交付需求并集。
不同消费者不保证外层 identity 相同；空视图可复用，同 Run 的冻结 graph/project、同 boundary 的不可变事实也可复用。
旧 snapshot 与 captured prefix 不随之后的执行或 fault 改变。外层冻结不冻结 signal 取消状态或受控 reporter 的内部生命周期。

声明仅选择既有能力，不是 sandbox，也不增加 direct dependency、handoff 或 artifact 权限。
零需求不关闭取消、hard guards、settlement、console capture 或既有输出/诊断义务。
callback 与 needs 是 runtime 配置，不进入 declarative fingerprint；业务 options 等既有声明仍按其 owner 处理。
