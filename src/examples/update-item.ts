import { appendList } from "../update-item/update-item.types";
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
    // .condition((eb) => eb("building.size", ">=", 100))
    // @TODO: test how the library behaves when soome objects have a field and some don't
    // .set((set) => [set("building.rooms", [{ size: 100 }, { size: 200 }, { size: 300 }])])
    .set((set) => [set("building.rooms", appendList([{ size: 400 }]))])
    // .remove(["building.size"])
    .returnValues("ALL_NEW")
    .executeAndReturnValue();
  // .build();

  console.log(JSON.stringify(result, null, 2));
})();
