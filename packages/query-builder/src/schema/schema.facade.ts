import { schemaBuilderFactory } from "./schema.builder";
import {
  ForEachMapValuePrependKey,
  InferTupledMap,
  TransformTypeToSchemaBuilderInterface,
  TupleKeyValuePeer,
  TupleMapBuilder,
  TupleMapBuilderResult,
  TupleMapBuilderUnknownInterface,
} from "./schema.types";

/** @deprecated */
export const useSchema = <V extends TupleMapBuilderResult>(value: V): ForEachMapValuePrependKey<InferTupledMap<V>> =>
  value as any;

/** @deprecated */
export const createModel = <N extends string, M extends TupleMapBuilderResult>(
  name: N,
  model: M,
): TupleKeyValuePeer<N, InferTupledMap<M>> => [name, model as any];

export const schema = <I extends Record<string, unknown> = TupleMapBuilderUnknownInterface>(): TupleMapBuilder<
  I extends TupleMapBuilderUnknownInterface ? I : TransformTypeToSchemaBuilderInterface<I>
> =>
  schemaBuilderFactory([]) as unknown as TupleMapBuilder<
    I extends TupleMapBuilderUnknownInterface ? I : TransformTypeToSchemaBuilderInterface<I>
  >;
