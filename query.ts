type PickByValue<T, ValueType> = Omit<
  T,
  { [Key in keyof T]: T[Key] extends ValueType ? never : Key }[keyof T]
>;

type OmitByValue<T, ValueType> = Pick<
  T,
  { [Key in keyof T]: T[Key] extends ValueType ? never : Key }[keyof T]
>;

type IndexAttribute<A, T> = { attributeType: A; dataType: T };

type PartitionKey<T> = IndexAttribute<"PARTITION_KEY", T>;

type SortKey<T> = IndexAttribute<"SORT_KEY", T>;

type PrimaryKeyAttributes<T> = PickByValue<
  T,
  PartitionKey<unknown> | SortKey<unknown>
>;

type NonPrimaryKeyAttributes<T> = OmitByValue<
  T,
  PartitionKey<unknown> | SortKey<unknown>
>;

type EntitySchema<K extends string | number | symbol> = Record<
  K,
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | IndexAttribute<unknown, unknown>
>;

type NormalOrIndexAttributeDataType<T> = T extends IndexAttribute<
  unknown,
  infer U
>
  ? U
  : T;

// Not sure if it makes sense to have this type stricter as `F extends keyof S`
type OperatorDefinition<
  F extends string | number | symbol,
  O extends string,
  S extends EntitySchema<F>
> = {
  field: F;
  operator: O;
  // value: S[F] extends IndexAttribute<unknown, unknown> ? S[F]['dataType'] : S[F];
  value: NormalOrIndexAttributeDataType<S[F]>;
};

type Operator<S extends EntitySchema<string>, O extends string> = <
  F extends keyof S
>(
  field: F,
  operator: O,
  //   value: S[F] extends IndexAttribute<unknown, unknown> ? S[F]['dataType'] : S[F]
  value: NormalOrIndexAttributeDataType<S[F]>
) => OperatorDefinition<F, O, S>;

// @TODO: separate allowed operations by the field's datatype
type QueryComparisonOperators =
  | "="
  | "!="
  | "<"
  | "<="
  | ">"
  | ">="
  | "begins_with"
  | "between"
  | "in";

type QueryFunctions =
  | "attribute_type"
  | "attribute_exists"
  | "attribute_not_exists"
  | "contains"
  | "size";

// @TODO: provide a way to use logical operators
type QueryLogicalOperators = "and" | "or" | "not";

type ConditionBuilder<S extends EntitySchema<string>> = (
  qb: Operator<S, QueryComparisonOperators>
) => OperatorDefinition<keyof S, QueryComparisonOperators, S>[];

// @TODO: add constraints for operators allowed for partition key and sort key (if applicable)
type QueryOperationBuilder<K extends string, S extends EntitySchema<K>> = {
  keyCondition: (
    builder: ConditionBuilder<PrimaryKeyAttributes<S>>
  ) => QueryOperationBuilder<K, S>;

  filter: (
    builder: ConditionBuilder<NonPrimaryKeyAttributes<S>>
  ) => QueryOperationBuilder<K, S>;
};

type QueryBuilder<K extends string, S extends EntitySchema<K>> = {
  query: () => QueryOperationBuilder<K, S>;
};

type Builder<S extends Record<string, EntitySchema<string>>> = {
  [K in keyof S]: QueryBuilder<keyof S[K] & string, S[K]>;
};

type ExampleUsersEntitySchema = {
  pk: PartitionKey<`users#${string}`>;
  sk: SortKey<string>;
  age: number;
};

type ExamplePostsEntitySchema = {
  pk: string;
  sk: number;
};

type ExampleTableSchema = {
  users: ExampleUsersEntitySchema;
  posts: ExamplePostsEntitySchema;
};

const builder: Builder<ExampleTableSchema> = {} as Builder<ExampleTableSchema>;

// @TODO: probably we will need to use entity names as field prefixes to enable queries across multiple entities
builder.users
  .query()
  .keyCondition((qb) => [
    qb("pk", "=", "users#some-random-user-id"),
    qb("sk", "=", "test"),
  ])
  .filter((qb) => [qb("age", "=", 1)]);

const op: Operator<ExampleUsersEntitySchema, QueryComparisonOperators> = (
  field,
  operator,
  value
) => ({
  field,
  operator,
  value,
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

const type: `users#${string}` = "test";
