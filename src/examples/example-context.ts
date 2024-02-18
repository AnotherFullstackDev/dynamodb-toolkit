import { TupleMap } from "../schema/schema-tuple-map.facade";
import { list, map, number, partitionKey, sortKey, string } from "../attribute/attribute";
import { schema } from "../schema/schema.facade";
import { extractSchemaBuilderResult } from "../schema/schema.builder";
import { queryBuilder } from "../condition/condition.types";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { run } from "../runner/runner.facade";

const usersSchema = schema()
  .add("name", partitionKey(string()))
  .add("age", sortKey(number()))
  .add("role", string())
  .add(
    "building",
    map(
      schema()
        .add("street", string())
        .add("number", number())
        .add("zip", string())
        .add("type", string())
        .add("size", number())
        .add("rooms", list(map(schema().add("size", number()).build())))
        .build(),
    ),
  )
  .build();

const indexUserSchema = schema().add("name", partitionKey(string())).add("role", sortKey(string())).build();

const gsi1 = schema().add("users", indexUserSchema).build();

export const tableSchema = schema().add("users", usersSchema).build();

export const tableMap = TupleMap.fromTableSchema(extractSchemaBuilderResult(tableSchema as any));

export const qb = queryBuilder(tableSchema, {
  "name-role-index": gsi1,
}).withContext({
  client: new DynamoDBClient({}),
  tableName: "qb-test-v1",
  runner: run,
});
