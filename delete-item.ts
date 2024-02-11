import { ReturnConsumedCapacityValues } from "./operations-common";
import { ConditionExpressionBuilder } from "./query";
import {
  PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList,
  TransformTableSchemaIntoTupleSchemasMap,
} from "./schema";

type DeleteIndividualItemOperationBuilder<S> = {
  key: (
    builder: ConditionExpressionBuilder<
      PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<TransformTableSchemaIntoTupleSchemasMap<S>>
    >,
  ) => DeleteIndividualItemOperationBuilder<S>;
  condition: (
    builder: ConditionExpressionBuilder<TransformTableSchemaIntoTupleSchemasMap<S>>,
  ) => DeleteIndividualItemOperationBuilder<S>;
  returnValues(value: "ALL_OLD"): DeleteIndividualItemOperationBuilder<S>;
  returnConsumedCapacity: (capacity: ReturnConsumedCapacityValues) => DeleteIndividualItemOperationBuilder<S>;
  returnItemCollectionMetrics: (value: "SIZE") => DeleteIndividualItemOperationBuilder<S>;
};

export type DeleteOperationBuilder<S> = S extends [infer F, ...infer R]
  ? (F extends [infer K, infer S]
      ? {
          [LK in `${K & string}Item`]: () => DeleteIndividualItemOperationBuilder<[[K, S]]>;
        }
      : F) &
      DeleteOperationBuilder<R>
  : S extends []
  ? {}
  : S;
