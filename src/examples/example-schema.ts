import { map, number, partitionKey, sortKey, string } from "../attribute/attribute";
import { schema } from "../schema/schema.facade";

const usersSchema = schema()
  .add("name", partitionKey(string()))
  .add("age", sortKey(number()))
  .add(
    "building",
    map(
      schema()
        .add("street", string())
        .add("number", number())
        .add("zip", string())
        .add("type", string())
        .add("size", number())
        .build(),
    ),
  )
  .build();

export const tableSchema = schema().add("users", usersSchema).build();
