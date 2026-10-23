export class Value {
  static number(value: string | number): number {
    if (typeof value === 'string' && !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) {
      throw new Error(`invalid number: ${value}`);
    }
    const result = Number(value);
    if (!Number.isFinite(result)) throw new Error(`invalid number: ${value}`);
    return Object.is(result, -0) ? 0 : result;
  }

  static positive(value: string | number, label: string): number {
    const result = this.number(value);
    if (result <= 0) throw new Error(`${label} must be positive`);
    return result;
  }

  static id(id: string): string {
    if (!id || /[\s<>"'&\x00-\x1f]/u.test(id)) throw new Error(`invalid id: ${id}`);
    return this.xmlText(id);
  }

  static xmlText(value: string): string {
    for (const char of value) {
      const code = char.codePointAt(0)!;
      if (!(code === 9 || code === 10 || code === 13 || (code >= 0x20 && code <= 0xd7ff)
        || (code >= 0xe000 && code <= 0xfffd) || (code >= 0x10000 && code <= 0x10ffff))) {
        throw new Error('invalid XML character');
      }
    }
    return value;
  }
}
