import { qb } from "./example-context";

(async () => {
  const result = await qb
    .scan()
    .filter((eb) => eb("age", ">=", 30))
    .returnConsumedCapacity("TOTAL")
    .execute();

  console.log(JSON.stringify(result, null, 2));
})();
