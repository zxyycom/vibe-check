# Proposal

本 Draft 为 ordinary executable Check 增加标准项目文件输入声明，并由 Product 在每次 Run 的 effective Check 集合确定后统一收集、向各 Check 分发自己的命名路径集合。

## Why

目前多个 Check 会对相同 project root/source 重复遍历目录或执行 Git discovery。让项目作者另外声明 snapshot Provider 虽可共享结果，却会拆散原本应由 Check 自含的声明，并引入 Provider ID、selection reference 和 dependency 接线样板。

在每个 Check 前单独收集无法消除重复 acquisition；在 Definition 构建或静态图结构锁定时收集则会把可重用定义绑定到过早的 workspace 状态。稳定的边界是每次 invocation 中 effective selection 已固定、任何 Check-owned work 尚未开始的时点。

## Outcome

Check 在标准 `projectFiles` 字段中声明命名 selections。Product 只对本次 effective Checks 执行一次 invocation input preparation：每个 source 只取得一份 candidate observation，candidate 命中时直接物化 Check/slot membership，随后向各 Check 分发冻结路径集合而不重新运行 include/exclude matcher。这一快照只固定路径 membership，每次 Run 重新取得；需要消费同一 Run 内生成物的 Check 继续在依赖后使用命令式收集，不伪装成初始批次。
