import {
  ExpressionPlaceholdersHost,
  GenericCondition,
  InferProjectionFieldsFromSchemas,
  OperationDefBase,
  OperationType,
  ReturnConsumedCapacityValues,
} from "../operations-common/operations-common.types";
import { ConditionExpressionBuilder } from "../condition/condition.types";
import { ScanCommandOutput } from "@aws-sdk/client-dynamodb";

export type ScanOperationBuilder<S> = {
  filter: (builder: ConditionExpressionBuilder<S>) => ScanOperationBuilder<S>;
  projection: (fields: InferProjectionFieldsFromSchemas<S>) => ScanOperationBuilder<S>;
  offset: (offset: number) => ScanOperationBuilder<S>;
  limit: (limit: number) => ScanOperationBuilder<S>;
  returnConsumedCapacity: (capacity: ReturnConsumedCapacityValues) => ScanOperationBuilder<S>;
  build(): ScanOperationDef;
  execute(): Promise<ScanCommandOutput>;
  executeAndReturnValue<T = unknown>(): Promise<T[] | null>;
};

export type ScanOperationBuilderStateType = {
  filter: GenericCondition | null;
  projection: string[] | null;
  offset: number | null;
  limit: number | null;
  returnConsumedCapacity: ReturnConsumedCapacityValues | null;
};

export type ScanOperationDef = OperationDefBase<OperationType.SCAN> &
  ExpressionPlaceholdersHost & {
    filter: string;
    projection: string | null;
    offset: number | null;
    limit: number | null;
    returnConsumedCapacity: ReturnConsumedCapacityValues | null;
  };
