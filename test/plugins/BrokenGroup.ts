import { Group } from '../../src/domain/Group.js';

/** Intentionally forgets to override emptyCopy, so it would clone into Group. */
export class BrokenGroup extends Group {}
