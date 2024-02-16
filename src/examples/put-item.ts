import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { queryBuilder } from "../condition/condition.types";
import { run } from "../runner/runner.facade";
import { qb, tableSchema } from "./example-context";

(async () => {
  const result = await qb
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
    .execute();

  console.log(result);
})();
