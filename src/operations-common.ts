import { CombineArrayElementsViaUnion, ConcatenateArrays } from "./utility-types";

type SchemaKeys<S> = S extends [infer F, ...infer R] ? (F extends [infer K, infer S] ? [K, ...SchemaKeys<R>] : F) : S;

export type InferProjectionFieldsFromSchemas<T> = Array<
  CombineArrayElementsViaUnion<
    T extends [infer F, ...infer R]
      ? F extends [infer K, infer S]
        ? ConcatenateArrays<SchemaKeys<S>, InferProjectionFieldsFromSchemas<R>>
        : F
      : T
  >
>;

export type ReturnConsumedCapacityValues = "INDEXES" | "TOTAL" | "NONE";

export type ReturnItemCommectionMetricsValues = "SIZE" | "NONE";

export enum OperationType {
  PUT = "put",
}

export type OperationDefBase = {
  type: OperationType;
  returnConsumedCapacity: ReturnConsumedCapacityValues | null;
};