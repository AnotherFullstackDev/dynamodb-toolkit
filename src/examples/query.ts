import { qb } from "./example-context";

(async () => {
  const result = await qb
    .query()
    .keyCondition((eb) => eb("name", "=", "John"))
    // .filter((eb) => eb("building.size", ">=", 3000))
    .projection(["name", "age", "building.street", "building.size"])
    .limit(1)
    .returnConsumedCapacity("TOTAL")
    .executeAndReturnValue();

  console.log(JSON.stringify(result, null, 2));
})();
