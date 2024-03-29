import { qb } from "./example-context";

(async () => {
  const result = await qb
    .get()
    .item("users")
    .key((eb, { and }) => and([eb("name", "=", "John"), eb("age", "=", 30)]))
    .projection(["name", "age", "role", "building.rooms.[0].size"])
    .returnConsumedCapacity("TOTAL")
    .executeAndReturnValue();

  console.log(JSON.stringify(result, null, 2));
})();
