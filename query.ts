type PickByValue<T, ValueType> = Omit<T, { [Key in keyof T]: T[Key] extends ValueType ? never : Key }[keyof T]>;

type OmitByValue<T, ValueType> = Pick<T, { [Key in keyof T]: T[Key] extends ValueType ? never : Key }[keyof T]>;

type SingleOrArray<T> = T | T[];

type IndexAttribute<A, T> = { attributeType: A; dataType: T };

type PartitionKey<T> = IndexAttribute<"PARTITION_KEY", T>;

type SortKey<T> = IndexAttribute<"SORT_KEY", T>;

type PrimaryKeyAttributes<T> = PickByValue<T, PartitionKey<unknown> | SortKey<unknown>>;

type NonPrimaryKeyAttributes<T> = OmitByValue<T, PartitionKey<unknown> | SortKey<unknown>>;

type EntitySchema<K extends string | number | symbol> = Record<
  K,
  string | number | bigint | boolean | null | undefined | IndexAttribute<unknown, unknown>
>;

type NormalOrIndexAttributeDataType<T> = T extends IndexAttribute<unknown, infer U> ? U : T;

// Not sure if it makes sense to have this type stricter as `F extends keyof S`
type ComparisonOperatorDefinition<F extends string | number | symbol, O extends string, S extends EntitySchema<F>> = {
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

type ComparisonOperatorFactory<S extends EntitySchema<string>, O extends string> = <F extends keyof S>(
  field: F,
  operator: O,
  value: NormalOrIndexAttributeDataType<S[F]>,
) => OperatorDefinition<"conditional", ComparisonOperatorDefinition<F, O, S>>;

type LogicalOperatorFactory<S extends EntitySchema<string>> = <F extends keyof S>(
  operator: QueryLogicalOperators,
  ...conditions: ComparisonOperatorDefinition<F, QueryComparisonOperators, S>[]
) => OperatorDefinition<"logical", LogicalOperatorDefinition>;

// @TODO: separate allowed operations by the field's datatype & field type (partition key, sort key, etc.)
type QueryComparisonOperators = "=" | "!=" | "<" | "<=" | ">" | ">=" | "begins_with" | "between" | "in";

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

type ConditionExpressionBuilder<S extends Record<string, EntitySchema<string>>> = (
  expressionBuilder: { [K in keyof S]: ComparisonOperatorFactory<S[K], QueryComparisonOperators> } & {
    [LK in QueryLogicalOperators]: (
      conditions: Array<
        | OperatorDefinition<"conditional", ComparisonOperatorDefinition<string, QueryComparisonOperators, S[keyof S]>>
        | OperatorDefinition<"logical", LogicalOperatorDefinition>
      >,
    ) => OperatorDefinition<"logical", LogicalOperatorDefinition>;
  },
) => any;

// @TODO: add constraints for operators allowed for partition key and sort key (if applicable)
type QueryOperationBuilder<S extends Record<string, EntitySchema<string>>> = {
  keyCondition: (
    builder: ConditionExpressionBuilder<{ [PK in keyof S]: PrimaryKeyAttributes<S[PK]> }>,
  ) => QueryOperationBuilder<S>;

  filter: (
    builder: ConditionExpressionBuilder<{ [FK in keyof S]: NonPrimaryKeyAttributes<S[FK]> }>,
  ) => QueryOperationBuilder<S>;
};

type QueryBuilder<S extends Record<string, EntitySchema<string>>> = {
  query: () => QueryOperationBuilder<S>;
};

type Builder<S extends Record<string, EntitySchema<string>>> = QueryBuilder<S>;

type ExampleUsersEntitySchema = {
  pk: PartitionKey<`users#${string}`>;
  sk: SortKey<number>;
  age: number;
};

type ExamplePostsEntitySchema = {
  pk: PartitionKey<`posts#${string}`>;
  sk: SortKey<number>;
};

type ExampleCommentsEntitySchema = {
  pk: PartitionKey<`comments#${string}`>;
};

type ExampleTableSchema = {
  users: ExampleUsersEntitySchema;
  posts: ExamplePostsEntitySchema;
  comments: ExampleCommentsEntitySchema;
};

const builder: Builder<ExampleTableSchema> = {} as Builder<ExampleTableSchema>;

builder
  .query()
  .keyCondition((eb) =>
    eb.or([
      // Simple consitions
      eb.users("sk", "=", 1),
      eb.users("pk", "=", "users#some-random-user-id"),
      eb.posts("pk", "=", "posts#random-id"),
      eb.posts("sk", "=", 10),
      eb.comments("pk", "=", "comments#random-id"),

      // Should not work
      eb.comments("sk", "=", 10),

      // Complex conditions
      eb.and([eb.posts("pk", "=", "posts#random-id")]),
      eb.and([eb.posts("pk", "=", "posts#random-id"), eb.posts("sk", "=", 2)]),
      eb.and([
        eb.or([eb.users("pk", "=", "users#some-random-user-id-2"), eb.users("pk", "!=", "users#some")]),
        eb.users("sk", ">=", 20),
        eb.users("sk", "<=", 50),
      ]),
    ]),
  )
  .filter((eb) => eb.users("age", "=", 1));

const op: ComparisonOperatorFactory<ExampleUsersEntitySchema, QueryComparisonOperators> = (field, operator, value) => ({
  type: "conditional",
  operator: {
    field,
    operator,
    value,
  },
});

const userTestId = `users#some-random-user-id`;
op("pk", "=", userTestId);
op("pk", "!=", userTestId);
op("pk", "<", userTestId);
op("pk", "<=", userTestId);
op("pk", ">", userTestId);
op("pk", ">=", userTestId);
op("pk", "begins_with", userTestId);
op("pk", "between", userTestId);
op("pk", "in", userTestId);

op("sk", "=", "test");

op("age", "=", 1);

const type: `users#${string}` = "users#some-random-user-id";
