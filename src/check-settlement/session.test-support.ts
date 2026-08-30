export function definition(checkId: string) {
  return { checkId, displayName: checkId } as const;
}
