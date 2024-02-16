/**
 * NOTE:
 * For data change operations there is no sence to make generic functions that can work with several items
 * because each operation can work with only one item at a time
 */

import {
  ConditionExpressionPlaceholdersHost,
  OperationDefBase,
  OperationType,
  ReturnConsumedCapacityValues,
  ReturnItemCommectionMetricsValues,
} from "../operations-common";
import { ConditionExpressionBuilder } from "../condition/condition.types";
import {
  PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList,
  TransformTableSchemaIntoSchemaInterfacesMap,
  TransformTableSchemaIntoTupleSchemasMap,
  TupleMapBuilderResult,
  TupledTableSchema,
} from "../schema/schema.types";
import { GenericInterfaceTableSchema, GenericTupleTableSchema } from "../general-test";
import { PutItemCommandOutput } from "@aws-sdk/client-dynamodb";

export type PutItemReturnValues = "ALL_OLD" | "NONE";

export type PutItemOperationDef = OperationDefBase<OperationType.PUT> &
  ConditionExpressionPlaceholdersHost & {
    item: Record<string, unknown>;
    condition: string | null;
    // expressionAttributeNames: Record<string, string> | null;
    // expressionAttributeValues: Record<string, unknown> | null;
    returnValues: PutItemReturnValues | null;
    // returnConsumedCapacity: ReturnConsumedCapacityValues | null;
    returnItemCollectionMetrics: ReturnItemCommectionMetricsValues | null;
  };

/**
 * @param S - Tuple of entity schema interfaces as [[string, Record<string, unknown>]]
 */
// export type PutOperationItemsBuilder<T extends [...[string, TupleMapBuilderResult][]], S> = S extends [
export type PutOperationItemsBuilder<T, S> = S extends [infer F, ...infer R]
  ? // ? (F extends [infer K, infer I] ? { [LK in `${K & string}Item`]: (value: I) => PutOperationBuilder<T> } : never) &
    (F extends [infer K, infer I] ? (name: K, value: I) => PutOperationAdditionalParamsBuilder<T> : never) &
      PutOperationItemsBuilder<T, R>
  : S extends []
  ? {}
  : S;

// export type PutOperationAdditionalParamsBuilder<S extends [...[string, TupleMapBuilderResult][]]> = {
export type PutOperationAdditionalParamsBuilder<TS> = {
  condition: (
    // builder: ConditionExpressionBuilder<PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<TS>>,
    builder: ConditionExpressionBuilder<TS>,
  ) => PutOperationAdditionalParamsBuilder<TS>;

  throwIfExists: () => PutOperationAdditionalParamsBuilder<TS>;

  returnValues(value: PutItemReturnValues): PutOperationAdditionalParamsBuilder<TS>;

  returnConsumedCapacity: (capacity: ReturnConsumedCapacityValues) => PutOperationAdditionalParamsBuilder<TS>;

  returnItemCollectionMetrics: (value: ReturnItemCommectionMetricsValues) => PutOperationAdditionalParamsBuilder<TS>;

  build: () => PutItemOperationDef;

  execute: () => Promise<PutItemCommandOutput>;
};

export type PutOperationBuilder<IS, TS> = {
  item: PutOperationItemsBuilder<TS, IS>;
};
