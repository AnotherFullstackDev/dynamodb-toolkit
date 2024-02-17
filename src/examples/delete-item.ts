import { qb } from "./example-context";

(async () => {
  const result = qb
    .delete()
    .item("users")
    .key((eb, { and }) => and([eb("name", "=", "John"), eb("age", "=", 31)]))
    // .condition((eb) => eb("building.rooms.[0].size", ">=", 100)) // @TODO: fix creation of placeholders for index values
    // .condition((eb) => eb("building.size", "<=", 100))
    // .condition((eb) => eb("building.size", ">=", 100))
    .returnValues("ALL_OLD")
    .executeAndReturnValue();

  console.log(JSON.stringify(result, null, 2));
})();
