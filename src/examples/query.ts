import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { tableSchema } from "./example-schema";
import { queryBuilder } from "../condition/condition.types";
import { run } from "../runner/runner.facade";

(async () => {
  const client = new DynamoDBClient({});
  const tableName = "qb-test-v1";

  const qb = queryBuilder(tableSchema);

  const result = await run(
    client,
    tableName,
    qb
      .query()
      .keyCondition((eb) => eb("name", "=", "John"))
      .filter((eb) => eb("building.size", "<=", 3000))
      .build(),
  );

  console.log(JSON.stringify(result, null, 2));
})();
