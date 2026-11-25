import { TreeDecorator, TreeLine, SessionChange } from '../../application/extensions/index.js';
import { Box } from './Box.js';

export class BoxTypeDecorator implements TreeDecorator {
  readonly name = 'box-type-label';
  onChange(_change: SessionChange): void {}
  decorate(line: TreeLine): string { return line.shape instanceof Box ? '(box)' : ''; }
}
