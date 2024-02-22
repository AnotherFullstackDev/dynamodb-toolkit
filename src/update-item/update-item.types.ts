import { ReturnConsumedCapacity, ReturnItemCollectionMetrics, UpdateItemCommandOutput } from "@aws-sdk/client-dynamodb";
import {
  ApplyNullability,
  ApplyOptional,
  Attribute,
  AttributeType,
  DateAttribute,
  ListAttribute,
  MapAttribute,
  PartitionKey,
  RegularAttribute,
  ResolveOptional,
  SortKey,
} from "../attribute/attribute";
import { ConditionExpressionBuilder, KeyConditionExpressionBuilder } from "../condition/condition.types";
import {
  ExpressionPlaceholdersHost,
  GenericCondition,
  InferProjectionFieldsFromSchemas,
  OperationDefBase,
  OperationType,
  ReturnConsumedCapacityValues,
} from "../operations-common/operations-common.types";
import {
  ExtractEntityKeysFromTableSchema,
  FilterTableSchemaFieldsByType,
  PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList,
  RemoveTableSchemaFieldsByType,
  TransformTableSchemaIntoTupleSchemasMap,
  TurnOptionalFieldsToPartial,
} from "../schema/schema.types";
import { CombineArrayElementsViaUnion } from "../utility-types";

type AddOperationsToItemInterface<T> = T extends object
  ? {
      [K in keyof T]?: T[K] extends number
        ? FieldUpdateOperationDef<"increment" | "decrement", T[K]> | T[K]
        : T[K] extends Array<unknown>
        ? AppendListUpdateOperationDef<T[K]> | T[K]
        : AddOperationsToItemInterface<T[K]>;
    }
  : T;

