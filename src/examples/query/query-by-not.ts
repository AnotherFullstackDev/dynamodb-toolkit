import { qb } from "../example-context";

(async () => {
  const result = await qb
    .query()
    .keyCondition((eb, { and }) => and([eb("name", "=", "John"), eb("age", ">=", 10)]))
    .filter((eb, { or, not }) => not([or([eb("cardIds", "contains", "111"), eb("role", "=", "super-admin")])]))
    .executeAndReturnValue();

  console.log(JSON.stringify(result, null, 2));
})();
