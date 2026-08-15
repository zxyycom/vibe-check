import {
  builtInDefinition,
  type BuiltInCheck,
  type BuiltInCheckData,
} from "../built-ins.ts";
import {
  builtInOptionCodeAreasAreKnown,
} from "../built-in-options.ts";
import {
  parseCheckTreeAuthoring,
  type ParsedHeader,
  type ParsedNode
} from "./authoring.ts";
import { resolveCheckTreeDependencies } from "./dependencies.ts";
import type { CheckDefinition } from "../check-definition.ts";
import type {
  CheckApplicabilityBinding,
  CustomCheck,
  CustomCheckBinding
} from "../custom-check.ts";

export type CheckSchedulingValue = string | readonly string[];

export interface CheckScheduling {
  readonly dependsOn?: CheckSchedulingValue;
  readonly maxParallel?: number;
  readonly mutex?: CheckSchedulingValue;
}

export interface CheckGroup extends CheckScheduling {
  readonly id: string;
  readonly checks: readonly CheckNode[];
}

export type { CheckApplicabilityBinding, CustomCheck, CustomCheckBinding };

export type CheckNode = CheckGroup | BuiltInCheck | CustomCheck;

interface ResolvedLeafScheduling {
  readonly definition: CheckDefinition;
  readonly dependsOn: readonly string[];
  readonly maxParallel: number;
  readonly mutex: readonly string[];
}

type ResolvedBuiltInCheckTreeLeaf = ResolvedLeafScheduling & Readonly<{
  readonly builtIn: BuiltInCheckData;
}>;

type ResolvedCustomCheckTreeLeaf = ResolvedLeafScheduling & Readonly<{
  readonly builtIn: null;
}>;

export type ResolvedCheckTreeLeaf = ResolvedBuiltInCheckTreeLeaf | ResolvedCustomCheckTreeLeaf;

export interface ResolvedCheckTree {
  readonly leaves: readonly ResolvedCheckTreeLeaf[];
  readonly customBindings: ReadonlyMap<string, Readonly<{
    readonly applicability: CheckApplicabilityBinding;
    readonly binding: CustomCheckBinding;
  }>>;
}

function collectDescendants(node: ParsedNode, descendants: Map<string, readonly string[]>): readonly string[] {
  if (node.kind === "built-in") return [node.checkId];
  if (node.kind === "custom") return [node.definition.checkId];
  const leaves: string[] = [];
  for (const child of node.checks) {
    leaves.push(...collectDescendants(child, descendants));
  }
  descendants.set(node.id, Object.freeze(leaves));
  return leaves;
}

function appendDistinct(...values: readonly (readonly string[])[]): readonly string[] {
  const result: string[] = [];
  for (const items of values) {
    for (const item of items) if (!result.includes(item)) result.push(item);
  }
  return Object.freeze(result);
}

function flattenNode(
  node: ParsedNode,
  inherited: ParsedHeader,
  leaves: ResolvedCheckTreeLeaf[],
  customBindings: Map<string, Readonly<{
    readonly applicability: CheckApplicabilityBinding;
    readonly binding: CustomCheckBinding;
  }>>
): void {
  const header: ParsedHeader = Object.freeze({
    dependsOn: appendDistinct(inherited.dependsOn, node.dependsOn),
    maxParallel: node.maxParallel ?? inherited.maxParallel,
    mutex: appendDistinct(inherited.mutex, node.mutex)
  });
  if (node.kind === "group") {
    for (const child of node.checks) flattenNode(child, header, leaves, customBindings);
    return;
  }
  if (node.kind === "built-in") {
    leaves.push(Object.freeze({
      definition: builtInDefinition(node.checkId),
      dependsOn: header.dependsOn,
      maxParallel: requireMaxParallel(header),
      mutex: header.mutex,
      builtIn: node
    }));
    return;
  }
  leaves.push(Object.freeze({
    definition: node.definition,
    dependsOn: header.dependsOn,
    maxParallel: requireMaxParallel(header),
    mutex: header.mutex,
    builtIn: null
  }));
  customBindings.set(node.definition.checkId, Object.freeze({
    applicability: node.applicability,
    binding: node.binding
  }));
}

export function resolveCheckTree(value: unknown, rootMaxParallel: number): ResolvedCheckTree | undefined {
  if (!Number.isSafeInteger(rootMaxParallel) || rootMaxParallel <= 0) return undefined;
  const roots = parseCheckTreeAuthoring(value);
  if (roots === undefined) return undefined;
  const descendants = new Map<string, readonly string[]>();
  for (const node of roots) {
    collectDescendants(node, descendants);
  }
  const leaves: ResolvedCheckTreeLeaf[] = [];
  const customBindings = new Map<string, Readonly<{
    readonly applicability: CheckApplicabilityBinding;
    readonly binding: CustomCheckBinding;
  }>>();
  const empty: ParsedHeader = Object.freeze({
    dependsOn: Object.freeze([]),
    maxParallel: rootMaxParallel,
    mutex: Object.freeze([])
  });
  for (const node of roots) {
    flattenNode(node, empty, leaves, customBindings);
  }
  const resolved = resolveCheckTreeDependencies(leaves, descendants);
  return resolved === undefined || resolved.some((leaf) => leaf.maxParallel > rootMaxParallel)
    ? undefined
    : Object.freeze({ leaves: resolved, customBindings });
}

function requireMaxParallel(header: ParsedHeader): number {
  if (header.maxParallel === undefined) throw new TypeError("Check tree maxParallel is missing");
  return header.maxParallel;
}

export function validateBuiltInOptionCodeAreas(
  tree: ResolvedCheckTree,
  codeAreas: Readonly<Record<string, unknown>>
): boolean {
  return tree.leaves.every((leaf) => builtInOptionCodeAreasAreKnown(
    leaf.builtIn,
    codeAreas
  ));
}
