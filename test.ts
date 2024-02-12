import {
  Attribute,
  PartitionKey,
  SortKey,
  composite,
  date,
  list,
  map,
  number,
  partitionKey,
  sortKey,
  string,
} from "./attribute";
import { queryBuilder } from "./query";
import {
  InferTupledMap,
  TransformTableSchemaIntoSchemaInterfacesMap,
  TransformTableSchemaIntoTupleSchemasMap,
  TupleKeyValuePeer,
  TupleMapBuilderResult,
  schema,
  useSchema,
} from "./schema";
import { appendList } from "./update-item";
import { ScalarTypes } from "./utility-types";

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

const usersSchema = schema()
  .add("pk", partitionKey(composite((builder) => builder.literal("users#").string())))
  .add("sk", sortKey(number()))
  .add("age", number())
  .add(
    "address",
    map(
      schema()
        .add("city", map(schema().add("name", string()).add("province", string()).build()))
        .add("street", string())
        .add("zip", number())
        .add("building", string())
        .build(),
    ),
  )
  .add("cards", list(map(schema().add("last4", number()).add("type", string()).build())))
  .build();

const postsSchema = schema<ExamplePostsEntitySchema>()
  .add("pk", partitionKey(composite((builder) => builder.literal("posts#").string())))
  .add("sk", sortKey(number()))
  .add("publishingDate", date())
  .add("authors", list(map(schema().add("name", string()).add("rating", number()).build())))
  .build();

// There is a possibility of type missmatch if type is provided for a nested schema
const commentUsersSchema = schema<{ username: string; postedAt: number }>()
  .add("username", string())
  .add("postedAt", number())
  .build();
const commetnsSchema = schema()
  .add("pk", partitionKey(composite((builder) => builder.literal("comments#").string())))
  .add("sk", sortKey(composite((builder) => builder.literal("comments#").boolean())))
  .add("users", list(map(commentUsersSchema)))
  .build();

const categoriesSchema = schema<ExampleCategoriesEntitySchema>()
  .add("pk", partitionKey(composite((builder) => builder.literal("categories#").string())))
  .add("sk", sortKey(number()))
  .add(
    "metadata",
    map(schema<{ name: string; description: number }>().add("name", string()).add("description", number()).build()),
  )
  .build();

const schemaV1 = schema()
  .add("users", useSchema(usersSchema))
  .add("posts", useSchema(postsSchema))
  .add("comments", useSchema(commetnsSchema))
  .add("categories", useSchema(categoriesSchema))
  .build();

const schemaV2 = schema()
  .add("users", usersSchema)
  .add("posts", postsSchema)
  .add("comments", commetnsSchema)
  .add("categories", categoriesSchema)
  .build();

queryBuilder(schemaV2)
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

const userEntitySchema = schema()
  .add("id", partitionKey(composite((t) => t.literal("users#").string())))
  .add("sk", sortKey(number()))
  .add("name", string())
  .add("age", number())
  .add("dob", date())
  .add(
    "address",
    map(
      schema()
        .add("zip", number())
        .add("building", string())
        .add(
          "neighbors",
          list(
            map(
              schema()
                .add("name", string())
                .add("building", string())
                .add("zip", number())
                .add("sex", string())
                .build(),
            ),
          ),
        )
        .build(),
    ),
  )
  .add("cards", list(map(schema().add("last4", number()).add("type", string()).build())))
  .build();

const postsEntitySchema = schema<{ title: string; content: string; authors: { name: string }[] }>()
  .add("title", partitionKey(string()))
  .add("content", string())
  .add("authors", list(map(schema().add("name", string()).build())))
  .build();

const tableSchema = schema().add("users", userEntitySchema).add("posts", postsEntitySchema).build();

const testTable = schema().add("posts", postsEntitySchema).build();

type TableBase = InferTupledMap<typeof testTable>;
type TupleTable = TransformTableSchemaIntoTupleSchemasMap<TableBase>;
type InterfaceTable = TransformTableSchemaIntoSchemaInterfacesMap<TableBase>;

type GenericTupleTable = [...TupleKeyValuePeer<string, GenericTupleAttributeValue>[]];

const tt: TupleTable = [
  [
    "posts",
    [
      ["title", partitionKey(string())],
      ["content", string()],
      ["authors", { dataType: { dataType: [["name", string()]], attributeType: "MAP" }, attributeType: "LIST" }],
      ["authors.[0]", { dataType: [["name", string()]], attributeType: "MAP" }],
      ["authors.[0].name", string()],
    ],
  ],
];
const it: InterfaceTable = [["posts", { title: "string", content: "string", authors: [{ name: "string" }] }]];

const gt: GenericTupleTableSchema = tt;
const gi: GenericInterfaceTableSchema = it;

export type GenericTupleAttributeValue = TupleKeyValuePeer<
  string,
  Attribute<string, Attribute<string, unknown> | ScalarTypes | TupleKeyValuePeer<string, unknown>[]>
  // | Attribute<string, any>
  // | ScalarTypes
  // | Date
  // any
