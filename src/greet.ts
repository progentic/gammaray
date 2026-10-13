export function greet(name: string): string {
  if (name.trim() === "") {
    throw new Error("greet: name must be non-empty");
  }
  return `Hello, ${name}!`;
}
