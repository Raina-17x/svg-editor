import { Shape } from '../../domain/Shape.js';
export interface ShapeAccess {
  create(type: string, id: string, args: readonly string[]): Shape;
}
