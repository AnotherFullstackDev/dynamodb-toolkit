import {
  ApplyNullability,
  Attribute,
  DateAttribute,
  InferOriginalOrAttributeDataType,
  ListAttribute,
  MapAttribute,
  PartitionKey,
  RegularAttribute,
  SetAttribute,
  SortKey,
} from "../attribute/attribute";
import { deleteItemFacadeFactory } from "../delete-item/delete-item.facade";
import { DeleteItemOperationBuilder } from "../delete-item/delete-item.types";
import { GenericTupleBuilderResultSchema } from "../schema/schema.types";
import { getItemOperationBuilderFactory } from "../get-item/get-item.facade";
import { GetItemOperationBuilder } from "../get-item/get-item.types";
import { OperationContext } from "../operations-common/operations-common.types";
import { putItemFacadeFactory } from "../put-item/put-item.facade";
import { PutOperationBuilder } from "../put-item/put-item.types";
import { queryOperationBuilder } from "../query/query.facade";
import { QueryOperationBuilder } from "../query/query.types";
import { scanOperationBuilderFacadeFactory } from "../scan/scan.facade";
import { ScanOperationBuilder } from "../scan/scan.types";
import {
  InferTupledMap,
  TransformTableSchemaIntoSchemaInterfacesMap,
  TransformTableSchemaIntoTupleSchemasMap,
  TupleKeyValuePeer,
  TupleMapBuilderResult,
} from "../schema/schema.types";
import { AttributeTypeDescriptorKey } from "../schema/type-descriptor-converters/schema-type-descriptors.types";
import { updateItemFacadeFactory } from "../update-item/update-item.facade";
import { UpdateOperationBuilder } from "../update-item/update-item.types";

// @TODO: evaluate if this type is neccesary
export type EntitySchema<K extends string | number | symbol> = Record<
  K,
  string | number | bigint | boolean | null | undefined | Date | Attribute<string, unknown>
>;

// Not sure if it makes sense to have this type stricter as `F extends keyof S`
// type ComparisonOperatorDefinition<F extends string | number | symbol, O extends string, S extends EntitySchema<F>> = {
export type ComparisonOperatorDefinition<
  F extends string | number | symbol,
  O extends string,
  S extends Record<F, unknown>,
> = {
  field: F;
  operator: O;
  value: InferOriginalOrAttributeDataType<S[F]>;
};

export type NoValueComparisonOperatorDefinition<F extends string | number | symbol, O extends string> = {
  field: F;
  operator: O;
};

// The type might be make stricter by accepting the operator as a generic type parameter. It might help during implementation of the builder.
export type LogicalOperatorDefinition = {
  operator: LogicalOperators;
  // conditions: Array<ComparisonOperatorDefinition<string, string, EntitySchema<string>> | LogicalOperatorDefinition>;
  conditions: Array<
    | OperatorDefinition<
        "conditional",
        | ComparisonOperatorDefinition<string, string, EntitySchema<string>>
        | NoValueComparisonOperatorDefinition<string, string>
      >
    | OperatorDefinition<"logical", LogicalOperatorDefinition>
  >;
};

export type OperatorDefinition<
  T extends "conditional" | "logical" | "function",
  O extends
    | ComparisonOperatorDefinition<string | number | symbol, string, EntitySchema<string>>
    | NoValueComparisonOperatorDefinition<string | number | symbol, string>
    | LogicalOperatorDefinition,
> = {
  type: T;
  // operator: T extends "logical" ? O[] : O;
  operator: O;
};

export type ComparisonOperatorFactory<N, S extends Record<string, unknown>, O extends string> = <
  LN extends N, // necessary to make the model names generics work
  LO extends O,
  F extends keyof S = keyof S,
>(
  field: F,
  operator: LO,
  value: LO extends "between"
    ? [InferOriginalOrAttributeDataType<S[F]>, InferOriginalOrAttributeDataType<S[F]>]
    : LO extends "in"
    ? InferOriginalOrAttributeDataType<S[F]>[]
    : LO extends "size"
    ? [Exclude<ComparisonOperators, "begins_with" | "between" | "in">, number]
    : LO extends "attribute_type"
    ? AttributeTypeDescriptorKey
    : InferOriginalOrAttributeDataType<S[F]>,
) => OperatorDefinition<"conditional", ComparisonOperatorDefinition<F, LO, S>>;

