/**
 * NOTE:
 * For data change operations there is no sence to make generic functions that can work with several items
 * because each operation can work with only one item at a time
 */

import { ReturnConsumedCapacityValues } from "../operations-common";
import { ConditionExpressionBuilder } from "../query";
import {
  PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList,
  TransformTableSchemaIntoSchemaInterfacesMap,
  TransformTableSchemaIntoTupleSchemasMap,
  TupleMapBuilderResult,
  TupledTableSchema,
} from "../schema";
import { GenericInterfaceTableSchema, GenericTupleTableSchema } from "../test";

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
    builder: ConditionExpressionBuilder<PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<TS>>,
    // ) => PutOperationBuilder<S>;
  ) => PutOperationAdditionalParamsBuilder<TS>;
  // throwIfExists: () => PutOperationBuilder<S>;
  throwIfExists: () => PutOperationAdditionalParamsBuilder<TS>;
  // returnValues(value: "ALL_NEW" | "ALL_OLD"): PutOperationBuilder<S>;
  returnValues(value: "ALL_NEW" | "ALL_OLD"): PutOperationAdditionalParamsBuilder<TS>;
  // returnConsumedCapacity: (capacity: ReturnConsumedCapacityValues) => PutOperationBuilder<S>;
  returnConsumedCapacity: (capacity: ReturnConsumedCapacityValues) => PutOperationAdditionalParamsBuilder<TS>;
  // returnItemCollectionMetrics: (value: "SIZE") => PutOperationBuilder<S>;
  returnItemCollectionMetrics: (value: "SIZE") => PutOperationAdditionalParamsBuilder<TS>;
};

export type PutOperationBuilder<IS, TS> = {
  item: PutOperationItemsBuilder<TS, IS>;
};
// } & PutOperationAdditionalParamsBuilder<TS>;
// export type PutOperationBuilder<S extends [...[string, TupleMapBuilderResult][]]> = {
//   item: PutOperationItemsBuilder<S, TransformTableSchemaIntoSchemaInterfacesMap<S>>;
// } & PutOperationAdditionalParamsBuilder<TransformTableSchemaIntoTupleSchemasMap<S>>;

type Schema = [["users", [["name", string]]]];

const put = ((name, value) =>
  null as unknown as PutOperationAdditionalParamsBuilder<GenericTupleTableSchema>) satisfies PutOperationItemsBuilder<
  GenericTupleTableSchema,
  GenericInterfaceTableSchema
>;

type PutHost<T, I> = {
  item: PutOperationItemsBuilder<T, I>;
};

const putHost: PutHost<GenericTupleTableSchema, GenericInterfaceTableSchema> = {
  item: (name, value) => null as any,
};

const putHostFn = (): PutHost<GenericTupleTableSchema, GenericInterfaceTableSchema> => ({
  item: (name: string, value: Record<string, unknown>): any => null as any,
});

const putItemFacadeFactory =
  () =>
  <
    T extends GenericTupleTableSchema = GenericTupleTableSchema,
    I extends GenericInterfaceTableSchema = GenericInterfaceTableSchema,
  >(): PutHost<T, I> => ({
    item: (name, value) => null as any,
  });
