import {
  PickOnlyNonPrimaryKeyAttributesFromTupledModelSchemasList,
  PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList,
} from "../schema/schema.types";
import { ConditionExpressionBuilder } from "../condition/condition.types";
import {
  ExpressionPlaceholdersHost,
  GenericCondition,
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
    // builder: ConditionExpressionBuilder<S>,
  ) => SingleTableQueryOperationBuilder<S>;
  projection: (fields: InferProjectionFieldsFromSchemas<S>) => SingleTableQueryOperationBuilder<S>;
  offset: (offset: number) => SingleTableQueryOperationBuilder<S>;
  limit: (limit: number) => SingleTableQueryOperationBuilder<S>;
  returnConsumedCapacity: (capacity: ReturnConsumedCapacityValues) => SingleTableQueryOperationBuilder<S>;
  build: () => QueryOperationDef;
  execute: () => Promise<QueryCommandOutput>;
  executeAndReturnValue: <T = unknown>() => Promise<T[] | null>;
};

export type QueryOperationBuilder<S, IDX> = QueryOperationIndexSelector<IDX> & SingleTableQueryOperationBuilder<S>;

export type QueryOperationBuilderStateType = {
  indexName: string | null;
  keyCondition: GenericCondition | null;
  filter: GenericCondition | null;
  projection: string[] | null;
  offset: number | null;
  limit: number | null;
  returnConsumedCapacity: ReturnConsumedCapacityValues | null;
};

export type QueryOperationDef = OperationDefBase<OperationType.QUERY> &
  ExpressionPlaceholdersHost & {
    indexName: string | null;
    keyCondition: string;
    filter: string | null;
    projection: string | null;
    offset: number | null;
    limit: number | null;
    returnConsumedCapacity: ReturnConsumedCapacityValues | null;
  };
