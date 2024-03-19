import { qb } from "./example-context";

(async () => {
  const result = await qb
    .query()
    .index("name-role-index")
    .keyCondition((eb, { and }) => and([eb("name", "=", "John"), eb("role", "=", "admin")])) // TODO: add a validation for mandatory usage of a partition key in a key condition - it is required by dynamodb
    .executeAndReturnValue();

  console.log(JSON.stringify(result, null, 2));
})();
