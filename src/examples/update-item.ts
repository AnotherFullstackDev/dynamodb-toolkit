import { qb } from "./example-context";

(async () => {
  // @TODO: if an item with such a primary key is not found dynamodb will throw an error
  // https://stackoverflow.com/questions/66776239/the-document-path-provided-in-the-update-expression-is-invalid-for-update-when
  const result = await qb
    .update()
    .item("users")
    // @TODO: add check for the primary key - if not all the fields of the primary key are set dynamodb will throw an error
    .key((eb, { and }) => and([eb("name", "=", "John"), eb("age", "=", 32)]))
    // .key((eb, { and }) => and([eb("age", "=", 30)]))
    .condition((eb) => eb("building.size", ">=", 100))
    .set((set) => [set("building.street", "Some Unknown Str. V3")])
    .remove(["building.size"])
    .returnValues("UPDATED_OLD")
    .executeAndReturnValue();
  // .build();

  console.log(JSON.stringify(result, null, 2));
})();
