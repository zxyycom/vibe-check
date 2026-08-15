import {
  PROFILE_FULL,
  PROFILE_REQUIRED,
  type CheckEnvironment,
  type Profile
} from "./model.ts";

const GROUP_FIELDS = [
  "id",
  "label",
  "type",
  "mutex",
  "dependsOn",
  "env",
  "envFile",
  "tasks"
] as const;
const LEAF_FIELDS = [
  "id",
  "label",
  "type",
  "mutex",
  "dependsOn",
  "env",
  "envFile",
  "allowOutput",
  "args",
  "command",
  "ignoreOutput",
  "warningOutput"
] as const;

export interface ParsedCheckDefinitionBase {
  readonly id: string;
  readonly label: string | undefined;
  readonly type: Profile | undefined;
  readonly mutex: readonly string[];
  readonly dependsOn: readonly string[];
  readonly env: CheckEnvironment | undefined;
  readonly envFile: string | undefined;
}

export interface ParsedCheckGroup extends ParsedCheckDefinitionBase {
  readonly kind: "group";
  readonly tasks: readonly ParsedCheckDefinition[];
}

export interface ParsedCheckLeaf extends ParsedCheckDefinitionBase {
  readonly kind: "leaf";
  readonly allowOutput: readonly RegExp[];
  readonly args: readonly string[];
  readonly command: string;
  readonly ignoreOutput: readonly RegExp[];
  readonly warningOutput: readonly RegExp[];
}

export type ParsedCheckDefinition = ParsedCheckGroup | ParsedCheckLeaf;

/** Parses the dynamic scripts authoring boundary into a complete readonly tree. */
export function parseCheckDefinitions(value: unknown): readonly ParsedCheckDefinition[] {
  if (!Array.isArray(value)) {
    throw new TypeError("check list must be an array");
  }
  return Object.freeze(value.map((check, index) => parseCheckDefinition(check, `checks[${index}]`)));
}

function parseCheckDefinition(value: unknown, path: string): ParsedCheckDefinition {
  const data = checkRecord(value, path);
  const id = nonEmptyString(data.id, `${path}.id`);
  if (Object.hasOwn(data, "tasks")) {
    return parseCheckGroup(data, id, path);
  }
  return parseCheckLeaf(data, id, path);
}

function parseCheckGroup(
  data: Readonly<Record<string, unknown>>,
  id: string,
  path: string
): ParsedCheckGroup {
  assertAllowedFields(data, GROUP_FIELDS, path);
  const tasks = data.tasks;
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new TypeError(`${path}.tasks must be a non-empty array`);
  }
  return Object.freeze({
    ...parseCheckDefinitionBase(data, id, path),
    kind: "group",
    tasks: Object.freeze(tasks.map((child, index) => parseCheckDefinition(child, `${path}.tasks[${index}]`)))
  });
}

function parseCheckLeaf(
  data: Readonly<Record<string, unknown>>,
  id: string,
  path: string
): ParsedCheckLeaf {
  assertAllowedFields(data, LEAF_FIELDS, path);
  return Object.freeze({
    ...parseCheckDefinitionBase(data, id, path),
    kind: "leaf",
    allowOutput: parseRegExpList(data.allowOutput, `${path}.allowOutput`),
    args: parseStringArray(data.args, `${path}.args`),
    command: nonEmptyString(data.command, `${path}.command`),
    ignoreOutput: parseRegExpList(data.ignoreOutput, `${path}.ignoreOutput`),
    warningOutput: parseRegExpList(data.warningOutput, `${path}.warningOutput`)
  });
}

function parseCheckDefinitionBase(
  data: Readonly<Record<string, unknown>>,
  id: string,
  path: string
): ParsedCheckDefinitionBase {
  return Object.freeze({
    id,
    label: optionalNonEmptyString(data.label, `${path}.label`),
    type: optionalProfile(data.type, `${path}.type`),
    mutex: parseStringList(data.mutex, `${path}.mutex`),
    dependsOn: parseStringList(data.dependsOn, `${path}.dependsOn`),
    env: parseEnvironment(data.env, `${path}.env`),
    envFile: optionalNonEmptyString(data.envFile, `${path}.envFile`)
  });
}

function parseStringList(value: unknown, fieldName: string): readonly string[] {
  if (value === undefined) return Object.freeze([]);
  if (typeof value === "string") return Object.freeze([nonEmptyString(value, fieldName)]);
  if (!Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be a string or string array`);
  }
  return Object.freeze(value.map((item, index) => nonEmptyString(item, `${fieldName}[${index}]`)));
}

function parseStringArray(value: unknown, fieldName: string): readonly string[] {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an array of strings`);
  }
  return Object.freeze(value.map((item, index) => {
    if (typeof item !== "string") {
      throw new TypeError(`${fieldName}[${index}] must be a string`);
    }
    return item;
  }));
}

function parseRegExpList(value: unknown, fieldName: string): readonly RegExp[] {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an array of RegExp values`);
  }
  return Object.freeze(value.map((item, index) => {
    if (!(item instanceof RegExp)) {
      throw new TypeError(`${fieldName}[${index}] must be a RegExp`);
    }
    return item;
  }));
}

function parseEnvironment(value: unknown, fieldName: string): CheckEnvironment | undefined {
  if (value === undefined) return undefined;
  const data = checkRecord(value, fieldName);
  const environment: Record<string, string | undefined> = {};
  for (const [key, entry] of Object.entries(data)) {
    if (entry !== undefined && typeof entry !== "string") {
      throw new TypeError(`${fieldName}.${key} must be a string or undefined`);
    }
    environment[key] = entry;
  }
  return Object.freeze(environment);
}

function optionalProfile(value: unknown, fieldName: string): Profile | undefined {
  if (value === undefined) return undefined;
  if (value === PROFILE_REQUIRED || value === PROFILE_FULL) return value;
  throw new TypeError(`${fieldName} must be a supported verification profile`);
}

function optionalNonEmptyString(value: unknown, fieldName: string): string | undefined {
  return value === undefined ? undefined : nonEmptyString(value, fieldName);
}

function nonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }
  return value;
}

function checkRecord(value: unknown, fieldName: string): Readonly<Record<string, unknown>> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an object`);
  }
  const prototype = Reflect.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${fieldName} must be a plain object`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function assertAllowedFields(
  value: Readonly<Record<string, unknown>>,
  allowedFields: readonly string[],
  path: string
): void {
  const allowed = new Set(allowedFields);
  const unsupported = Object.keys(value).find((field) => !allowed.has(field));
  if (unsupported !== undefined) {
    throw new TypeError(`${path} contains unsupported field ${unsupported}`);
  }
}
