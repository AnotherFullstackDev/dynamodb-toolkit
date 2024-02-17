import { DeleteItemCommandOutput } from "@aws-sdk/client-dynamodb";
import { ConditionExpressionBuilder, KeyConditionExpressionBuilder } from "../condition/condition.types";
import {
  ExpressionPlaceholdersHost as ExpressionPlaceholdersHost,
  GenericCondition,
  OperationDefBase,
  OperationType,
  ReturnConsumedCapacityValues,
  ReturnItemCollectionMetricsValues,
} from "../operations-common/operations-common.types";
import {
  PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList,
  TransformTableSchemaIntoTupleSchemasMap,
} from "../schema/schema.types";

export type DeleteIndividualItemOperationBuilder<S> = {
  key: (
    builder: KeyConditionExpressionBuilder<
      PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<TransformTableSchemaIntoTupleSchemasMap<S>>
    >,
  ) => DeleteIndividualItemOperationBuilder<S>;
  condition: (
    builder: ConditionExpressionBuilder<TransformTableSchemaIntoTupleSchemasMap<S>>,
  ) => DeleteIndividualItemOperationBuilder<S>;
  returnValues(value: DeleteItemReturnValues): DeleteIndividualItemOperationBuilder<S>;
  returnConsumedCapacity: (capacity: ReturnConsumedCapacityValues) => DeleteIndividualItemOperationBuilder<S>;
  returnItemCollectionMetrics: (value: ReturnItemCollectionMetricsValues) => DeleteIndividualItemOperationBuilder<S>;
  build: () => DeleteItemOperationDef;
  execute: () => Promise<DeleteItemCommandOutput>;
  executeAndReturnValue: <T = unknown>() => Promise<T | null>;
};

export type DeleteItemOperationBuilder<S> = S extends [infer F, ...infer R]
  ? (F extends [infer K, infer S]
      ? {
          // [LK in `${K & string}Item`]: () => DeleteIndividualItemOperationBuilder<[[K, S]]>;
          item: (itemName: K & string) => DeleteIndividualItemOperationBuilder<[[K, S]]>;
        }
      : F) &
      DeleteItemOperationBuilder<R>
  : S extends []
  ? {}
  : S;

export type DeleteItemReturnValues = "ALL_OLD" | "NONE";

export type DeleteItemOperationBuilderStateType = {
  key: GenericCondition | null;
  condition: GenericCondition | null;
  returnValues: DeleteItemReturnValues | null;
  returnConsumedCapacity: ReturnConsumedCapacityValues | null;
  returnItemCollectionMetrics: ReturnItemCollectionMetricsValues | null;
};

export type DeleteItemOperationDef = OperationDefBase<OperationType.DELETE> &
  ExpressionPlaceholdersHost & {
    key: Record<string, unknown>;
    condition: string | null;
    returnValues: DeleteItemReturnValues | null;
    returnConsumedCapacity: ReturnConsumedCapacityValues | null;
    returnItemCollectionMetrics: ReturnItemCollectionMetricsValues | null;
  };
