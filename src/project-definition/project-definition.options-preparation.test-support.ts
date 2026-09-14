import { defineConfig } from "./project-definition.ts";
import { jsonSchemaValidation } from "../package-checks/json-schema-validation/default-check.ts";
import { jsonValidation } from "../package-checks/json-validation/default-check.ts";
import { validateProjectDefinition } from "./project-definition-validation.ts";

const schemaId = "https://schemas.example.test/root";
const defaultJsonValidation = jsonValidation();
const defaultJsonSchemaValidation = jsonSchemaValidation();

export const invalidJsonValidationOptions: readonly object[] = [
  {},
  { maximumBytes: 0 },
  { maximumBytes: -1 },
  { maximumBytes: 1.5 },
  { maximumBytes: Number.MAX_SAFE_INTEGER + 1 },
  { maximumBytes: 1, extra: true }
];

export const validJsonValidationOptions = {
  ...defaultJsonValidation.options,
  maximumBytes: 1
};

export const validJsonSchemaValidationOptions = {
  bindings: [{ id: "instance", instancePath: "instances/one.json", schemaId }],
  files: defaultJsonSchemaValidation.options.files,
  maximumBytes: 1,
  referenceResolution: {
    mode: "allowlisted",
    sources: [
      { catalog: "json-schema-2020-12", kind: "bundled" },
      {
        id: "urn:vibe-check:source:schemas-example",
        kind: "https",
        origin: "https://schemas.example.test",
        pathPrefix: "/catalog/"
      }
    ]
  },
  schemaIdentity: { mode: "document-authoritative" },
  schemas: [{ id: schemaId, path: "schemas/root.json" }]
} as const;

export const invalidJsonSchemaValidationOptions: readonly object[] = [
  {},
  { ...validJsonSchemaValidationOptions, maximumBytes: 0 },
  { ...validJsonSchemaValidationOptions, schemaIdentity: { mode: "per-schema" } },
  { ...validJsonSchemaValidationOptions, referenceResolution: { mode: "offline", sources: [] } },
  {
    ...validJsonSchemaValidationOptions,
    referenceResolution: { mode: "allowlisted", sources: [] }
  },
  {
    ...validJsonSchemaValidationOptions,
    referenceResolution: {
      mode: "allowlisted",
      sources: [
        {
          id: "urn:vibe-check:source:insecure",
          kind: "https",
          origin: "http://schemas.example.test",
          pathPrefix: "/catalog/"
        }
      ]
    }
  },
  { ...validJsonSchemaValidationOptions, schemas: [{ id: "relative", path: "schemas/root.json" }] },
  { ...validJsonSchemaValidationOptions, schemas: [{ id: schemaId, path: "../root.json" }] },
  {
    ...validJsonSchemaValidationOptions,
    schemas: [
      { id: schemaId, path: "schemas/root.json" },
      { id: schemaId, path: "schemas/other.json" }
    ]
  },
  {
    ...validJsonSchemaValidationOptions,
    bindings: [{ id: "instance", instancePath: "instances/one.json", schemaId: "urn:unknown" }]
  },
  {
    ...validJsonSchemaValidationOptions,
    bindings: [
      { id: "first", instancePath: "instances/one.json", schemaId },
      { id: "second", instancePath: "instances/one.json", schemaId }
    ]
  }
];

export function definitionAcceptsJsonValidationOptions(options: object): boolean {
  return validateProjectDefinition(
    defineConfig({
      checks: [{ ...defaultJsonValidation, checkId: "renamed-json-check", options }]
    })
  ).ok;
}

export function definitionAcceptsDefaultJsonValidationOptions(): boolean {
  return validateProjectDefinition(
    defineConfig({ checks: [{ ...defaultJsonValidation, options: validJsonValidationOptions }] })
  ).ok;
}

export function definitionAcceptsJsonSchemaValidationOptions(options: object): boolean {
  return validateProjectDefinition(
    defineConfig({ checks: [{ ...defaultJsonSchemaValidation, options }] })
  ).ok;
}