export type NoValueComparisonOperatorFactory<
  N,
  S extends Record<string, unknown>,
  O extends "attribute_exists" | "attribute_not_exists",
> = <
  LN extends N, // necessary to make the model names generics work
  F extends keyof S = keyof S,
>(
  field: F,
  operator: O,
) => OperatorDefinition<"conditional", NoValueComparisonOperatorDefinition<F, O>>;
// ) => any;

export type LogicalOperatorFactory<S extends EntitySchema<string>> = <F extends keyof S>(
  operator: LogicalOperators,
  ...conditions: ComparisonOperatorDefinition<F, ComparisonOperators, S>[]
) => OperatorDefinition<"logical", LogicalOperatorDefinition>;

export type ComparisonOperators = "=" | "<>" | "<" | "<=" | ">" | ">=" | "begins_with" | "between" | "in";

export type ComparisonFunctions = "attribute_type" | "attribute_exists" | "attribute_not_exists" | "contains" | "size";

export type LogicalOperators = "and" | "or" | "not";

// @TODO: evaluate if necessary and add operators for NOT LEAF keys of map, list and set types
// @TODO: investigate is is possible to match exactly a "const" type like "value" or "10"
type AttributeTypesToOperatorsTupledMap = [
  [PartitionKey<any>, "="],
  [SortKey<any>, "=" | "<" | "<=" | ">" | ">=" | "begins_with" | "between"],

  // Experiment with complex data types
  [SetAttribute<any>, ComparisonOperators | ComparisonFunctions],
  [MapAttribute<any>, ComparisonOperators | ComparisonFunctions],
  [ListAttribute<any>, ComparisonOperators | ComparisonFunctions],

  [RegularAttribute<string>, ComparisonOperators | ComparisonFunctions],
  [RegularAttribute<number>, ComparisonOperators | ComparisonFunctions],
  [RegularAttribute<bigint>, ComparisonOperators | ComparisonFunctions],
  [RegularAttribute<boolean>, ComparisonOperators | ComparisonFunctions],
  [DateAttribute<Date>, ComparisonOperators | ComparisonFunctions],
];

/**
 * The generic extracts "value type" from a "tupled schema" by checking if the provided type is a subtype of the one from the schema
 */
type GetAttributeOperatorsByType<T, M> = M extends [infer FT, ...infer R]
  ? FT extends [infer OT, infer O]
    ? T extends OT
      ? O
      : GetAttributeOperatorsByType<T, R>
    : never
  : never;

type ForEachKeyComparisonOperatorFactory<K, T> = T extends [infer KeyValuePeer, ...infer R]
  ? // ? KeyValuePeer extends TupleKeyValuePeer<string, unknown>
    KeyValuePeer extends TupleKeyValuePeer<infer PK, infer PV>
    ? ComparisonOperatorFactory<
        K,
        Record<PK, ApplyNullability<PV, InferOriginalOrAttributeDataType<PV>>>,
        Exclude<
          GetAttributeOperatorsByType<PV, AttributeTypesToOperatorsTupledMap>,
          "attribute_exists" | "attribute_not_exists"
        >
      > &
        NoValueComparisonOperatorFactory<
          K,
          Record<PK, ApplyNullability<PV, InferOriginalOrAttributeDataType<PV>>>,
          Extract<
            GetAttributeOperatorsByType<PV, AttributeTypesToOperatorsTupledMap>,
            "attribute_exists" | "attribute_not_exists"
          >
        > &
        ForEachKeyComparisonOperatorFactory<K, R>
    : never
  : T;

type OverloadableComparisonFactory<T> = T extends [infer EntityTupleSchema, ...infer R]
  ? EntityTupleSchema extends [infer K, infer Schemas]
    ? ForEachKeyComparisonOperatorFactory<K, Schemas> & OverloadableComparisonFactory<R>
    : never
  : T;

