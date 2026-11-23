// Escapes characters that have special meaning in regular expressions so that
// user input is matched literally. Without this, a search such as "(" throws,
// and crafted patterns like "(a+)+$" can hang the server (ReDoS).
export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
