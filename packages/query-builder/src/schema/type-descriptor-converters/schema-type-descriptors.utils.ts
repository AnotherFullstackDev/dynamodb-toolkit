import { Nullable } from "../../attribute/attribute";

export const shouldBeNulled = (value: unknown, modifiers: Nullable<unknown>) => value === null && modifiers.isNullable === true;

export const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object";
