import {
  InferTupledMap,
  TupleMapBuilder,
  compositeType,
  dateType,
  numberType,
  partitionKey,
  schemaType,
  sortKey,
} from "./schema";

type PreventEmptyObject<T> = keyof T extends never ? never : T;

type PickByValue<T, ValueType> = PreventEmptyObject<
  Omit<T, { [Key in keyof T]: T[Key] extends ValueType ? never : Key }[keyof T]>
>;

type OmitByValue<T, ValueType> = PreventEmptyObject<
  Omit<T, { [Key in keyof T]: T[Key] extends ValueType ? Key : never }[keyof T]>
>;

type SingleOrArray<T> = T | T[];

type IndexAttribute<A, T> = { attributeType: A; dataType: T };

export type IndexAttributeValueTypes = string | number | boolean;

export type PartitionKey<T extends IndexAttributeValueTypes> = IndexAttribute<"PARTITION_KEY", T>;

export type SortKey<T extends IndexAttributeValueTypes> = IndexAttribute<"SORT_KEY", T>;

type PrimaryKeyAttributes<T> = PickByValue<
  T,
  PartitionKey<IndexAttributeValueTypes> | SortKey<IndexAttributeValueTypes>
>;

type NonPrimaryKeyAttributes<T> = OmitByValue<
  T,
  PartitionKey<IndexAttributeValueTypes> | SortKey<IndexAttributeValueTypes>
>;

type EntitySchema<K extends string | number | symbol> = Record<
  K,
  string | number | bigint | boolean | null | undefined | Date | IndexAttribute<string, unknown>
>;

type NormalOrIndexAttributeDataType<T> = T extends IndexAttribute<string, infer U> ? U : T;

// Not sure if it makes sense to have this type stricter as `F extends keyof S`
// type ComparisonOperatorDefinition<F extends string | number | symbol, O extends string, S extends EntitySchema<F>> = {
type ComparisonOperatorDefinition<
  F extends string | number | symbol,
  O extends string,
  S extends Record<F, unknown>,
> = {
  field: F;
  operator: O;
  value: NormalOrIndexAttributeDataType<S[F]>;
};

