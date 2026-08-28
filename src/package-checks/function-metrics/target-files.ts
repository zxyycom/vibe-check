/** Lizard 支持的 exact input 选择。 */

export function selectLizardTargetFiles(files: readonly string[]): string[] {
  return files.filter(isLizardTarget);
}

function isLizardTarget(filePath: string): boolean {
  return filePath.endsWith(".rs") || filePath.endsWith(".ts");
}
