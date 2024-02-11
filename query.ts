import {
  Attribute,
  IndexAttributeValueTypes,
  InferOriginalOrAttributeDataType,
  PartitionKey,
  SortKey,
} from "./attribute";
import { InferProjectionFieldsFromSchemas, ReturnConsumedCapacityValues } from "./operations-common";
import {
  ForEachMapValuePrependKey,
  InferTupledMap,
  TupleMapBuilder,
  TypedTupleMapBuilderCompletedResult,
  composite,
  schema,
  date,
  list,
  map,
  number,
  partitionKey,
  useSchema,
  sortKey,
  TupleMapBuilderResult,
  string,
  InferTupleMapInterface,
  TransformTypeToSchemaBuilderInterface,
  ReconstructInterfaces,
  TupleKeyValuePeer,
  TupleValue,
  TupleKey,
  PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList,
  PickOnlyNonPrimaryKeyAttributesFromTupledModelSchemasList,
  TransformTableSchemaIntoSchemaInterfacesMap,
  TransformTableSchemaIntoTupleSchemasMap,
} from "./schema";
import { UpdateOperationBuilder } from "./update-item";
import { CombineArrayElementsViaUnion, ConcatenateArrays } from "./utility-types";

// @TODO: evaluate if this type is neccesary
export type EntitySchema<K extends string | number | symbol> = Record<
  K,
  string | number | bigint | boolean | null | undefined | Date | Attribute<string, unknown>
>;

// Not sure if it makes sense to have this type stricter as `F extends keyof S`
// type ComparisonOperatorDefinition<F extends string | number | symbol, O extends string, S extends EntitySchema<F>> = {
type ComparisonOperatorDefinition<
  F extends string | number | symbol,
  O extends string,
  S extends Record<F, unknown>,
> = {
  field: F;
  operator: O;
  value: InferOriginalOrAttributeDataType<S[F]>;
};

// The type might be make stricter by accepting the operator as a generic type parameter. It might help during implementation of the builder.
type LogicalOperatorDefinition = {
  operator: LogicalOperators;
  conditions: Array<ComparisonOperatorDefinition<string, string, EntitySchema<string>> | LogicalOperatorDefinition>;
};

type OperatorDefinition<
  T extends "conditional" | "logical" | "function",
  O extends
    | ComparisonOperatorDefinition<string | number | symbol, string, EntitySchema<string>>
    | LogicalOperatorDefinition,
> = {
  type: T;
  operator: T extends "logical" ? O[] : O;
};

type ComparisonOperatorFactory<N, S extends Record<string, unknown>, O extends string> = <
  LN extends N, // necessary to make the model names generics work
  F extends keyof S = keyof S,
>(
  field: F,
  operator: O,
  value: InferOriginalOrAttributeDataType<S[F]>,
) => OperatorDefinition<"conditional", ComparisonOperatorDefinition<F, O, S>>;

type LogicalOperatorFactory<S extends EntitySchema<string>> = <F extends keyof S>(
  operator: LogicalOperators,
  ...conditions: ComparisonOperatorDefinition<F, ComparisonOperators, S>[]
) => OperatorDefinition<"logical", LogicalOperatorDefinition>;

export type ComparisonOperators = "=" | "<>" | "<" | "<=" | ">" | ">=" | "begins_with" | "between" | "in";

export type ComparisonFunctions = "attribute_type" | "attribute_exists" | "attribute_not_exists" | "contains" | "size";

export type LogicalOperators = "and" | "or" | "not";

// @TODO: evaluate if necessary and add operators for NOT LEAF keys of map, list and set types
// @TODO: investigate is is possible to match exactly a "const" type like "value" or "10"
type AttributeTypesToOperatorsTupledMap = [
  [PartitionKey<any>, "="],
  [SortKey<any>, "=" | "<" | "<=" | ">" | ">=" | "begins_with" | "between"],
  [string, ComparisonOperators | ComparisonFunctions],
  [number, ComparisonOperators | ComparisonFunctions],
  [bigint, ComparisonOperators | ComparisonFunctions],
  [boolean, ComparisonOperators | ComparisonFunctions],
  [Date, ComparisonOperators | ComparisonFunctions],
];

/**
 * The generic extracts "value type" from a "tupled schema" by checking if the provided type is a subtype of the one from the schema
 */
type GetAttributeOperatorsByType<T, M> = M extends [infer FT, ...infer R]
  ? FT extends [infer OT, infer O]
    ? T extends OT
      ? O
      : GetAttributeOperatorsByType<T, R>
    : never
  : never;

type ForEachKeyComparisonOperatorFactory<K, T> = T extends [infer KeyValuePeer, ...infer R]
  ? KeyValuePeer extends TupleKeyValuePeer<string, unknown>
    ? ComparisonOperatorFactory<
        K,
        Record<TupleKey<KeyValuePeer>, TupleValue<KeyValuePeer>>,
        GetAttributeOperatorsByType<TupleValue<KeyValuePeer>, AttributeTypesToOperatorsTupledMap>
      > &
        ForEachKeyComparisonOperatorFactory<K, R>
    : never
  : T;

type OverloadableComparisonFactory<T> = T extends [infer EntityTupleSchema, ...infer R]
  ? EntityTupleSchema extends [infer K, infer Schemas]
    ? ForEachKeyComparisonOperatorFactory<K, Schemas> & OverloadableComparisonFactory<R>
    : never
  : T;

