type PickByValue<T, ValueType> = Omit<T, { [Key in keyof T]: T[Key] extends ValueType ? never : Key }[keyof T]>;

type OmitByValue<T, ValueType> = Pick<T, { [Key in keyof T]: T[Key] extends ValueType ? never : Key }[keyof T]>;

type SingleOrArray<T> = T | T[];

type IndexAttribute<A extends string, T> = { attributeType: A; dataType: T };

type IndexAttributeValueTypes = string | number | boolean;

type PartitionKey<T extends IndexAttributeValueTypes> = IndexAttribute<"PARTITION_KEY", T>;

type SortKey<T extends IndexAttributeValueTypes> = IndexAttribute<"SORT_KEY", T>;

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

type TupleKeyValuePeer<T extends string | number | symbol, V> = [T, V];

type TupleKeys<T> = T extends [infer FT, ...infer R]
  ? FT extends [infer K, infer V]
    ? K | TupleKeys<R>
    : never
  : never;

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

type VBK = TupleValueByKey<[["a", 1], ["b", 2]], "b">;
type KT = TupleKeys<[["a", 1], ["b", 2]]>;
type VT = TupleValues<[["a", 1]]>;

type TupleKeyedEntitySchema = TupleKeyValuePeer<string, Record<string, unknown>>;

type TupleKeyedEntityScheams = [TupleKeyedEntitySchema, ...TupleKeyedEntitySchema[]];

type ComparisonOperatorFactory<S extends TupleKeyedEntityScheams, O extends string> = <
  SK extends TupleKeys<S>,
  LS extends TupleValueByKey<S, SK> = TupleValueByKey<S, SK>,
  F extends keyof LS = keyof LS,
>(
  field: F,
  operator: O,
  value: NormalOrIndexAttributeDataType<LS[F]>,
) => OperatorDefinition<"conditional", ComparisonOperatorDefinition<F, O, LS>>;

// type Proxy<N extends boolean = boolean> = ComparisonOperatorFactory<ExampleUsersEntitySchema, QueryComparisonOperators>;

const t = null as unknown as ComparisonOperatorFactory<
  [["users", ExampleUsersEntitySchema], ["posts", ExamplePostsEntitySchema]],
  QueryComparisonOperators
>;
// const t = null as unknown as Proxy;
t("age", "=", 1);

type LogicalOperatorFactory<S extends EntitySchema<string>> = <F extends keyof S>(
  operator: QueryLogicalOperators,
  ...conditions: ComparisonOperatorDefinition<F, QueryComparisonOperators, S>[]
) => OperatorDefinition<"logical", LogicalOperatorDefinition>;

// @TODO: separate allowed operations by the field's datatype & field type (partition key, sort key, etc.)
type QueryComparisonOperators = "=" | "<>" | "<" | "<=" | ">" | ">=" | "begins_with" | "between" | "in";

type QueryFunctions = "attribute_type" | "attribute_exists" | "attribute_not_exists" | "contains" | "size";

type QueryLogicalOperators = "and" | "or" | "not";

// type ConditionExpressionBuilder<S extends EntitySchema<string>> = (
//   expressionBuilder: ComparisonOperatorFactory<S, QueryComparisonOperators>,
//   // expressionBuilder: ComparisonOperatorFactory<S, QueryComparisonOperators> &
//   // Record<
//   //   QueryLogicalOperators,
//   //   (
//   //     conditions: Array<
//   //       | OperatorDefinition<"conditional", ComparisonOperatorDefinition<keyof S, QueryComparisonOperators, S>>
//   //       | OperatorDefinition<"logical", LogicalOperatorDefinition>
//   //     >,
//   //   ) => OperatorDefinition<"logical", LogicalOperatorDefinition>
//   // >,
// ) => SingleOrArray<
//   | OperatorDefinition<"conditional", ComparisonOperatorDefinition<keyof S, QueryComparisonOperators, S>>
//   | OperatorDefinition<"logical", LogicalOperatorDefinition>
// >;

