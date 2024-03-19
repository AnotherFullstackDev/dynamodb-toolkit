import { GenericTupleBuilderResultSchema } from "../schema/schema.types";
import { TupleMap } from "./schema-tuple-map.facade";
import { extractSchemaBuilderResult } from "./schema.builder";
import { TupleMapBuilderResult } from "./schema.types";

export const isTupleMap = (value: any): value is TupleMap => value instanceof TupleMap;

export const createTupleMapFromTableSchema = (
  schema: TupleMapBuilderResult<unknown, GenericTupleBuilderResultSchema>,
): TupleMap => {
  return TupleMap.fromTableSchema(extractSchemaBuilderResult(schema as any)); // TODO: fix it
};

export const createCombinedTupleMapForAllTableEntitiesFromTableMap = (schema: TupleMap): TupleMap => {
  const tableWithFieldsFromAllModels = new TupleMap("ROOT", [], {
    isNullable: false,
    isOptional: false,
  });

  schema.forEach((entityHost) => {
    const entitySchema = entityHost.value();

    if (!isTupleMap(entitySchema)) {
      throw new Error(`Entity schema "${entityHost.key()}" is not a TupleMap!`);
    }

    entitySchema.forEach((modelField) => {
      if (tableWithFieldsFromAllModels.has(modelField.key())) {
        // @TODO: evaluate a possibility to share keys between entities
        // The keys probably must be of the same datatype
        // Theoretically ther eshould not be any problems with sharing keys between entities because each item is a new record
        // Though, in the current implementation at the application level it is problematic if the field has different datatypes across entities (types, descriptors, targetic a specific field, etc..)
        throw new Error(`Field ${modelField.key()} is already defined in some of the table entities!`);
      }

      tableWithFieldsFromAllModels.set(modelField.key(), modelField.value() as any);
    });
  });

  return tableWithFieldsFromAllModels;
};