>;

export type GenericTupleTableSchema = [
  TupleKeyValuePeer<string, GenericTupleAttributeValue[]>,
  ...TupleKeyValuePeer<string, GenericTupleAttributeValue[]>[],
  // TupleKeyValuePeer<string, [GenericTupleAttributeValue, ...GenericTupleAttributeValue[]]>,
  // ...TupleKeyValuePeer<string, [GenericTupleAttributeValue, ...GenericTupleAttributeValue[]]>[],
];

// export type GenericInterfaceTableSchema = TupleKeyValuePeer<string, Record<string, unknown>>[];
export type GenericInterfaceTableSchema = [
  TupleKeyValuePeer<string, Record<string, any>>,
  // ...TupleKeyValuePeer<string, Record<string, any>>[],
  // ...unknown[],
];

// @TODO: necessary to encapsulate everything inside attributes to simplify typing
export type GenericTupleBuilderResultAttributeValue = TupleMapBuilderResult<
  Record<string, unknown>,
  [
    ...TupleKeyValuePeer<
      string,
      Attribute<
        any,
        | TupleMapBuilderResult<any, any>
        | Attribute<any, any>
        // | TupleKeyValuePeer<any, any>
        | ScalarTypes
        | Date
        | Record<string, any> // TODO: this type might masc problems with map builder result interfaces
      >
      // Attribute<
      //   unknown,
      //   // | TupleKeyValuePeer<string, Attribute<unknown, any>>
      //   | TupleKeyValuePeer<string, any>
      //   | Attribute<unknown, any>
      //   | TupleMapBuilderResult<any, any>
      //   | ScalarTypes
      //   | Date
      // >
    >[],
  ]
>;
// export type GenericTupleBuilderResultAttributeValue = TupleMapBuilderResult<
//   // | Attribute<string, Attribute<string, unknown> | string | number | boolean | TupleKeyValuePeer<string, unknown>[]>
//   Attribute<string, any | any[]> | TupleMapBuilderResult<any, any> | string | number | boolean | Date
// >;

export type GenericTupleBuilderResultSchema = [
  TupleKeyValuePeer<string, GenericTupleBuilderResultAttributeValue>,
  ...TupleKeyValuePeer<string, GenericTupleBuilderResultAttributeValue>[],
];

type TableBase2 = typeof tableSchema;
type Table = InferTupledMap<TableBase2>;
const tt2: Table = null as any;
const test_tt2: GenericTupleBuilderResultSchema = tt2;
const t: TupleMapBuilderResult<Record<string, unknown>, GenericTupleBuilderResultSchema> = tableSchema;
const qb = queryBuilder(tableSchema);

qb.query()
  .keyCondition((eb) => eb("id", "=", "users#some-random-user-id"))
  .filter((eb, { or }) =>
    or([
      eb<"users">("address.building", "begins_with", "bob"),
      eb("age", ">", 18),
      eb("dob", ">", new Date("2007-01-01")),
      eb<"posts">("content", "=", "some title"),
    ]),
  );

qb.put().item("users", {
  id: "users#some-random-user-id",
  sk: 1,
  name: "some name",
  age: 0,
  dob: new Date(),
  address: {
    zip: 222,
    building: "my house",
    neighbors: [{ name: "bob", building: "some building", zip: 100, sex: "famale" }],
  },
  cards: [{ last4: 1234, type: "visa" }],
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
    id: "users#some",
    name: "new name",
    age: 21,
    dob: new Date(),
    address: {
      zip: 222,
      building: "my house",
      neighbors: appendList([{ name: "bob", building: "some building", zip: 1000, sex: "male" }]),
    },
    cards: appendList([{ last4: 1234, type: "visa" }]),
    // cards: {
    //   operationName: "append_list",
    //   value: [{ last4: 1234, type: "visa" }],
    // },
  })
  .remove(["name", "age", "cards.[0].last4", "cards.[1].type", "id"])
  .returnValues("ALL_NEW");

qb.update()
  .postsItem()
  .set((set) => [
    set("authors", appendList([{ name: "new name" }])),
    set("authors.[0]", { name: "some name" }),
    set("authors.[1].name", "new name"),
    set("content", "new content"),
  ])
  .remove(["title", "content"]);

qb.delete()
  .usersItem()
  .key((eb) => eb("id", "=", "users#some-random-user-id"))
  .condition((eb) => eb("age", ">", 20));

qb.delete()
  .postsItem()
  .key((eb) => eb("title", "=", "some title"));

const userSchema = schema().add("name", string()).add("age", number()).build();

const rootTableSchema = schema().add("users", userSchema).build();

const indexUserSchema = schema().add("name", string()).build();

const indexTableSchema = schema().add("users", indexUserSchema).build();

const qb2 = queryBuilder(rootTableSchema, { users: indexTableSchema });

qb2
  .query()
  .index("users")
  .filter((eb, { and }) => and([eb("name", "=", "bob"), eb("age", ">", 18)]));
