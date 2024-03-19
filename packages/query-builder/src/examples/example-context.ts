import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { bool, date, list, map, number, partitionKey, sortKey, string } from "../attribute/attribute";
import { queryBuilder } from "../condition/condition.types";
import { run } from "../runner/runner.facade";
import { TupleMap } from "../schema/schema-tuple-map.facade";
import { extractSchemaBuilderResult } from "../schema/schema.builder";
import { schema } from "../schema/schema.facade";

const usersSchema = schema()
  .add("name", partitionKey(string().nullable()))
  .add("age", sortKey(number()))
  .add("role", string().nullable().optional())
  .add("registrationDate", date().nullable().optional())
  .add("cardIds", list(string()).nullable().optional())
  .add("commentIds", list(string().nullable().optional()))
  .add(
    "building",
    map(
      schema()
        .add("street", string().optional())
        .add("number", number().nullable())
        .add("zip", string())
        .add("type", string())
        .add("size", number())
        .add(
          "rooms",
          list(
            map(
              schema()
                .add("size", number())
                .add("floor", number().nullable().optional())
                .add("hasLock", bool().nullable().optional())
                .build(),
            ).nullable(),
          ).nullable(), // TODO: optional lists might cause "error TS2589: Type instantiation is excessively deep and possibly infinite."
        )
        .build(),
    ).nullable(),
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
