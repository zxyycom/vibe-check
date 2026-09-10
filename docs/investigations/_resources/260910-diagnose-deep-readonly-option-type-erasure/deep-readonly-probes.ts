/**
 * Investigation-only compile probe.
 *
 * Run from the repository root with both compilers:
 *   node node_modules/@typescript/native-preview/bin/tsgo.js --ignoreConfig \
 *     --noEmit --strict --noUncheckedIndexedAccess --allowImportingTsExtensions --target esnext \
 *     --module nodenext --moduleResolution nodenext <this-file>
 *   node node_modules/typescript/bin/tsc --ignoreConfig \
 *     --noEmit --strict --noUncheckedIndexedAccess --allowImportingTsExtensions --target esnext \
 *     --module nodenext --moduleResolution nodenext <this-file>
 */
import type { CheckExecution, DeepReadonly } from "../../../../src/check/check.ts";

type Equal<Left, Right> =
  (<Type>() => Type extends Left ? 1 : 2) extends
  (<Type>() => Type extends Right ? 1 : 2) ? true : false;
type Expect<Value extends true> = Value;

type Command = readonly [executable: string, ...arguments: string[]];
type Heterogeneous = readonly [kind: "count", value: number];
type Optional = readonly [head: string, tail?: number];
type TaggedValue =
  | readonly [kind: "text", value: string]
  | readonly [kind: "count", value: number];

// These assertions describe the current erasure rather than the intended contract.
type _CurrentCommandWasFlattened = Expect<
  Equal<DeepReadonly<Command>, readonly string[]>
>;
type _CurrentHeterogeneousWasFlattened = Expect<
  Equal<DeepReadonly<Heterogeneous>, readonly ("count" | number)[]>
>;
type _CurrentOptionalWasFlattened = Expect<
  Equal<DeepReadonly<Optional>, readonly (string | number)[]>
>;
type _CurrentUnknownBecameNever = Expect<Equal<DeepReadonly<unknown>, never>>;

const currentCommandExecution: CheckExecution<{ readonly command: Command }> = ({ options }) => {
  // @ts-expect-error Current DeepReadonly erased the required first position.
  const tuple: Command = options.command;
  const [executable, ...commandArguments] = options.command;
  // @ts-expect-error With noUncheckedIndexedAccess, the flattened first item may be undefined.
  const requiredExecutable: string = executable;
  return {
    status: "passed",
    data: { argumentCount: commandArguments.length, executable: requiredExecutable }
  };
};
void currentCommandExecution;

declare const currentTaggedValue: DeepReadonly<TaggedValue>;
if (currentTaggedValue[0] === "count") {
  // @ts-expect-error The flattened arrays no longer carry discriminant/value correlation.
  const amount: number = currentTaggedValue[1];
  void amount;
}

const currentUnknownExecution: CheckExecution<{ readonly payload: unknown }> = ({ options }) => {
  // This unsound assignment currently compiles because payload became never.
  const incorrectlyAcceptedString: string = options.payload;
  return { status: "passed", data: { normalized: incorrectlyAcceptedString.toUpperCase() } };
};
void currentUnknownExecution;

// Investigation candidate only; this is not the repository implementation.
type CandidateDeepReadonly<Value> = Value extends string | number | boolean | null
  ? Value
  : Value extends readonly unknown[]
    ? { readonly [Key in keyof Value]: CandidateDeepReadonly<Value[Key]> }
    : Value extends object
      ? { readonly [Key in keyof Value]: CandidateDeepReadonly<Value[Key]> }
      : Value;

type _CandidateCommandPreserved = Expect<Equal<CandidateDeepReadonly<Command>, Command>>;
type _CandidateHeterogeneousPreserved = Expect<
  Equal<CandidateDeepReadonly<Heterogeneous>, Heterogeneous>
>;
type _CandidateOptionalPreserved = Expect<Equal<CandidateDeepReadonly<Optional>, Optional>>;
type _CandidateUnknownPreserved = Expect<Equal<CandidateDeepReadonly<unknown>, unknown>>;
type _CandidateMutableArrayStillReadonly = Expect<
  Equal<CandidateDeepReadonly<string[]>, readonly string[]>
>;
type _CandidateReadonlyArrayUnchanged = Expect<
  Equal<CandidateDeepReadonly<readonly string[]>, readonly string[]>
>;
type _CandidateNestedArrayElementsReadonly = Expect<
  Equal<
    CandidateDeepReadonly<Array<{ values: number[] }>>,
    readonly { readonly values: readonly number[] }[]
  >
>;

declare const candidateCommandOptions: CandidateDeepReadonly<{ readonly command: Command }>;
const [candidateExecutable, ...candidateArguments] = candidateCommandOptions.command;
const candidateRequiredExecutable: string = candidateExecutable;
const candidateOptionalArguments: readonly string[] = candidateArguments;
void candidateRequiredExecutable;
void candidateOptionalArguments;

declare const candidateTaggedValue: CandidateDeepReadonly<TaggedValue>;
if (candidateTaggedValue[0] === "count") {
  const amount: number = candidateTaggedValue[1];
  void amount;
}
