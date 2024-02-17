import { GetItemCommandOutput } from "@aws-sdk/client-dynamodb";
import { KeyConditionExpressionBuilder } from "../condition/condition.types";
import {
  ExpressionPlaceholdersHost,
  GenericCondition,
  InferProjectionFieldsFromSchemas,
  OperationDefBase,
  OperationType,
  ReturnConsumedCapacityValues,
} from "../operations-common/operations-common.types";
import { PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList } from "../schema/schema.types";

export type GetIndividualItemOperationBuilder<S> = {
  key: (
    builder: KeyConditionExpressionBuilder<PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<S>>,
  ) => GetIndividualItemOperationBuilder<S>;
  projection: (fields: InferProjectionFieldsFromSchemas<S>) => GetIndividualItemOperationBuilder<S>;
  returnConsumedCapacity: (capacity: ReturnConsumedCapacityValues) => GetIndividualItemOperationBuilder<S>;
  build: () => GetItemOperationDef;
  execute: () => Promise<GetItemCommandOutput>;
  executeAndReturnValue: <T = unknown>() => Promise<T | null>;
};

export type GetItemOperationBuilder<S> = S extends [infer F, ...infer R]
  ? (F extends [infer K, infer S]
      ? {
          // [LK in `${K & string}Item`]: () => GetIndividualItemOperationBuilder<[[K, S]]>;
          item: (itemName: K & string) => GetIndividualItemOperationBuilder<[[K, S]]>;
        }
      : F) &
      GetItemOperationBuilder<R>
  : S extends []
  ? {}
  : S;

export type GetItemOperationBuilderStateType = {
  key: GenericCondition | null;
  projection: string[] | null;
  returnConsumedCapacity: ReturnConsumedCapacityValues | null;
};

export type GetItemOperationDef = OperationDefBase<OperationType.GET_ITEM> &
  ExpressionPlaceholdersHost & {
    key: Record<string, unknown>;
    projection: string | null;
    returnConsumedCapacity: ReturnConsumedCapacityValues | null;
  };
