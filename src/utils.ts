import { randomBytes } from "node:crypto";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generate(length = 8): string {
  const bytes = randomBytes(length);

  let id = "";

  for (let i = 0; i < length; i++) {
    id += alphabet[bytes[i]! % alphabet.length];
  }
  return id;
}
