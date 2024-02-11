import { IndexAttributeValueTypes, InferOriginalOrAttributeDataType, PartitionKey, SortKey } from "../attribute";
import { ComparisonOperators, EntitySchema } from "../query";

/**
 * Experiment with fully string condition
 *
 * Benefits:
 * - Simplicity of writing conditions;
 *
 * Disadvantages:
 * - Hard to compose conditions on the go when if/else logic is required;
 * - Hard to pass runtime data;
 */
type SimpleStringCondition<T extends EntitySchema<string>, O extends string, K extends keyof T> = `${K &
  string} ${O} ${InferOriginalOrAttributeDataType<T[K]> & (string | number | boolean)}`;

type SimpleStringConditionFn<T extends EntitySchema<string>> = <K extends keyof T>(
  condition: T[K] extends PartitionKey<IndexAttributeValueTypes>
    ? SimpleStringCondition<T, "=", K>
    : T[K] extends SortKey<IndexAttributeValueTypes>
    ? SimpleStringCondition<T, Exclude<ComparisonOperators, "!=" | "between" | "in">, K>
    : SimpleStringCondition<T, ComparisonOperators, K>,
) => any;

const flatTest = null as unknown as SimpleStringConditionFn<{
  pk: PartitionKey<`users#${string}`>;
  sk: SortKey<`users#${number}`>;
  age: number;
}>;

flatTest("pk = users#some-random-user-id");
