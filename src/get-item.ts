// @TODO: for operations that work with a single item we can restrict the key condition to achieve the following:
// - use all the available primary keys;

import { ConditionExpressionBuilder } from "./condition/condition.types";
import { InferProjectionFieldsFromSchemas, ReturnConsumedCapacityValues } from "./operations-common";
import { PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList } from "./schema/schema.types";

type GetIndividualItemOperationBuilder<S> = {
  key: (
    builder: ConditionExpressionBuilder<PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<S>>,
  ) => GetIndividualItemOperationBuilder<S>;
  // @TODO: projection can include nested fields - check it!
  projection: (fields: InferProjectionFieldsFromSchemas<S>) => GetIndividualItemOperationBuilder<S>;
  returnConsumedCapacity: (capacity: ReturnConsumedCapacityValues) => GetIndividualItemOperationBuilder<S>;
};

export type GetItemOperationBuilder<S> = S extends [infer F, ...infer R]
  ? (F extends [infer K, infer S]
      ? {
          [LK in `${K & string}Item`]: () => GetIndividualItemOperationBuilder<[[K, S]]>;
        }
      : F) &
      GetItemOperationBuilder<R>
  : S extends []
  ? {}
  : S;