// The type might be make stricter by accepting the operator as a generic type parameter. It might help during implementation of the builder.
type LogicalOperatorDefinition = {
  operator: QueryLogicalOperators;
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

// type TupleKeyedEntitySchema = TupleKeyValuePeer<string, Record<string, unknown>>;
type TupleKeyedEntitySchema = TupleKeyValuePeer<
  string,
  [TupleKeyValuePeer<string, unknown>, ...TupleKeyValuePeer<string, unknown>[]]
>;

type TupleKeyedEntityScheams = [TupleKeyedEntitySchema, ...TupleKeyedEntitySchema[]];

// type ComparisonOperatorFactory<S extends TupleKeyedEntitySchema, O extends string> = <
type ComparisonOperatorFactory<N, S extends Record<string, unknown>, O extends string> = <
  LN extends N,
  F extends keyof S = keyof S,
>(
  field: F,
  operator: O,
  value: NormalOrIndexAttributeDataType<S[F]>,
) => OperatorDefinition<"conditional", ComparisonOperatorDefinition<F, O, S>>;
// ) => OperatorDefinition<"conditional", ComparisonOperatorDefinition<F, O, Record<F, TupleValue<S>>>>;

type LogicalOperatorFactory<S extends EntitySchema<string>> = <F extends keyof S>(
  operator: QueryLogicalOperators,
  ...conditions: ComparisonOperatorDefinition<F, QueryComparisonOperators, S>[]
) => OperatorDefinition<"logical", LogicalOperatorDefinition>;

// @TODO: separate allowed operations by the field's datatype & field type (partition key, sort key, etc.)
type QueryComparisonOperators = "=" | "<>" | "<" | "<=" | ">" | ">=" | "begins_with" | "between" | "in";

type QueryFunctions = "attribute_type" | "attribute_exists" | "attribute_not_exists" | "contains" | "size";

type QueryLogicalOperators = "and" | "or" | "not";

type ForEachKeyComparisonOperatorFactory<K, T> = T extends [infer KeyValuePeer, ...infer R]
  ? KeyValuePeer extends TupleKeyValuePeer<string, unknown>
    ? ComparisonOperatorFactory<K, Record<TupleKey<KeyValuePeer>, TupleValue<KeyValuePeer>>, QueryComparisonOperators> &
        ForEachKeyComparisonOperatorFactory<K, R>
    : never
  : T;

type T = ForEachKeyComparisonOperatorFactory<
  "users",
  [TupleKeyValuePeer<"pk", PartitionKey<IndexAttributeValueTypes>>]
>;
const t: T = null as any;
t("pk", "=", "users#some-random-user-id");
t<"users">("pk", "=", "users#some-random-user-id");

type OverloadableComparisonFactory<T> = T extends [infer EntityTupleSchema, ...infer R]
  ? EntityTupleSchema extends [infer K, infer Schemas]
    ? ForEachKeyComparisonOperatorFactory<K, Schemas> & OverloadableComparisonFactory<R>
    : never
  : T;

type S = OverloadableComparisonFactory<
  [
    ["users", [TupleKeyValuePeer<"pk", PartitionKey<`users#${string}`>>, TupleKeyValuePeer<"sk", SortKey<boolean>>]],
    ["posts", [TupleKeyValuePeer<"pk", PartitionKey<`posts#${string}`>>, TupleKeyValuePeer<"sk", SortKey<boolean>>]],
  ]
>;
const s: S = null as any;
s("sk", "=", false);
s("pk", "=", "users#some-random-user-id");
s<"posts">("pk", "=", "posts#some-random-post-id");

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

type PK = PickOnlyNonPrimaryKeyAttributesFromTupledModelSchemasList<
  [
    // ["users", [TupleKeyValuePeer<"pk", PartitionKey<`users#${string}`>>, TupleKeyValuePeer<"sk", SortKey<boolean>>]],
    [
      "posts",
      [
        TupleKeyValuePeer<"pk", PartitionKey<`posts#${string}`>>,
        TupleKeyValuePeer<"sk", SortKey<boolean>>,
        TupleKeyValuePeer<"publishingDate", Date>,
      ],
    ],
  ]
>;

type ConditionExpressionBuilder<S extends TupleKeyedEntityScheams> = (
  expressionBuilder: OverloadableComparisonFactory<S>,

  // @TODO: add possibility to target specific entity type via generic parameter
  logicalOperators: {
    [LK in QueryLogicalOperators]: (
      conditions: Array<
        // @TODO: fix schema types for the logical conditions section
        // | OperatorDefinition<"conditional", ComparisonOperatorDefinition<string, QueryComparisonOperators, S>>
        | OperatorDefinition<
            "conditional",
            ComparisonOperatorDefinition<string, QueryComparisonOperators, EntitySchema<string>>
          >
        | OperatorDefinition<"logical", LogicalOperatorDefinition>
      >,
    ) => OperatorDefinition<"logical", LogicalOperatorDefinition>;
  },
) => any;

// @TODO: add constraints for operators allowed for partition key and sort key (if applicable)
type QueryOperationBuilder<S extends TupleKeyedEntityScheams> = {
  keyCondition: (
    builder: ConditionExpressionBuilder<PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList<S>>,
  ) => QueryOperationBuilder<S>;
  filter: (
    builder: ConditionExpressionBuilder<PickOnlyNonPrimaryKeyAttributesFromTupledModelSchemasList<S>>,
  ) => QueryOperationBuilder<S>;
};

type QueryBuilder<S extends TupleKeyedEntityScheams> = {
  query: () => QueryOperationBuilder<S>;
};

type Builder<S extends TupleKeyedEntityScheams> = QueryBuilder<S>;

type ExampleUsersEntitySchema = {
  pk: PartitionKey<`users#${string}`>;
  sk: SortKey<`users#${number}`>;
  age: number;
};

type ExamplePostsEntitySchema = {
  pk: PartitionKey<`posts#${string}`>;
  sk: SortKey<number>;
  publishingDate: Date;
};

type ExampleCommentsEntitySchema = {
  pk: PartitionKey<`comments#${string}`>;
  sk: SortKey<`comments#${boolean}`>;
};

type ExampleTableSchema = {
  users: ExampleUsersEntitySchema;
  posts: ExamplePostsEntitySchema;
  comments: ExampleCommentsEntitySchema;
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
  string} ${O} ${NormalOrIndexAttributeDataType<T[K]> & (string | number | boolean)}`;

type SimpleStringConditionFn<T extends EntitySchema<string>> = <K extends keyof T>(
  condition: T[K] extends PartitionKey<IndexAttributeValueTypes>
    ? SimpleStringCondition<T, "=", K>
    : T[K] extends SortKey<IndexAttributeValueTypes>
    ? SimpleStringCondition<T, Exclude<QueryComparisonOperators, "!=" | "between" | "in">, K>
    : SimpleStringCondition<T, QueryComparisonOperators, K>,
) => any;

const flatTest = null as unknown as SimpleStringConditionFn<ExampleUsersEntitySchema>;

flatTest("pk = users#some-random-user-id");

const schemaBuilder = {} as unknown as TupleMapBuilder;

const usersSchema = schemaBuilder
  .add("pk", partitionKey(compositeType((builder) => builder.literal("users#").string())))
  .add("sk", sortKey(numberType()))
  .add("age", numberType());

const postsSchema = schemaBuilder
  .add("pk", partitionKey(compositeType((builder) => builder.literal("posts#").string())))
  .add("sk", sortKey(numberType()))
  .add("publishingDate", dateType());

const commetnsSchema = schemaBuilder
  .add("pk", partitionKey(compositeType((builder) => builder.literal("comments#").string())))
  .add("sk", sortKey(compositeType((builder) => builder.literal("comments#").boolean())));

const schema = schemaBuilder
  .add("users", schemaType(usersSchema))
  .add("posts", schemaType(postsSchema))
  .add("comments", schemaType(commetnsSchema));

type SchemaType = InferTupledMap<typeof schema>;
const builder = {} as unknown as Builder<SchemaType>;
// const builder = {} as unknown as Builder<
//   [["users", ExampleUsersEntitySchema], ["posts", ExamplePostsEntitySchema], ["comments", ExampleCommentsEntitySchema]]
// >;

builder
  .query()
  .keyCondition((eb, { or, and }) =>
    or([
      eb("pk", "=", "users#some-random-user-id"),
      eb("sk", "=", 10),
      eb<"comments">("pk", "=", "comments#random-id"),
      eb<"posts">("pk", "=", "posts#sda"), // @TODO: fix this. It should not allow wrong value type
      eb<"posts">("pk", "=", "users#some-random-user-id"),
      eb<"users">("pk", "=", "users#some-random-user-id"),

      // Simple consitions
      eb("sk", "=", 1),
      eb("pk", "=", "users#some-random-user-id"),
      eb("pk", "=", "posts#random-id"),
      eb("sk", "=", 10),
      eb("pk", "=", "comments#random-id"),

      // Should not work
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
      // should not work
      eb("publishingDate", ">", 1),
      eb("way", "begins_with", "a"),
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
