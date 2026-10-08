# 主代理转交的 Product 排除子树观察

来源：2026-10-08 同轮主代理直接交接的实测信息。本调查子代理未重跑本样本；保存的是条件与聚合结果，不是原始 trace 文件。原脚本和所有 tmp fixture 已由执行者清理，本附件不声称其仍存在。

环境：Linux / Bun 1.3.14 / Git 2.53.0。

方法：独占 tmp 创建 root、`vendor/excluded` 已初始化独立 Git repo、child 内 `modules/nested` 独立 repo。通过 fixture-scoped Git index/commit 写入 HEAD gitlinks，没有 remote。文件为 root `src/kept.ts`、child `src/excluded.ts`、nested `src/nested.ts`。调用公开 `src/index.ts` 的同步 `collectProjectFiles`，root显式给出，selection如下：

```ts
{
  source: "git-worktree",
  include: ["**/*.ts"],
  exclude: ["**/vendor/**"]
}
```

临时 PATH Git wrapper记录 cwd/args再 exec真实git；setup不纳入计时，每轮重置trace。

| 轮次 | 返回 | 全部 Git 调用 | excluded subtree 调用 | instrumented wall time |
| --- | --- | --- | --- | --- |
| 1 | `['src/kept.ts']` | 11 | 8 | 38.73 ms |
| 2 | `['src/kept.ts']` | 11 | 8 | 31.14 ms |

root的3次调用：`ls-files -z --cached --others --exclude-standard --`、`rev-parse --verify --quiet HEAD`、`ls-tree -r -z <SHA>`。

child和nested各4次：`rev-parse --show-toplevel`，之后各自 `ls-files`、HEAD `rev-parse`、`ls-tree`。两个被最终exclude排除的repo共8次调用。

该样本证明“最终结果正确，但excluded child仍先访问”。它不是正式benchmark，没有未插桩baseline、before/after或权限故障样本，不能用于承诺优化收益。所有目录与wrapper已清理，无工作区或远端写入。
