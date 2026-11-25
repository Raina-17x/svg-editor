export class DuplicateRegistrationError extends Error {
  constructor(category: string, name: string) { super(`duplicate registration: ${category}/${name}`); }
}
