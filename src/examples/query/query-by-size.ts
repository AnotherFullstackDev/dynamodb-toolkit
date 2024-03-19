import { qb } from "../example-context";

(async () => {
  const result = await qb
    .query()
    .keyCondition((eb, { and }) => and([eb("name", "=", "John"), eb("age", ">=", 10)]))
    .filter((eb) => eb("role", "size", [">", 0]))
    .executeAndReturnValue();

  console.log(JSON.stringify(result, null, 2));
})();
