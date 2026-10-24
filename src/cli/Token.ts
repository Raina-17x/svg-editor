export class Token {
  constructor(private readonly text: string, private readonly quoted: boolean) {}
  get value(): string { return this.text; }
  get isQuoted(): boolean { return this.quoted; }
}
