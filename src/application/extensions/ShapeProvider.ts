import { Shape } from '../../domain/Shape.js';

/** Parsed XML boundary; children have already been decoded, in source order. */
export interface ShapeReadInput {
  readonly tag: string;
  readonly id: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly content: string;
  readonly children: readonly Shape[];
}

export interface ShapeWriteOutput {
  readonly tag: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly content?: string;
  readonly children: readonly Shape[];
}

export interface ShapeProvider {
  readonly name: string;
  readonly help: string;
  /** SVG tag plus optional data-kind identify read dispatch, without name branches. */
  readonly svgTag: string;
  readonly dataKind?: string;
  create(id: string, args: readonly string[]): Shape;
  read(input: ShapeReadInput): Shape;
  supports(shape: Shape): boolean;
  write(shape: Shape): ShapeWriteOutput;
}
