import {
  Attribute,
  DateAttribute,
  InferOriginalOrAttributeDataType,
  ListAttribute,
  MapAttribute,
  PartitionKey,
  RegularAttribute,
  SortKey,
} from "./attribute";
import { InferProjectionFieldsFromSchemas, ReturnConsumedCapacityValues } from "./operations-common";
import { ConditionExpressionBuilder } from "./query";
import {
  ExtractEntityKeysFromTableSchema,
  FilterTableSchemaFieldsByType,
  ForEachMapValuePrependKey,
  InferTupledMap,
  PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList,
  RemoveTableSchemaFieldsByType,
  TransformTableSchemaIntoSchemaInterfacesMap,
  TransformTableSchemaIntoTupleSchemasMap,
} from "./schema";
import { CombineArrayElementsViaUnion, ConcatenateArrays, DeepPartial } from "./utility-types";

type AddOperationsToItemInterface<T> = T extends object
  ? {
      [K in keyof T]?: T[K] extends number
        ? UpdateOperationDef<"increment" | "decrement", T[K]> | T[K]
        : T[K] extends Array<unknown>
        ? AppendListUpdateOperationDef<T[K]> | T[K]
        : AddOperationsToItemInterface<T[K]>;
    }
  : T;

type SetItemValue<S, TS> = (
  S extends infer T ? (T extends [infer S] ? (S extends [infer K, infer V] ? V : S) : T) : never
) extends infer I
  ? Omit<
      I,
      CombineArrayElementsViaUnion<
        ExtractEntityKeysFromTableSchema<FilterTableSchemaFieldsByType<TS, [PartitionKey<any>, SortKey<any>]>>
      > &
        string
    > extends infer R
    ? AddOperationsToItemInterface<R>
    : never
  : never;

type TransformMapSchemaIntoRecord<T> = (
  T extends [infer F, ...infer R]
    ? F extends [infer K, infer V]
      ? Record<K & string, TransformAttributeValueIntoRecord<V>> & TransformMapSchemaIntoRecord<R>
      : never
    : T extends []
    ? {}
    : T
) extends infer R
  ? { [RK in keyof R]: R[RK] }
  : never;

type MS = TransformMapSchemaIntoRecord<[["field", number], ["field2", string]]>;

// @TODO: seems we might recunstruct the map builder interface from the field tuples
// Probably it might be used to simplify the typesystem in the future
export type TransformAttributeValueIntoRecord<T> = T extends Attribute<infer A, infer V>
  ? A extends "MAP"
    ? TransformMapSchemaIntoRecord<V>
    : A extends "LIST"
    ? TransformAttributeValueIntoRecord<V>[] extends infer LT
      ? LT | UpdateOperationDef<"append_list", LT>
      : never
    : InferOriginalOrAttributeDataType<T>
  : T;

type TAV = TransformAttributeValueIntoRecord<
  ListAttribute<
    MapAttribute<
      [
        ["field", RegularAttribute<number>],
        ["field2", string],
        [
          "map",
          MapAttribute<
            [
              ["nested_field", DateAttribute<Date>],
              ["nested_list", ListAttribute<number>],
              ["nested_list_map", ListAttribute<MapAttribute<[["list_map", number]]>>],
            ]
          >,
        ],
      ]
    >
  >
>;

type SetValuesSchemaOperationBuilder<S> = S extends [infer F, ...infer R]
  ? (F extends [infer K, infer V] ? (field: K, value: TransformAttributeValueIntoRecord<V>) => any : never) &
      SetValuesSchemaOperationBuilder<R>
  : S;

type SetValuesOperationBuilder<S> = S extends [infer F, ...infer R]
  ? (F extends [infer K, infer S] ? SetValuesSchemaOperationBuilder<S> : never) & SetValuesOperationBuilder<R>
  : S;

// type SetValuesBuilder<S> = (builder: (value: TransformTableSchemaIntoTupleSchemasMap<S>) => any) => any;
type SetValuesBuilder<S> = (builder: SetValuesOperationBuilder<S>) => any;

type UpdateOperationDef<N, T> = {
  operationName: N;
  value: T;
};

type AppendListUpdateOperationDef<T extends Array<unknown>> = UpdateOperationDef<"append_list", T>;

type AtomicIncrementUpdateOperationDef<T extends number> = UpdateOperationDef<"increment", T>;

type DecrementUpdateOperationDef<T extends number> = UpdateOperationDef<"decrement", T>;

export const appendList = <T extends Array<unknown>>(value: T): AppendListUpdateOperationDef<T> => ({
  operationName: "append_list",
  value,
});

export const atomitIncrement = <T extends number>(value: T): AtomicIncrementUpdateOperationDef<T> => ({
  operationName: "increment",
  value,
});

export const atomicDecrement = <T extends number>(value: T): DecrementUpdateOperationDef<T> => ({
  operationName: "decrement",
  value,
});

type UpdateIndividualItemOperationBuilder<S> = {
  key: (
    builder: ConditionExpressionBuilder<
      PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<TransformTableSchemaIntoTupleSchemasMap<S>>
    >,
  ) => UpdateIndividualItemOperationBuilder<S>;
  set: (
    value:
      | SetItemValue<TransformTableSchemaIntoSchemaInterfacesMap<S>, TransformTableSchemaIntoTupleSchemasMap<S>>
      | SetValuesBuilder<
          RemoveTableSchemaFieldsByType<TransformTableSchemaIntoTupleSchemasMap<S>, [PartitionKey<any>, SortKey<any>]>
        >,
  ) => UpdateIndividualItemOperationBuilder<S>;
  remove: (
    fields: InferProjectionFieldsFromSchemas<
      RemoveTableSchemaFieldsByType<TransformTableSchemaIntoTupleSchemasMap<S>, [PartitionKey<any>, SortKey<any>]>
    >,
  ) => UpdateIndividualItemOperationBuilder<S>;
  // TODO: currently ADD and DELETE is not supported because it works only with specific field types what requires additional work to implement it
  // add: (fields: Array<InferProjectionFieldsFromSchemas<S>>) => UpdateIndividualItemOperationBuilder<S>;
  // delete: (
  //   fields: InferProjectionFieldsFromSchemas<TransformTableSchemaIntoTupleSchemasMap<S>>,
  // ) => UpdateIndividualItemOperationBuilder<S>;
  condition: (
    builder: ConditionExpressionBuilder<TransformTableSchemaIntoTupleSchemasMap<S>>,
  ) => UpdateIndividualItemOperationBuilder<S>;
  returnValues(value: "ALL_NEW" | "ALL_OLD" | "UPDATED_NEW" | "UPDATED_OLD"): UpdateIndividualItemOperationBuilder<S>;
  returnConsumedCapacity: (capacity: ReturnConsumedCapacityValues) => UpdateIndividualItemOperationBuilder<S>;
  returnItemCollectionMetrics: (value: "SIZE") => UpdateIndividualItemOperationBuilder<S>;
};

export type UpdateOperationBuilder<S> = S extends [infer F, ...infer R]
  ? (F extends [infer K, infer S]
      ? {
          [LK in `${K & string}Item`]: () => UpdateIndividualItemOperationBuilder<[[K, S]]>;
        }
      : F) &
      UpdateOperationBuilder<R>
  : S extends []
  ? {}
  : S;