// type ConditionExpressionBuilder<S extends TupleKeyedEntitySchemas> = (
export type ConditionExpressionBuilder<S> = (
  expressionBuilder: OverloadableComparisonFactory<S>,

  // @TODO: add possibility to target specific entity type via generic parameter
  // Awaits for the results of first usage and a feedback on usefulness on targeting a specific type in the condition expression
  logicalOperators: {
    [LK in LogicalOperators]: (
      conditions: Array<
        // @TODO: fix schema types for the logical conditions section
        // | OperatorDefinition<"conditional", ComparisonOperatorDefinition<string, QueryComparisonOperators, S>>
        | OperatorDefinition<
            "conditional",
            ComparisonOperatorDefinition<string, ComparisonOperators | ComparisonFunctions, EntitySchema<string>>
          >
        | OperatorDefinition<"logical", LogicalOperatorDefinition>
      >,
    ) => OperatorDefinition<"logical", LogicalOperatorDefinition>;
  },
) => any;

// type QueryOperationBuilder<S extends TupleKeyedEntitySchemas> = {
type QueryOperationBuilder<S> = {
  keyCondition: (
    builder: ConditionExpressionBuilder<PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<S>>,
  ) => QueryOperationBuilder<S>;
  filter: (
    builder: ConditionExpressionBuilder<PickOnlyNonPrimaryKeyAttributesFromTupledModelSchemasList<S>>,
  ) => QueryOperationBuilder<S>;
  projection: (fields: InferProjectionFieldsFromSchemas<S>) => QueryOperationBuilder<S>;
  offset: (offset: number) => QueryOperationBuilder<S>;
  limit: (limit: number) => QueryOperationBuilder<S>;
  returnConsumedCapacity: (capacity: ReturnConsumedCapacityValues) => QueryOperationBuilder<S>;
};

type ScanOperationBuilder<S> = {
  filter: (builder: ConditionExpressionBuilder<S>) => ScanOperationBuilder<S>;
  projection: (fields: InferProjectionFieldsFromSchemas<S>) => ScanOperationBuilder<S>;
  offset: (offset: number) => ScanOperationBuilder<S>;
  limit: (limit: number) => ScanOperationBuilder<S>;
  returnConsumedCapacity: (capacity: ReturnConsumedCapacityValues) => ScanOperationBuilder<S>;
};

// @TODO: for operations that work with a single item we can restrict the key condition to achieve the following:
// - use all the available primary keys;
// - provide a better type support for the key condition;
// - for data change operations such types narowing might also be useful and significantly improve type safety;

type GetItemOperationBuilder<S> = S extends [infer F, ...infer R]
  ? (F extends [infer K, infer S]
      ? {
          [LK in `${K & string}Item`]: () => GetIndividualItemOperationBuilder<[[K, S]]>;
        }
      : F) &
      GetItemOperationBuilder<R>
  : S extends []
  ? {}
  : S;

type GetIndividualItemOperationBuilder<S> = {
  key: (
    builder: ConditionExpressionBuilder<PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<S>>,
  ) => GetIndividualItemOperationBuilder<S>;
  // @TODO: projection can include nested fields - check it!
  projection: (fields: InferProjectionFieldsFromSchemas<S>) => GetIndividualItemOperationBuilder<S>;
  returnConsumedCapacity: (capacity: ReturnConsumedCapacityValues) => GetIndividualItemOperationBuilder<S>;
};

/**
 * NOTE:
 * For data change operations there is no sence to make generic functions that can work with several items
 * because each operation can work with only one item at a time
 */

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

type PutOperationBuilder<S> = PutOperationItemsBuilder<S, TransformTableSchemaIntoSchemaInterfacesMap<S>> &
  PutOperationAdditionalParamsBuilder<TransformTableSchemaIntoTupleSchemasMap<S>>;

type DeleteOperationBuilder<S> = S extends [infer F, ...infer R]
  ? (F extends [infer K, infer S]
      ? {
          [LK in `${K & string}Item`]: () => DeleteIndividualItemOperationBuilder<[[K, S]]>;
        }
      : F) &
      DeleteOperationBuilder<R>
  : S extends []
  ? {}
  : S;

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

// type QueryBuilder<S extends TupleKeyedEntitySchemas> = {
//   // type QueryBuilder<S> = {
//   query: () => QueryOperationBuilder<TransformTableSchemaIntoTupleSchemasMap<S>>;
// };

// type Builder<S extends TupleKeyedEntitySchemas> = QueryBuilder<S>;
type Builder<S> = {
  query: () => QueryOperationBuilder<TransformTableSchemaIntoTupleSchemasMap<S>>;
  scan: () => ScanOperationBuilder<TransformTableSchemaIntoTupleSchemasMap<S>>;
  get: () => GetItemOperationBuilder<TransformTableSchemaIntoTupleSchemasMap<S>>;
  put: () => PutOperationBuilder<S>;
  update: () => UpdateOperationBuilder<S>;
  delete: () => DeleteOperationBuilder<S>;
};

// const queryBuilder = <S extends TupleMapBuilderResult<unknown, TupleKeyedEntitySchemas>>(): Builder<
export const queryBuilder = <S extends TupleMapBuilderResult<unknown, unknown>>(): Builder<InferTupledMap<S>> =>
  null as unknown as Builder<InferTupledMap<S>>;
