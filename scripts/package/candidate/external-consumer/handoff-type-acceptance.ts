/** Public declaration fixture for direct Check handoff authoring and consumption. */
export const CHECK_HANDOFF_TYPE_ACCEPTANCE_SOURCE = `const handoffProvider = defineCheck({
  checkId: "isolated-handoff-provider",
  displayName: "Isolated handoff provider",
  handoff: true,
  parseData(data): Readonly<{ readonly version: 1 }> {
    if (data.version !== 1) throw new TypeError("unsupported handoff data");
    return { version: 1 };
  },
  execution: () => ({
    status: "passed",
    data: { version: 1 as const },
    handoff: new Map<string, Uint8Array>()
  })
});
const handoffConsumer = defineCheck({
  checkId: "isolated-handoff-consumer",
  displayName: "Isolated handoff consumer",
  dependsOn: [handoffProvider.checkId],
  execution: ({ dependencies }) => {
    const read = dependencies.get(handoffProvider);
    if (!read.ok) return { status: "unavailable", reason: { code: read.error.code } };
    const parsed: Readonly<{ readonly version: 1 }> = handoffProvider.parseData(read.data);
    const handoff: Map<string, Uint8Array> = read.handoff;
    void [parsed, handoff];
    return { status: "passed", data: {} };
  }
});
void handoffConsumer;
`;