export type ConditionExpressionBuilder<S> = (
  expressionBuilder: OverloadableComparisonFactory<S>,

  // @TODO: add possibility to target specific entity type via generic parameter
  // Awaits for the results of first usage and a feedback on usefulness on targeting a specific type in the condition expression
  logicalOperators: {
    [LK in LogicalOperators]: (
      conditions: Array<
        // @TODO: fix schema types for the logical conditions section
        // | OperatorDefinition<"conditional", ComparisonOperatorDefinition<string, QueryComparisonOperators, S>>
        | OperatorDefinition<
            "conditional",
            | ComparisonOperatorDefinition<string, ComparisonOperators | ComparisonFunctions, EntitySchema<string>>
            | NoValueComparisonOperatorDefinition<string, ComparisonFunctions>
          >
        | OperatorDefinition<"logical", LogicalOperatorDefinition>
      >,
    ) => OperatorDefinition<"logical", LogicalOperatorDefinition>;
  },
) =>
  | OperatorDefinition<
      "conditional",
      | ComparisonOperatorDefinition<string, ComparisonOperators | ComparisonFunctions, EntitySchema<string>>
      | NoValueComparisonOperatorDefinition<string, ComparisonFunctions>
    >
  | OperatorDefinition<"logical", LogicalOperatorDefinition>;

// @TODO: for operations that work with a single item we can restrict the key condition to achieve the following:
// - use all the available primary keys;
export type KeyConditionExpressionBuilder<S> = (
  expressionBuilder: OverloadableComparisonFactory<S>,

  // @TODO: add possibility to target specific entity type via generic parameter
  // Awaits for the results of first usage and a feedback on usefulness on targeting a specific type in the condition expression
  logicalOperators: {
    and: (
      conditions: Array<
        // @TODO: fix schema types for the logical conditions section
        OperatorDefinition<
          "conditional",
          ComparisonOperatorDefinition<string, ComparisonOperators | ComparisonFunctions, EntitySchema<string>>
        >
      >,
    ) => OperatorDefinition<"logical", LogicalOperatorDefinition>;
  },
) =>
  | OperatorDefinition<
      "conditional",
      ComparisonOperatorDefinition<string, ComparisonOperators | ComparisonFunctions, EntitySchema<string>>
    >
  | OperatorDefinition<"logical", LogicalOperatorDefinition>;

type BuilderInitizlizer<S, IDX> = {
  withContext: (context: OperationContext) => BuilderOperations<S, IDX>;
};

type BuilderOperations<S, IDX> = {
  query: () => QueryOperationBuilder<
    TransformTableSchemaIntoTupleSchemasMap<S>,
    { [K in keyof IDX]: TransformTableSchemaIntoTupleSchemasMap<IDX[K]> }
  >;
  scan: () => ScanOperationBuilder<TransformTableSchemaIntoTupleSchemasMap<S>>;
  get: () => GetItemOperationBuilder<TransformTableSchemaIntoTupleSchemasMap<S>>;
  put: () => PutOperationBuilder<
    TransformTableSchemaIntoSchemaInterfacesMap<S>,
    TransformTableSchemaIntoTupleSchemasMap<S>
  >;
  update: () => UpdateOperationBuilder<S>;
  delete: () => DeleteItemOperationBuilder<S>;
};

type Builder<S, IDX> = BuilderInitizlizer<S, IDX>;

export const queryBuilder = <
  S extends TupleMapBuilderResult<any, GenericTupleBuilderResultSchema>,
  IDX extends Record<string, TupleMapBuilderResult<unknown, GenericTupleBuilderResultSchema>>,
>(
  schema: S,
  indexes: IDX = {} as IDX,
): Builder<InferTupledMap<S>, { [K in keyof IDX]: InferTupledMap<IDX[K]> }> => {
  return {
    withContext: (context: OperationContext) => queryBuilderOperations(schema, indexes, context),
  };
};

export const queryBuilderOperations = <
  S extends TupleMapBuilderResult<any, GenericTupleBuilderResultSchema>,
  IDX extends Record<string, TupleMapBuilderResult<unknown, GenericTupleBuilderResultSchema>>,
>(
  schema: S,
  indexes: IDX = {} as IDX,
  context: OperationContext,
): BuilderOperations<InferTupledMap<S>, { [K in keyof IDX]: InferTupledMap<IDX[K]> }> => {
  return {
    put: () => putItemFacadeFactory(schema, context),
    query: () => queryOperationBuilder(schema, indexes, context),
    scan: () => scanOperationBuilderFacadeFactory(schema, context),
    get: () => getItemOperationBuilderFactory(schema, context),
    update: () => updateItemFacadeFactory(schema, context),
    delete: () => deleteItemFacadeFactory(schema, context),
  };
};
// } as unknown as Builder<InferTupledMap<S>, { [K in keyof IDX]: InferTupledMap<IDX[K]> }>;
