import {
  PickOnlyNonPrimaryKeyAttributesFromTupledModelSchemasList,
  PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList,
} from "../schema/schema.types";
import { ConditionExpressionBuilder } from "../condition/condition.types";
import {
  ExpressionPlaceholdersHost,
  InferProjectionFieldsFromSchemas,
  OperationDefBase,
  OperationType,
  ReturnConsumedCapacityValues,
} from "../operations-common/operations-common.types";
import { QueryCommandOutput } from "@aws-sdk/client-dynamodb";

export type QueryOperationIndexSelector<IDX> = {
  index: <N extends keyof IDX>(name: N) => SingleTableQueryOperationBuilder<IDX[N]>;
};

export type SingleTableQueryOperationBuilder<S> = {
  keyCondition: (
    builder: ConditionExpressionBuilder<PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<S>>,
  ) => SingleTableQueryOperationBuilder<S>;
  filter: (
    builder: ConditionExpressionBuilder<PickOnlyNonPrimaryKeyAttributesFromTupledModelSchemasList<S>>,
  ) => SingleTableQueryOperationBuilder<S>;
  projection: (fields: InferProjectionFieldsFromSchemas<S>) => SingleTableQueryOperationBuilder<S>;
  offset: (offset: number) => SingleTableQueryOperationBuilder<S>;
  limit: (limit: number) => SingleTableQueryOperationBuilder<S>;
  returnConsumedCapacity: (capacity: ReturnConsumedCapacityValues) => SingleTableQueryOperationBuilder<S>;
  build: () => QueryOperationDef;
  execute: () => Promise<QueryCommandOutput>;
  executeAndReturnValue: <T = unknown>() => Promise<T>;
};

export type QueryOperationBuilder<S, IDX> = QueryOperationIndexSelector<IDX> & SingleTableQueryOperationBuilder<S>;

export type QueryOperationDef = OperationDefBase<OperationType.QUERY> &
  ExpressionPlaceholdersHost & {
    keyCondition: string;
    filter: string | null;
    projection: string | null;
    offset: number | null;
    limit: number | null;
    returnConsumedCapacity: ReturnConsumedCapacityValues | null;
  };
