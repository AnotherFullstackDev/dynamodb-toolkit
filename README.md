# Scope of work

## DynamoDB peculiarities that MIGHT be incorporated

- Usage in different contexts:
  - Application code;
    - Performing CRUD;
    - Handling stream events;
  - CDK infrastructure code;
    - Defining table/index schemas;
    - Defining integrations/resolvers connected to DynamoDB;

### Data types

- Converting to and from dynamodb data type descriptor;
- Representing a datetime. Obviously it sohould be ISO 8601 but the datatype that DynamoDB offers is string. It can be handled at the type level and at the code level by providing transformation for JS Date object;
- Binary values must be base64 encoded before sending them to DynamoDB. It can be solved at the type system level and at the code level providing automatic convertion of binary values to base64 strings;
- Typings and convertions for Map and List data types; TODO: not sure if specific conversion is necessary

### Keys & attributes

- Only scalar data types can be used for primary key. A restriction can be put to prevent creation of primary keys with complex data types;
- Non primary key attributes might contain complex data structure as Map/List. It might be incorporated into the type system;
- KeyCondition for Scan operation has the following limits/requirements that might be ncorporated:
  - For partition key only equality match is allowed;
  - For sort key the number of allowed operators and functions is less than it is for other conditions;
  - Seems that the only allowed logical operator for primary key is `AND`; TODO: requires checking

### Indexes & derivate tables

- Derivate tables created with secondary indexes. The points to consider:
  - Attributes copied to the secondary index. At least key attributes + any additional specified;
- Working with secondary indexes. Points:
  - The primary key schema might change + the available attributes might change as well;
  - Specifying the index during read operation;

### Data API

#### General

- Providing possibility to conveniently handle a retry?
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

#### Read

- Strongly and eventually consistent read modes;
- Specifying projection (a subset of attributes) when fetching items;
- Automatic pagination of a response in case `LastEvaluatedKey` is present in the Query result;

#### Data change

- Specifying condition expression when updating/deleting items. It is necessary to implement "offline lock";
- Update operations including atomic updates;
- Type of the returned value after update (UPDATED_NEW);
- Type of information returned about consumed capacity (ReturnConsumedCapacity);
- When an item is updated the primary key cannot be changed. It can be incorporated in the type system;
- Posibility to specify a client key for client updates

### Schema

- Code level schema builder with extended types for applications;
- Automatically added fields:
  - Created at;
  - Updated at - useful for implementing offline lock;
  - Updated by - ???

- Consistent partition ans sort key creation with some utilities; TODO: what is this about?

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

## Ongoing points, things to exaluate or fix, notes

- Evaluate how to better create descriptors for fields - either use different attribute descriptors for the same path or a single one;
- Fix response conversion to convert attribute values according to the schema (dates);
