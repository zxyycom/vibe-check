/** Fixed globals and compiler configuration for the isolated external-consumer typecheck. */
export const EXTERNAL_CONSUMER_NODE_GLOBALS_DECLARATION = `declare const process: Readonly<{ readonly execPath: string }>;
`;

export function externalConsumerTypecheckConfig(packageImport: string): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        module: "nodenext",
        moduleResolution: "nodenext",
        exactOptionalPropertyTypes: true,
        noUncheckedIndexedAccess: true,
        noEmit: true,
        strict: true,
        target: "esnext",
        verbatimModuleSyntax: true
      },
      include: [
        "node-globals.d.ts",
        "public-imports.ts",
        "docs/examples/package-api/*.ts",
        `node_modules/${packageImport}/docs/examples/artifacts/mixed-outcomes/definition.ts`
      ]
    },
    null,
    2
  )}\n`;
}
