import { qb } from "../example-context";

(async () => {
  const result = await qb
    .query()
    .keyCondition((eb, { and }) => and([eb("name", "=", "John"), eb("age", ">=", 10)]))
    .filter((eb, { and, or }) =>
      and([
        eb("building", "attribute_exists"),
        or([eb("role", "attribute_not_exists"), eb("role", "attribute_type", "S")]),
      ]),
    )
    .executeAndReturnValue();

  console.log(JSON.stringify(result, null, 2));
})();
