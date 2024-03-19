import { qb } from "../example-context";

(async () => {
  const result = await qb
    .query()
    .keyCondition((eb, { and }) => and([eb("name", "=", "John"), eb("age", ">=", 10)]))
    .filter((eb, { or }) => or([eb("cardIds", "contains", "111"), eb("role", "contains", "super")]))
    .executeAndReturnValue();

  console.log(JSON.stringify(result, null, 2));
})();
