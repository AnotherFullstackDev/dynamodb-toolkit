// implementation of put item

import { ReturnConsumedCapacityValues } from "../operations-common";
import { ConditionExpressionBuilder } from "../query";
import {
  InferTupledMap,
  PickOnlyPrimaryKeyAttributesFromTupledModelSchemasList,
  TransformTableSchemaIntoSchemaInterfacesMap,
  TransformTableSchemaIntoTupleSchemasMap,
  TupleMapBuilderResult,
  TupledTableSchema,
  schema,
} from "../schema";
import { GenericInterfaceTableSchema, GenericTupleBuilderResultSchema, GenericTupleTableSchema } from "../test";
import { RemapRecord } from "../utility-types";
import { PutOperationAdditionalParamsBuilder, PutOperationBuilder, PutOperationItemsBuilder } from "./put-item.types";

/**
 * Common implementations
 * - transformation of fields into placeholders and aliases
 * - transformation of values into placeholders and aliases
 * - creation of type descriptors for field values
 */

const putItemAdditionaOperationsFactory = <TS extends GenericTupleBuilderResultSchema>(
  schema: TS,
): PutOperationAdditionalParamsBuilder<TS> => {
  //   const result: PutOperationAdditionalParamsBuilder<GenericTupleTableSchema> = {
  const result = {
    condition: function (builder: ConditionExpressionBuilder<any>): PutOperationAdditionalParamsBuilder<TS> {
      throw new Error("Function not implemented.");
    },
    throwIfExists: function (): PutOperationAdditionalParamsBuilder<TS> {
      throw new Error("Function not implemented.");
    },
    returnValues: function (value: "ALL_NEW" | "ALL_OLD"): PutOperationAdditionalParamsBuilder<TS> {
      throw new Error("Function not implemented.");
    },
    returnConsumedCapacity: function (capacity: ReturnConsumedCapacityValues): PutOperationAdditionalParamsBuilder<TS> {
      throw new Error("Function not implemented.");
    },
    returnItemCollectionMetrics: function (value: "SIZE"): PutOperationAdditionalParamsBuilder<TS> {
      throw new Error("Function not implemented.");
    },
  };

  return result;
  //   return result satisfies PutOperationAdditionalParamsBuilder<TransformTableSchemaIntoSchemaInterfacesMap<S>>;
  // return result satisfies PutOperationAdditionalParamsBuilder<GenericTupleTableSchema>;
};

export const putItemFacadeFactory = <S extends TupleMapBuilderResult<unknown, GenericTupleBuilderResultSchema>>(
  // export const putItemFacadeFactory = <S extends GenericTupleTableSchema>(
  schema: S,
): PutOperationBuilder<
  TransformTableSchemaIntoSchemaInterfacesMap<InferTupledMap<S>>,
  TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>
> => {
  const result = {
    // @TODO: we might put the item object to descriptors transformation here
    item: (name, value) => putItemAdditionaOperationsFactory(schema.value),
  } satisfies PutOperationBuilder<GenericInterfaceTableSchema, GenericTupleBuilderResultSchema>;

  return result as unknown as PutOperationBuilder<
    TransformTableSchemaIntoSchemaInterfacesMap<InferTupledMap<S>>,
    TransformTableSchemaIntoTupleSchemasMap<InferTupledMap<S>>
  >;
};
