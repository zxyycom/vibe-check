# Tasks

仅实施 waiver 配置可省略，通过输入、回归、安装后验收和独立反查完成交付。

## Readiness

- [x] 0.1 确认最小范围、默认及非法值语义，读取 owner 与现有 Decision，核对干净起点和 Case 闭合。

## Implementation

- [x] 1.1 修改 authoring 类型与 materialization 默认，增加最窄正常/非法边界测试。
- [x] 1.2 同步用户指南、JSDoc、内部 owner、changelog 和 Case，补齐 installed types/runtime 验收。

## Verification

- [x] 2.1 最窄回归、类型/lint/格式及文档与全树 Case 闭合通过。
- [x] 2.2 完整 Gate 与同一 exact candidate 的安装后 artifact/types/documentation/runtime 验收通过。
- [x] 2.3 非实施代理反查实际 diff 与文档影响，审计局部 diff 并记录验证边界。
- [x] 2.4 按 ai-ready-docs 与完整编码规范优化本次文档和代码，完成非实施复核。
- [x] 2.5 对优化后的完整工作树重新验证，并记录实际证据与未覆盖边界。
- [x] 2.6 按用户授权整理语义提交，审阅精确待提交快照与正常提交钩子的影响。
