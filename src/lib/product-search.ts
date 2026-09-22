/**
 * Build a PostgREST `or` filter for catalogue text search.
 * Values are double-quoted so commas, parentheses, and other filter
 * grammar characters stay inside the ilike pattern.
 */
const SEARCH_COLUMNS = ["name", "description", "sku", "slug"] as const;

export function catalogueSearchTerm(value: string): string {
  return value.replace(/[%_]/g, " ").replace(/\s+/g, " ").trim();
}

export function quotePostgrestValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** True when the visitor typed a search that escapes to nothing (`%`, `_`, or both). */
export function isWildcardOnlySearch(value: string): boolean {
  return value.trim().length > 0 && catalogueSearchTerm(value).length === 0;
}

export function productSearchOrFilter(search: string): string | null {
  if (isWildcardOnlySearch(search)) return null;
  const term = catalogueSearchTerm(search);
  if (!term) return null;
  const pattern = quotePostgrestValue(`%${term}%`);
  return SEARCH_COLUMNS.map((column) => `${column}.ilike.${pattern}`).join(",");
}
