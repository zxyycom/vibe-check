# 执行粒度实验：方法与解释边界

本附件说明 2026-10-22（Asia/Shanghai）的隔离实验，不定义产品实现或通用 worker 契约。
结果以同目录 `probe-batch-summary.json` 和对应原始数据为准。

## 实际改变的因素

| 版本 | 判断链位置 | 组件 API | 每路径跨线程请求 |
| --- | --- | --- | --- |
| baseline | 调用线程 | 原生 Promise FS | 原生逐组件调度 |
| direct-sync | 调用线程 | 同步 FS | 0 |
| worker-sync | 单个私有 JS worker | 同步 FS | 1 |
| worker-async | 单个私有 JS worker | Promise FS | 外层 1 次，内部仍逐组件调度 |
| worker-fine | 判断留在调用线程，metadata 转发到 worker | worker 内同步 FS | 每组件 1 次 |
| adaptive | 同 baseline | 同 baseline | 同 baseline，仅改变读取容量 |

所有版本共用实验性的私有生命周期接线；baseline 的原探查算法和 FS 调用保持原样，但包含按路径的包装与上下文支架。
因此正式比较是同框架隔离版本之间的对照，不是已发布产物的直接升级验收。
plain 版本无操作计数/屏障/函数计时插桩；profile 单独执行。各版本内部逻辑不依赖 profile 计数。

同步 kernel 从当前 `filesystem-probes.ts` 的相同 probe region 转换：移除 async/await，替换 lstat/readlink 后端，
保留分量顺序、状态分支、symlink reset、40-hop 限制与错误映射；不是另写一套路径规则。
worker-fine 只传递必要的 file/directory/symlink 三项状态，不传完整 Stats 对象；其比较也包含此 DTO 与控制流位置差异。

每个 resolver 懒创建一个 worker，每次只有一个请求，不跨 invocation 共享；finalize 等待 worker 退出。
缓存恢复/发布、正文读取、整批计费、图与 Records 留在原 owner；Markdown lint 等二参数调用继续原后端。
没有将整个 Run、用户 closure 或 Project Definition 序列化到 worker。

## 行为对照如何解释

每个 runtime/version 组合执行 24 个共同场景、5 个取消场景和 29 个现有测试；worker 另检查异常退出。
共同场景对照结果和顺序化访问轨迹。adaptive 只忽略 trace 中 requested capacity 字段，实际 bytes、结果和 byte bound 仍核对；
读取中增长另外保留完整 trace，要求累计实际读取恰为 max+1，不能按旧 stat.size 截断。

普通安全场景的操作 hook 同步执行。worker 通过共享内存屏障让父侧 hook 在操作前后发生确定性替换，
该屏障只存在于 safety bundle；它证明访问顺序/错误/取消停发，不证明生产消息延迟。
source/target/symlink 三处 abort 后，新候选允许少做后续操作，终态均要求 cancelled、无部分普通 Records/final data。
8000 边场景用 timer 与真实 readFile 完成触发取消，边处理中没有操作屏障替代原 checkpoint。

响应性场景移除操作 hook，以一段受控 100 ms 宿主操作替身说明阻塞边界：异步后端等待 timer，同步后端用 Atomics.wait 阻塞。
timer 在替身开始时才安排，worker 的启动不会提前消耗取消计时。记录 timer delivery 与 probe 返回时点；
这是机制演示，不是实际慢磁盘/网络盘测量，也不证明某个生产取消延迟上限。
worker 内在途同步操作仍要结束；主线程及时收到 abort 不等于 Check 可以立即收束。

## 预检中修正的生命周期问题

1. Bun 1.3.14 下，单独关闭 worker 消息端口未使本实验的 idle worker 退出；最终采用处理完当前请求后，
   收到 close 指令再由 worker 自愿 `process.exit(0)`。父侧等待 exit，没有对在途工作调用 terminate。
2. 初版把 AbortSignal listener 注册放在 worker lifetime handlers 之前。Bun 对既有测试的 Proxy signal receiver
   注册失败时，worker 已创建却没有 exit handler，导致取消/teardown 超时。最终先安装 lifetime handlers，
   再注册 listener；不支持 listener 的 receiver 保留原 owner 的节点边界 signal 轮询。
   正常原生 AbortSignal 仍用共享标志逐组件停止；所有正式性能 profile 的 listener fallback 数均要求为 0。
   最小复核中，同样的 Proxy 包装在 Bun 注册 listener 抛出 TypeError（要求 EventTarget receiver），Node 则注册成功。
3. 安全屏障等待使用一次读取的版本值作为 Atomics.wait 的 expected 值，避免检查与等待之间丢失通知。

正式采样只在修正后的同一身份上运行。旧预检失败不计作性能样本；它们提醒 worker 并非免费或现成的通用执行层。
相邻既有测试没有改正文，只通过临时 bundle 加入实验后端；测试 teardown 关闭直接 resolver 测试留下的 idle sessions。
public Run 的正常/取消/failure 路径另核对每 invocation 的 started/exited 相等，不依赖该测试 teardown。

## 采用前仍需验证

- 发布材料中的 worker 加载、打包路径和安装后行为；本实验使用临时绝对 worker 文件路径。
- Windows、真实慢存储、冷 OS cache、I/O 竞争、真实并行 Check 的事件循环与取消延迟分布。
- 更大/不同大小文件、symlink 密集和多故障的性能退化；当前性能主矩阵是无 symlink 的固定短目录名语料。
- 若拟采用，再按生产 owner 完成类型/边界整理与完整 Gate。当前仅比较私有原型，不新增公共 option、执行器或硬耗时门槛。
