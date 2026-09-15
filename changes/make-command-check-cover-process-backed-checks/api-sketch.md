# 命令包装式 Check API 草图

**状态：Draft，非当前 package API。** 本页只让后续审阅者检查调用形状；方案、影响和开放问题以 [design.md](design.md) 为准。

## 执行顺序

```text
ordinary Check 准入 → 现有 prepare → 可选 resolver → 验证环境 → Product 单次命令执行
                                      ├─ 完整结果 → 扩展 context → 用户 execute → 普通 Check 结算
                                      └─ 不完整/进程失败 → Product unavailable，不调用用户 execute
```

## 拟议输入

```ts
type CompletedCommand = Readonly<{
  exitCode: number;
  stdout: string;
  stderr: string;
}>;

type CommandExecutionContext<Options extends object> =
  CheckExecutionContext<Options> & Readonly<{ command: CompletedCommand }>;

type CommandEnvironmentContext<Options extends object> =
  Pick<CheckExecutionContext<Options>, "options" | "project" | "dependencies" | "signal">;

// 非可运行示例：标识符和 projector 由 caller 提供；精确泛型尚待类型验收。
// 顶层 execute 与 afterCommand.execute 二选一。
commandCheck({
  checkId, displayName, executable, arguments,
  timeoutMs, outputByteLimit, output,
  // 拟议新字段；与静态 environment 二选一。可读 direct dependencies。
  resolveEnvironment(context: CommandEnvironmentContext<ResolvedCommandOptions>) {
    const candidate = context.dependencies.get(candidateProvider);
    return { mode: "exact", variables: candidateEnvironment(candidate) };
  },
  execute(context: CommandExecutionContext<ResolvedCommandOptions>) {
    const projected = validateAndProjectOwnerOutput(context.command);
    for (const item of projected.records)
      context.records.report({ id: item.id }, item.data);
    return projected.result; // 普通 CheckResult<Data>
  }
});
```

resolver 在命令启动前从原 context 读取 options、project、direct dependencies、signal 等值，只能选择当前闭合的环境策略；不提供时使用原静态 `environment` 或 exact-empty。非法返回/异常 fail closed，不发布环境值。后置用户函数仍可读取原 context 的 options、project、direct dependencies、artifactDirectory、signal 和 invocationId，也可返回 messages、typed final data 或执行连接 signal 的额外工作。工具协议与安全投影由 caller 实现，Product 只提供有界、invocation-local 的命令结果。省略后置函数时仍按当前退出码生成 `{ exitCode }`。

## 完整性与发布边界

只有正常结束、输出完整且有 numeric exit 时才调用用户函数；完整性不能仅从 numeric exit 推断。进程失败由 Product 结算，用户 callback 的 throw/非法结果与 `records.report` 遵循普通 Check 规则。Raw child material 不自动进入结果或机器输出；逐条 Record 报告也不构成原子批量提交。
