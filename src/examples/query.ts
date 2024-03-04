import { qb } from "./example-context";

(async () => {
  const result = await qb
    .query()
    .keyCondition((eb) => eb("name", "=", "John"))
    // .filter((eb) => eb("building.size", ">=", 3000))
    // .filter((eb) => eb("role", ">=", null))
    .filter((eb) => eb("registrationDate", "between", [new Date("2020-01-01"), new Date("2021-01-02")]))
    // .filter((eb) => eb("registrationDate", "between", new Date("2020-01-01")))
    .filter((eb) => eb("role", "in", ["admin"]))
    // .filter((eb) => eb("role", "in", "admin"))
    .filter((eb) => eb("building", "attribute_exists"))
    .filter((eb) => eb("building", "attribute_not_exists"))
    .filter((eb) => eb("building", "size", [">", 30]))
    .filter((eb) => eb("building", "attribute_type", "M"))
    .filter((eb) => eb("role", "contains", "admin"))
    .filter((eb, { and }) => and([eb("building", "attribute_exists"), eb("building", "attribute_not_exists")]))
    .projection(["name", "age", "building.street", "building.size", "building.rooms"])
    // .limit(1)
    .returnConsumedCapacity("TOTAL")
    .executeAndReturnValue();

  console.log(JSON.stringify(result, null, 2));
})();

type T = Extract<"a" | "b" | "c", "a">;