type OverloadableComparisonFactory<T> = T extends [infer TupleSchema, ...infer R]
  ? TupleSchema extends TupleKeyedEntitySchema
    ? // TODO: seems we can simplify this place by pasing only a single tuple keyed schema
      ComparisonOperatorFactory<[TupleSchema], QueryComparisonOperators> & OverloadableComparisonFactory<R>
    : never
  : T;

type ForEachElementPickOnlyPrimaryKeyAttributes<T> = T extends [infer Tuple, ...infer R]
  ? [[TupleKeys<[Tuple]>, PrimaryKeyAttributes<TupleValues<[Tuple]>>], ...ForEachElementPickOnlyPrimaryKeyAttributes<R>]
  : T;

type ForEachElementPickOnlyNonPrimaryKeyAttributes<T> = T extends [infer Tuple, ...infer R]
  ? [
      [TupleKeys<[Tuple]>, NonPrimaryKeyAttributes<TupleValues<[Tuple]>>],
      ...ForEachElementPickOnlyNonPrimaryKeyAttributes<R>,
    ]
  : T;

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
    builder: ConditionExpressionBuilder<ForEachElementPickOnlyPrimaryKeyAttributes<S>>,
  ) => QueryOperationBuilder<S>;
  filter: (
    // builder: ConditionExpressionBuilder<S>,
    builder: ConditionExpressionBuilder<ForEachElementPickOnlyNonPrimaryKeyAttributes<S>>,
  ) => QueryOperationBuilder<S>;
};

// type QueryBuilder<S extends [EntitySchema<string>, ...EntitySchema<string>[]]> = {
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
 */
type SimpleStringCondition<T extends EntitySchema<string>, O extends string, K extends keyof T> = `${K &
  string} ${O} ${NormalOrIndexAttributeDataType<T[K]> & (string | number | boolean)}`;

// type SimpleStringConditionFn<T extends EntitySchema<string>, O extends string> = <K extends keyof T>(
type SimpleStringConditionFn<T extends EntitySchema<string>> = <K extends keyof T>(
  condition: T[K] extends PartitionKey<IndexAttributeValueTypes>
    ? SimpleStringCondition<T, "=", K>
    : T[K] extends SortKey<IndexAttributeValueTypes>
    ? SimpleStringCondition<T, Exclude<QueryComparisonOperators, "!=" | "between" | "in">, K>
    : SimpleStringCondition<T, QueryComparisonOperators, K>,
) => any;

const flatTest = null as unknown as SimpleStringConditionFn<ExampleUsersEntitySchema>;

flatTest("pk = users#some-random-user-id");

const builder = {} as unknown as Builder<
  [["users", ExampleUsersEntitySchema], ["posts", ExamplePostsEntitySchema], ["comments", ExampleCommentsEntitySchema]]
>;

type T = ForEachElementPickOnlyNonPrimaryKeyAttributes<
  [
    // [["users", ExampleUsersEntitySchema],
    ["posts", ExamplePostsEntitySchema],
    ["comments", ExampleCommentsEntitySchema],
  ]
>;
const TT: T = [
  // ["users", { age: 1 }],
  ["posts", { publishingDate: new Date() }],
  ["comments", { sk: true }],
];

builder
  .query()
  .keyCondition((eb, { or, and }) =>
    or([
      eb("pk", "=", "users#some-random-user-id"),
      eb("sk", "=", 10),
      eb<"comments">("pk", "=", "comments#random-id"),
      eb<"posts">("pk", "=", "posts#random-id"),

      // Simple consitions
      eb("sk", "=", 1),
      eb("pk", "=", "users#some-random-user-id"),
      eb("pk", "=", "posts#random-id"),
      eb("sk", "=", 10),
      eb("pk", "=", "comments#random-id"),

      // Should not work
      eb("sk", "=", "10"),

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
