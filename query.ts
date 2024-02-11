import {
  ForEachMapValuePrependKey,
  InferTupledMap,
  TupleMapBuilder,
  TypedTupleMapBuilderCompletedResult,
  composite,
  schemaBuilder,
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
} from "./schema";

export type Attribute<A, T> = { attributeType: A; dataType: T };

export type IndexAttributeValueTypes = string | number | boolean;

export type PartitionKey<T extends IndexAttributeValueTypes> = Attribute<"PARTITION_KEY", T>;

export type SortKey<T extends IndexAttributeValueTypes> = Attribute<"SORT_KEY", T>;

type EntitySchema<K extends string | number | symbol> = Record<
  K,
  string | number | bigint | boolean | null | undefined | Date | Attribute<string, unknown>
>;

type InferOriginalOrAttributeDataType<T> = T extends Attribute<string, infer U> ? U : T;

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

export type TupleKeyValuePeer<T extends string | number | symbol, V> = [T, V];

type TupleKeys<T> = T extends [infer FT, ...infer R]
  ? FT extends [infer K, infer V]
    ? K | TupleKeys<R>
    : never
  : never;

type TupleKey<T> = T extends [infer K, infer V] ? K : never;

type TupleValue<T> = T extends [infer K, infer V] ? V : never;

type TupleValues<T> = T extends [infer FT, ...infer R]
  ? FT extends [infer K, infer V]
    ? V | TupleValues<R>
    : never
  : never;

type TupleValueByKey<T, K> = T extends [infer FT, ...infer R]
  ? FT extends [K, infer V]
    ? V
    : TupleValueByKey<R, K>
  : never;

type TupleKeyedEntitySchema = TupleKeyValuePeer<
  string,
  [TupleKeyValuePeer<string, unknown>, ...TupleKeyValuePeer<string, unknown>[]]
>;

type TupleKeyedEntitySchemas = [TupleKeyedEntitySchema, ...TupleKeyedEntitySchema[]];

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

type ComparisonOperators = "=" | "<>" | "<" | "<=" | ">" | ">=" | "begins_with" | "between" | "in";

type ComparisonFunctions = "attribute_type" | "attribute_exists" | "attribute_not_exists" | "contains" | "size";

type LogicalOperators = "and" | "or" | "not";

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

// A tuple attribute can be created based on the list type
// export type ListAttribute<T> = Attribute<"LIST", T[]>;
export type ListAttribute<T> = Attribute<"LIST", T>; // changing type from T[] to T to avoid problems with extracting Attribute value types

export type MapAttribute<T> = Attribute<"MAP", T>;

export type SetAttributeValueTypes = string | number;

// Set attribute can contain string, number and binary types
export type SetAttribute<T extends SetAttributeValueTypes> = Attribute<"SET", T[]>;

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

type PickOnlyPrimaryKeyAttributesFromTupledFieldSchemasList<T> = T extends [infer AttributeTuple, ...infer R]
  ? TupleValue<AttributeTuple> extends PartitionKey<IndexAttributeValueTypes> | SortKey<IndexAttributeValueTypes>
    ? [
        [TupleKey<AttributeTuple>, TupleValue<AttributeTuple>],
        ...PickOnlyPrimaryKeyAttributesFromTupledFieldSchemasList<R>,
      ]
    : PickOnlyPrimaryKeyAttributesFromTupledFieldSchemasList<R>
  : T;

type PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<T> = T extends [infer Model, ...infer R]
  ? Model extends [infer K, infer L]
    ? [
        [K, PickOnlyPrimaryKeyAttributesFromTupledFieldSchemasList<L>],
        ...PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<R>,
      ]
    : never
  : T;

type PickOnlyNonPrimaryKeyAttributesFromTupledFieldSchemaList<T> = T extends [infer AttributeTuple, ...infer R]
  ? TupleValue<AttributeTuple> extends PartitionKey<IndexAttributeValueTypes> | SortKey<IndexAttributeValueTypes>
    ? PickOnlyNonPrimaryKeyAttributesFromTupledFieldSchemaList<R>
    : [
        [TupleKey<AttributeTuple>, TupleValue<AttributeTuple>],
        ...PickOnlyNonPrimaryKeyAttributesFromTupledFieldSchemaList<R>,
      ]
  : T;

