# adopt-typescript-project-definition

以 Bun 托管的可执行 TypeScript Project Definition 取代 JSON project config，并通过稳定 authoring contract
组合内置与自定义 Checks。

## 当前状态

这是三项基础 change 的第三项，尚未实施。它负责 source selection、trusted module loading 与 authoring
declaration resolution；Check/Record lifecycle 和 task scheduling 仍由前两项 foundation change 拥有。
`tasks.md` 1.x 完成前不得修改产品实现。

## 依赖顺序

实施与主 spec apply 必须遵循以下顺序：

1. `establish-check-record-core`
2. `establish-check-task-orchestration`
3. `adopt-typescript-project-definition`

Project Definition 在 runtime data flow 中向 foundation 提供已解析的声明和 private binding，但这不改变上述
OpenSpec 依赖顺序。

## 阅读顺序

1. `proposal.md`
2. `design.md`
3. `specs/**`
4. `tasks.md`
