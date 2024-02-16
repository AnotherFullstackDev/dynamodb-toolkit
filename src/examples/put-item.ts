import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { queryBuilder } from "../condition/condition.types";
import { run } from "../runner/runner.facade";
import { tableSchema } from "./example-context";

const qb = queryBuilder(tableSchema);

(async () => {
  const client = new DynamoDBClient({});
  const tableName = "qb-test-v1";

  const result = await run(
    client,
    tableName,
    qb
      .put()
      .item("users", {
        name: "John",
        age: 33,
        building: {
          street: "Main St",
          number: 123,
          zip: "12345",
          type: "house",
          size: 3000,
        },
      })
      //   NOTE: The condition is executed for this particular item and not for all the items in a collection
      .condition((eb) => eb("building.size", "<>", 3000))
      //   .throwIfExists()
      .returnValues("ALL_OLD")
      .returnConsumedCapacity("TOTAL")
      .returnItemCollectionMetrics("SIZE")
      .build(),
  );

  console.log(result);
})();