type PickOnlyNonPrimaryKeyAttributesFromTupledModelSchemasList<T> = T extends [infer Model, ...infer R]
  ? Model extends [infer K, infer L]
    ? [
        [K, PickOnlyNonPrimaryKeyAttributesFromTupledFieldSchemaList<L>],
        ...PickOnlyNonPrimaryKeyAttributesFromTupledModelSchemasList<R>,
      ]
    : never
  : T;

// type ConditionExpressionBuilder<S extends TupleKeyedEntitySchemas> = (
type ConditionExpressionBuilder<S> = (
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

// type InferProjectionFieldsFromSchemas<T extends TupleKeyedEntitySchemas> = TupleKeys<TupleValues<InferTupledMap<T>>>;
// type InferProjectionFieldsFromSchemas<T> = ForEachMapValuePrependKey<InferTupledMap<T>>;
type ConcatenateArrays<T, A> = [...(T extends [...infer U] ? U : [T]), ...(A extends [...infer AE] ? AE : [A])];
type SchemaKeys<S> = S extends [infer F, ...infer R] ? (F extends [infer K, infer S] ? [K, ...SchemaKeys<R>] : F) : S;
type CombineArrayElementsViaUnion<T> = T extends [infer E, ...infer R] ? E | CombineArrayElementsViaUnion<R> : never;
type InferProjectionFieldsFromSchemas<T> = Array<
  CombineArrayElementsViaUnion<
    T extends [infer F, ...infer R]
      ? F extends [infer K, infer S]
        ? ConcatenateArrays<SchemaKeys<S>, InferProjectionFieldsFromSchemas<R>>
        : F
      : T
  >
>;

type ReturnConsumedCapacityValues = "INDEXES" | "TOTAL" | "NONE";

type TransformTableSchemaIntoSchemaInterfacesMap<T> = T extends [infer F, ...infer R]
  ? F extends [infer K, infer S]
    ? [[K, ReconstructInterfaces<InferTupleMapInterface<S>>], ...TransformTableSchemaIntoSchemaInterfacesMap<R>]
    : never
  : T;

type TransformTableSchemaIntoTupleSchemasMap<T> = T extends [infer F, ...infer R]
  ? F extends [infer K, infer S]
    ? [[K, ForEachMapValuePrependKey<InferTupledMap<S>>], ...TransformTableSchemaIntoTupleSchemasMap<R>]
    : never
  : T;

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

type DeepPartial<T> = T extends object
  ? T extends Date
    ? T
    : {
        [P in keyof T]?: T[P] extends Array<infer U>
          ? Array<DeepPartial<U>>
          : T[P] extends ReadonlyArray<infer U>
          ? ReadonlyArray<DeepPartial<U>>
          : DeepPartial<T[P]>;
      }
  : T;

type FilterTupleSchemasByType<T, P> = T extends [infer F, ...infer R]
  ? F extends [infer K, infer V]
    ? P extends V
      ? [F, ...FilterTupleSchemasByType<R, P>]
      : FilterTupleSchemasByType<R, P>
    : never
  : T;

type FTP = FilterTupleSchemasByType<
  [["id", PartitionKey<string>], ["name", string], ["sk", SortKey<string>]],
  PartitionKey<any>
>;
type FTS = FilterTupleSchemasByType<
  [["id", PartitionKey<string>], ["name", string], ["sk", SortKey<string>]],
  SortKey<any>
>;
type FTR = ExtractKeysFromTupleSchemas<ConcatenateArrays<FTP, FTS>>;

type FilterTableSchemaFieldsByType<T, P> = T extends [infer F, ...infer R]
  ? F extends [infer K, infer S]
    ? FilterTupleSchemasByType<S, P> extends infer FR
      ? FR extends []
        ? FilterTableSchemaFieldsByType<R, P>
        : [[K, FR], ...FilterTableSchemaFieldsByType<R, P>]
      : never
    : never
  : T;

type ExtractKeysFromTupleSchemas<T> = T extends [infer F, ...infer R]
  ? F extends [infer K, infer V]
    ? [K, ...ExtractKeysFromTupleSchemas<R>]
    : never
  : T;

type ExtractEntityKeysFromTableSchema<S> = S extends [infer F, ...infer R]
  ? F extends [infer K, infer S]
    ? ConcatenateArrays<ExtractKeysFromTupleSchemas<S>, ExtractEntityKeysFromTableSchema<R>>
    : F
  : S;

type FTP2 = FilterTableSchemaFieldsByType<
  [
    ["users", [["id", PartitionKey<string>], ["name", string], ["sk", SortKey<string>]]],
    ["users2", [["name", string], ["sk", SortKey<string>]]],
  ],
  PartitionKey<any>
>;
type FTP3 = FilterTableSchemaFieldsByType<
  [
    ["users", [["id", PartitionKey<string>], ["name", string], ["sk", SortKey<string>]]],
    ["users2", [["name", string], ["sk", SortKey<string>]]],
  ],
  SortKey<any>
>;
type Keys = CombineArrayElementsViaUnion<
  ConcatenateArrays<ExtractEntityKeysFromTableSchema<FTP2>, ExtractEntityKeysFromTableSchema<FTP3>>
>;

type UpdateOperationBuilder<S> = S extends [infer F, ...infer R]
  ? (F extends [infer K, infer S]
      ? {
          [LK in `${K & string}Item`]: () => UpdateIndividualItemOperationBuilder<[[K, S]]>;
        }
      : F) &
      UpdateOperationBuilder<R>
  : S extends []
  ? {}
  : S;

type SetItemValue<S> = (
  TransformTableSchemaIntoSchemaInterfacesMap<S> extends infer T
    ? T extends [infer S]
      ? S extends [infer K, infer V]
        ? V
        : S
      : T
    : never
) extends infer I
  ? Omit<
      I,
      CombineArrayElementsViaUnion<
        ConcatenateArrays<
          ExtractEntityKeysFromTableSchema<
            FilterTableSchemaFieldsByType<TransformTableSchemaIntoTupleSchemasMap<S>, PartitionKey<any>>
          >,
          ExtractEntityKeysFromTableSchema<
            FilterTableSchemaFieldsByType<TransformTableSchemaIntoTupleSchemasMap<S>, SortKey<any>>
          >
        >
      > &
        string
    > extends infer R
    ? {
        [K in keyof R]:
          | R[K]
          | (R[K] extends Array<unknown> ? { operationName: "append_list"; value: R[K] } : never)
          | (R[K] extends number ? { operationName: "increment" | "decrement"; value: R[K] } : never);
      }
    : never
  : never;

type UpdateIndividualItemOperationBuilder<S> = {
  key: (
    builder: ConditionExpressionBuilder<
      PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<TransformTableSchemaIntoTupleSchemasMap<S>>
    >,
  ) => UpdateIndividualItemOperationBuilder<S>;
  // @TODO: use update operators for fields
  // @TODO: omit primary key fields
  set: (value: SetItemValue<S>) => UpdateIndividualItemOperationBuilder<S>;
  remove: (fields: InferProjectionFieldsFromSchemas<S>) => UpdateIndividualItemOperationBuilder<S>;
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
const queryBuilder = <S extends TupleMapBuilderResult<unknown, unknown>>(): Builder<InferTupledMap<S>> =>
  null as unknown as Builder<InferTupledMap<S>>;

type ExampleUsersEntitySchema = {
  pk: PartitionKey<`users#${string}`>;
  sk: SortKey<`users#${number}`>;
  age: number;
};

type ExamplePostsEntitySchema = {
  pk: `posts#${string}`;
  sk: number;
  publishingDate: Date;
  authors: Array<{ name: string; rating: number }>;
};

type ExampleCommentsEntitySchema = {
  pk: PartitionKey<`comments#${string}`>;
  sk: SortKey<`comments#${boolean}`>;
};

type ExampleCategoriesEntitySchema = {
  pk: `categories#${string}`;
  sk: number;
  metadata: {
    name: string;
    description: number;
  };
};

/**
 * Experiment with fully string condition
 *
 * Benefits:
 * - Simplicity of writing conditions;
 *
 * Disadvantages:
 * - Hard to compose conditions on the go when if/else logic is required;
 * - Hard to pass runtime data;
 */
type SimpleStringCondition<T extends EntitySchema<string>, O extends string, K extends keyof T> = `${K &
  string} ${O} ${InferOriginalOrAttributeDataType<T[K]> & (string | number | boolean)}`;

type SimpleStringConditionFn<T extends EntitySchema<string>> = <K extends keyof T>(
  condition: T[K] extends PartitionKey<IndexAttributeValueTypes>
    ? SimpleStringCondition<T, "=", K>
    : T[K] extends SortKey<IndexAttributeValueTypes>
    ? SimpleStringCondition<T, Exclude<ComparisonOperators, "!=" | "between" | "in">, K>
    : SimpleStringCondition<T, ComparisonOperators, K>,
) => any;

const flatTest = null as unknown as SimpleStringConditionFn<ExampleUsersEntitySchema>;

flatTest("pk = users#some-random-user-id");

const usersSchema = schemaBuilder()
  .add("pk", partitionKey(composite((builder) => builder.literal("users#").string())))
  .add("sk", sortKey(number()))
  .add("age", number())
  .add(
    "address",
    map(
      schemaBuilder()
        .add("city", map(schemaBuilder().add("name", "value").add("province", "value").build()))
        .add("street", "value")
        .add("zip", number())
        .add("building", "value")
        .build(),
    ),
  )
  .add("cards", list(map(schemaBuilder().add("last4", number()).add("type", "value").build())))
  .build();

const postsSchema = schemaBuilder<ExamplePostsEntitySchema>()
  .add("pk", partitionKey(composite((builder) => builder.literal("posts#").string())))
  .add("sk", sortKey(number()))
  .add("publishingDate", date())
  .add("authors", list(map(schemaBuilder().add("name", "value").add("rating", number()).build())))
  .build();

// There is a possibility of type missmatch if type is provided for a nested schema
const commentUsersSchema = schemaBuilder<{ username: string; postedAt: number }>()
  .add("username", "value")
  .add("postedAt", number())
  .build();
const commetnsSchema = schemaBuilder()
  .add("pk", partitionKey(composite((builder) => builder.literal("comments#").string())))
  .add("sk", sortKey(composite((builder) => builder.literal("comments#").boolean())))
  .add("users", list(map(commentUsersSchema)))
  .build();

const categoriesSchema = schemaBuilder<ExampleCategoriesEntitySchema>()
  .add("pk", partitionKey(composite((builder) => builder.literal("categories#").string())))
  .add("sk", sortKey(number()))
  .add(
    "metadata",
    map(
      schemaBuilder<{ name: string; description: number }>().add("name", "value").add("description", number()).build(),
    ),
  )
  .build();

const schema = schemaBuilder()
  .add("users", useSchema(usersSchema))
  .add("posts", useSchema(postsSchema))
  .add("comments", useSchema(commetnsSchema))
  .add("categories", useSchema(categoriesSchema))
  .build();

const schemaV2 = schemaBuilder()
  .add("users", usersSchema)
  .add("posts", postsSchema)
  .add("comments", commetnsSchema)
  .add("categories", categoriesSchema)
  .build();

queryBuilder<typeof schemaV2>()
  .query()
  .keyCondition((eb, { or, and }) =>
    or([
      eb("pk", "=", "users#some-random-user-id"),
      eb("sk", "=", 10),
      eb<"comments">("pk", "=", "comments#random-id"),
      eb<"posts">("pk", "=", "posts#sda"), // @TODO: fix this. It should not allow wrong value type
      eb<"users">("pk", "=", "users#some-random-user-id"),

      // Simple consitions
      eb("sk", "=", 1),
      eb("pk", "=", "users#some-random-user-id"),
      eb("pk", "=", "posts#random-id"),
      eb("sk", "=", 10),
      eb("pk", "=", "comments#random-id"),

      // Should not work
      eb<"posts">("pk", "=", "users#some-random-user-id"),
      eb("pk", ">=", "posts#random-id"),
      eb("sk", "=", "10"),
      eb("sdada", "=", "10"),

      // Complex conditions
      and([eb("pk", "=", "posts#random-id")]),
      and([eb("pk", "=", "posts#random-id"), eb("sk", "=", 2)]),
      and([
        or([eb("pk", "=", "users#some-random-user-id-2"), eb("pk", "<>", "users#some")]),
        eb("sk", ">=", 20),
        eb("sk", "<=", 50),
      ]),
    ]),
  )
  .filter((eb, { and }) =>
    and([
      eb("age", "=", 1),
      eb("publishingDate", ">", new Date()),

      // Nested data types
      eb("address.city.name", "=", "New York"),
      eb("address.zip", "=", 12345),
      eb("cards.[0].last4", "=", 1234),
      eb<"posts">("authors.[0].name", "=", "some author"),
      eb("authors.[0].rating", "=", 1),
      eb("users.[0].username", "=", "value"),
      eb<"comments">("users.[0].postedAt", "=", 1),
      eb("metadata.name", "=", "value"),
      eb<"categories">("metadata.description", "=", 1),

      // should not work
      eb("publishingDate", ">", 1),
      eb("way", "begins_with", "a"),
      eb<"users">("authors.[0].rating", "=", 1),
      eb("users.[0].username", "=", "not_value"),
      eb<"comments">("users.[0].postedAt2", "=", 1),
      eb<"categories">("metadata.description", "=", "1"),
      eb("metadata.name", "=", 1),
    ]),
  );

// const op: ComparisonOperatorFactory<ExampleUsersEntitySchema, QueryComparisonOperators> = (field, operator, value) => ({
//   type: "conditional",
//   operator: {
//     field,
//     operator,
//     value,
//   },
// });

// const userTestId = `users#some-random-user-id`;
// op("pk", "=", userTestId);
// op("pk", "!=", userTestId);
// op("pk", "<", userTestId);
// op("pk", "<=", userTestId);
// op("pk", ">", userTestId);
// op("pk", ">=", userTestId);
// op("pk", "begins_with", userTestId);
// op("pk", "between", userTestId);
// op("pk", "in", userTestId);

// op("sk", "=", "test");

// op("age", "=", 1);

// const type: `users#${string}` = "users#some-random-user-id";

const userEntitySchema = schemaBuilder()
  .add("id", partitionKey(composite((t) => t.literal("users#").string())))
  .add("sk", sortKey(number()))
  .add("name", string())
  .add("age", number())
  .add("dob", date())
  .add("address", map(schemaBuilder().add("zip", number()).add("building", string()).build()))
  .add("cards", list(map(schemaBuilder().add("last4", number()).add("type", string()).build())))
  .build();

const postsEntitySchema = schemaBuilder()
  .add("title", partitionKey(string()))
  .add("content", string())
  .add("authors", list(map(schemaBuilder().add("name", string()).build())))
  .build();

const tableSchema = schemaBuilder().add("users", userEntitySchema).add("posts", postsEntitySchema).build();

const qb = queryBuilder<typeof tableSchema>();

qb.query()
  .keyCondition((eb) => eb("id", "=", "users#some-random-user-id"))
  .filter((eb, { or }) =>
    or([eb("name", "begins_with", "bob"), eb("age", ">", 18), eb("dob", ">", new Date("2007-01-01"))]),
  );

qb.put().usersItem({
  id: "users#some-random-user-id",
  sk: 1,
  name: "",
  age: 0,
  dob: new Date(),
  address: {
    zip: 222,
    building: "my house",
  },
});

qb.get()
  .usersItem()
  .key((eb) => eb("id", "=", "users#some-random-user-id"))
  .projection(["name", "age", "address"]);

qb.get()
  .postsItem()
  .key((eb) => eb("title", "=", "some title"))
  .projection(["title", "content"]);

qb.update()
  .usersItem()
  .key((eb) => eb("id", "=", "users#some-random-user-id"))
  .condition((eb) => eb("age", "=", 20))
  .set({
    name: "new name",
    age: 21,
    dob: new Date(),
    address: {
      zip: 222,
      building: "my house",
    },
    cards: {
      operationName: "append_list",
      value: [{ last4: 1234, type: "visa" }],
    },
  })
  .remove(["name", "age"])
  .returnValues("ALL_NEW");

qb.delete()
  .usersItem()
  .key((eb) => eb("id", "=", "users#some-random-user-id"))
  .condition((eb) => eb("age", ">", 20));

qb.delete()
  .postsItem()
  .key((eb) => eb("title", "=", "some title"));
