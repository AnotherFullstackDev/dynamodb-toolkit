import {
  ComparisonOperatorDefinition,
  EntitySchema,
  LogicalOperatorDefinition,
  OperatorDefinition,
} from "./condition/condition.types";
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
  QUERY = "query",
}

export type OperationDefBase<T extends OperationType> = {
  type: T;
  returnConsumedCapacity: ReturnConsumedCapacityValues | null;
};

export type ConditionExpressionPlaceholdersHost = {
  expressionAttributeNames: Record<string, string> | null;
  expressionAttributeValues: Record<string, unknown> | null;
};

export type GenericCondition =
  | OperatorDefinition<"conditional", ComparisonOperatorDefinition<string, string, EntitySchema<string>>>
  | OperatorDefinition<"logical", LogicalOperatorDefinition>;
