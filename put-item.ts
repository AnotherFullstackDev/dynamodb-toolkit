/**
 * NOTE:
 * For data change operations there is no sence to make generic functions that can work with several items
 * because each operation can work with only one item at a time
 */

import { ReturnConsumedCapacityValues } from "./operations-common";
import { ConditionExpressionBuilder } from "./query";
import {
  PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList,
  TransformTableSchemaIntoSchemaInterfacesMap,
  TransformTableSchemaIntoTupleSchemasMap,
} from "./schema";

/**
 * @param S - Tuple of entity schema interfaces as [[string, Record<string, unknown>]]
 */
type PutOperationItemsBuilder<T, S> = S extends [infer F, ...infer R]
  ? (F extends [infer K, infer I] ? { [LK in `${K & string}Item`]: (value: I) => PutOperationBuilder<T> } : never) &
      PutOperationItemsBuilder<T, R>
  : S extends []
  ? {}
  : S;

type PutOperationAdditionalParamsBuilder<S> = {
  condition: (
    builder: ConditionExpressionBuilder<PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<S>>,
  ) => PutOperationBuilder<S>;
  throwIfExists: () => PutOperationBuilder<S>;
  returnValues(value: "ALL_NEW" | "ALL_OLD"): PutOperationBuilder<S>;
  returnConsumedCapacity: (capacity: ReturnConsumedCapacityValues) => PutOperationBuilder<S>;
  returnItemCollectionMetrics: (value: "SIZE") => PutOperationBuilder<S>;
};

export type PutOperationBuilder<S> = PutOperationItemsBuilder<S, TransformTableSchemaIntoSchemaInterfacesMap<S>> &
  PutOperationAdditionalParamsBuilder<TransformTableSchemaIntoTupleSchemasMap<S>>;
