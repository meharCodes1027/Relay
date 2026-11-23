// Escapes characters that have special meaning in regular expressions so that
// user input is matched literally. Without this, a search such as "(" throws,
// and crafted patterns like "(a+)+$" can hang the server (ReDoS).
export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// MongoDB ObjectIds are 24 hexadecimal characters. Checking the shape before
// querying lets us answer malformed ids with 400 instead of letting Mongoose
// throw a CastError that surfaces as a 500.
export function isObjectId(value) {
  return typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
}
