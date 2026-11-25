import { Shape } from '../../domain/Shape.js';
import { EditContext } from './SessionApi.js';

export interface AttributeResult {
  readonly message: string;
  /** The handler supplies domain-specific feedback; history supplies snapshots. */
  readonly undoMessage: string;
}

export interface AttributeHandler {
  readonly name: string;
  /** Receives an isolated probe clone; must not mutate it or retain it. */
  handles(target: Shape, attribute: string): boolean;
  /** Runs against the working document inside the enclosing set transaction. */
  apply(context: EditContext, shapeId: string, attribute: string, value: string): AttributeResult;
}
