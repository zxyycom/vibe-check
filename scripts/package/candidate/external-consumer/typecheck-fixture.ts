/** Consumer-owned strict compiler configuration, using the locked Node type materials. */
export function externalConsumerTypecheckConfig(packageImport: string): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        allowImportingTsExtensions: true,
        module: "nodenext",
        moduleResolution: "nodenext",
        exactOptionalPropertyTypes: true,
        noUncheckedIndexedAccess: true,
        noEmit: true,
        strict: true,
        target: "esnext",
        types: ["node"],
        verbatimModuleSyntax: true
      },
      include: [
        "public-imports.ts",
        "docs/examples/package-api/*.ts",
        `node_modules/${packageImport}/docs/examples/artifacts/mixed-outcomes/definition.ts`
      ]
    },
    null,
    2
  )}\n`;
}
