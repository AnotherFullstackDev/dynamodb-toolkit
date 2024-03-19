import { qb } from "../example-context";

(async () => {
  const result = await qb
    .query()
    .keyCondition((eb, { and }) => and([eb("name", "=", "John"), eb("age", ">=", 10)]))
    .filter((eb) => eb("registrationDate", "between", [new Date("2023-01-01"), new Date("2025-12-31")]))
    .executeAndReturnValue();

  console.log(JSON.stringify(result, null, 2));
})();
