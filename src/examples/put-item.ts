import { qb } from "./example-context";

(async () => {
  const result = await qb
    .put()
    .item("users", {
      name: "John",
      age: 33,
      role: undefined,
      registrationDate: new Date(),
      cardIds: ["123", "456"],
      commentIds: [null, "789"],
      // building: null,
      building: {
        street: "Main St",
        number: 123,
        zip: "12345",
        type: "house",
        size: 3000,
        // rooms: [{ size: 100 }, { size: 200 }],
        rooms: null,
      },
    })
    //   NOTE: The condition is executed for this particular item and not for all the items in a collection
    // .condition((eb) => eb("building.size", "<>", 3000))
    //   .throwIfExists()
    .returnValues("ALL_OLD")
    .returnConsumedCapacity("TOTAL")
    .returnItemCollectionMetrics("SIZE")
    .execute();

  console.log(result);
})();
