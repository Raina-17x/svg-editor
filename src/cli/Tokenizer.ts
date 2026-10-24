import { Token } from './Token.js';
export class Tokenizer {
  tokenize(line: string): Token[] {
    if (line.trimStart().startsWith('#')) return [];
    const tokens: Token[] = [];
    let value = ''; let inQuote = false; let quoted = false; let started = false;
    for (let index = 0; index < line.length; index++) {
      const char = line[index];
      if (char === '"') { inQuote = !inQuote; quoted = true; started = true; }
      else if (inQuote && char === '\\' && (line[index + 1] === '"' || line[index + 1] === '\\')) { value += line[++index]; }
      else if (/\s/u.test(char) && !inQuote) {
        if (started) { tokens.push(new Token(value, quoted)); value = ''; quoted = false; started = false; }
      } else { value += char; started = true; }
    }
    if (inQuote) throw new Error('unterminated double quote');
    if (started) tokens.push(new Token(value, quoted));
    return tokens;
  }
}
