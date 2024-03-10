import { qb } from "./example-context";

(async () => {
  const result = await qb
    .put()
    .item("users", {
      name: "John",
      age: 38,
      role: "super-admin",
      registrationDate: new Date("2022-03-10T20:10:02.328Z"),
      cardIds: ["123", "456"],
      // commentIds: [null, "789"],
      commentIds: ["789"],
      // building: null,
      building: {
        street: "Main St",
        number: 123,
        zip: "12345",
        type: "house",
        size: 3000,
        rooms: [{ size: 100 }, { size: 200 }],
        // rooms: null,
      },
    })
    // .condition((eb) => eb("building.size", "<>", 3000))
    //   .throwIfExists()
    .returnValues("ALL_OLD")
    .returnConsumedCapacity("TOTAL")
    .returnItemCollectionMetrics("SIZE")
    .execute();

  console.log(result);
})();
