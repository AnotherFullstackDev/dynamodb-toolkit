import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  ComparisonOperatorDefinition,
  EntitySchema,
  LogicalOperatorDefinition,
  OperatorDefinition,
} from "../condition/condition.types";
import { CombineArrayElementsViaUnion, ConcatenateArrays } from "../utility-types";
import { SupportedOperationDefsByRunner } from "../runner/runner.facade";

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

export type ReturnItemCollectionMetricsValues = "SIZE" | "NONE";

export enum OperationType {
  PUT = "put",
  QUERY = "query",
  UPDATE = "update",
  DELETE = "delete",
  GET_ITEM = "get_item",
  SCAN = "scan",
}

export type OperationDefBase<T extends OperationType> = {
  type: T;
  returnConsumedCapacity: ReturnConsumedCapacityValues | null;
};

export type ExpressionPlaceholdersHost = {
  expressionAttributeNames: Record<string, string> | null;
  expressionAttributeValues: Record<string, unknown> | null;
};

export type GenericCondition =
  | OperatorDefinition<"conditional", ComparisonOperatorDefinition<string, string, EntitySchema<string>>>
  | OperatorDefinition<"logical", LogicalOperatorDefinition>;

export type OperationContext = {
  client: DynamoDBClient;
  tableName: string;
  runner: (client: DynamoDBClient, tableName: string, operationDef: SupportedOperationDefsByRunner) => Promise<unknown>;
};
