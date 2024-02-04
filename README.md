# Scope of work

## DynamoDB peculiarities that MIGHT be incorporated

- Only scalar data types can be used for primary key. A restriction can be put to prevent creation of primary weks with complex data types;
- Non primary key attributes might contain complex data structure as Map/List it might be incorporated into the type system;
- Derivate tables created with secondary indexes. The points to consider:
  - Attributes copied to the secondary index. At least key attributes + any additional specified;
- Specifying projection (a subset of attributes) when fetching items;
- Working with secondary indexes. Points:
  - The primary key schema might change + the available attributes might change as well;
  - Specifying the index during read operation;
- Specifying condition expression when updating/deleting items. It is necessary to implement "offline lock";
- Update operations including atomic updates;
- Type of the returned value after update (UPDATED_NEW);
- When an item is updated the primary key cannot be change. It can be incorporated in the type system;
- Usage in different contexts:
  - Application code;
    - Performing CRUD;
    - Handling stream events;
  - CDK infrastructure code;
    - Defining table/index schemas;
    - Defining integrations/resolvers connected to DynamoDB;
- Representing a datetime. Obviously it sohould be ISO 8601 but the datatype that DynamoDB offers is string. It can be handled at the type level and at the code level by providing transformation for JS Date object;
- Binary values must be base64 encoded before sending them to DynamoDB. It can be solved at the type system level and at the code level providing automatic convertion of binary values to base64 strings;
- Typings and convertions for Map and List data types;
- Converting to and from data type descriptors;
- Consistent partition ans sort key creation with some utilities;
- Strongly and eventually consistent read modes;
- CRUD operations;
  - Create;
    - API operations PutItem / BatchWriteItem or PartiQL;
    - Likely the requirement will be to insert data that correspond to a particular model;
  - UpdateItem;
  - DeleteItem;
  - (Batch)GetItem;
  - Query;
  - Scan;
  - Transactions ???;
- Providing possibility to conveniently handle a retry?
- Automatically added fields:
  - Created at;
  - Updated at - useful for implementing offline lock;
  - Updated by - ???
- Automatic pagination of a response in case `LastEvaluatedKey` is present in the Query result;

## Existing utilities and solutions to evaluate

- aws-sdk/util-dynamodb package. It contains marshal and unmarshal functionality that might be used;
- [DynamoDB toolbox - TS ORM like client for DynamoDB](https://github.com/jeremydaly/dynamodb-toolbox);
- [DynamoDB stream processor (from the autor of the toolbox)](https://github.com/jeremydaly/dynamodb-streams-processor);
- Amplify Gen 2 provides an interface for writing DynamoDB schemas connected to AppSync (GraphQL) what might eliminate the need of using the query builder at the infrastructure level;
- [Programing with Python](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/programming-with-python.html);

## Considerations for the user-facing interface

- Similarity of the interface with the one provided by Prisma/Kysely/Drizzle might make it easier to migrate to other SQL tool in case of necesity;
- Similarity to the native string-like interface provided by DynamoDB SDK will make it easier to integrate the library into an existing workflow and application;
- Also, the Gen 2 Amplify version exists that provides own interface what can be widelly adopted in the future;

## Implementation notes and thoughts

- It seems to be a good idea to separate building of the query and its execution;
  - It will simplify reusing of the query in different contexts;
  - Implementation of the query executor might be different;
    - Fetch only one page;
    - Fetch app the available pages;
    - Fetch data pages and yield them from an async generator;
    - Etc..;
