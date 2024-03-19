import { FieldUpdateOperationDef } from "./update-item.types";

export const isFieldUpdateOperationDef = (value: unknown): value is FieldUpdateOperationDef<string, unknown> =>
  !!value && typeof value === "object" && "operationName" in value && "value" in value;
