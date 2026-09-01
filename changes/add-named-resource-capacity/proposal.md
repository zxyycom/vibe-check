# Proposal

本 Draft 评审 named resource capacity与per-Check weight，使多个可并发 Check能在共同的有限资源预算内 admission，而不把容量大于一的资源伪装成多个 mutex。

## Why

当前 `mutex` 只能表达同名资源容量为一，`maxParallel` 只能限制 invocation或active Check scope的总并发。真实项目可能同时存在 CPU slot、browser worker、数据库连接或内存预算：不同 Check对同一资源占用不同单位，且该资源限制不等同于全局并行度。

用多个 mutex名称模拟数值容量会让配置依赖人为分片，无法保证不同weight的原子占用，也会与priority和无状态 capacity selection产生难以解释的调度顺序。另一方面，在没有测量过的生产争用场景前直接加入通用semaphore、动态权重或多资源公平算法，会制造超过产品需求的调度DSL。

## Outcome

在至少一个可复现资源争用基线证明现有`mutex`与`maxParallel`不足后，Definition可以声明有限的named capacity，Check可以声明静态正整数claim。Scheduler只在所有claim可被原子满足时admit，并在Task settlement后释放；现有dependency/observation、mutex、parallel limit、priority、无状态 policy 与cancellation继续保持可解释且无死锁。没有证据时本Change不进入Plan。