export type SetItemValue<S, TS> = (
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
  ? ApplyOptional<
      T,
      ApplyNullability<
        T,
        A extends "MAP"
          ? TransformMapSchemaIntoRecord<V>
          : A extends "LIST"
          ? TransformAttributeValueIntoRecord<V>[] extends infer LT
            ? LT | FieldUpdateOperationDef<"append_list", LT>
            : never
          : TransformAttributeValueIntoRecord<V>
      >
    >
  : T;

type TAV = TransformAttributeValueIntoRecord<
  ListAttribute<
    MapAttribute<
      [
        ["field", RegularAttribute<number>],
        ["field2", string],
        ["field3", Attribute<AttributeType.REGULAR, string, true, true>],
        [
          "map",
          MapAttribute<
            [
              ["nested_field", DateAttribute<Date>],
              ["nested_list", ListAttribute<Attribute<AttributeType.REGULAR, number>>],
              ["nested_list_map", ListAttribute<MapAttribute<[["list_map", number]]>>],
            ]
          >,
        ],
      ]
    >
  >
>;

export type UnpackEntityAttributesIntoValueTypes<T> = T extends [infer F, ...infer R]
  ? F extends [infer K, infer V]
    ? [
        [K, ResolveOptional<TurnOptionalFieldsToPartial<TransformAttributeValueIntoRecord<V>>>],
        ...UnpackEntityAttributesIntoValueTypes<R>,
      ]
    : F
  : T;

type UET = UnpackEntityAttributesIntoValueTypes<
  [
    // ["field", Attribute<AttributeType.REGULAR, number, true>],
    // ["field", RegularAttribute<string>],
    // ["field2", string],
    [
      "map",
      MapAttribute<
        [
          ["nested_field", DateAttribute<Date>],
          ["nested_list", ListAttribute<Attribute<AttributeType.REGULAR, number>>],
          ["nested_list_map", ListAttribute<MapAttribute<[["list_map", number]]>>],
        ]
      >,
    ],
  ]
>;

export type UnpackTableAttributeIntoIntoValueTypes<T> = T extends [infer F, ...infer R]
  ? F extends [infer K, infer S]
    ? [[K, UnpackEntityAttributesIntoValueTypes<S>], ...UnpackTableAttributeIntoIntoValueTypes<R>]
    : never
  : T;

type UTT = UnpackTableAttributeIntoIntoValueTypes<
  [
    [
      "users",
      [
        ["field", RegularAttribute<number>],
        ["field2", string],
        [
          "map",
          MapAttribute<
            [
              ["nested_field", DateAttribute<Date>],
              ["nested_list", ListAttribute<Attribute<AttributeType.REGULAR, number>>],
              ["nested_list_map", ListAttribute<MapAttribute<[["list_map", number]]>>],
            ]
          >,
        ],
      ],
    ],
  ]
>;

export type SetOperationDef = {
  field: string;
  operation: FieldUpdateOperationDef<string, unknown>;
};

export type SetOperationDefsHost = {
  operations: SetOperationDef[];
};

export type SetOperationDefFactory<K, V> = (
  field: K,
  value: ResolveOptional<TurnOptionalFieldsToPartial<TransformAttributeValueIntoRecord<V>>>,
) => SetOperationDef;

type SetValuesSchemaOperationBuilder<S> = S extends [infer F, ...infer R]
  ? (F extends [infer K, infer V]
      ? // ? (field: K, value: TransformAttributeValueIntoRecord<V>) => SetOperationDef
        SetOperationDefFactory<K, V>
      : never) &
      SetValuesSchemaOperationBuilder<R>
  : S;

type SetValuesOperationBuilder<S> = S extends [infer F, ...infer R]
  ? (F extends [infer K, infer S] ? SetValuesSchemaOperationBuilder<S> : never) & SetValuesOperationBuilder<R>
  : S;

// type SetValuesBuilder<S> = (builder: (value: TransformTableSchemaIntoTupleSchemasMap<S>) => any) => any;
// export type SetValuesBuilder<S> = (builder: SetValuesOperationBuilder<S>) => SetOperationDefsHost;
export type SetValuesBuilder<S> = (builder: SetValuesOperationBuilder<S>) => SetOperationDef[];

export type FieldUpdateOperationDef<N, T> = {
  operationName: N;
  value: T;
};

export enum FieldUpdateOperation {
  APPEND_LIST = "append_list",
  ATOMIC_INCREMENT = "increment",
  ATOMIC_DECREMENT = "decrement",
  SET = "set",
}

type AppendListUpdateOperationDef<T extends Array<unknown>> = FieldUpdateOperationDef<
  FieldUpdateOperation.APPEND_LIST,
  T
>;

type AtomicIncrementUpdateOperationDef<T extends number> = FieldUpdateOperationDef<
  FieldUpdateOperation.ATOMIC_INCREMENT,
  T
>;

type AtomicDecrementUpdateOperationDef<T extends number> = FieldUpdateOperationDef<
  FieldUpdateOperation.ATOMIC_DECREMENT,
  T
>;

export const appendList = <T extends Array<unknown>>(value: T): AppendListUpdateOperationDef<T> => ({
  operationName: FieldUpdateOperation.APPEND_LIST,
  value,
});

export const atomitIncrement = <T extends number>(value: T): AtomicIncrementUpdateOperationDef<T> => ({
  operationName: FieldUpdateOperation.ATOMIC_INCREMENT,
  value,
});

export const atomicDecrement = <T extends number>(value: T): AtomicDecrementUpdateOperationDef<T> => ({
  operationName: FieldUpdateOperation.ATOMIC_DECREMENT,
  value,
});

export type UpdateIndividualItemOperationBuilder<S> = {
  key: (
    builder: KeyConditionExpressionBuilder<
      PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<TransformTableSchemaIntoTupleSchemasMap<S>>
    >,
  ) => UpdateIndividualItemOperationBuilder<S>;
  set: (
    // @TODO: add ability to update items via object notation
    value: // | SetItemValue<TransformTableSchemaIntoSchemaInterfacesMap<S>, TransformTableSchemaIntoTupleSchemasMap<S>>
    SetValuesBuilder<
      UnpackTableAttributeIntoIntoValueTypes<
        RemoveTableSchemaFieldsByType<TransformTableSchemaIntoTupleSchemasMap<S>, [PartitionKey<any>, SortKey<any>]>
      >
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
    builder: ConditionExpressionBuilder<
      RemoveTableSchemaFieldsByType<TransformTableSchemaIntoTupleSchemasMap<S>, [PartitionKey<any>, SortKey<any>]>
    >,
  ) => UpdateIndividualItemOperationBuilder<S>;
  returnValues(value: "ALL_NEW" | "ALL_OLD" | "UPDATED_NEW" | "UPDATED_OLD"): UpdateIndividualItemOperationBuilder<S>;
  returnConsumedCapacity: (capacity: ReturnConsumedCapacityValues) => UpdateIndividualItemOperationBuilder<S>;
  returnItemCollectionMetrics: (value: "SIZE") => UpdateIndividualItemOperationBuilder<S>;
  build: () => UpdateItemOperationDef;
  execute: () => Promise<UpdateItemCommandOutput>;
  executeAndReturnValue: <T = unknown>() => Promise<T | null>; // TODO: improve types by checking if return values are set
};

export type UpdateOperationBuilder<S> = S extends [infer F, ...infer R]
  ? (F extends [infer K, infer S]
      ? { item: (itemName: K & string) => UpdateIndividualItemOperationBuilder<[[K, S]]> }
      : // {
        //     [LK in `${K & string}Item`]: () => UpdateIndividualItemOperationBuilder<[[K, S]]>;
        //   }
        F) &
      UpdateOperationBuilder<R>
  : S extends []
  ? {}
  : S;

export type UpdateItemReturnValues = "ALL_NEW" | "ALL_OLD" | "UPDATED_NEW" | "UPDATED_OLD";

export type UpdateItemOperationBuilderState = {
  key: GenericCondition | null;
  set: {
    statements: string[];
    valuePlaceholders: Record<string, unknown>;
    attributePlaceholders: Record<string, string>;
  };
  remove: {
    attributes: string[];
    attributePlaceholders: Record<string, string>;
  };
  condition: GenericCondition | null;
  returnValues: UpdateItemReturnValues | null;
  returnConsumedCapacity: ReturnConsumedCapacityValues | null;
  returnItemCollectionMetrics: ReturnItemCollectionMetrics | null;
};

export type UpdateItemOperationDef = OperationDefBase<OperationType.UPDATE> &
  ExpressionPlaceholdersHost & {
    key: Record<string, unknown>;
    updateExpression: string;
    condition: string | null;
    returnValues: UpdateItemReturnValues | null;
    returnConsumedCapacity: ReturnConsumedCapacity | null;
    returnItemCollectionMetrics: ReturnItemCollectionMetrics | null;
  };
